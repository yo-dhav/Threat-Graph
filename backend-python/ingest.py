import os
import json
import time
import feedparser
from dotenv import load_dotenv
from neo4j import GraphDatabase
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# Load environment variables
load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

# Initialize clients
try:
    neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    neo4j_driver.verify_connectivity()
    print("Connected to Neo4j")
except Exception as e:
    print(f"Failed to connect to Neo4j: {e}")
    exit(1)

genai_client = genai.Client() # Uses GEMINI_API_KEY from .env

# --- Pydantic Schema for Gemini Structured Output ---
class Entity(BaseModel):
    name: str = Field(description="The normalized name or ID of the entity")
    type: str = Field(description="Must be one of: ThreatActor, Malware, CVE, Software")

class Relationship(BaseModel):
    source_name: str = Field(description="Name of the source entity")
    target_name: str = Field(description="Name of the target entity")
    relation: str = Field(description="Must be one of: USES, EXPLOITS, TARGETS, AFFECTS")

class ThreatGraphData(BaseModel):
    entities: list[Entity] = Field(description="List of extracted entities")
    relationships: list[Relationship] = Field(description="List of extracted relationships between the entities")

# --- Feed URLs ---
FEEDS = [
    "https://feeds.feedburner.com/TheHackersNews", # The Hacker News
    # "https://www.cisa.gov/uscert/ncas/current-activity.xml" # Optional CISA
]

def extract_threat_intel(text: str) -> ThreatGraphData:
    prompt = f"""
    You are an expert cybersecurity threat intelligence analyst.
    Analyze the following cybersecurity news article summary and extract key entities and their relationships.
    
    Entities can only be of these types: ThreatActor, Malware, CVE, Software.
    Relationships can only be: USES (ThreatActor -> Malware), EXPLOITS (ThreatActor -> CVE), TARGETS (Malware -> Software), AFFECTS (CVE -> Software).
    
    Article Text:
    {text}
    """
    
    response = genai_client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ThreatGraphData,
            temperature=0.1,
        ),
    )
    
    return ThreatGraphData.model_validate_json(response.text)

def insert_into_neo4j(graph_data: ThreatGraphData):
    with neo4j_driver.session() as session:
        # First pass: Create entities
        for entity in graph_data.entities:
            # Dynamic label injection is safe here since we constrained it in the prompt/schema
            label = ''.join(e for e in entity.type if e.isalnum()) 
            if label not in ["ThreatActor", "Malware", "CVE", "Software"]:
                continue
                
            session.run(
                f"MERGE (n:{label} {{id: $name, name: $name}})",
                name=entity.name
            )
            
        # Second pass: Create relationships
        for rel in graph_data.relationships:
            relation = ''.join(e for e in rel.relation if e.isalnum()).upper()
            if relation not in ["USES", "EXPLOITS", "TARGETS", "AFFECTS"]:
                continue
                
            session.run(
                f"""
                MATCH (s {{name: $source_name}})
                MATCH (t {{name: $target_name}})
                MERGE (s)-[r:{relation}]->(t)
                """,
                source_name=rel.source_name,
                target_name=rel.target_name
            )

def main():
    print("Starting Threat Intel Ingestion Pipeline")
    for feed_url in FEEDS:
        print(f"Parsing feed: {feed_url}")
        feed = feedparser.parse(feed_url)
        
        # Limit to top 20 articles
        for entry in feed.entries[:20]:
            title = entry.title
            summary = entry.get("summary", "")
            text_to_analyze = f"Title: {title}\n\nSummary: {summary}"
            
            print(f"Analyzing: {title}")
            try:
                graph_data = extract_threat_intel(text_to_analyze)
                print(f"   => Found {len(graph_data.entities)} entities and {len(graph_data.relationships)} relationships.")
                insert_into_neo4j(graph_data)
            except Exception as e:
                print(f"   Error extracting/inserting intel: {e}")
            
            time.sleep(4) # Pause to respect free tier rate limits

    print("Ingestion complete.")
    neo4j_driver.close()

if __name__ == "__main__":
    main()
