const db = require("../src/config/database");

async function run() {
  try {
    const result = await db.query(
      "SELECT id, codigo, nome_completo, email, cargo, telefone, ativo, nivel_acesso FROM funcionarios WHERE id = $1",
      [8]
    );
    if (result.rows.length === 0) {
      console.log("Funcionario id 8 não encontrado.");
    } else {
      console.log("Funcionario id 8:");
      console.table(result.rows);
    }
  } catch (error) {
    console.error("Erro ao verificar funcionario:", error.message);
  } finally {
    db.pool.end();
  }
}

run();
