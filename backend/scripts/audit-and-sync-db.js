/**
 * Script de auditoria e sincronização da base de dados
 * Casa do Brasil - CLAIM Bairro Alto
 *
 * Garante conformidade entre:
 * - Schema da base de dados
 * - Interface web (formulários, relatórios)
 * - Critérios FAMI e auditorias
 *
 * Executar: node scripts/audit-and-sync-db.js
 */

const db = require("../src/config/database");

const PESSOAS_COLUNAS_REQUERIDAS = [
  { nome: "nome_completo", tipo: "VARCHAR(200)", obrigatorio: true },
  { nome: "data_nascimento", tipo: "DATE", obrigatorio: true },
  { nome: "naturalidade", tipo: "VARCHAR(100)", obrigatorio: true },
  { nome: "nacionalidade", tipo: "VARCHAR(100)", obrigatorio: true },
  { nome: "email", tipo: "VARCHAR(100)", obrigatorio: true },
  { nome: "telefone", tipo: "VARCHAR(30)", obrigatorio: true },
  { nome: "morada", tipo: "TEXT", obrigatorio: true },
  { nome: "genero", tipo: "VARCHAR(20)", obrigatorio: false },
  { nome: "estado_civil", tipo: "VARCHAR(50)", obrigatorio: false },
  { nome: "profissao", tipo: "VARCHAR(100)", obrigatorio: false },
  { nome: "habilitacoes_literarias", tipo: "VARCHAR(120)", obrigatorio: false },
  { nome: "idioma_origem", tipo: "VARCHAR(100)", obrigatorio: false },
  { nome: "telefone_alternativo", tipo: "VARCHAR(30)", obrigatorio: false },
  { nome: "codigo_postal", tipo: "VARCHAR(20)", obrigatorio: false },
  { nome: "distrito", tipo: "VARCHAR(100)", obrigatorio: false },
  { nome: "concelho", tipo: "VARCHAR(100)", obrigatorio: false },
  { nome: "freguesia", tipo: "VARCHAR(100)", obrigatorio: false },
  { nome: "tipo_documento", tipo: "VARCHAR(50)", obrigatorio: false },
  { nome: "numero_documento", tipo: "VARCHAR(50)", obrigatorio: false },
  { nome: "documento_emissao", tipo: "DATE", obrigatorio: false },
  { nome: "documento_validade", tipo: "DATE", obrigatorio: false },
  { nome: "tipo_visto", tipo: "VARCHAR(80)", obrigatorio: false },
  { nome: "tipo_ar", tipo: "VARCHAR(80)", obrigatorio: false },
  { nome: "situacao_regular", tipo: "VARCHAR(50)", obrigatorio: false },
  { nome: "familia_id", tipo: "INTEGER", obrigatorio: false }
];

const ATENDIMENTOS_COLUNAS_REQUERIDAS = [
  { nome: "beneficiario_id", tipo: "INTEGER", obrigatorio: true },
  { nome: "modalidade_atendimento", tipo: "VARCHAR(30)", obrigatorio: true },
  { nome: "tipo_atendimento", tipo: "VARCHAR(100)", obrigatorio: true },
  { nome: "data_atendimento", tipo: "DATE", obrigatorio: true },
  { nome: "funcionario_id", tipo: "INTEGER", obrigatorio: false },
  { nome: "declaracao_data", tipo: "DATE", obrigatorio: false },
  { nome: "declaracao_local", tipo: "VARCHAR(150)", obrigatorio: false },
  { nome: "declaracao_assinatura", tipo: "VARCHAR(150)", obrigatorio: false },
  { nome: "descricao", tipo: "TEXT", obrigatorio: false },
  { nome: "observacoes", tipo: "TEXT", obrigatorio: false },
  { nome: "itens_entregues", tipo: "TEXT", obrigatorio: false },
  { nome: "elegivel_npt", tipo: "BOOLEAN", obrigatorio: false },
  { nome: "orientacao_profissional", tipo: "BOOLEAN", obrigatorio: false },
  { nome: "avaliou", tipo: "VARCHAR(20)", obrigatorio: false },
  { nome: "servico_util", tipo: "VARCHAR(20)", obrigatorio: false },
  { nome: "criado_em", tipo: "TIMESTAMP", obrigatorio: false }
];

