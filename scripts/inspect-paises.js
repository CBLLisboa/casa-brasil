const db = require("../src/config/database");

async function run() {
  try {
    const columns = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'paises' ORDER BY ordinal_position"
    );
    console.log("Colunas paises:", columns.rows.map((c) => c.column_name));
    const sample = await db.query("SELECT * FROM paises ORDER BY 1 LIMIT 3");
    console.log("Amostra:", sample.rows);
  } catch (error) {
    console.error(error.message);
  } finally {
    db.pool.end();
  }
}

run();
