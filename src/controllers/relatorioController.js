const db = require("../config/database");
const { gerarExcel } = require("../services/exportFamiExcel");

const mapaViews = {
  diario: "relatorio_atendimentos_diario",
  semanal: "relatorio_atendimentos_semanal",
  quinzenal: "relatorio_atendimentos_quinzenal",
  mensal: "relatorio_atendimentos_mensal"
};

function buildBaseSubquery(filtros, valores, indiceRef) {
  let idx = indiceRef.current;
  const partes = [];

  if (filtros.genero) {
    partes.push(` AND p.genero = $${idx++}`);
    valores.push(filtros.genero);
  }
  if (filtros.faixa_etaria) {
    partes.push(` AND (
      CASE
        WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) < 18 THEN '0-17'
        WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) < 30 THEN '18-29'
        WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) < 45 THEN '30-44'
        WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) < 60 THEN '45-59'
        ELSE '60+'
      END
    ) = $${idx++}`);
    valores.push(filtros.faixa_etaria);
  }
  if (filtros.idade_min !== undefined && filtros.idade_min !== "") {
    partes.push(` AND date_part('year', age(a.data_atendimento, p.data_nascimento)) >= $${idx++}`);
    valores.push(Number.parseInt(filtros.idade_min, 10));
  }
  if (filtros.idade_max !== undefined && filtros.idade_max !== "") {
    partes.push(` AND date_part('year', age(a.data_atendimento, p.data_nascimento)) <= $${idx++}`);
    valores.push(Number.parseInt(filtros.idade_max, 10));
  }
  if (filtros.tipo_atendimento) {
    partes.push(` AND a.tipo_atendimento = $${idx++}`);
    valores.push(filtros.tipo_atendimento);
  }
  if (filtros.elegivel_npt !== undefined && filtros.elegivel_npt !== "" && filtros.elegivel_npt !== null) {
    const val = filtros.elegivel_npt === "true" || filtros.elegivel_npt === true;
    partes.push(` AND a.elegivel_npt = $${idx++}`);
    valores.push(val);
  }
  if (filtros.funcionario_id) {
    partes.push(` AND a.funcionario_id = $${idx++}`);
    valores.push(Number.parseInt(filtros.funcionario_id, 10));
  }
  if (filtros.inicio) {
    partes.push(` AND a.data_atendimento >= $${idx++}`);
    valores.push(filtros.inicio);
  }
  if (filtros.fim) {
    partes.push(` AND a.data_atendimento <= $${idx++}`);
    valores.push(filtros.fim);
  }

  indiceRef.current = idx;
  return partes.join("");
}

