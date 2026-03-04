const db = require("../config/database");

function obterInteiro(valor) {
  if (!valor) return null;
  const convertido = Number.parseInt(valor, 10);
  return Number.isNaN(convertido) ? null : convertido;
}

function normalizarTextoBase(valor) {
  if (!valor || !valor.trim) return "";
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarGenero(valor) {
  if (!valor || !valor.trim()) return "";
  const base = normalizarTextoBase(valor);
  const mapa = {
    feminino: "Feminino",
    masculino: "Masculino",
    "nao binario": "Não binário",
    "nao quero informar": "Não quero informar",
    outro: "Outro"
  };
  return mapa[base] || valor.trim();
}

function normalizarEstadoCivil(valor) {
  if (!valor || !valor.trim()) return "";
  const base = normalizarTextoBase(valor);
  const mapa = {
    "solteiro(a)": "Solteiro(a)",
    "casado(a)": "Casado(a)",
    "divorciado(a)": "Divorciado(a)",
    "viuvo(a)": "Viúvo(a)",
    "uniao de facto": "União de facto",
    "separado(a)": "Separado(a)",
    outro: "Outro"
  };
  return mapa[base] || valor.trim();
}

function normalizarDocumentoPessoa(valor) {
  if (!valor || !valor.trim()) return "";
  const base = normalizarTextoBase(valor);
  const mapa = {
    passaporte: "Passaporte",
    "titulo de residencia": "Título de Residência",
    "cartao de cidadao": "Cartão de cidadão",
    visto: "Visto",
    "autorizacao de residencia": "Autorização de Residência",
    "documento de viagem": "Documento de Viagem",
    outro: "Outro",
    "ar permanente": "AR PERMANENTE",
    "ar provisoria": "AR PROVISORIA",
    "ar temporaria": "AR TEMPORARIA",
    bi: "BI",
    "carta de conducao": "CARTA DE CONDUCAO",
    "cartao do cidadao": "CARTAO DO CIDADAO",
    "cartao de inscricao consular": "CARTAO DE INSCRICAO CONSULAR",
    "cartao de residencia": "CARTAO DE RESIDENCIA",
    "cartao de residencia permanente": "CARTAO DE RESIDENCIA PERMANENTE",
    "cartao mne cid": "CARTAO MNE CID",
    "certificado da ue crue": "CERTIFICADO DA UE CRUE",
    "cedula/certidao nascimento": "CEDULA/CERTIDAO NASCIMENTO",
    "estatuto de resid longa duracao": "ESTATUTO DE RESID LONGA DURACAO"
  };
  return mapa[base] || valor.trim();
}

async function registrarAtendimento(req, res, next) {
  const client = await db.pool.connect();

  try {
    const {
      pessoa_id,
      nome_completo,
      data_nascimento,
      naturalidade,
      nacionalidade,
      genero,
      estado_civil,
      profissao,
      habilitacoes_literarias,
      idioma_origem,
      email,
      telefone,
      telefone_alternativo,
      morada,
      codigo_postal,
      distrito,
      concelho,
      freguesia,
      tipo_documento,
      numero_documento,
      documento_emissao,
      documento_validade,
      tipo_visto,
      tipo_ar,
      situacao_regular,
      nacionalidade_outro,
      modalidade_atendimento,
      tipo_atendimento,
      data_atendimento,
      descricao,
      observacoes,
      itens_entregues,
      elegivel_npt,
      orientacao_profissional,
      avaliou,
      servico_util,
      funcionario_id,
      familia_id,
      familia_nome_referencia,
      parente_id,
      grau_parentesco,
      grau_parentesco_outro,
      declaracao_data,
      declaracao_local,
      declaracao_assinatura
    } = req.body;

    if (!tipo_atendimento) {
      return res.status(400).json({ error: "Tipo de atendimento é obrigatório." });
    }
    if (!modalidade_atendimento) {
      return res.status(400).json({ error: "Modalidade (Presencial/Telefónico/Email) é obrigatória." });
    }
    if (!funcionario_id || !obterInteiro(funcionario_id)) {
      return res.status(400).json({ error: "Funcionário que atendeu é obrigatório." });
    }

    if (nacionalidade === "Outro" && (!nacionalidade_outro || !nacionalidade_outro.trim())) {
      return res.status(400).json({
        error: "Informe a nacionalidade quando selecionar 'Outro'."
      });
    }
    if (!naturalidade || !naturalidade.trim()) {
      return res.status(400).json({ error: "Naturalidade é obrigatória." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "E-mail é obrigatório." });
    }
    if (!telefone || !telefone.trim()) {
      return res.status(400).json({ error: "Telefone é obrigatório." });
    }
    if (!morada || !morada.trim()) {
      return res.status(400).json({ error: "Morada é obrigatória." });
    }

    await client.query("BEGIN");

    let familiaId = obterInteiro(familia_id);
    if (!familiaId && familia_nome_referencia && familia_nome_referencia.trim()) {
      const existente = await client.query(
        `SELECT id FROM familias WHERE nome_referencia = $1`,
        [familia_nome_referencia.trim()]
      );
      if (existente.rows.length > 0) {
        familiaId = existente.rows[0].id;
      } else {
        const criada = await client.query(
          `INSERT INTO familias (nome_referencia)
           VALUES ($1)
           RETURNING id`,
          [familia_nome_referencia.trim()]
        );
        familiaId = criada.rows[0].id;
      }
    }

    const situacaoMap = {
      Sim: "Regular",
      Nao: "Irregular",
      "Em processo de regularizacao": "Em processo de regularização",
      "Protecao Temporaria": "Proteção Temporária",
      "Nao se aplica": "Não se aplica"
    };

    const situacaoRegularNormalizada =
      situacao_regular && situacaoMap[situacao_regular]
        ? situacaoMap[situacao_regular]
        : situacao_regular;

    const nacionalidadeFinal =
      nacionalidade === "Outro" && nacionalidade_outro && nacionalidade_outro.trim()
        ? nacionalidade_outro.trim()
        : nacionalidade;

    const generoNormalizado = normalizarGenero(genero);
    const estadoCivilNormalizado = normalizarEstadoCivil(estado_civil);
    const tipoDocumentoNormalizado = normalizarDocumentoPessoa(tipo_documento);

    let pessoaId = obterInteiro(pessoa_id);
    if (pessoaId) {
      const existentePorId = await client.query(
        `SELECT id, familia_id FROM pessoas WHERE id = $1`,
        [pessoaId]
      );
      if (existentePorId.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Pessoa informada não encontrada." });
      }
      if (!familiaId && existentePorId.rows[0].familia_id) {
        familiaId = existentePorId.rows[0].familia_id;
      }

      await client.query(
        `UPDATE pessoas SET
          nome_completo = COALESCE(NULLIF($1, ''), nome_completo),
          data_nascimento = COALESCE($2, data_nascimento),
          naturalidade = COALESCE(NULLIF($3, ''), naturalidade),
          nacionalidade = COALESCE(NULLIF($4, ''), nacionalidade),
          genero = COALESCE(NULLIF($5, ''), genero),
          estado_civil = COALESCE(NULLIF($6, ''), estado_civil),
          profissao = COALESCE(NULLIF($7, ''), profissao),
          habilitacoes_literarias = COALESCE(NULLIF($8, ''), habilitacoes_literarias),
          idioma_origem = COALESCE(NULLIF($9, ''), idioma_origem),
          email = COALESCE(NULLIF($10, ''), email),
          telefone = COALESCE(NULLIF($11, ''), telefone),
          telefone_alternativo = COALESCE(NULLIF($12, ''), telefone_alternativo),
          morada = COALESCE(NULLIF($13, ''), morada),
          codigo_postal = COALESCE(NULLIF($14, ''), codigo_postal),
          distrito = COALESCE(NULLIF($15, ''), distrito),
          concelho = COALESCE(NULLIF($16, ''), concelho),
          freguesia = COALESCE(NULLIF($17, ''), freguesia),
          tipo_documento = COALESCE(NULLIF($18, ''), tipo_documento),
          numero_documento = COALESCE(NULLIF($19, ''), numero_documento),
          documento_emissao = COALESCE($20, documento_emissao),
          documento_validade = COALESCE($21, documento_validade),
          tipo_visto = COALESCE(NULLIF($22, ''), tipo_visto),
          tipo_ar = COALESCE(NULLIF($23, ''), tipo_ar),
          situacao_regular = COALESCE(NULLIF($24, ''), situacao_regular),
          familia_id = COALESCE(familia_id, $25)
        WHERE id = $26`,
        [
          nome_completo || "",
          data_nascimento || null,
          naturalidade || "",
          nacionalidadeFinal || "",
          generoNormalizado || "",
          estadoCivilNormalizado || "",
          profissao || "",
          habilitacoes_literarias || "",
          idioma_origem || "",
          email || "",
          telefone || "",
          telefone_alternativo || "",
          morada || "",
          codigo_postal || "",
          distrito || "",
          concelho || "",
          freguesia || "",
          tipoDocumentoNormalizado || "",
          numero_documento || "",
          documento_emissao || null,
          documento_validade || null,
          tipo_visto || "",
          tipo_ar || "",
          situacaoRegularNormalizada || "",
          familiaId,
          pessoaId
        ]
      );
    } else if (numero_documento) {
      const existente = await client.query(
        `SELECT id, familia_id FROM pessoas
         WHERE numero_documento = $1`,
        [numero_documento]
      );
      if (existente.rows.length > 0) {
        pessoaId = existente.rows[0].id;
        if (!familiaId && existente.rows[0].familia_id) {
          familiaId = existente.rows[0].familia_id;
        }
      }
    }

    if (!pessoaId) {
      if (!nome_completo || !data_nascimento || !nacionalidade) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Nome completo, data de nascimento e nacionalidade são obrigatórios."
        });
      }

      const pessoaCriada = await client.query(
        `INSERT INTO pessoas (
          nome_completo,
          data_nascimento,
          naturalidade,
          nacionalidade,
          genero,
          estado_civil,
          profissao,
          habilitacoes_literarias,
          idioma_origem,
          email,
          telefone,
          telefone_alternativo,
          morada,
          codigo_postal,
          distrito,
          concelho,
          freguesia,
          tipo_documento,
          numero_documento,
          documento_emissao,
          documento_validade,
          tipo_visto,
          tipo_ar,
          situacao_regular,
          familia_id
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
        )
        RETURNING id`,
        [
          nome_completo,
          data_nascimento,
          naturalidade || null,
          nacionalidadeFinal,
          generoNormalizado || null,
          estadoCivilNormalizado || null,
          profissao || null,
          habilitacoes_literarias || null,
          idioma_origem || null,
          email || null,
          telefone || null,
          telefone_alternativo || null,
          morada || null,
          codigo_postal || null,
          distrito || null,
          concelho || null,
          freguesia || null,
          tipoDocumentoNormalizado || null,
          numero_documento || null,
          documento_emissao || null,
          documento_validade || null,
          tipo_visto || null,
          tipo_ar || null,
          situacaoRegularNormalizada || null,
          familiaId
        ]
      );
      pessoaId = pessoaCriada.rows[0].id;
    } else if (familiaId) {
      await client.query(
        `UPDATE pessoas SET familia_id = COALESCE(familia_id, $1) WHERE id = $2`,
        [familiaId, pessoaId]
      );
    }

    const atendimentoCriado = await client.query(
      `INSERT INTO atendimentos (
        beneficiario_id,
        modalidade_atendimento,
        tipo_atendimento,
        data_atendimento,
        declaracao_data,
        declaracao_local,
        declaracao_assinatura,
        descricao,
        observacoes,
        itens_entregues,
        funcionario_id,
        elegivel_npt,
        orientacao_profissional,
        avaliou,
        servico_util
      ) VALUES (
        $1,$2,$3,COALESCE($4, CURRENT_DATE),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )
      RETURNING id`,
      [
        pessoaId,
        modalidade_atendimento || null,
        tipo_atendimento,
        data_atendimento || null,
        declaracao_data || null,
        declaracao_local || null,
        declaracao_assinatura || null,
        descricao || null,
        observacoes || null,
        itens_entregues || null,
        obterInteiro(funcionario_id),
        elegivel_npt === "true" || elegivel_npt === true,
        orientacao_profissional === "true" || orientacao_profissional === true,
        avaliou === "sim" ? "sim" : "nao_avaliou",
        avaliou === "sim" ? (servico_util === "sim" ? "sim" : servico_util === "nao" ? "nao" : null) : null
      ]
    );

    const atendimentoId = atendimentoCriado.rows[0].id;

    const parenteId = obterInteiro(parente_id);
    const outroInformado = grau_parentesco_outro && grau_parentesco_outro.trim();
    const parentescoInformado = outroInformado ? grau_parentesco_outro.trim() : grau_parentesco;

    if (parenteId && !parentescoInformado) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Grau de parentesco é obrigatório quando o ID do familiar é informado."
      });
    }

    if (grau_parentesco === "Outro familiar a cargo" && !outroInformado) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Informe o parentesco quando selecionar 'Outro familiar a cargo'."
      });
    }

    if (parenteId && parentescoInformado) {
      await client.query(
        `INSERT INTO parentescos (pessoa_id, parente_id, grau_parentesco)
         VALUES ($1, $2, $3)
         ON CONFLICT (pessoa_id, parente_id) DO NOTHING`,
        [pessoaId, parenteId, parentescoInformado]
      );
    }

    const countAtend = await client.query(
      `SELECT COUNT(*)::int AS n FROM atendimentos WHERE beneficiario_id = $1`,
      [pessoaId]
    );
    const jaTeveAtendimento = (countAtend.rows[0]?.n ?? 0) > 0;

    if (Array.isArray(req.files) && req.files.length > 0) {
      const { tipos_documento } = req.body;
      let tiposArray;
      if (Array.isArray(tipos_documento)) {
        tiposArray = tipos_documento;
      } else if (typeof tipos_documento === "string") {
        try {
          const parsed = JSON.parse(tipos_documento);
          tiposArray = Array.isArray(parsed) ? parsed : [tipos_documento];
        } catch {
          tiposArray = tipos_documento ? [tipos_documento] : [];
        }
      } else {
        tiposArray = tipos_documento ? [tipos_documento] : [];
      }
      const tiposNormalizados = tiposArray.map((tipo) => normalizarTipoDocumento(tipo));
      const temDeclaracao = tiposNormalizados.includes("Declaração");

      if (!jaTeveAtendimento && !temDeclaracao) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "É obrigatório anexar a declaração RGPD no primeiro atendimento."
        });
      }

      for (let i = 0; i < req.files.length; i += 1) {
        const arquivo = req.files[i];
        const tipoBruto = tiposArray[i] || "Outro";
        const tipoFinal = normalizarTipoDocumento(tipoBruto);
        const caminhoArquivo = `/uploads/${arquivo.filename}`;
        await client.query(
          `INSERT INTO documentos (
            pessoa_id,
            atendimento_id,
            tipo_documento,
            nome_arquivo,
            caminho_arquivo,
            tamanho_bytes,
            mimetype
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            pessoaId,
            atendimentoId,
            tipoFinal,
            arquivo.originalname,
            caminhoArquivo,
            arquivo.size,
            arquivo.mimetype
          ]
        );
      }
    } else if (!jaTeveAtendimento) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "É obrigatório anexar a declaração RGPD no primeiro atendimento."
      });
    }

    await client.query("COMMIT");
    return res.status(201).json({
      atendimento_id: atendimentoId,
      pessoa_id: pessoaId
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
}

function normalizarTipoDocumento(valor) {
  if (!valor || !valor.trim()) return "Outro";
  const raw = valor.trim();
  const lower = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const mapa = {
    "titulo de residencia": "Título de Residência",
    "cartao de cidadao": "Cartão de Cidadão",
    visto: "Visto",
    "autorizacao de residencia": "Autorização de Residência",
    "documento de viagem": "Documento de Viagem",
    "certidao de nascimento": "Certidão de Nascimento",
    "certidao de casamento": "Certidão de Casamento",
    "certidao de obito": "Certidão de Óbito",
    "bilhete de identidade estrangeiro": "Bilhete de Identidade Estrangeiro",
    "carteira de motorista estrangeira": "Carteira de Motorista Estrangeira",
    "cartao de utente (saude)": "Cartão de Utente (Saúde)",
    "cartao de contribuinte (nif)": "Cartão de Contribuinte (NIF)",
    "cartao da seguranca social": "Cartão da Segurança Social",
    "contrato de trabalho": "Contrato de Trabalho",
    "declaracao de empregador": "Declaração de Empregador",
    "recibos de vencimento": "Recibos de Vencimento",
    "historico profissional": "Histórico Profissional",
    diploma: "Diploma",
    "certificado escolar": "Certificado Escolar",
    "historico academico": "Histórico Acadêmico",
    "certificado de conclusao": "Certificado de Conclusão",
    "cartao de vacinacao": "Cartão de Vacinação",
    "atestado medico": "Atestado Médico",
    "receituario medico": "Receituário Médico",
    "relatorio medico": "Relatório Médico",
    "extrato bancario": "Extrato Bancário",
    "comprovante de renda": "Comprovante de Renda",
    irs: "IRS",
    "comprovante de morada": "Comprovante de Morada",
    fotografia: "Fotografia",
    procuracao: "Procuração",
    declaracao: "Declaração",
    outro: "Outro",
    passaporte: "Passaporte"
  };

  if (mapa[lower]) return mapa[lower];
  return "Outro";
}

async function contarAtendimentosHoje(req, res, next) {
  try {
    const resultado = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM atendimentos
       WHERE data_atendimento = CURRENT_DATE`
    );
    return res.json(resultado.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function listarAtendimentosHoje(req, res, next) {
  try {
    const resultado = await db.query(
      `SELECT
         a.id,
         a.data_atendimento,
         COALESCE(to_char(a.criado_em, 'HH24:MI'), '') AS hora,
         a.modalidade_atendimento,
         a.tipo_atendimento,
         p.nome_completo AS pessoa,
         COALESCE(f.nome_completo, u.nome, '') AS atendido_por
       FROM atendimentos a
       JOIN pessoas p ON p.id = a.beneficiario_id
       LEFT JOIN funcionarios f ON f.id = a.funcionario_id
       LEFT JOIN usuarios u ON u.id = a.funcionario_id
       WHERE a.data_atendimento = CURRENT_DATE
       ORDER BY a.criado_em DESC NULLS LAST, a.id DESC`
    );
    return res.json(resultado.rows);
  } catch (error) {
    return next(error);
  }
}

async function atendimentosPorTecnico(req, res, next) {
  try {
    const resultado = await db.query(
      `SELECT
         COALESCE(f.nome_completo, u.nome, 'Sem tecnico') AS tecnico,
         COUNT(*)::int AS total
       FROM atendimentos a
       LEFT JOIN funcionarios f ON f.id = a.funcionario_id
       LEFT JOIN usuarios u ON u.id = a.funcionario_id
       WHERE a.data_atendimento = CURRENT_DATE
       GROUP BY COALESCE(f.nome_completo, u.nome, 'Sem tecnico')
       ORDER BY total DESC, tecnico`
    );
    return res.json(resultado.rows);
  } catch (error) {
    return next(error);
  }
}

async function atendimentosPorPessoa(req, res, next) {
  try {
    const { id } = req.params;
    const resultado = await db.query(
      `SELECT
         a.id,
         a.data_atendimento,
         COALESCE(to_char(a.criado_em, 'HH24:MI'), '') AS hora,
         a.modalidade_atendimento,
         a.tipo_atendimento,
         COALESCE(f.nome_completo, u.nome, '') AS atendido_por
       FROM atendimentos a
       LEFT JOIN funcionarios f ON f.id = a.funcionario_id
       LEFT JOIN usuarios u ON u.id = a.funcionario_id
       WHERE a.beneficiario_id = $1
       ORDER BY a.data_atendimento DESC, a.id DESC`,
      [id]
    );
    return res.json(resultado.rows);
  } catch (error) {
    return next(error);
  }
}

async function obterAtendimento(req, res, next) {
  try {
    const { id } = req.params;
    const resultado = await db.query(
      `SELECT a.*, p.id AS beneficiario_id, p.nome_completo, p.data_nascimento, p.naturalidade,
         p.nacionalidade, p.genero, p.estado_civil, p.profissao, p.habilitacoes_literarias,
         p.idioma_origem, p.email, p.telefone, p.telefone_alternativo, p.concelho AS cidade_residencia,
         p.morada, p.codigo_postal, p.distrito, p.concelho, p.freguesia,
         p.tipo_documento, p.numero_documento, p.documento_emissao, p.documento_validade,
         p.tipo_visto, p.tipo_ar, p.situacao_regular,
         COALESCE(to_char(a.criado_em, 'HH24:MI'), '') AS hora
       FROM atendimentos a
       JOIN pessoas p ON p.id = a.beneficiario_id
       WHERE a.id = $1`,
      [id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Atendimento não encontrado." });
    }
    return res.json(resultado.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function atualizarAtendimento(req, res, next) {
  try {
    const { id } = req.params;
    const {
      modalidade_atendimento,
      tipo_atendimento,
      data_atendimento,
      descricao,
      observacoes,
      itens_entregues,
      funcionario_id,
      elegivel_npt,
      orientacao_profissional,
      avaliou,
      servico_util
    } = req.body;

    const existe = await db.query(
      "SELECT id, beneficiario_id FROM atendimentos WHERE id = $1",
      [id]
    );
    if (existe.rows.length === 0) {
      return res.status(404).json({ error: "Atendimento não encontrado." });
    }

    await db.query(
      `UPDATE atendimentos SET
         modalidade_atendimento = COALESCE(NULLIF($2, ''), modalidade_atendimento),
         tipo_atendimento = COALESCE(NULLIF($3, ''), tipo_atendimento),
         data_atendimento = COALESCE($4::date, data_atendimento),
         descricao = $5,
         observacoes = $6,
         itens_entregues = $7,
         funcionario_id = $8,
         elegivel_npt = CASE WHEN $9 IN ('true', 'false') THEN $9::boolean ELSE elegivel_npt END,
         orientacao_profissional = CASE WHEN $10 IN ('true', 'false') THEN $10::boolean ELSE orientacao_profissional END,
         avaliou = COALESCE(NULLIF($11, ''), avaliou),
         servico_util = CASE WHEN $11 = 'sim' THEN COALESCE(NULLIF($12, ''), servico_util) ELSE NULL END
       WHERE id = $1`,
      [
        id,
        modalidade_atendimento,
        tipo_atendimento,
        data_atendimento || null,
        descricao ?? null,
        observacoes ?? null,
        itens_entregues ?? null,
        obterInteiro(funcionario_id),
        elegivel_npt,
        orientacao_profissional,
        avaliou,
        servico_util
      ]
    );

    const pessoaId = existe.rows[0].beneficiario_id;
    return res.json({ atendimento_id: parseInt(id, 10), pessoa_id: pessoaId });
  } catch (error) {
    return next(error);
  }
}

async function listarFuncionarios(req, res, next) {
  try {
    let funcList = [];
    let usrList = [];
    try {
      const funcResult = await db.query(
        `SELECT id, nome_completo FROM funcionarios
         WHERE (ativo IS NULL OR ativo = true)
         ORDER BY nome_completo`
      );
      funcList = (funcResult.rows || []).map((r) => ({
        id: r.id,
        nome: r.nome_completo || r.nome || `Funcionário ${r.id}`
      }));
    } catch {
      funcList = [];
    }
    try {
      const usrResult = await db.query(
        `SELECT id, nome FROM usuarios
         WHERE (ativo IS NULL OR ativo = true)
         ORDER BY nome`
      );
      usrList = (usrResult.rows || [])
        .filter((u) => !funcList.some((f) => f.id === u.id))
        .map((r) => ({ id: r.id, nome: r.nome || `Utilizador ${r.id}` }));
    } catch {
      usrList = [];
    }
    const todos = [...funcList, ...usrList];
    return res.json(todos);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registrarAtendimento,
  listarAtendimentosHoje,
  contarAtendimentosHoje,
  atendimentosPorTecnico,
  atendimentosPorPessoa,
  listarFuncionarios,
  obterAtendimento,
  atualizarAtendimento
};
