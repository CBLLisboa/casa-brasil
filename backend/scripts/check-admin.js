const db = require("../src/config/database");

async function run() {
  try {
    const result = await db.query(
      "SELECT id, nome, email, tipo, ativo FROM usuarios WHERE id = $1",
      [8]
    );
    if (result.rows.length === 0) {
      console.log("Admin id 8 não encontrado.");
    } else {
      console.log("Admin id 8:");
      console.table(result.rows);
    }
  } catch (error) {
    console.error("Erro ao verificar admin:", error.message);
  } finally {
    db.pool.end();
  }
}

run();