async function listarRelatorioFami(req, res, next) {
  try {
    const {
      periodo,
      genero,
      faixa_etaria,
      idade_min,
      idade_max,
      tipo_atendimento,
      elegivel_npt,
      funcionario_id,
      inicio,
      fim
    } = req.query;

    const periodosValidos = ["diario", "semanal", "quinzenal", "mensal", "trimestral", "semestral", "anual"];
    if (!periodo || !periodosValidos.includes(periodo)) {
      return res.status(400).json({
        error: "Período inválido. Use: diario, semanal, quinzenal, mensal, trimestral, semestral ou anual."
      });
    }

    const filtros = {
      genero: genero || null,
      faixa_etaria: faixa_etaria || null,
      idade_min: idade_min ?? null,
      idade_max: idade_max ?? null,
      tipo_atendimento: tipo_atendimento || null,
      elegivel_npt: elegivel_npt ?? null,
      funcionario_id: funcionario_id || null,
      inicio: inicio || null,
      fim: fim || null
    };

    const valores = [];
    const indiceRef = { current: 1 };
    const whereExtra = buildBaseSubquery(filtros, valores, indiceRef);

    const baseSql = `
      FROM atendimentos a
      JOIN pessoas p ON p.id = a.beneficiario_id
      WHERE 1=1 ${whereExtra}
    `;

    let groupByCol = "date_trunc('day', a.data_atendimento)::date";
    let periodoInicioExpr = "date_trunc('day', a.data_atendimento)::date";
    let periodoFimExpr = "(date_trunc('day', a.data_atendimento)::date + INTERVAL '1 day' - INTERVAL '1 second')";

    switch (periodo) {
      case "diario":
        break;
      case "semanal":
        groupByCol = "date_trunc('week', a.data_atendimento)::date";
        periodoInicioExpr = "date_trunc('week', a.data_atendimento)::date";
        periodoFimExpr = "(date_trunc('week', a.data_atendimento)::date + INTERVAL '7 days' - INTERVAL '1 second')";
        break;
      case "quinzenal": {
        const quinzenaExpr = `(date_trunc('month', a.data_atendimento)::date + 
          (CASE WHEN EXTRACT(day FROM a.data_atendimento) <= 15 THEN 0 ELSE 15 END) * INTERVAL '1 day')`;
        groupByCol = quinzenaExpr;
        periodoInicioExpr = quinzenaExpr;
        periodoFimExpr = `(${quinzenaExpr} + INTERVAL '15 days' - INTERVAL '1 second')`;
        break;
      }
      case "mensal":
        groupByCol = "date_trunc('month', a.data_atendimento)::date";
        periodoInicioExpr = "date_trunc('month', a.data_atendimento)::date";
        periodoFimExpr = "(date_trunc('month', a.data_atendimento)::date + INTERVAL '1 month' - INTERVAL '1 second')";
        break;
      case "trimestral":
        groupByCol = `date_trunc('quarter', a.data_atendimento)::date`;
        periodoInicioExpr = "date_trunc('quarter', a.data_atendimento)::date";
        periodoFimExpr = "(date_trunc('quarter', a.data_atendimento)::date + INTERVAL '3 months' - INTERVAL '1 second')";
        break;
      case "semestral": {
        const semestreExpr = `(date_trunc('year', a.data_atendimento)::date + 
          (CASE WHEN EXTRACT(month FROM a.data_atendimento) <= 6 THEN 0 ELSE 6 END) * INTERVAL '1 month')`;
        groupByCol = semestreExpr;
        periodoInicioExpr = semestreExpr;
        periodoFimExpr = `(${semestreExpr} + INTERVAL '6 months' - INTERVAL '1 second')`;
        break;
      }
      case "anual":
        groupByCol = "date_trunc('year', a.data_atendimento)::date";
        periodoInicioExpr = "date_trunc('year', a.data_atendimento)::date";
        periodoFimExpr = "(date_trunc('year', a.data_atendimento)::date + INTERVAL '1 year' - INTERVAL '1 second')";
        break;
      default:
        break;
    }

    const faixaExpr = `CASE
      WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) < 18 THEN '0-17'
      WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) < 30 THEN '18-29'
      WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) < 45 THEN '30-44'
      WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) < 60 THEN '45-59'
      ELSE '60+'
    END`;

    const selectCols = `
      ${periodoInicioExpr} AS periodo_inicio,
      ${periodoFimExpr} AS periodo_fim,
      p.genero,
      ${faixaExpr} AS faixa_etaria,
      a.tipo_atendimento,
      COALESCE(a.elegivel_npt::text, 'nao_informado') AS elegivel_npt,
      a.funcionario_id,
      COUNT(*) AS total_atendimentos
    `;

    const groupByList = [groupByCol, "p.genero", faixaExpr, "a.tipo_atendimento", "a.elegivel_npt", "a.funcionario_id"].join(", ");

    const sql = `
      SELECT ${selectCols}
      ${baseSql}
      GROUP BY ${groupByList}
      ORDER BY periodo_inicio DESC, total_atendimentos DESC
    `;

    const resultado = await db.query(sql, valores);
    return res.json(resultado.rows);
  } catch (error) {
    return next(error);
  }
}

