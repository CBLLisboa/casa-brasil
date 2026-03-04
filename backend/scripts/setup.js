const db = require("../src/config/database");

async function setupDatabase() {
  console.log("🔄 Configurando banco de dados da Casa do Brasil...");
  
  try {
    // 1. Criar tabela de usuários (funcionários do sistema)
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        telefone VARCHAR(30) NOT NULL,
        tipo VARCHAR(20) DEFAULT 'funcionario',
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabela 'usuarios' criada/verificada");

    // 1.1. Tabela para recuperação de palavra-passe
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
    console.log("✅ Tabela 'password_reset_tokens' criada/verificada");
    
    // 2. Criar tabela de pessoas (beneficiários - FICHA DE ATENDIMENTO)
    // Apenas dados da ficha. Filhos/cônjuge via parentescos e familias (agregado familiar).
    await db.query(`
      CREATE TABLE IF NOT EXISTS pessoas (
        id SERIAL PRIMARY KEY,
        -- IDENTIFICAÇÃO
        nome_completo VARCHAR(200) NOT NULL,
        data_nascimento DATE NOT NULL,
        naturalidade VARCHAR(100),
        nacionalidade VARCHAR(100) NOT NULL,
        genero VARCHAR(20),
        estado_civil VARCHAR(50),
        profissao VARCHAR(100),
        habilitacoes_literarias VARCHAR(120),
        idioma_origem VARCHAR(100),
        -- CONTACTO
        email VARCHAR(100),
        telefone VARCHAR(30),
        telefone_alternativo VARCHAR(30),
        -- MORADA
        morada TEXT,
        codigo_postal VARCHAR(20),
        distrito VARCHAR(100),
        concelho VARCHAR(100),
        freguesia VARCHAR(100),
        -- DOCUMENTAÇÃO
        tipo_documento VARCHAR(50),
        numero_documento VARCHAR(50),
        documento_emissao DATE,
        documento_validade DATE,
        situacao_regular VARCHAR(50),
        tipo_visto VARCHAR(80),
        tipo_ar VARCHAR(80),
        -- CONTROLE
        status VARCHAR(20) DEFAULT 'ativo',
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        criado_por INTEGER REFERENCES usuarios(id)
      );
    `);
    console.log("✅ Tabela 'pessoas' criada/verificada (Ficha de Atendimento)");
    
    // 3. Criar tabela de atendimentos
    await db.query(`
      CREATE TABLE IF NOT EXISTS atendimentos (
        id SERIAL PRIMARY KEY,
        beneficiario_id INTEGER REFERENCES pessoas(id) ON DELETE CASCADE,
        modalidade_atendimento VARCHAR(30),
        tipo_atendimento VARCHAR(100) NOT NULL,
        data_atendimento DATE NOT NULL DEFAULT CURRENT_DATE,
        declaracao_data DATE,
        declaracao_local VARCHAR(150),
        declaracao_assinatura VARCHAR(150),
        descricao TEXT,
        observacoes TEXT,
        itens_entregues TEXT,
        funcionario_id INTEGER REFERENCES usuarios(id),
        elegivel_npt BOOLEAN,
        orientacao_profissional BOOLEAN,
        avaliou VARCHAR(20),
        servico_util VARCHAR(20),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Garantir colunas de relatório FAMI (caso a tabela já exista)
    await db.query(`
      ALTER TABLE atendimentos
      ADD COLUMN IF NOT EXISTS elegivel_npt BOOLEAN,
      ADD COLUMN IF NOT EXISTS orientacao_profissional BOOLEAN,
      ADD COLUMN IF NOT EXISTS avaliou VARCHAR(20),
      ADD COLUMN IF NOT EXISTS servico_util VARCHAR(20);
    `);
    console.log("✅ Tabela 'atendimentos' criada/verificada");
    
    // Remover colunas desnecessárias (se existirem)
    // Resolução: sempre "resolvida" quando a pessoa foi atendida
    // Agendamento: não existe - atendimentos por ordem de chegada
    // Conclusão: igual à resolução - atendimento concluído ao preencher assunto
    // Local: sempre CLAIM Bairro Alto | Prioridade/idioma/tradutor: não utilizados
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
    
    // 4. Criar tabela de documentos (RGPD, cópias de documentos)
    await db.query(`
      CREATE TABLE IF NOT EXISTS documentos (
        id SERIAL PRIMARY KEY,
        pessoa_id INTEGER REFERENCES pessoas(id) ON DELETE CASCADE,
        atendimento_id INTEGER REFERENCES atendimentos(id) ON DELETE SET NULL,
        tipo_documento VARCHAR(50) NOT NULL,
        nome_arquivo VARCHAR(255) NOT NULL,
        caminho_arquivo VARCHAR(500) NOT NULL,
        tamanho_bytes BIGINT,
        mimetype VARCHAR(100),
        criado_por INTEGER REFERENCES usuarios(id),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabela 'documentos' criada/verificada");

    // 4.1. Criar tabela de familias para agrupar pessoas relacionadas
    await db.query(`
      CREATE TABLE IF NOT EXISTS familias (
        id SERIAL PRIMARY KEY,
        nome_referencia VARCHAR(150),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabela 'familias' criada/verificada");

    // 4.2. Vincular pessoas a uma familia (agregado familiar - filhos/cônjuge via documento do titular)
    await db.query(`
      ALTER TABLE pessoas
      ADD COLUMN IF NOT EXISTS familia_id INTEGER REFERENCES familias(id);
    `);

    // 4.3. Relacionar pessoas pelo grau de parentesco
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
    console.log("✅ Tabela 'parentescos' criada/verificada");

    // 4.4. Indices para relatorios e filtros por data, genero e idade
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

    // 4.5. Views de relatorio (diario, semanal, quinzenal e mensal)
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
    console.log("✅ Views de relatorio criadas/verificadas");
    
    // 5. Inserir usuário admin padrão (senha: admin123)
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash("admin123", salt);
    
    await db.query(`
      INSERT INTO usuarios (nome, email, senha_hash, telefone, tipo) 
      VALUES 
        ('Administrador', 'admin@casabrasil.pt', $1, '', 'admin'),
        ('Funcionário Teste', 'funcionario@casabrasil.pt', $1, '', 'funcionario')
      ON CONFLICT (email) DO NOTHING;
    `, [adminPassword]);
    
    console.log("✅ Usuários padrão configurados:");
    console.log("   👑 Admin: admin@casabrasil.pt / admin123");
    console.log("   👤 Funcionário: funcionario@casabrasil.pt / admin123");
    
    // 6. Verificar tabelas criadas
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log("\n📊 TABELAS NO BANCO DE DADOS:");
    tables.rows.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
    
    console.log("\n🎉 SETUP CONCLUÍDO COM SUCESSO!");
    console.log("🔄 O sistema está pronto para uso.");
    
  } catch (error) {
    console.error("❌ ERRO NO SETUP:", error.message);
    console.error("📌 Detalhes:", error);
    process.exit(1);
  }
}

// Executar setup
setupDatabase();
