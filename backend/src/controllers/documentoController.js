const db = require("../config/database");

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
    "questionario de avaliacao": "Questionário de Avaliação",
    "questionário de avaliação": "Questionário de Avaliação",
    outro: "Outro",
    passaporte: "Passaporte"
  };

  if (mapa[lower]) return mapa[lower];
  return "Outro";
}

async function listarDocumentosPorPessoa(req, res, next) {
  try {
    const { pessoaId } = req.params;
    const resultado = await db.query(
      `SELECT d.id, d.pessoa_id, d.atendimento_id, d.tipo_documento, d.nome_arquivo, d.caminho_arquivo, d.tamanho_bytes, COALESCE(d.mimetype, d.mime_type) AS mimetype, d.data_upload AS criado_em
       FROM documentos d
       WHERE d.pessoa_id = $1
          OR (d.atendimento_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM atendimentos a
            WHERE a.id = d.atendimento_id AND a.beneficiario_id = $1
          ))
       ORDER BY d.data_upload DESC NULLS LAST`,
      [pessoaId]
    );

    return res.json(resultado.rows);
  } catch (error) {
    return next(error);
  }
}

async function uploadDocumentosPessoa(req, res, next) {
  try {
    const { pessoaId } = req.params;
    const { tipo_documento, tipos_documento } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Envie pelo menos 1 documento." });
    }
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
    const tipoFallback = normalizarTipoDocumento(tipo_documento);

    const tiposNormalizados = tiposArray.map((tipo) => normalizarTipoDocumento(tipo));

    for (let i = 0; i < req.files.length; i += 1) {
      const arquivo = req.files[i];
      const tipoBruto = tiposArray[i] || tipoFallback || "Outro";
      const tipoFinal = normalizarTipoDocumento(tipoBruto);
      const caminhoArquivo = `/uploads/${arquivo.filename}`;
      await db.query(
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
          null,
          tipoFinal,
          arquivo.originalname,
          caminhoArquivo,
          arquivo.size,
          arquivo.mimetype
        ]
      );
    }

    return res.status(201).json({ success: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listarDocumentosPorPessoa,
  uploadDocumentosPessoa
};