async function listarRelatorio(req, res, next) {
  try {
    const { periodo } = req.params;
    const view = mapaViews[periodo];

    if (!view) {
      return res.status(400).json({ error: "Periodo invalido." });
    }

    const {
      genero,
      faixa_etaria,
      tipo_atendimento,
      funcionario_id,
      inicio,
      fim
    } = req.query;

    const filtros = [];
    const valores = [];
    let indice = 1;

    if (genero) {
      filtros.push(`genero = $${indice++}`);
      valores.push(genero);
    }
    if (faixa_etaria) {
      filtros.push(`faixa_etaria = $${indice++}`);
      valores.push(faixa_etaria);
    }
    if (tipo_atendimento) {
      filtros.push(`tipo_atendimento = $${indice++}`);
      valores.push(tipo_atendimento);
    }
    if (funcionario_id) {
      filtros.push(`funcionario_id = $${indice++}`);
      valores.push(Number.parseInt(funcionario_id, 10));
    }
    if (inicio) {
      filtros.push(`periodo_inicio >= $${indice++}`);
      valores.push(inicio);
    }
    if (fim) {
      filtros.push(`periodo_inicio <= $${indice++}`);
      valores.push(fim);
    }

    const where = filtros.length > 0 ? `WHERE ${filtros.join(" AND ")}` : "";

    const resultado = await db.query(
      `SELECT *
       FROM ${view}
       ${where}
       ORDER BY periodo_inicio DESC`,
      valores
    );

    return res.json(resultado.rows);
  } catch (error) {
    return next(error);
  }
}

async function listarTiposAtendimento(req, res, next) {
  try {
    const resultado = await db.query(
      `SELECT DISTINCT tipo_atendimento
       FROM atendimentos
       WHERE tipo_atendimento IS NOT NULL AND tipo_atendimento != ''
       ORDER BY tipo_atendimento`
    );
    return res.json(resultado.rows.map((r) => r.tipo_atendimento));
  } catch (error) {
    return next(error);
  }
}

/**
 * Relatório FAMI no formato do documento oficial:
 * - Indicadores de realização e resultado (HCO203, HPO006, elegíveis, não elegíveis)
 * - Desagregação de participantes por idade (< 18, 18-60, > 60) e género (Feminino, Masculino, Não Binário)
 */
