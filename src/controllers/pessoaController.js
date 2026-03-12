const db = require("../config/database");

async function listarPessoas(req, res, next) {
  try {
    const { q } = req.query;
    const limite = 20;

    if (!q || q.trim().length < 2) {
      const resultado = await db.query(
        `SELECT id, nome_completo, numero_documento, data_nascimento
         FROM pessoas
         ORDER BY nome_completo
         LIMIT $1`,
        [limite]
      );
      return res.json(resultado.rows);
    }

    const busca = `%${q.trim()}%`;
    const resultado = await db.query(
      `SELECT id, nome_completo, numero_documento, data_nascimento
       FROM pessoas
       WHERE nome_completo ILIKE $1 OR numero_documento ILIKE $1
       ORDER BY nome_completo
       LIMIT $2`,
      [busca, limite]
    );

    return res.json(resultado.rows);
  } catch (error) {
    return next(error);
  }
}

async function obterPessoa(req, res, next) {
  try {
    const { id } = req.params;
    const resultado = await db.query(
      `SELECT *
       FROM pessoas
       WHERE id = $1`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Pessoa não encontrada" });
    }

    return res.json(resultado.rows[0]);
  } catch (error) {
    return next(error);
  }
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

async function atualizarPessoa(req, res, next) {
  try {
    const { id } = req.params;
    const {
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
      situacao_regular
    } = req.body;

    const generoNormalizado = normalizarGenero(genero);
    const estadoCivilNormalizado = normalizarEstadoCivil(estado_civil);
    const tipoDocumentoNormalizado = normalizarDocumentoPessoa(tipo_documento);

    const resultado = await db.query(
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
        situacao_regular = COALESCE(NULLIF($24, ''), situacao_regular)
      WHERE id = $25
      RETURNING *`,
      [
        nome_completo || "",
        data_nascimento || null,
        naturalidade || "",
        nacionalidade || "",
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
        situacao_regular || "",
        id
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Pessoa não encontrada" });
    }

    return res.json(resultado.rows[0]);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listarPessoas,
  obterPessoa,
  atualizarPessoa
};
