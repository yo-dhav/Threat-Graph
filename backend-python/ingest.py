import os
import time
import feedparser
from dotenv import load_dotenv
from neo4j import GraphDatabase
import spacy

# Load environment variables
load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

try:
    neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    neo4j_driver.verify_connectivity()
    print("Connected to Neo4j")
except Exception as e:
    print(f"Failed to connect to Neo4j: {e}")
    exit(1)

# Initialize spaCy
print("Loading local spaCy NLP model...")
nlp = spacy.load("en_core_web_sm")

# Add EntityRuler for custom Cyber threat detection
ruler = nlp.add_pipe("entity_ruler", before="ner")

# --- Define Patterns for spaCy ---
patterns = [
    # Regex for CVEs
    {"label": "CVE", "pattern": [{"TEXT": {"REGEX": "^CVE-\d{4}-\d+$"}}]},
    
    # Known Threat Actors
    {"label": "ThreatActor", "pattern": "Lazarus"},
    {"label": "ThreatActor", "pattern": "APT28"},
    {"label": "ThreatActor", "pattern": "APT29"},
    {"label": "ThreatActor", "pattern": "Fancy Bear"},
    {"label": "ThreatActor", "pattern": "MuddyWater"},
    {"label": "ThreatActor", "pattern": "Sandworm"},
    {"label": "ThreatActor", "pattern": "LockBit"},
    {"label": "ThreatActor", "pattern": "Scattered Spider"},
    {"label": "ThreatActor", "pattern": "BlackCat"},
    {"label": "ThreatActor", "pattern": "Kimsuky"},
    
    # Known Malware/Tools
    {"label": "Malware", "pattern": "Mirai"},
    {"label": "Malware", "pattern": "WannaCry"},
    {"label": "Malware", "pattern": "Emotet"},
    {"label": "Malware", "pattern": "Cobalt Strike"},
    {"label": "Malware", "pattern": "Qakbot"},
    {"label": "Malware", "pattern": "GhostRider"},
    {"label": "Malware", "pattern": "xlabs_v1"}, # From your terminal!
    
    # Contextual Rules (e.g. capitalized word followed by 'botnet' or 'ransomware')
    {"label": "Malware", "pattern": [{"IS_TITLE": True}, {"LOWER": {"IN": ["botnet", "ransomware", "trojan", "malware", "virus", "worm"]}}]},
    
    # Contextual Threat Actor (e.g., capitalized word followed by 'group' or 'gang')
    {"label": "ThreatActor", "pattern": [{"IS_TITLE": True}, {"LOWER": {"IN": ["group", "gang", "syndicate", "hackers", "actor"]}}]}
]

ruler.add_patterns(patterns)

FEEDS = [
    "https://feeds.feedburner.com/TheHackersNews",
    "https://www.bleepingcomputer.com/feed/",
    "https://cyberscoop.com/feed/",
    "https://krebsonsecurity.com/feed/",
    "https://www.darkreading.com/rss.xml",
    "https://www.securityweek.com/feed/",
    "https://www.infosecurity-magazine.com/rss/news/",
    "https://www.csoonline.com/feed/",
    "https://blog.malwarebytes.com/feed/",
    "https://securelist.com/feed/",
    "https://unit42.paloaltonetworks.com/feed/",
    "https://www.mandiant.com/resources/blog/rss.xml",
    "https://www.recordedfuture.com/feed",
    "https://gbhackers.com/feed/",
    "https://cybernews.com/news/rss/",
    "https://www.cisa.gov/cybersecurity-advisories/all.xml",
    "https://nakedsecurity.sophos.com/feed/"
]

def extract_threat_intel(text: str):
    doc = nlp(text)
    
    entities = []
    relationships = []
    
    # 1. Extract Entities
    found_entities = {} 
    
    for ent in doc.ents:
        label = ent.label_
        name = ent.text.strip()
        
        # Heuristics to convert generic spaCy ORG/PRODUCT into Software
        if label in ["ORG", "PRODUCT"]:
            if name not in [e['name'] for e in entities]:
                label = "Software"
        
        # Only keep our 4 core types
        if label in ["ThreatActor", "Malware", "CVE", "Software"]:
            if name not in found_entities:
                entities.append({"name": name, "type": label})
                found_entities[name] = label
                
    # 2. Extract Relationships (Heuristic Dependency Parsing)
    for sent in doc.sents:
        actors_in_sent = []
        malware_in_sent = []
        cve_in_sent = []
        software_in_sent = []
        
        for ent in sent.ents:
            name = ent.text.strip()
            if name not in found_entities: continue
            
            ent_type = found_entities[name]
            if ent_type == "ThreatActor": actors_in_sent.append(name)
            elif ent_type == "Malware": malware_in_sent.append(name)
            elif ent_type == "CVE": cve_in_sent.append(name)
            elif ent_type == "Software": software_in_sent.append(name)
            
        # Basic Co-occurrence Heuristics
        for actor in actors_in_sent:
            for mal in malware_in_sent:
                relationships.append({"source": actor, "target": mal, "relation": "USES"})
            for cve in cve_in_sent:
                relationships.append({"source": actor, "target": cve, "relation": "EXPLOITS"})
            for sw in software_in_sent:
                relationships.append({"source": actor, "target": sw, "relation": "TARGETS"})
                
        for mal in malware_in_sent:
            for cve in cve_in_sent:
                relationships.append({"source": mal, "target": cve, "relation": "EXPLOITS"})
            for sw in software_in_sent:
                relationships.append({"source": mal, "target": sw, "relation": "TARGETS"})
                
        for cve in cve_in_sent:
            for sw in software_in_sent:
                relationships.append({"source": cve, "target": sw, "relation": "AFFECTS"})

    # Deduplicate relationships
    unique_rels = []
    seen = set()
    for r in relationships:
        key = f"{r['source']}-{r['relation']}-{r['target']}"
        if key not in seen:
            seen.add(key)
            unique_rels.append(r)

    return {"entities": entities, "relationships": unique_rels}

def insert_into_neo4j(graph_data):
    with neo4j_driver.session() as session:
        for entity in graph_data['entities']:
            session.run(
                f"MERGE (n:{entity['type']} {{id: $name, name: $name}})",
                name=entity['name']
            )
            
        for rel in graph_data['relationships']:
            session.run(
                f"""
                MATCH (s {{name: $source_name}})
                MATCH (t {{name: $target_name}})
                MERGE (s)-[r:{rel['relation']}]->(t)
                """,
                source_name=rel['source'],
                target_name=rel['target']
            )

def main():
    print("Starting LOCAL Threat Intel Ingestion Pipeline (spaCy NLP)")
    for feed_url in FEEDS:
        print(f"Parsing feed: {feed_url}")
        feed = feedparser.parse(feed_url)
        
        for entry in feed.entries[:20]:
            title = entry.title
            summary = entry.get("summary", "")
            text_to_analyze = f"Title: {title}\n\nSummary: {summary}"
            
            print(f"Analyzing: {title}")
            try:
                graph_data = extract_threat_intel(text_to_analyze)
                print(f"   => Found {len(graph_data['entities'])} entities and {len(graph_data['relationships'])} relationships.")
                insert_into_neo4j(graph_data)
            except Exception as e:
                print(f"   Error extracting/inserting intel: {e}")
            
            # No API limits, so we can run instantly without sleep!
            time.sleep(0.1)

    print("Ingestion complete.")
    neo4j_driver.close()

if __name__ == "__main__":
    main()
