const axios = require("axios");
const driver = require("./db");

// 🔍 Extract software from description
function extractSoftware(text) {
  text = text.toLowerCase();

  if (text.includes("apache") || text.includes("httpd")) return "Apache";
  if (text.includes("microsoft") || text.includes("windows")) return "Microsoft";
  if (text.includes("linux") || text.includes("kernel")) return "Linux";
  if (text.includes("oracle") || text.includes("java")) return "Oracle";
  if (text.includes("mysql")) return "MySQL";
  if (text.includes("nginx")) return "Nginx";
  if (text.includes("openssl")) return "OpenSSL";

  return "Unknown";
}

// 📊 Extract CVSS score
function extractCVSS(v) {
  try {
    if (v.cve.metrics.cvssMetricV31) {
      return v.cve.metrics.cvssMetricV31[0].cvssData.baseScore;
    }
    if (v.cve.metrics.cvssMetricV30) {
      return v.cve.metrics.cvssMetricV30[0].cvssData.baseScore;
    }
    if (v.cve.metrics.cvssMetricV2) {
      return v.cve.metrics.cvssMetricV2[0].cvssData.baseScore;
    }
  } catch (e) {}

  return 0;
}

// ⚠️ Convert score → severity level
function getSeverity(score) {
  if (score >= 9) return "Critical";
  if (score >= 7) return "High";
  if (score >= 4) return "Medium";
  if (score > 0) return "Low";
  return "Unknown";
}

// 💾 Insert into Neo4j
async function insertData(id, desc, software, score, severity) {
  const session = driver.session();

  try {
    await session.run(
      `
      MERGE (c:CVE {id: $id})
      SET c.description = $desc,
          c.cvssScore = $score,
          c.severity = $severity

      MERGE (s:Software {name: $software})

      MERGE (c)-[:AFFECTS]->(s)
      `,
      { id, desc, software, score, severity }
    );
  } catch (err) {
    console.error("Insert error:", err);
  } finally {
    await session.close();
  }
}

// 📥 Fetch CVEs from API
async function fetchCVEs() {
  try {
    const res = await axios.get(
      "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=10"
    );

    const vulnerabilities = res.data.vulnerabilities;

    for (const v of vulnerabilities) {
      const id = v.cve.id;
      const desc = v.cve.descriptions[0].value;

      const software = extractSoftware(desc);
      const score = extractCVSS(v);
      const severity = getSeverity(score);

      console.log("Saving:", id, "->", software, "| Score:", score, "|", severity);

      await insertData(id, desc, software, score, severity);
    }

    console.log("✅ All data inserted successfully");
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

// 🚀 Run
fetchCVEs();