const DOCUMENTOS_COLUNAS_REQUERIDAS = [
  { nome: "pessoa_id", tipo: "INTEGER", obrigatorio: false },
  { nome: "atendimento_id", tipo: "INTEGER", obrigatorio: false },
  { nome: "tipo_documento", tipo: "VARCHAR(50)", obrigatorio: true },
  { nome: "nome_arquivo", tipo: "VARCHAR(255)", obrigatorio: true },
  { nome: "caminho_arquivo", tipo: "VARCHAR(500)", obrigatorio: true },
  { nome: "tamanho_bytes", tipo: "BIGINT", obrigatorio: false },
  { nome: "mimetype", tipo: "VARCHAR(100)", obrigatorio: false },
  { nome: "criado_em", tipo: "TIMESTAMP", obrigatorio: false }
];

async function getColunasExistentes(tabela) {
  const r = await db.query(`
    SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tabela]);
  return r.rows;
}

async function colunaExiste(tabela, coluna) {
  const cols = await getColunasExistentes(tabela);
  return cols.some((c) => c.column_name === coluna);
}

async function adicionarColunaSeFaltar(tabela, coluna, tipo) {
  const existe = await colunaExiste(tabela, coluna);
  if (!existe) {
    const tipoMap = {
      INTEGER: "INTEGER",
      TEXT: "TEXT",
      DATE: "DATE",
      BOOLEAN: "BOOLEAN",
      BIGINT: "BIGINT",
      TIMESTAMP: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    };
    const tipoSql = tipoMap[tipo] || tipo;
    try {
      await db.query(`
        ALTER TABLE ${tabela}
        ADD COLUMN IF NOT EXISTS ${coluna} ${tipoSql}
      `);
      return true;
    } catch (e) {
      console.warn(`  ⚠️ Não foi possível adicionar ${tabela}.${coluna}:`, e.message);
      return false;
    }
  }
  return false;
}

async function garantirTabelaExiste(nome, createSql) {
  const r = await db.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = $1
  `, [nome]);
  if (r.rows.length === 0) {
    await db.query(createSql);
    return true;
  }
  return false;
}

