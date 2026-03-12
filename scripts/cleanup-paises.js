const db = require("../src/config/database");

async function run() {
  try {
    const before = await db.query("SELECT COUNT(*)::int AS total FROM paises");
    const removed = await db.query("DELETE FROM paises WHERE ativo = false");
    const after = await db.query("SELECT COUNT(*)::int AS total FROM paises");

    console.log(`✅ Inativos removidos: ${removed.rowCount}`);
    console.log(`ℹ️ Total antes: ${before.rows[0].total} | depois: ${after.rows[0].total}`);
  } catch (error) {
    console.error("❌ Erro ao limpar paises:", error.message);
  } finally {
    db.pool.end();
  }
}

run();
