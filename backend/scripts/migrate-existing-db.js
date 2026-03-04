const db = require("../src/config/database");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

async function migrateExistingDatabase() {
  console.log("🔄 Migrando banco de dados existente...");

  try {
    // 0. Ajustar coluna beneficiario_id em atendimentos (se necessario)
    const colunasAtendimentos = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'atendimentos';
    `);
    const nomesColunas = colunasAtendimentos.rows.map((c) => c.column_name);

    if (!nomesColunas.includes("beneficiario_id") && nomesColunas.includes("pessoa_id")) {
      await db.query(`
        ALTER TABLE atendimentos
        RENAME COLUMN pessoa_id TO beneficiario_id;
      `);
      console.log("ℹ️ Coluna atendimentos.pessoa_id renomeada para beneficiario_id");
    }

    if (!nomesColunas.includes("beneficiario_id")) {
      await db.query(`
        ALTER TABLE atendimentos
        ADD COLUMN IF NOT EXISTS beneficiario_id INTEGER;
      `);
      console.log("ℹ️ Coluna atendimentos.beneficiario_id criada (sem dados)");
    }

    // 0.5. Garantir tabela usuarios (para autenticação)
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        senha_hash VARCHAR(255),
        tipo VARCHAR(20) DEFAULT 'funcionario',
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS nome VARCHAR(100),
      ADD COLUMN IF NOT EXISTS email VARCHAR(100),
      ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS telefone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'funcionario',
      ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    // 0.6. Garantir dados obrigatórios em usuarios
    const hashPendente = await bcrypt.hash(
      `pendente-${Date.now()}`,
      await bcrypt.genSalt(10)
    );
    await db.query(
      `UPDATE usuarios
       SET
         nome = COALESCE(nome, 'Utilizador pendente'),
         email = COALESCE(email, CONCAT('invalido+', id, '@local')),
         telefone = COALESCE(telefone, ''),
         senha_hash = COALESCE(senha_hash, $1),
         ativo = CASE
           WHEN nome IS NULL OR email IS NULL OR senha_hash IS NULL OR telefone IS NULL THEN false
           ELSE ativo
         END
       WHERE nome IS NULL OR email IS NULL OR senha_hash IS NULL OR telefone IS NULL`,
      [hashPendente]
    );

    await db.query(`
      ALTER TABLE usuarios
      ALTER COLUMN nome SET NOT NULL,
      ALTER COLUMN email SET NOT NULL,
      ALTER COLUMN senha_hash SET NOT NULL,
      ALTER COLUMN telefone SET NOT NULL;
    `);

    // 1. Remover colunas desnecessárias (resolução, agendamento, conclusão, local, prioridade, idioma, tradutor)
    for (const col of [
      "duracao_minutos",
      "resolucao",
      "data_agendamento",
      "data_conclusao",
      "local_atendimento",
      "prioridade",
      "idioma_atendimento",
      "requer_tradutor"
    ]) {
      await db.query(`ALTER TABLE atendimentos DROP COLUMN IF EXISTS ${col}`);
    }

    // 1.1. Adicionar campos de declaracao (se nao existirem)
    await db.query(`
      ALTER TABLE atendimentos
      ADD COLUMN IF NOT EXISTS declaracao_data DATE,
      ADD COLUMN IF NOT EXISTS declaracao_local VARCHAR(150),
      ADD COLUMN IF NOT EXISTS declaracao_assinatura VARCHAR(150);
    `);
    await db.query(`
      ALTER TABLE atendimentos
      ADD COLUMN IF NOT EXISTS itens_entregues TEXT;
    `);
    await db.query(`
      ALTER TABLE atendimentos
      ADD COLUMN IF NOT EXISTS elegivel_npt BOOLEAN;
    `);
    await db.query(`
      ALTER TABLE atendimentos
      ADD COLUMN IF NOT EXISTS atividade_util_integracao BOOLEAN;
    `);
    const colType = await db.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'atendimentos'
      AND column_name = 'atividade_util_integracao'
    `);
    if (colType.rows[0]?.data_type === "boolean") {
      await db.query(`
        ALTER TABLE atendimentos
        ALTER COLUMN atividade_util_integracao TYPE VARCHAR(20)
        USING (
          CASE
            WHEN atividade_util_integracao = true THEN 'sim'
            WHEN atividade_util_integracao = false THEN 'nao'
            ELSE 'nao_avaliou'
          END
        )
      `);
    }
    await db.query(`
      ALTER TABLE atendimentos
      ALTER COLUMN atividade_util_integracao SET DEFAULT 'nao_avaliou'
    `).catch(() => {});

    await db.query(`
      ALTER TABLE atendimentos
      ADD COLUMN IF NOT EXISTS avaliou VARCHAR(20),
      ADD COLUMN IF NOT EXISTS servico_util VARCHAR(20)
    `);
    await db.query(`
      ALTER TABLE atendimentos
      ADD COLUMN IF NOT EXISTS orientacao_profissional BOOLEAN
    `);
    await db.query(`
      ALTER TABLE atendimentos
      ADD COLUMN IF NOT EXISTS modalidade_atendimento VARCHAR(30)
    `);
    await db.query(`
      UPDATE atendimentos
      SET avaliou = CASE
        WHEN atividade_util_integracao = 'nao_avaliou' THEN 'nao_avaliou'
        ELSE 'sim'
      END,
      servico_util = CASE
        WHEN atividade_util_integracao = 'nao_avaliou' THEN NULL
        WHEN atividade_util_integracao = 'sim' THEN 'sim'
        WHEN atividade_util_integracao = 'nao' THEN 'nao'
        ELSE NULL
      END
      WHERE avaliou IS NULL OR avaliou = ''
    `).catch(() => {});

    // 1.2. Garantir colunas basicas em pessoas
    await db.query(`
      ALTER TABLE pessoas
      ADD COLUMN IF NOT EXISTS nome_completo VARCHAR(200),
      ADD COLUMN IF NOT EXISTS data_nascimento DATE,
      ADD COLUMN IF NOT EXISTS naturalidade VARCHAR(100),
      ADD COLUMN IF NOT EXISTS nacionalidade VARCHAR(100),
      ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(50),
      ADD COLUMN IF NOT EXISTS genero VARCHAR(20),
      ADD COLUMN IF NOT EXISTS email VARCHAR(100),
      ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS telefone_alternativo VARCHAR(20),
      ADD COLUMN IF NOT EXISTS cidade_residencia VARCHAR(100),
      ADD COLUMN IF NOT EXISTS morada TEXT,
      ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(20),
      ADD COLUMN IF NOT EXISTS distrito VARCHAR(100),
      ADD COLUMN IF NOT EXISTS concelho VARCHAR(100),
      ADD COLUMN IF NOT EXISTS freguesia VARCHAR(100),
      ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(50),
      ADD COLUMN IF NOT EXISTS profissao VARCHAR(100),
      ADD COLUMN IF NOT EXISTS habilitacoes_literarias VARCHAR(120),
      ADD COLUMN IF NOT EXISTS idioma_origem VARCHAR(100),
      ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(50),
      ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(50),
      ADD COLUMN IF NOT EXISTS documento_emissao DATE,
      ADD COLUMN IF NOT EXISTS documento_validade DATE,
      ADD COLUMN IF NOT EXISTS tipo_visto VARCHAR(80),
      ADD COLUMN IF NOT EXISTS tipo_ar VARCHAR(80),
      ADD COLUMN IF NOT EXISTS situacao_regular VARCHAR(50),
      ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
      ADD COLUMN IF NOT EXISTS rg VARCHAR(20),
      ADD COLUMN IF NOT EXISTS outro_doc_qual VARCHAR(100);
    `);

    // 1.3. Atualizar constraint de tipo de documento (pessoas)
    await db.query(`
      ALTER TABLE pessoas
      DROP CONSTRAINT IF EXISTS pessoas_documento_tipo_check;
    `);
    await db.query(`
      ALTER TABLE pessoas
      ADD CONSTRAINT pessoas_documento_tipo_check CHECK (
        (documento_tipo)::text = ANY (
          ARRAY[
            'Passaporte',
            'Título de Residência',
            'Cartão de cidadão',
            'Visto',
            'Autorização de Residência',
            'Documento de Viagem',
            'Outro',
            'AR PERMANENTE',
            'AR PROVISORIA',
            'AR TEMPORARIA',
            'BI',
            'CARTA DE CONDUCAO',
            'CARTAO DO CIDADAO',
            'CARTAO DE INSCRICAO CONSULAR',
            'CARTAO DE RESIDENCIA',
            'CARTAO DE RESIDENCIA PERMANENTE',
            'CARTAO MNE CID',
            'CERTIFICADO DA UE CRUE',
            'CEDULA/CERTIDAO NASCIMENTO',
            'ESTATUTO DE RESID LONGA DURACAO',
            'PASSAPORTE'
          ]::text[]
        )
      );
    `);

    // 2. Criar tabela de familias (se nao existir)
    await db.query(`
      CREATE TABLE IF NOT EXISTS familias (
        id SERIAL PRIMARY KEY,
        nome_referencia VARCHAR(150),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Adicionar coluna familia_id em pessoas (se nao existir)
    await db.query(`
      ALTER TABLE pessoas
      ADD COLUMN IF NOT EXISTS familia_id INTEGER REFERENCES familias(id);
    `);

    // 4. Criar tabela de parentescos (se nao existir)
    await db.query(`
      CREATE TABLE IF NOT EXISTS parentescos (
        id SERIAL PRIMARY KEY,
        pessoa_id INTEGER REFERENCES pessoas(id) ON DELETE CASCADE,
        parente_id INTEGER REFERENCES pessoas(id) ON DELETE CASCADE,
        grau_parentesco VARCHAR(50) NOT NULL,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_parentesco UNIQUE (pessoa_id, parente_id),
        CONSTRAINT ck_parentesco_diferente CHECK (pessoa_id <> parente_id)
      );
    `);

    // 4.1. Vincular documento a atendimento (se nao existir)
    await db.query(`
      ALTER TABLE documentos
      ADD COLUMN IF NOT EXISTS atendimento_id INTEGER REFERENCES atendimentos(id) ON DELETE SET NULL;
    `);
    await db.query(`
      ALTER TABLE documentos
      ADD COLUMN IF NOT EXISTS pessoa_id INTEGER REFERENCES pessoas(id) ON DELETE CASCADE;
    `);
    await db.query(`
      UPDATE documentos d
      SET pessoa_id = a.beneficiario_id
      FROM atendimentos a
      WHERE d.atendimento_id = a.id
        AND (d.pessoa_id IS NULL OR d.pessoa_id = 0)
        AND a.beneficiario_id IS NOT NULL
    `);
    await db.query(`
      ALTER TABLE documentos
      ADD COLUMN IF NOT EXISTS mimetype VARCHAR(100);
    `);

    // 4.2. Tabela para recuperação de palavra-passe
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_token_hash
      ON password_reset_tokens (token_hash);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_user
      ON password_reset_tokens (user_id);
    `);

    // 5. Indices para relatorios e filtros
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_atendimentos_data
      ON atendimentos (data_atendimento);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_atendimentos_beneficiario
      ON atendimentos (beneficiario_id);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_atendimentos_funcionario
      ON atendimentos (funcionario_id);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_pessoas_genero
      ON pessoas (genero);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_pessoas_data_nascimento
      ON pessoas (data_nascimento);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_pessoas_numero_documento
      ON pessoas (numero_documento);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_pessoas_familia
      ON pessoas (familia_id);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_parentescos_pessoa
      ON parentescos (pessoa_id);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_parentescos_parente
      ON parentescos (parente_id);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_documentos_pessoa
      ON documentos (pessoa_id);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_documentos_atendimento
      ON documentos (atendimento_id);
    `);

    // 6. Views de relatorio (diario, semanal, quinzenal e mensal)
    await db.query(`
      CREATE OR REPLACE VIEW relatorio_atendimentos_base AS
      SELECT
        a.id AS atendimento_id,
        a.data_atendimento,
        date_trunc('day', a.data_atendimento)::date AS dia,
        date_trunc('week', a.data_atendimento)::date AS semana_inicio,
        (date_trunc('month', a.data_atendimento)::date
          + CASE WHEN EXTRACT(day FROM a.data_atendimento) <= 15 THEN 0 ELSE 15 END
        ) AS quinzena_inicio,
        date_trunc('month', a.data_atendimento)::date AS mes_inicio,
        p.genero,
        date_part('year', age(a.data_atendimento, p.data_nascimento))::int AS idade,
        CASE
          WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) < 18 THEN '0-17'
          WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) < 30 THEN '18-29'
          WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) < 45 THEN '30-44'
          WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) < 60 THEN '45-59'
          ELSE '60+'
        END AS faixa_etaria,
        a.tipo_atendimento,
        a.funcionario_id
      FROM atendimentos a
      JOIN pessoas p ON p.id = a.beneficiario_id;
    `);

    await db.query(`
      CREATE OR REPLACE VIEW relatorio_atendimentos_diario AS
      SELECT
        dia AS periodo_inicio,
        (dia + INTERVAL '1 day' - INTERVAL '1 second') AS periodo_fim,
        genero,
        faixa_etaria,
        tipo_atendimento,
        funcionario_id,
        COUNT(*) AS total_atendimentos
      FROM relatorio_atendimentos_base
      GROUP BY dia, genero, faixa_etaria, tipo_atendimento, funcionario_id;
    `);

    await db.query(`
      CREATE OR REPLACE VIEW relatorio_atendimentos_semanal AS
      SELECT
        semana_inicio AS periodo_inicio,
        (semana_inicio + INTERVAL '7 days' - INTERVAL '1 second') AS periodo_fim,
        genero,
        faixa_etaria,
        tipo_atendimento,
        funcionario_id,
        COUNT(*) AS total_atendimentos
      FROM relatorio_atendimentos_base
      GROUP BY semana_inicio, genero, faixa_etaria, tipo_atendimento, funcionario_id;
    `);

    await db.query(`
      CREATE OR REPLACE VIEW relatorio_atendimentos_quinzenal AS
      SELECT
        quinzena_inicio AS periodo_inicio,
        (quinzena_inicio + INTERVAL '15 days' - INTERVAL '1 second') AS periodo_fim,
        genero,
        faixa_etaria,
        tipo_atendimento,
        funcionario_id,
        COUNT(*) AS total_atendimentos
      FROM relatorio_atendimentos_base
      GROUP BY quinzena_inicio, genero, faixa_etaria, tipo_atendimento, funcionario_id;
    `);

    await db.query(`
      CREATE OR REPLACE VIEW relatorio_atendimentos_mensal AS
      SELECT
        mes_inicio AS periodo_inicio,
        (mes_inicio + INTERVAL '1 month' - INTERVAL '1 second') AS periodo_fim,
        genero,
        faixa_etaria,
        tipo_atendimento,
        funcionario_id,
        COUNT(*) AS total_atendimentos
      FROM relatorio_atendimentos_base
      GROUP BY mes_inicio, genero, faixa_etaria, tipo_atendimento, funcionario_id;
    `);

    // 7. Relatorio de verificacao pos-migracao
    const checks = {};

    const tables = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    checks.tables = tables.rows.map((t) => t.table_name);

    const columns = await db.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('pessoas', 'atendimentos');
    `);
    checks.columns = columns.rows;

    const indexes = await db.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'idx_atendimentos_data',
          'idx_atendimentos_beneficiario',
          'idx_pessoas_genero',
          'idx_pessoas_data_nascimento',
          'idx_parentescos_pessoa',
          'idx_parentescos_parente'
        )
      ORDER BY indexname;
    `);
    checks.indexes = indexes.rows;

    const views = await db.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name IN (
          'relatorio_atendimentos_base',
          'relatorio_atendimentos_diario',
          'relatorio_atendimentos_semanal',
          'relatorio_atendimentos_quinzenal',
          'relatorio_atendimentos_mensal'
        )
      ORDER BY table_name;
    `);
    checks.views = views.rows.map((v) => v.table_name);

    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM pessoas) AS total_pessoas,
        (SELECT COUNT(*) FROM atendimentos) AS total_atendimentos,
        (SELECT COUNT(*) FROM documentos) AS total_documentos,
        (SELECT COUNT(*) FROM familias) AS total_familias,
        (SELECT COUNT(*) FROM parentescos) AS total_parentescos;
    `);

    const reportLines = [];
    const timestamp = new Date().toISOString();

    reportLines.push("RELATORIO POS-MIGRACAO");
    reportLines.push(`Data: ${timestamp}`);
    reportLines.push("");
    reportLines.push(`Tabelas: ${checks.tables.join(", ")}`);
    reportLines.push(`Views: ${checks.views.join(", ") || "nenhuma"}`);
    reportLines.push(`Indices: ${checks.indexes.map((i) => i.indexname).join(", ") || "nenhum"}`);
    reportLines.push("Colunas (pessoas/atendimentos):");
    checks.columns.forEach((c) => {
      reportLines.push(` - ${c.table_name}.${c.column_name}`);
    });
    reportLines.push("Totais:");
    reportLines.push(` - pessoas: ${stats.rows[0].total_pessoas}`);
    reportLines.push(` - atendimentos: ${stats.rows[0].total_atendimentos}`);
    reportLines.push(` - documentos: ${stats.rows[0].total_documentos}`);
    reportLines.push(` - familias: ${stats.rows[0].total_familias}`);
    reportLines.push(` - parentescos: ${stats.rows[0].total_parentescos}`);

    const reportText = reportLines.join("\n");
    console.log("✅ Migracao concluida com sucesso!");
    console.log("\n📊 " + reportText);

    const logPath = path.join(__dirname, "migration-report.log");
    fs.appendFileSync(logPath, `${reportText}\n\n`, "utf8");
    console.log(`\n📝 Relatorio salvo em: ${logPath}`);
  } catch (error) {
    console.error("❌ ERRO NA MIGRACAO:", error.message);
    console.error("📌 Detalhes:", error);
    process.exit(1);
  }
}

migrateExistingDatabase();
