const express = require("express");
const driver = require("./db");
const cors = require("cors");

const app = express();

// ✅ Enable CORS (fixes your error)
app.use(cors());

// 🔹 Root route (test if server is running)
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// 🔹 Get full graph data
app.get("/graph", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (n)-[r]->(m)
      RETURN n, r, m LIMIT 200
    `);

    const data = result.records.map(record => {
      const n = record.get("n");
      const m = record.get("m");
      const r = record.get("r");
      return {
        source: { id: n.properties.id || n.properties.name, label: n.labels[0], ...n.properties },
        target: { id: m.properties.id || m.properties.name, label: m.labels[0], ...m.properties },
        relationship: r.type
      };
    });

    res.json(data);
  } catch (err) {
    console.error("Graph error:", err);
    res.status(500).send("Error fetching graph data");
  } finally {
    await session.close();
  }
});

// 🔹 Get critical vulnerabilities
app.get("/critical", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (c:CVE)
      WHERE c.severity = "Critical"
      RETURN c LIMIT 50
    `);

    const data = result.records.map(r => r.get("c").properties);

    res.json(data);
  } catch (err) {
    console.error("Critical error:", err);
    res.status(500).send("Error fetching critical CVEs");
  } finally {
    await session.close();
  }
});

// 🚀 Start server
const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});