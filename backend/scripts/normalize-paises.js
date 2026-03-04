const db = require("../src/config/database");

async function run() {
  try {
    await db.query("BEGIN");

    // Remover espaços extras
    await db.query(
      "UPDATE paises SET nome = TRIM(nome), nome_pt = TRIM(nome_pt) WHERE nome IS NOT NULL OR nome_pt IS NOT NULL"
    );

    // Preencher nome_pt quando estiver vazio
    await db.query(
      "UPDATE paises SET nome_pt = nome WHERE (nome_pt IS NULL OR TRIM(nome_pt) = '') AND nome IS NOT NULL"
    );

    // Garantir ativo true quando nulo
    await db.query("UPDATE paises SET ativo = true WHERE ativo IS NULL");

    await db.query("COMMIT");
    console.log("✅ Normalizacao concluida.");
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("❌ Erro ao normalizar paises:", error.message);
  } finally {
    db.pool.end();
  }
}

run();