async function relatorioFamiDesagregacao(req, res, next) {
  try {
    const { inicio, fim, genero, faixa_etaria, elegivel_npt } = req.query;

    const valores = [];
    let whereClause = " WHERE 1=1";
    if (inicio) {
      whereClause += ` AND a.data_atendimento >= $${valores.length + 1}`;
      valores.push(inicio);
    }
    if (fim) {
      whereClause += ` AND a.data_atendimento <= $${valores.length + 1}`;
      valores.push(fim);
    }
    if (genero) {
      whereClause += ` AND p.genero = $${valores.length + 1}`;
      valores.push(genero);
    }
    if (elegivel_npt === "true" || elegivel_npt === "false") {
      whereClause += ` AND a.elegivel_npt = $${valores.length + 1}`;
      valores.push(elegivel_npt === "true");
    }
    if (faixa_etaria) {
      if (faixa_etaria === "menor_18") {
        whereClause += ` AND p.data_nascimento IS NOT NULL AND date_part('year', age(a.data_atendimento, p.data_nascimento)) < 18`;
      } else if (faixa_etaria === "18_60") {
        whereClause += ` AND (p.data_nascimento IS NULL OR (date_part('year', age(a.data_atendimento, p.data_nascimento)) >= 18 AND date_part('year', age(a.data_atendimento, p.data_nascimento)) <= 60))`;
      } else if (faixa_etaria === "maior_60") {
        whereClause += ` AND p.data_nascimento IS NOT NULL AND date_part('year', age(a.data_atendimento, p.data_nascimento)) > 60`;
      }
    }

    const faixaFami = `CASE
      WHEN p.data_nascimento IS NULL THEN '18_60'
      WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) < 18 THEN 'menor_18'
      WHEN date_part('year', age(a.data_atendimento, p.data_nascimento)) <= 60 THEN '18_60'
      ELSE 'maior_60'
    END`;

    const generoNorm = `CASE
      WHEN p.genero = 'Feminino' THEN 'Feminino'
      WHEN p.genero = 'Masculino' THEN 'Masculino'
      WHEN p.genero = 'Não binário' OR p.genero = 'Nao binario' THEN 'Não Binário'
      WHEN p.genero = 'Outro' OR p.genero = 'Não quero informar' OR p.genero IS NULL OR p.genero = '' THEN 'Outros'
      ELSE 'Outros'
    END`;

    const baseFrom = `
      FROM atendimentos a
      JOIN pessoas p ON p.id = a.beneficiario_id
      ${whereClause}
    `;

    const elegivelNptExpr = `EXISTS (SELECT 1 FROM atendimentos a2 WHERE a2.beneficiario_id = a.beneficiario_id AND a2.elegivel_npt = true)`;
    const naoElegivelNptExpr = `EXISTS (SELECT 1 FROM atendimentos a2 WHERE a2.beneficiario_id = a.beneficiario_id AND a2.elegivel_npt = false) AND NOT ${elegivelNptExpr}`;

    const desagregacao = await db.query(
      `SELECT
        ${faixaFami} AS faixa_etaria,
        ${generoNorm} AS genero,
        COUNT(DISTINCT a.beneficiario_id) AS participantes_apoiados,
        COUNT(DISTINCT CASE WHEN a.orientacao_profissional = true THEN a.beneficiario_id END) AS participantes_orientacao_profissional,
        COUNT(*) AS atendimentos_realizados,
        COUNT(DISTINCT CASE WHEN ${elegivelNptExpr} THEN a.beneficiario_id END) AS participantes_elegiveis,
        COUNT(DISTINCT CASE WHEN ${naoElegivelNptExpr} THEN a.beneficiario_id END) AS participantes_nao_elegiveis,
        COUNT(DISTINCT CASE WHEN a.avaliou = 'sim' AND a.servico_util = 'sim' THEN a.beneficiario_id END) AS participantes_atividade_util
      ${baseFrom}
      GROUP BY ${faixaFami}, ${generoNorm}`,
      valores
    );

    const totais = await db.query(
      `SELECT
        COUNT(DISTINCT a.beneficiario_id) AS participantes_apoiados,
        COUNT(DISTINCT CASE WHEN a.orientacao_profissional = true THEN a.beneficiario_id END) AS participantes_orientacao_profissional,
        COUNT(*) AS atendimentos_realizados,
        COUNT(DISTINCT CASE WHEN ${elegivelNptExpr} THEN a.beneficiario_id END) AS participantes_elegiveis,
        COUNT(DISTINCT CASE WHEN ${naoElegivelNptExpr} THEN a.beneficiario_id END) AS participantes_nao_elegiveis,
        COUNT(DISTINCT CASE WHEN a.avaliou = 'sim' AND a.servico_util = 'sim' THEN a.beneficiario_id END) AS participantes_atividade_util
      ${baseFrom}`,
      valores
    );

    const totaisRow = totais.rows[0] || {};

    const primeiraAtendimento = `(
      SELECT MIN(a2.data_atendimento)
      FROM atendimentos a2
      WHERE a2.beneficiario_id = a.beneficiario_id
    )`;

    let resumoRow = {};
    let resumoPorGenero = [];
    let resumoPorFaixa = [];
    let resumoPorGeneroFaixa = [];
    const idx1 = valores.length + 1;
    const idx2 = valores.length + 2;
    const valsResumo = [...valores, inicio || "1900-01-01", fim || "2099-12-31"];

    try {
      const resumoRegistros = await db.query(
        `WITH base AS (
          SELECT
            a.beneficiario_id,
            (${primeiraAtendimento})::date AS primeira_data
          ${baseFrom}
        )
        SELECT
          COUNT(DISTINCT CASE WHEN primeira_data >= $${idx1} AND primeira_data <= $${idx2} THEN beneficiario_id END)::int AS novos_registros,
          COUNT(DISTINCT CASE WHEN primeira_data < $${idx1} THEN beneficiario_id END)::int AS pessoas_ja_registradas,
          (COUNT(*) - COUNT(DISTINCT CASE WHEN primeira_data >= $${idx1} AND primeira_data <= $${idx2} THEN beneficiario_id END))::int AS atendimentos_ja_registradas,
          COUNT(*)::int AS total_atendimentos
        FROM base`,
        valsResumo
      );
      resumoRow = resumoRegistros.rows[0] || {};

      const resumoGen = await db.query(
        `WITH base AS (
          SELECT
            a.beneficiario_id,
            (${primeiraAtendimento})::date AS primeira_data,
            ${generoNorm} AS genero
          ${baseFrom}
        )
        SELECT
          genero,
          COUNT(DISTINCT CASE WHEN primeira_data >= $${idx1} AND primeira_data <= $${idx2} THEN beneficiario_id END)::int AS novos_registros,
          (COUNT(*) - COUNT(DISTINCT CASE WHEN primeira_data >= $${idx1} AND primeira_data <= $${idx2} THEN beneficiario_id END))::int AS atendimentos_ja_registradas,
          COUNT(*)::int AS total_atendimentos
        FROM base
        GROUP BY genero
        ORDER BY genero`,
        valsResumo
      );
      resumoPorGenero = (resumoGen.rows || []).map((r) => ({
        ...r,
        atendimentos_ja_registradas: Math.max(0, (parseInt(r.total_atendimentos, 10) || 0) - (parseInt(r.novos_registros, 10) || 0))
      }));

      const resumoFaixa = await db.query(
        `WITH base AS (
          SELECT
            a.beneficiario_id,
            (${primeiraAtendimento})::date AS primeira_data,
            ${faixaFami} AS faixa_etaria
          ${baseFrom}
        )
        SELECT
          faixa_etaria,
          COUNT(DISTINCT CASE WHEN primeira_data >= $${idx1} AND primeira_data <= $${idx2} THEN beneficiario_id END)::int AS novos_registros,
          (COUNT(*) - COUNT(DISTINCT CASE WHEN primeira_data >= $${idx1} AND primeira_data <= $${idx2} THEN beneficiario_id END))::int AS atendimentos_ja_registradas,
          COUNT(*)::int AS total_atendimentos
        FROM base
        GROUP BY faixa_etaria
        ORDER BY CASE faixa_etaria WHEN 'menor_18' THEN 1 WHEN '18_60' THEN 2 ELSE 3 END`,
        valsResumo
      );
      resumoPorFaixa = (resumoFaixa.rows || []).map((r) => ({
        ...r,
        atendimentos_ja_registradas: Math.max(0, (parseInt(r.total_atendimentos, 10) || 0) - (parseInt(r.novos_registros, 10) || 0))
      }));

      const resumoMatriz = await db.query(
        `WITH base AS (
          SELECT
            a.beneficiario_id,
            (${primeiraAtendimento})::date AS primeira_data,
            ${faixaFami} AS faixa_etaria,
            ${generoNorm} AS genero
          ${baseFrom}
        )
        SELECT
          faixa_etaria,
          genero,
          COUNT(DISTINCT CASE WHEN primeira_data >= $${idx1} AND primeira_data <= $${idx2} THEN beneficiario_id END)::int AS novos_registros,
          (COUNT(*) - COUNT(DISTINCT CASE WHEN primeira_data >= $${idx1} AND primeira_data <= $${idx2} THEN beneficiario_id END))::int AS atendimentos_ja_registradas,
          COUNT(*)::int AS total_atendimentos
        FROM base
        GROUP BY faixa_etaria, genero
        ORDER BY CASE faixa_etaria WHEN 'menor_18' THEN 1 WHEN '18_60' THEN 2 ELSE 3 END, genero`,
        valsResumo
      );
      resumoPorGeneroFaixa = (resumoMatriz.rows || []).map((r) => ({
        ...r,
        atendimentos_ja_registradas: Math.max(0, (parseInt(r.total_atendimentos, 10) || 0) - (parseInt(r.novos_registros, 10) || 0))
      }));
    } catch (err) {
      console.error("Erro ao carregar resumo de registros:", err);
      resumoRow = { novos_registros: 0, pessoas_ja_registradas: 0, atendimentos_ja_registradas: 0, atendimentos_novos: 0, total_atendimentos: parseInt(totaisRow.atendimentos_realizados, 10) || 0 };
    }

    const whereNovos = (inicio && fim)
      ? ` AND (SELECT MIN(a2.data_atendimento) FROM atendimentos a2 WHERE a2.beneficiario_id = p.id)::date >= $${valores.length + 1} AND (SELECT MIN(a2.data_atendimento) FROM atendimentos a2 WHERE a2.beneficiario_id = p.id)::date <= $${valores.length + 2}`
      : "";
    const valoresParticipantes = (inicio && fim) ? [...valores, inicio, fim] : valores;

    const indicadores = [
      {
        tipo: "Realização (O)",
        codigo: "HCO203",
        designacao: "Participantes apoiados",
        contratualizado: 0,
        executado: parseInt(totaisRow.participantes_apoiados, 10) || 0,
        taxa_execucao: 0
      },
      {
        tipo: "Realização (O)",
        codigo: "HPO006",
        designacao: "Atendimentos realizados e inscritos na plataforma de registo da RNAIM",
        contratualizado: 0,
        executado: parseInt(totaisRow.atendimentos_realizados, 10) || 0,
        taxa_execucao: 0
      },
      {
        tipo: "Realização (O)",
        codigo: "HCO203-E",
        designacao: "Elegível NPT – pessoas únicas elegíveis",
        contratualizado: 0,
        executado: parseInt(totaisRow.participantes_elegiveis, 10) || 0,
        taxa_execucao: 0
      },
      {
        tipo: "Realização (O)",
        codigo: "HCO203-NE",
        designacao: "Não elegível NPT – pessoas únicas não elegíveis",
        contratualizado: 0,
        executado: parseInt(totaisRow.participantes_nao_elegiveis, 10) || 0,
        taxa_execucao: 0
      },
      {
        tipo: "Resultado (R)",
        codigo: "HCR209",
        designacao: "Participantes que comunicaram que a atividade foi útil para a sua integração",
        contratualizado: 0,
        executado: parseInt(totaisRow.participantes_atividade_util, 10) || 0,
        taxa_execucao: 0
      }
    ];

    const faixas = [
      { key: "menor_18", label: "< 18 anos" },
      { key: "18_60", label: "18-60 anos" },
      { key: "maior_60", label: "> 60 anos" }
    ];
    const generos = ["Feminino", "Masculino", "Não Binário", "Outros"];

    let listaParticipantes = [];
    try {
      const participantes = await db.query(
        `WITH docs_base AS (
          SELECT COALESCE(d.pessoa_id, a.beneficiario_id) AS pessoa_id, d.caminho_arquivo, d.tipo_documento
          FROM documentos d
          LEFT JOIN atendimentos a ON a.id = d.atendimento_id AND d.pessoa_id IS NULL
          WHERE d.pessoa_id IS NOT NULL OR d.atendimento_id IS NOT NULL
        ),
        docs_agg AS (
          SELECT pessoa_id,
            STRING_AGG(DISTINCT caminho_arquivo, ' | ') FILTER (WHERE (tipo_documento ILIKE '%declaração%' OR tipo_documento ILIKE '%declaracao%' OR tipo_documento ILIKE '%rgpd%')) AS links_rgpd,
            STRING_AGG(DISTINCT caminho_arquivo, ' | ') FILTER (WHERE (tipo_documento NOT ILIKE '%declaração%' AND tipo_documento NOT ILIKE '%declaracao%' AND tipo_documento NOT ILIKE '%rgpd%' AND tipo_documento NOT ILIKE '%questionário%' AND tipo_documento NOT ILIKE '%questionario%')) AS links_identificacao
          FROM docs_base
          WHERE pessoa_id IS NOT NULL
          GROUP BY pessoa_id
        ),
        primeira_data AS (
          SELECT beneficiario_id, MIN(data_atendimento)::date AS data_reg
          FROM atendimentos
          GROUP BY beneficiario_id
        )
        SELECT
          p.id AS pessoa_id,
          pd.data_reg AS data_registro,
          p.nome_completo AS nome,
          p.data_nascimento AS data_nasc,
          p.genero,
          p.telefone,
          p.email,
          p.naturalidade,
          p.nacionalidade,
          p.concelho AS cidade_residencia,
          p.morada,
          p.codigo_postal,
          p.distrito,
          p.concelho,
          p.freguesia,
          p.tipo_documento AS tipo_doc,
          '' AS outro_doc_qual,
          p.numero_documento AS numero_doc,
          '' AS numero_doc_mi_nipc,
          COALESCE(da.links_identificacao, '') || CASE WHEN da.links_identificacao IS NOT NULL AND da.links_rgpd IS NOT NULL THEN ' | ' ELSE '' END || COALESCE(da.links_rgpd, '') AS link_doc,
          da.links_identificacao AS link_doc_identificacao,
          da.links_rgpd AS link_doc_rgpd,
          to_char(pd.data_reg, 'YYYY-MM') AS mes_atendimento,
          COUNT(a.id)::int AS n_atendimento_mensal,
          1 AS novos_registros,
          GREATEST(0, COUNT(a.id) - 1)::int AS atendimentos_ja_registradas
        FROM atendimentos a
        JOIN pessoas p ON p.id = a.beneficiario_id
        JOIN primeira_data pd ON pd.beneficiario_id = p.id
        LEFT JOIN docs_agg da ON da.pessoa_id = p.id
        ${whereClause}${whereNovos}
        GROUP BY p.id, p.nome_completo, p.data_nascimento, p.genero, p.telefone, p.email, p.naturalidade, p.nacionalidade,
          p.concelho, p.morada, p.codigo_postal, p.distrito, p.freguesia,
          p.tipo_documento, p.numero_documento, da.links_identificacao, da.links_rgpd, pd.data_reg
        ORDER BY pd.data_reg, p.nome_completo`,
        valoresParticipantes
      );
      listaParticipantes = participantes.rows || [];
    } catch (err) {
      console.error("Erro ao carregar lista de participantes:", err);
      try {
        const fallback = await db.query(
          `WITH primeira_data AS (
            SELECT beneficiario_id, MIN(data_atendimento)::date AS data_reg
            FROM atendimentos GROUP BY beneficiario_id
          )
          SELECT
            p.id AS pessoa_id,
            pd.data_reg AS data_registro,
            p.nome_completo AS nome,
            p.data_nascimento AS data_nasc,
            p.genero,
            p.telefone,
            p.email,
            p.naturalidade,
            p.nacionalidade,
            p.concelho AS cidade_residencia,
            p.morada,
            p.codigo_postal,
            p.distrito,
            p.concelho,
            p.freguesia,
            p.tipo_documento AS tipo_doc,
            '' AS outro_doc_qual,
            p.numero_documento AS numero_doc,
            '' AS numero_doc_mi_nipc,
            (SELECT STRING_AGG(DISTINCT d.caminho_arquivo, ' | ') FROM documentos d WHERE d.pessoa_id = p.id) AS link_doc,
            (SELECT STRING_AGG(DISTINCT d.caminho_arquivo, ' | ') FROM documentos d WHERE d.pessoa_id = p.id AND (d.tipo_documento NOT ILIKE '%declaração%' AND d.tipo_documento NOT ILIKE '%declaracao%' AND d.tipo_documento NOT ILIKE '%rgpd%')) AS link_doc_identificacao,
            (SELECT STRING_AGG(DISTINCT d.caminho_arquivo, ' | ') FROM documentos d WHERE d.pessoa_id = p.id AND (d.tipo_documento ILIKE '%declaração%' OR d.tipo_documento ILIKE '%declaracao%' OR d.tipo_documento ILIKE '%rgpd%')) AS link_doc_rgpd,
            to_char(pd.data_reg, 'YYYY-MM') AS mes_atendimento,
            COUNT(a.id)::int AS n_atendimento_mensal,
            1 AS novos_registros,
            GREATEST(0, COUNT(a.id) - 1)::int AS atendimentos_ja_registradas
          FROM atendimentos a
          JOIN pessoas p ON p.id = a.beneficiario_id
          JOIN primeira_data pd ON pd.beneficiario_id = p.id
          WHERE 1=1 ${whereClause}${whereNovos}
          GROUP BY p.id, p.nome_completo, p.data_nascimento, p.genero, p.telefone, p.email, p.naturalidade, p.nacionalidade,
            p.concelho, p.morada, p.codigo_postal, p.distrito, p.freguesia,
            p.tipo_documento, p.numero_documento, pd.data_reg
          ORDER BY pd.data_reg, p.nome_completo`,
          valoresParticipantes
        );
        listaParticipantes = fallback.rows || [];
      } catch (err2) {
        console.error("Fallback lista participantes falhou:", err2);
      }
    }

    const buildMatriz = (campo) => {
      const matriz = {};
      faixas.forEach((f) => {
        matriz[f.key] = {};
        generos.forEach((g) => {
          matriz[f.key][g] = { estimado: 0, executado: 0 };
        });
        matriz[f.key].Total = { estimado: 0, executado: 0 };
      });
      matriz.Total = {};
      generos.forEach((g) => {
        matriz.Total[g] = { estimado: 0, executado: 0 };
      });
      matriz.Total.Total = { estimado: 0, executado: 0 };

      desagregacao.rows.forEach((r) => {
        const faixa = r.faixa_etaria || "18_60";
        const genero = r.genero === "Outro" ? "Outros" : (r.genero || "Feminino");
        const val = parseInt(r[campo], 10) || 0;
        if (matriz[faixa] && matriz[faixa][genero]) {
          matriz[faixa][genero].executado += val;
        }
        if (matriz[faixa]) matriz[faixa].Total.executado += val;
        if (matriz.Total[genero]) matriz.Total[genero].executado += val;
        matriz.Total.Total.executado += val;
      });

      return matriz;
    };

    const totalAtend = parseInt(totaisRow.atendimentos_realizados, 10) || 0;
    const totalResumo = parseInt(resumoRow.total_atendimentos, 10) || totalAtend;
    const novosReg = parseInt(resumoRow.novos_registros, 10) || 0;
    const atendJaReg = Math.max(0, totalResumo - novosReg);
    return res.json({
      data_reporte: fim || new Date().toISOString().slice(0, 10),
      periodo: { inicio: inicio || null, fim: fim || null },
      resumo_registros: {
        pessoas_ja_registradas: parseInt(resumoRow.pessoas_ja_registradas, 10) || 0,
        novos_registros: novosReg,
        atendimentos_ja_registradas: atendJaReg,
        atendimentos_novos: parseInt(resumoRow.atendimentos_novos, 10) || 0,
        total_atendimentos: totalResumo
      },
      resumo_por_genero: resumoPorGenero,
      resumo_por_faixa: resumoPorFaixa,
      resumo_por_genero_faixa: resumoPorGeneroFaixa,
      indicadores,
      desagregacao: {
        participantes_apoiados: buildMatriz("participantes_apoiados"),
        participantes_orientacao_profissional: buildMatriz("participantes_orientacao_profissional"),
        atendimentos_realizados: buildMatriz("atendimentos_realizados"),
        participantes_elegiveis: buildMatriz("participantes_elegiveis"),
        participantes_nao_elegiveis: buildMatriz("participantes_nao_elegiveis"),
        participantes_atividade_util: buildMatriz("participantes_atividade_util")
      },
      lista_participantes: listaParticipantes
    });
  } catch (error) {
    return next(error);
  }
}

async function exportFamiExcel(req, res, next) {
  try {
    const dadosFami = req.body;
    if (!dadosFami || !dadosFami.indicadores) {
      return res.status(400).json({ error: "Dados do relatório FAMI inválidos. Gere o relatório primeiro." });
    }
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const workbook = await gerarExcel(dadosFami, baseUrl);
    const dataReporte = (dadosFami.data_reporte || "").replace(/-/g, "") || new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `Relatorio-FAMI-Casa-do-Brasil-${dataReporte}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error) {
    console.error("Erro ao exportar Excel FAMI:", error);
    next(error);
  }
}

module.exports = {
  listarRelatorio,
  listarRelatorioFami,
  listarTiposAtendimento,
  relatorioFamiDesagregacao,
  exportFamiExcel
};
