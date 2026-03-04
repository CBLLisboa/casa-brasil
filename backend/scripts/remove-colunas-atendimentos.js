/**
 * Remove colunas desnecessárias da tabela atendimentos:
 * resolução, agendamento, conclusão, local, prioridade, idioma, tradutor
 *
 * Executar: node scripts/remove-colunas-atendimentos.js
 */
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "casa_brasil_lisboa",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || ""
});

const COLUNAS_REMOVER = [
  "resolucao",
  "data_agendamento",
  "data_conclusao",
  "local_atendimento",
  "prioridade",
  "idioma_atendimento",
  "requer_tradutor"
];

async function main() {
  const client = await pool.connect();
  try {
    console.log("🔄 Removendo colunas da tabela atendimentos...");

    for (const col of COLUNAS_REMOVER) {
      try {
        await client.query(`ALTER TABLE atendimentos DROP COLUMN IF EXISTS ${col}`);
        console.log(`   ✓ Coluna ${col} removida (ou não existia)`);
      } catch (err) {
        console.warn(`   ⚠ ${col}:`, err.message);
      }
    }

    console.log("✅ Concluído.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
