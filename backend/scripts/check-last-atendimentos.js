const db = require("../src/config/database");

async function run() {
  try {
    const result = await db.query(
      `SELECT a.id, a.data_atendimento, a.tipo_atendimento, a.criado_em,
              p.nome_completo, f.nome_completo AS tecnico
       FROM atendimentos a
       JOIN pessoas p ON p.id = a.beneficiario_id
       LEFT JOIN funcionarios f ON f.id = a.funcionario_id
       ORDER BY a.id DESC
       LIMIT 5`
    );
    console.table(result.rows);
  } catch (error) {
    console.error("Erro ao verificar atendimentos:", error.message);
  } finally {
    db.pool.end();
  }
}

run();
