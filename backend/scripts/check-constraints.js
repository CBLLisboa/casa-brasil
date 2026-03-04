const db = require("../src/config/database");

async function run() {
  try {
    const result = await db.query(
      "SELECT t.relname AS tabela, c.conname, pg_get_constraintdef(c.oid) AS def " +
        "FROM pg_constraint c " +
        "JOIN pg_class t ON c.conrelid = t.oid " +
        "WHERE t.relname IN ('pessoas', 'documentos', 'atendimentos') " +
        "AND c.contype = 'c' " +
        "ORDER BY t.relname, c.conname"
    );
    console.log(result.rows);
  } catch (error) {
    console.error(error.message);
  } finally {
    db.pool.end();
  }
}

run();
