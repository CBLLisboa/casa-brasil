const db = require("../src/config/database");

async function run() {
  try {
    const colunasUsuarios = await db.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'usuarios'
       ORDER BY ordinal_position`
    );
    const colunasTokens = await db.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'password_reset_tokens'
       ORDER BY ordinal_position`
    );
    const indices = await db.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename IN ('usuarios', 'password_reset_tokens')
       ORDER BY tablename, indexname`
    );

    console.log("=== usuarios ===");
    console.table(colunasUsuarios.rows);
    console.log("=== password_reset_tokens ===");
    console.table(colunasTokens.rows);
    console.log("=== indices ===");
    console.table(indices.rows);
  } catch (error) {
    console.error("Erro ao verificar schema:", error.message);
  } finally {
    db.pool.end();
  }
}

run();
