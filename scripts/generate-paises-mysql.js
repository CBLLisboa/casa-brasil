/**
 * Gera paises-mysql.sql a partir do CSV ISO 3166
 * Execute: node scripts/generate-paises-mysql.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const CSV_URL =
  "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv";

function escapeSql(str) {
  if (str == null || str === "") return "NULL";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function run() {
  console.log("📥 Baixando CSV ISO 3166...");
  const resp = await new Promise((resolve, reject) => {
    https.get(CSV_URL, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });

  const lines = resp.trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const idxName = header.indexOf("name");
  const idxAlpha2 = header.indexOf("alpha-2");
  const idxRegion = header.indexOf("region");

  if (idxName === -1 || idxAlpha2 === -1) {
    throw new Error("CSV inesperado");
  }

  const inserts = [];
  for (let i = 1; i < lines.length; i += 1) {
    const row = parseCsvLine(lines[i]);
    const nome = row[idxName];
    const codigoIso = row[idxAlpha2];
    const continente = idxRegion !== -1 ? row[idxRegion] : null;
    if (!codigoIso || !nome) continue;
    inserts.push(
      `  (${escapeSql(codigoIso)}, ${escapeSql(nome)}, ${escapeSql(nome)}, ${escapeSql(continente)}, 1)`
    );
  }

  const sql = `-- ===========================================
-- Casa do Brasil - Todos os países (ISO 3166)
-- Execute no phpMyAdmin APÓS o setup-mysql.sql
-- ===========================================

INSERT IGNORE INTO paises (codigo_iso, nome, nome_pt, continente, ativo)
VALUES
${inserts.join(",\n")};
`;

  const outPath = path.join(__dirname, "paises-mysql.sql");
  fs.writeFileSync(outPath, sql, "utf8");
  console.log(`✅ Gerado: ${outPath} (${inserts.length} países)`);
}

run().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
