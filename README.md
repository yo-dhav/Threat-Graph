Cyber Threat Intelligence Graph



A full-stack application that visualizes cybersecurity vulnerabilities and their relationships using a graph-based approach.



\-> Features



\* Fetches real CVE data from NVD API

\* Stores relationships in Neo4j graph database

\* Displays interactive graph visualization

\* Severity-based color coding

\* Search and filtering

\* Node click → detailed vulnerability info



\-> Tech Stack



\* Frontend: React + react-force-graph

\* Backend: Node.js + Express

\* Database: Neo4j



\-> What it does



This project maps:

CVE → AFFECTS → Software



It helps visualize:



\* Which software is most vulnerable

\* Severity distribution

\* Relationships between vulnerabilities



\-> Setup Instructions



Backend:



```bash

cd backend

npm install

node server.js

```



Frontend:



```bash

cd frontend

npm install

npm start

```