async function executarAuditoria() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  AUDITORIA E SINCRONIZAÇÃO DA BASE DE DADOS");
  console.log("  Casa do Brasil - CLAIM Bairro Alto");
  console.log("═══════════════════════════════════════════════════════════\n");

  const alteracoes = [];
  const avisos = [];

  try {
    // 1. PESSOAS
    console.log("📋 Tabela PESSOAS");
    const colsPessoas = await getColunasExistentes("pessoas");
    const nomesPessoas = colsPessoas.map((c) => c.column_name);

    for (const col of PESSOAS_COLUNAS_REQUERIDAS) {
      if (!nomesPessoas.includes(col.nome)) {
        const add = await adicionarColunaSeFaltar("pessoas", col.nome, col.tipo);
        if (add) {
          alteracoes.push(`pessoas.${col.nome} adicionada`);
        }
      }
    }

    if (!nomesPessoas.includes("morada")) {
      avisos.push("pessoas: coluna 'morada' obrigatória. Execute setup ou simplify-pessoas.");
    }

    console.log(`   Colunas atuais: ${colsPessoas.length}`);
    console.log("   ✓ Conformidade verificada\n");

    // 2. ATENDIMENTOS
    console.log("📋 Tabela ATENDIMENTOS");
    const colsAtend = await getColunasExistentes("atendimentos");
    const nomesAtend = colsAtend.map((c) => c.column_name);

    for (const col of ATENDIMENTOS_COLUNAS_REQUERIDAS) {
      if (!nomesAtend.includes(col.nome)) {
        const add = await adicionarColunaSeFaltar("atendimentos", col.nome, col.tipo);
        if (add) {
          alteracoes.push(`atendimentos.${col.nome} adicionada`);
        }
      }
    }

    if (!nomesAtend.includes("beneficiario_id") && nomesAtend.includes("pessoa_id")) {
      await db.query(`ALTER TABLE atendimentos RENAME COLUMN pessoa_id TO beneficiario_id`);
      alteracoes.push("atendimentos.pessoa_id renomeada para beneficiario_id");
    }

    console.log(`   Colunas atuais: ${colsAtend.length}`);
    console.log("   ✓ Conformidade verificada\n");

    // 3. DOCUMENTOS
    console.log("📋 Tabela DOCUMENTOS");
    const colsDocs = await getColunasExistentes("documentos");
    const nomesDocs = colsDocs.map((c) => c.column_name);

    for (const col of DOCUMENTOS_COLUNAS_REQUERIDAS) {
      if (!nomesDocs.includes(col.nome)) {
        const add = await adicionarColunaSeFaltar("documentos", col.nome, col.tipo);
        if (add) {
          alteracoes.push(`documentos.${col.nome} adicionada`);
        }
      }
    }

    if (!nomesDocs.includes("atendimento_id")) {
      await db.query(`
        ALTER TABLE documentos
        ADD COLUMN IF NOT EXISTS atendimento_id INTEGER REFERENCES atendimentos(id) ON DELETE SET NULL
      `);
      alteracoes.push("documentos.atendimento_id adicionada");
    }
    if (!nomesDocs.includes("pessoa_id")) {
      await db.query(`
        ALTER TABLE documentos
        ADD COLUMN IF NOT EXISTS pessoa_id INTEGER REFERENCES pessoas(id) ON DELETE CASCADE
      `);
      alteracoes.push("documentos.pessoa_id adicionada");
    }

    console.log(`   Colunas atuais: ${colsDocs.length}`);
    console.log("   ✓ Conformidade verificada\n");

    // 4. ÍNDICES
    console.log("📋 Índices");
    const indices = [
      ["idx_atendimentos_beneficiario", "atendimentos(beneficiario_id)"],
      ["idx_atendimentos_data", "atendimentos(data_atendimento)"],
      ["idx_atendimentos_funcionario", "atendimentos(funcionario_id)"],
      ["idx_pessoas_genero", "pessoas(genero)"],
      ["idx_pessoas_data_nascimento", "pessoas(data_nascimento)"],
      ["idx_pessoas_numero_documento", "pessoas(numero_documento)"],
      ["idx_documentos_pessoa", "documentos(pessoa_id)"],
      ["idx_documentos_atendimento", "documentos(atendimento_id)"]
    ];

    for (const [nome, tabelaCol] of indices) {
      const [tabela] = tabelaCol.split("(");
      const r = await db.query(`
        SELECT 1 FROM pg_indexes WHERE indexname = $1
      `, [nome]);
      if (r.rows.length === 0) {
        const col = tabelaCol.match(/\((\w+)\)/)?.[1];
        await db.query(`CREATE INDEX IF NOT EXISTS ${nome} ON ${tabela} (${col})`);
        alteracoes.push(`Índice ${nome} criado`);
      }
    }
    console.log("   ✓ Índices verificados\n");

    // 5. Resumo
    console.log("═══════════════════════════════════════════════════════════");
    if (alteracoes.length > 0) {
      console.log("   ALTERAÇÕES REALIZADAS:");
      alteracoes.forEach((a) => console.log(`   • ${a}`));
    } else {
      console.log("   ✓ Nenhuma alteração necessária. Base em conformidade.");
    }
    if (avisos.length > 0) {
      console.log("\n   AVISOS:");
      avisos.forEach((a) => console.log(`   ⚠ ${a}`));
    }
    console.log("═══════════════════════════════════════════════════════════\n");
    console.log("🎉 Auditoria concluída.");

  } catch (error) {
    console.error("❌ Erro na auditoria:", error.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

executarAuditoria();
