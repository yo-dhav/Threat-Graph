from neo4j import GraphDatabase
driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password"))
with driver.session() as session:
    res = session.run("MATCH (n) RETURN labels(n)[0] as label, count(n) as count")
    for r in res:
        print(f"{r['label']}: {r['count']}")
