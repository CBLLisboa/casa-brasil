const db = require("../src/config/database");

async function inspecionar() {
  try {
    const result = await db.query(
      "SELECT conname, pg_get_constraintdef(c.oid) AS def " +
        "FROM pg_constraint c " +
        "JOIN pg_class t ON c.conrelid = t.oid " +
        "WHERE t.relname = 'pessoas' AND conname ILIKE '%situacao_regular%'"
    );
    console.log(result.rows);
  } catch (error) {
    console.error(error.message);
  } finally {
    db.pool.end();
  }
}

inspecionar();
