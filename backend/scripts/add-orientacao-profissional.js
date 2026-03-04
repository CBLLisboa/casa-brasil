/**
 * Adiciona a coluna orientacao_profissional à tabela atendimentos.
 * Executar: node scripts/add-orientacao-profissional.js
 */
const db = require("../src/config/database");

async function run() {
  try {
    await db.query(`
      ALTER TABLE atendimentos
      ADD COLUMN IF NOT EXISTS orientacao_profissional BOOLEAN
    `);
    console.log("✅ Coluna orientacao_profissional adicionada (ou já existia).");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro:", err.message);
    process.exit(1);
  }
}

run();
