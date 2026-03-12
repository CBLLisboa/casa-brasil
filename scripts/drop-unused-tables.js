/**
 * Remove tabelas e views desnecessárias da base de dados
 * Casa do Brasil - CLAIM Bairro Alto
 *
 * MANTÉM: pessoas, atendimentos, documentos, familias, parentescos,
 *         funcionarios, usuarios, paises, password_reset_tokens,
 *         relatorio_atendimentos_* (views usadas nos relatórios)
 *
 * REMOVE: tabelas e views não utilizadas pela aplicação atual
 *
 * Executar: node scripts/drop-unused-tables.js
 * ATENÇÃO: Operação irreversível. Faça backup antes.
 */

const db = require("../src/config/database");

const VIEWS_A_REMOVER = [
  "vw_atendimentos_por_mes",
  "vw_atendimentos_simples",
  "vw_dashboard_basico",
  "vw_funcionarios_ativos",
  "vw_lista_pessoas",
  "vw_relatorio_diario_atendimentos"
];

const TABELAS_A_REMOVER = [
  "acompanhamentos_sociais",
  "agendamentos",
  "auditoria_alteracoes",
  "cursos_formacoes",
  "familia_membros",
  "grupos_familiares",
  "indicadores_fami",
  "logs_acesso",
  "parentesco",
  "registros_indicadores",
  "tipos_atendimento"
];

async function dropUnused() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  REMOÇÃO DE TABELAS E VIEWS DESNECESSÁRIAS");
  console.log("  Casa do Brasil - CLAIM Bairro Alto");
  console.log("═══════════════════════════════════════════════════════════\n");

  try {
    // 1. Remover views primeiro (podem depender de tabelas)
    console.log("📋 Removendo views não utilizadas...");
    for (const view of VIEWS_A_REMOVER) {
      try {
        await db.query(`DROP VIEW IF EXISTS ${view} CASCADE`);
        console.log(`   ✓ ${view} removida`);
      } catch (e) {
        if (e.message.includes("does not exist")) {
          console.log(`   - ${view} (não existia)`);
        } else {
          console.warn(`   ⚠ ${view}:`, e.message);
        }
      }
    }

    // 2. Remover tabelas (CASCADE para dependências)
    console.log("\n📋 Removendo tabelas não utilizadas...");
    for (const tabela of TABELAS_A_REMOVER) {
      try {
        await db.query(`DROP TABLE IF EXISTS ${tabela} CASCADE`);
        console.log(`   ✓ ${tabela} removida`);
      } catch (e) {
        if (e.message.includes("does not exist")) {
          console.log(`   - ${tabela} (não existia)`);
        } else {
          console.warn(`   ⚠ ${tabela}:`, e.message);
        }
      }
    }

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("   ✓ Remoção concluída.");
    console.log("   Tabelas mantidas: pessoas, atendimentos, documentos,");
    console.log("   familias, parentescos, funcionarios, usuarios, paises,");
    console.log("   password_reset_tokens + views relatorio_atendimentos_*");
    console.log("═══════════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

dropUnused();
