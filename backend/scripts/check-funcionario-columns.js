const db = require("../src/config/database");

async function run() {
  try {
    const result = await db.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'funcionarios'
       ORDER BY ordinal_position`
    );
    console.table(result.rows);
  } catch (error) {
    console.error("Erro ao listar colunas:", error.message);
  } finally {
    db.pool.end();
  }
}

run();
