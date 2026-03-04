const db = require("../src/config/database");

const CSV_URL =
  "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/refs/heads/master/all/all.csv";

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
  try {
    console.log("📥 Baixando lista ISO 3166...");
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Falha ao baixar CSV: ${response.status}`);
    }
    const text = await response.text();
    const lines = text.trim().split(/\r?\n/);
    const header = parseCsvLine(lines[0]);
    const idxName = header.indexOf("name");
    const idxAlpha2 = header.indexOf("alpha-2");
    const idxRegion = header.indexOf("region");

    if (idxName === -1 || idxAlpha2 === -1) {
      throw new Error("CSV inesperado: colunas não encontradas.");
    }

    await db.query("BEGIN");
    await db.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_paises_codigo_iso ON paises (codigo_iso)"
    );

    let inserted = 0;
    for (let i = 1; i < lines.length; i += 1) {
      const row = parseCsvLine(lines[i]);
      const nome = row[idxName];
      const codigoIso = row[idxAlpha2];
      const continente = idxRegion !== -1 ? row[idxRegion] : null;

      if (!codigoIso || !nome) continue;

      await db.query(
        `INSERT INTO paises (codigo_iso, nome, nome_pt, continente, ativo)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (codigo_iso) DO UPDATE SET
           nome = EXCLUDED.nome,
           nome_pt = EXCLUDED.nome_pt,
           continente = EXCLUDED.continente,
           ativo = true`,
        [codigoIso, nome, nome, continente || null]
      );
      inserted += 1;
    }

    await db.query("COMMIT");
    console.log(`✅ Paises atualizados: ${inserted}`);
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("❌ Erro ao importar paises:", error.message);
  } finally {
    db.pool.end();
  }
}

run();
