const db = require("../src/config/database");

async function run() {
  try {
    await db.query("BEGIN");
    await db.query("DROP TABLE IF EXISTS freguesias_ref");
    await db.query("DROP TABLE IF EXISTS concelhos_ref");
    await db.query("DROP TABLE IF EXISTS distritos_ref");
    await db.query("COMMIT");
    console.log("✅ Tabelas de localidades removidas.");
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("❌ Erro ao remover localidades:", error.message);
  } finally {
    db.pool.end();
  }
}

run();
