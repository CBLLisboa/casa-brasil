const db = require("../src/config/database");

async function run() {
  try {
    const columns = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'funcionarios' ORDER BY ordinal_position"
    );
    console.log("Colunas funcionarios:", columns.rows.map((c) => c.column_name));
    const result = await db.query("SELECT id FROM funcionarios ORDER BY id LIMIT 1");
    console.log("Funcionario:", result.rows);
  } catch (error) {
    console.error(error.message);
  } finally {
    db.pool.end();
  }
}

run();
