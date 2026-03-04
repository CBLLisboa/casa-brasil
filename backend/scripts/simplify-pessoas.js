/**
 * Simplifica a tabela pessoas - remove colunas desnecessárias
 * Casa do Brasil - CLAIM Bairro Alto
 *
 * Mantém apenas os dados da ficha de atendimento.
 * Filhos/cônjuge via parentescos e familias (agregado familiar).
 *
 * Executar: node scripts/simplify-pessoas.js
 * Opção --dry-run: apenas lista o que seria feito
 */

const db = require("../src/config/database");

const COLUNAS_REMOVER = [
  "cidade_residencia",
  "documento_tipo",
  "documento_numero",
  "outro_doc_qual",
  "tipo_cliente",
  "cpf",
  "rg",
  "endereco",
  "bairro",
  "estado",
  "cep",
  "escolaridade",
  "renda_familiar",
  "possui_deficiencia",
  "tipo_deficiencia",
  "doencas_cronicas",
  "numero_filhos",
  "pessoas_na_casa",
  "tipo_ajuda",
  // Schema migrate-existing-db / legado
  "nacionalidade_id",
  "nacionalidade_outro",
  "nif",
  "niss",
  "ns",
  "data_entrada_portugal",
  "motivo_imigracao",
  "situacao_profissional",
  "rendimento_mensal",
  "necessidades_especiais",
  "alergias",
  "medicamentos_continuos",
  "grupo_sanguineo",
  "nome_conjuge",
  "filhos_menores",
  "fala_portugues",
  "outras_linguas",
  "ativo",
  "data_cadastro",
  "data_ultima_atualizacao",
  "cadastrado_por",
  "atualizado_por",
  "deletado",
  "deletado_por",
  "data_delecao",
  "tempo_residencia_meses"
];

async function colunaExiste(tabela, coluna) {
  const r = await db.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tabela, coluna]
  );
  return r.rows.length > 0;
}

async function simplifyPessoas() {
  const dryRun = process.argv.includes("--dry-run");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  SIMPLIFICAÇÃO DA TABELA PESSOAS");
  console.log("  Casa do Brasil - CLAIM Bairro Alto");
  if (dryRun) console.log("  [MODO DRY-RUN - nenhuma alteração será feita]");
  console.log("═══════════════════════════════════════════════════════════\n");

  try {
    // 0. Remover apenas triggers custom (auditoria, etc.) - NÃO tocar em RI_ConstraintTrigger
    if (!dryRun) {
      try {
        const triggers = await db.query(`
          SELECT tgname FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          WHERE c.relname = 'pessoas'
            AND t.tgname NOT LIKE 'pg_%'
            AND t.tgname NOT LIKE 'RI_ConstraintTrigger%'
        `);
        for (const tr of triggers.rows || []) {
          await db.query(`DROP TRIGGER IF EXISTS ${tr.tgname} ON pessoas`);
          console.log(`   ✓ Trigger ${tr.tgname} removido`);
        }
      } catch (e) {
        if (!e.message.includes("auditoria_alteracoes")) console.log("   ⚠ Triggers:", e.message);
      }
    }

    // 1. Migrar dados: documento_numero -> numero_documento, documento_tipo -> tipo_documento
    const temDocNumero = await colunaExiste("pessoas", "documento_numero");
    const temDocTipo = await colunaExiste("pessoas", "documento_tipo");

    if (temDocNumero && !dryRun) {
      await db.query(`
        UPDATE pessoas SET numero_documento = documento_numero
        WHERE (numero_documento IS NULL OR TRIM(numero_documento) = '')
          AND documento_numero IS NOT NULL AND TRIM(documento_numero) <> ''
      `);
      console.log("   ✓ Dados de documento_numero migrados para numero_documento");
    }
    if (temDocTipo && !dryRun) {
      await db.query(`
        UPDATE pessoas SET tipo_documento = documento_tipo
        WHERE (tipo_documento IS NULL OR TRIM(tipo_documento) = '')
          AND documento_tipo IS NOT NULL AND TRIM(documento_tipo) <> ''
      `);
      console.log("   ✓ Dados de documento_tipo migrados para tipo_documento");
    }

    // 1.1 Migrar data_cadastro -> criado_em, data_ultima_atualizacao -> atualizado_em
    const temDataCadastro = await colunaExiste("pessoas", "data_cadastro");
    const temCriadoEm = await colunaExiste("pessoas", "criado_em");
    if (temDataCadastro && !temCriadoEm && !dryRun) {
      await db.query(`ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      await db.query(`UPDATE pessoas SET criado_em = data_cadastro WHERE data_cadastro IS NOT NULL`);
      console.log("   ✓ criado_em adicionado (a partir de data_cadastro)");
    }
    const temDataAtualizacao = await colunaExiste("pessoas", "data_ultima_atualizacao");
    const temAtualizadoEm = await colunaExiste("pessoas", "atualizado_em");
    if (temDataAtualizacao && !temAtualizadoEm && !dryRun) {
      await db.query(`ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      await db.query(`UPDATE pessoas SET atualizado_em = data_ultima_atualizacao WHERE data_ultima_atualizacao IS NOT NULL`);
      console.log("   ✓ atualizado_em adicionado (a partir de data_ultima_atualizacao)");
    }
    if (!temCriadoEm && !dryRun) {
      await db.query(`ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    }
    if (!temAtualizadoEm && !dryRun) {
      await db.query(`ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    }
    const temStatus = await colunaExiste("pessoas", "status");
    if (!temStatus && !dryRun) {
      await db.query(`ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ativo'`);
      console.log("   ✓ status adicionado");
    }
    const temCriadoPor = await colunaExiste("pessoas", "criado_por");
    const temCadastradoPor = await colunaExiste("pessoas", "cadastrado_por");
    if (temCadastradoPor && !temCriadoPor && !dryRun) {
      await db.query(`ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS criado_por INTEGER`);
      await db.query(`UPDATE pessoas SET criado_por = cadastrado_por WHERE cadastrado_por IS NOT NULL`);
      console.log("   ✓ criado_por adicionado (a partir de cadastrado_por)");
    } else if (!temCriadoPor && !dryRun) {
      await db.query(`ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS criado_por INTEGER`);
    }

    // 2. Remover colunas
    console.log("\n   Colunas a remover:");
    for (const col of COLUNAS_REMOVER) {
      const existe = await colunaExiste("pessoas", col);
      if (existe) {
        console.log(`   - ${col}`);
        if (!dryRun) {
          try {
            await db.query(`ALTER TABLE pessoas DROP COLUMN IF EXISTS ${col}`);
            console.log(`     ✓ ${col} removida`);
          } catch (e) {
            console.log(`     ⚠ ${col}: ${e.message}`);
          }
        }
      }
    }

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("   Schema simplificado. Colunas mantidas:");
    console.log("   nome_completo, data_nascimento, naturalidade, nacionalidade,");
    console.log("   genero, estado_civil, profissao, habilitacoes_literarias,");
    console.log("   idioma_origem, email, telefone, telefone_alternativo,");
    console.log("   morada, codigo_postal, distrito, concelho, freguesia,");
    console.log("   tipo_documento, numero_documento, documento_emissao, documento_validade,");
    console.log("   situacao_regular, tipo_visto, tipo_ar, familia_id,");
    console.log("   status, observacoes, criado_em, atualizado_em, criado_por");
    console.log("═══════════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

simplifyPessoas();
