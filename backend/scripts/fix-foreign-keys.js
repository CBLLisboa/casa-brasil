/**
 * Corrige as foreign keys para que todas as tabelas fiquem ligadas no diagrama
 * Casa do Brasil - CLAIM Bairro Alto
 *
 * O sistema usa FUNCIONARIOS para autenticação e para "quem atendeu".
 * USUARIOS e PASSWORD_RESET_TOKENS eram do setup antigo.
 *
 * Este script:
 * 1. Liga atendimentos.funcionario_id -> funcionarios(id)
 * 2. Liga password_reset_tokens.user_id -> usuarios(id)
 *
 * Executar: node scripts/fix-foreign-keys.js
 */

const db = require("../src/config/database");

async function fixForeignKeys() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  CORREÇÃO DE FOREIGN KEYS");
  console.log("  Casa do Brasil - CLAIM Bairro Alto");
  console.log("═══════════════════════════════════════════════════════════\n");

  try {
    // Verificar se funcionarios existe
    const temFuncionarios = await db.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'funcionarios'
    `);
    if (temFuncionarios.rows.length === 0) {
      console.log("⚠ Tabela funcionarios não existe. Nada a fazer.");
      await db.pool.end();
      return;
    }

    // 1. atendimentos.funcionario_id -> funcionarios(id)
    const fkAtend = await db.query(`
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'atendimentos' AND c.contype = 'f'
        AND c.confrelid = (SELECT oid FROM pg_class WHERE relname = 'funcionarios')
    `);
    if (fkAtend.rows.length === 0) {
      const orfaos = await db.query(`
        SELECT COUNT(*) AS n FROM atendimentos a
        WHERE a.funcionario_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM funcionarios f WHERE f.id = a.funcionario_id)
      `);
      if (parseInt(orfaos.rows[0]?.n, 10) > 0) {
        console.log("   ⚠ atendimentos: existem funcionario_id que não existem em funcionarios. FK não adicionada.");
      } else {
        try {
          await db.query(`
            ALTER TABLE atendimentos
            ADD CONSTRAINT fk_atendimentos_funcionario
            FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
          `);
          console.log("   ✓ atendimentos.funcionario_id -> funcionarios(id)");
        } catch (e) {
          console.log("   ⚠ atendimentos:", e.message);
        }
      }
    } else {
      console.log("   - atendimentos já tem FK para funcionarios");
    }

    // 2. password_reset_tokens: manter user_id -> usuarios (setup original)
    //    Nota: o auth usa funcionarios.reset_token. password_reset_tokens é tabela alternativa.
    // Verificar se password_reset_tokens tem FK para usuarios
    const temToken = await db.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
    `);
    let fkToken = { rows: [] };
    if (temToken.rows.length > 0) {
      fkToken = await db.query(`
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND constraint_type = 'FOREIGN KEY'
      `);
    }
    const temUsuarios = await db.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'usuarios'
    `);
    if (temToken.rows.length > 0 && temUsuarios.rows.length > 0 && fkToken.rows.length === 0) {
      try {
        await db.query(`
          ALTER TABLE password_reset_tokens
          ADD CONSTRAINT fk_password_reset_usuarios
          FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
        `);
        console.log("   ✓ password_reset_tokens.user_id -> usuarios(id)");
      } catch (e) {
        console.log("   ⚠ password_reset_tokens:", e.message);
      }
    } else if (temToken.rows.length > 0 && fkToken.rows.length > 0) {
      console.log("   - password_reset_tokens já tem FK");
    }

    // 3. usuarios: garantir que pessoas e documentos podem referenciar
    //    Se quiser ligar a funcionarios, seria necessário migrar os dados.
    //    Por agora, usuarios fica como tabela auxiliar (login alternativo).

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("   Diagrama atual:");
    console.log("   • atendimentos -> pessoas (beneficiario_id)");
    console.log("   • atendimentos -> funcionarios (funcionario_id)");
    console.log("   • documentos -> pessoas (pessoa_id)");
    console.log("   • documentos -> atendimentos (atendimento_id)");
    console.log("   • pessoas -> familias (familia_id)");
    console.log("   • parentescos -> pessoas (pessoa_id, parente_id)");
    console.log("   • password_reset_tokens -> usuarios (user_id)");
    console.log("   • usuarios: referenciada por password_reset_tokens");
    console.log("═══════════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

fixForeignKeys();
