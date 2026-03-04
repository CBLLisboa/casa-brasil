const db = require("../src/config/database");

async function run() {
  try {
    const pessoa = await db.query(
      "SELECT id, nome_completo, data_nascimento, nacionalidade, genero, email, telefone, concelho, numero_documento, situacao_regular FROM pessoas ORDER BY id DESC LIMIT 1"
    );
    const atendimento = await db.query(
      "SELECT id, beneficiario_id, tipo_atendimento, data_atendimento, descricao, observacoes, funcionario_id, declaracao_data, declaracao_local, declaracao_assinatura FROM atendimentos ORDER BY id DESC LIMIT 1"
    );

    console.log("Ultima pessoa:", pessoa.rows);
    console.log("Ultimo atendimento:", atendimento.rows);
  } catch (error) {
    console.error(error.message);
  } finally {
    db.pool.end();
  }
}

run();
