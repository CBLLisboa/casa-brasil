/**
 * Exporta relatório FAMI para Excel com logos (Casa do Brasil, FAMI).
 * Usa ExcelJS para suporte a imagens.
 */
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

const LOGOS_DIR = path.join(__dirname, "../../public/logos");
const PUBLIC_DIR = path.join(__dirname, "../../public");

function formatarData(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function taxaExecucao(contrat, exec) {
  const c = parseInt(contrat, 10) || 0;
  const e = parseInt(exec, 10) || 0;
  if (c <= 0) return e > 0 ? "100%" : "0%";
  return Math.round((e / c) * 100) + "%";
}

async function gerarExcel(dadosFami, baseUrl = "http://localhost:5000") {
  const d = dadosFami.desagregacao || {};
  const indicadoresLista = [
    { key: "participantes_apoiados", titulo: "Participantes apoiados" },
    { key: "participantes_orientacao_profissional", titulo: "Participantes que receberam orientação profissional individual" },
    { key: "atendimentos_realizados", titulo: "Atendimentos realizados e inscritos na plataforma de registo da RNAIM" },
    { key: "participantes_atividade_util", titulo: "Participantes que comunicaram que a atividade foi útil para a sua integração" }
  ];
  const faixas = [
    { key: "menor_18", label: "< 18 anos" },
    { key: "18_60", label: "18-60 anos" },
    { key: "maior_60", label: "> 60 anos" },
    { key: "Total", label: "Total" }
  ];
  const generos = ["Feminino", "Masculino", "Não Binário", "Outros", "Total"];
  const generosDesagregacao = ["Feminino", "Masculino", "Não Binário", "Total"];
  const generosExp = ["Feminino", "Masculino", "Não Binário", "Outros"];
  const faixasExp = [
    { key: "menor_18", label: "< 18 anos" },
    { key: "18_60", label: "18-60 anos" },
    { key: "maior_60", label: "> 60 anos" }
  ];

  const resumo = dadosFami.resumo_registros || {};
  const totalAtend = resumo.total_atendimentos ?? dadosFami.indicadores?.[1]?.executado ?? 0;
  const resumoGen = dadosFami.resumo_por_genero || [];
  const genMapExp = resumoGen.reduce((m, r) => {
    m[r.genero] = r;
    return m;
  }, {});
  const totGen = generosExp.reduce(
    (a, g) => {
      const r = genMapExp[g] || {};
      return {
        novos: a.novos + (r.novos_registros ?? 0),
        atendJa: a.atendJa + (r.atendimentos_ja_registradas ?? 0),
        atendNovos: a.atendNovos + (r.atendimentos_novos ?? 0),
        total: a.total + (r.total_atendimentos ?? 0)
      };
    },
    { novos: 0, atendJa: 0, atendNovos: 0, total: 0 }
  );
  const resumoFaixa = dadosFami.resumo_por_faixa || [];
  const faixaMapExp = resumoFaixa.reduce((m, r) => {
    m[r.faixa_etaria] = r;
    return m;
  }, {});
  const totFaixa = faixasExp.reduce(
    (a, f) => {
      const r = faixaMapExp[f.key] || {};
      return {
        novos: a.novos + (r.novos_registros ?? 0),
        atendJa: a.atendJa + (r.atendimentos_ja_registradas ?? 0),
        atendNovos: a.atendNovos + (r.atendimentos_novos ?? 0),
        total: a.total + (r.total_atendimentos ?? 0)
      };
    },
    { novos: 0, atendJa: 0, atendNovos: 0, total: 0 }
  );
  const matrizExp = (dadosFami.resumo_por_genero_faixa || []).reduce((m, r) => {
    if (!m[r.faixa_etaria]) m[r.faixa_etaria] = {};
    m[r.faixa_etaria][r.genero] = r;
    return m;
  }, {});

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Relatório FAMI", {
    views: [{ state: "frozen", ySplit: 12 }],
    pageSetup: {
      margins: { left: 0.7, right: 0.7, top: 0.7, bottom: 0.7, header: 0.3, footer: 0.3 },
      paperSize: 9,
      orientation: "portrait",
      scale: 100,
      fitToPage: false
    }
  });

  // Logos obrigatórios - template do relatório
  const LOGOS_ABS = "C:\\Users\\mjuly\\OneDrive\\Ambiente de Trabalho\\casa-brasil\\casa-brasil\\backend\\public\\logos";
  const logosDir = (() => {
    const candidates = [
      path.resolve(__dirname, "../../public/logos"),
      LOGOS_ABS,
      path.join(process.cwd(), "public/logos"),
      path.join(process.cwd(), "backend/public/logos")
    ];
    return candidates.find((d) => fs.existsSync(d)) || path.resolve(__dirname, "../../public/logos");
  })();
  const publicDir = path.dirname(logosDir);

  // Detectar extensão real pelo magic bytes (JPEG: FF D8 FF, PNG: 89 50 4E 47)
  const detectImageExt = (buf) => {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
    return null;
  };

  const logoCasaCandidatos = [
    { path: path.join(logosDir, "cbl-logo.png"), ext: "png" },
    { path: path.join(logosDir, "logo-casa.png"), ext: "png" },
    { path: path.join(logosDir, "cbllogo.png.png"), ext: "png" },
    { path: path.join(logosDir, "casa-brasil.png"), ext: "png" },
    { path: path.join(publicDir, "cbllogo.png.png"), ext: "png" },
    { path: path.join(publicDir, "cbllogo.png"), ext: "png" }
  ];
  const logoFamiPath = path.join(logosDir, "fami.png");

  let imageIdRep = null;
  let imageIdAima = null;
  let imageIdFamiBarra = null;
  let imageIdCasa = null;
  let imageIdFami = null;

  // 1. Logos separados: República (rep.jpg), AIMA (AIMA.png), FAMI (FAMI.png)
  const carregarLogo = (filePath, ext) => {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) return null;
    try {
      const buf = fs.readFileSync(fullPath);
      const extReal = detectImageExt(buf) || ext;
      return workbook.addImage({ buffer: buf, extension: extReal });
    } catch (_) {
      try {
        return workbook.addImage({ filename: fullPath, extension: ext });
      } catch (_2) {
        return null;
      }
    }
  };
  const repPath = path.join(logosDir, "rep.jpg");
  const aimaPath = path.join(logosDir, "AIMA.png");
  const famiPath = path.join(logosDir, "FAMI.png");
  imageIdRep = carregarLogo(repPath, "jpeg") || carregarLogo(path.join(LOGOS_ABS, "rep.jpg"), "jpeg");
  imageIdAima = carregarLogo(aimaPath, "png") || carregarLogo(path.join(LOGOS_ABS, "AIMA.png"), "png");
  imageIdFamiBarra = carregarLogo(famiPath, "png") || carregarLogo(path.join(LOGOS_ABS, "FAMI.png"), "png");

  // 2. Logo Casa do Brasil (cabeçalho)
  for (const { path: p, ext } of logoCasaCandidatos) {
    const fullPath = path.resolve(p);
    if (fs.existsSync(fullPath)) {
      try {
        const buf = fs.readFileSync(fullPath);
        imageIdCasa = workbook.addImage({ buffer: buf, extension: ext });
        break;
      } catch (e1) {
        try {
          imageIdCasa = workbook.addImage({ filename: fullPath, extension: ext });
          break;
        } catch (e2) {
          console.warn("Logo Casa não carregado:", fullPath, e2.message);
        }
      }
    }
  }

  // 3. Logo FAMI (usado se não houver barra)
  if (fs.existsSync(logoFamiPath)) {
    try {
      imageIdFami = workbook.addImage({
        filename: logoFamiPath,
        extension: "png"
      });
    } catch (e) {
      console.warn("Logo FAMI não carregado:", e.message);
    }
  }

  // Altura e largura das primeiras linhas
  ws.getRow(1).height = 55;
  ws.getRow(2).height = 20;
  for (let c = 1; c <= 10; c++) ws.getColumn(c).width = 12;

  // Cabeçalho: apenas logo Casa do Brasil (República, AIMA, FAMI vão para o rodapé)
  if (imageIdCasa) {
    ws.addImage(imageIdCasa, { tl: { col: 0, row: 0 }, ext: { width: 100, height: 50 }, editAs: "oneCell" });
  }

  const addRow = (arr, rowNum) => {
    const row = ws.getRow(rowNum);
    arr.forEach((v, c) => {
      const cell = row.getCell(c + 1);
      cell.value = v != null && v !== undefined ? v : "";
    });
  };

  const borderNone = {
    top: { style: "none" },
    bottom: { style: "none" },
    left: { style: "none" },
    right: { style: "none" }
  };
  const borderCabecalho = borderNone;
  const styleCabecalho = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2F1" } },
    font: { bold: true, size: 11 },
    alignment: { horizontal: "left", vertical: "middle", indent: 1 },
    border: borderCabecalho
  };
  const codigoAviso = dadosFami.codigo_aviso ?? process.env.FAMI_CODIGO_AVISO ?? "";
  const codigoOperacao = dadosFami.codigo_operacao ?? process.env.FAMI_CODIGO_OPERACAO ?? "";
  const pedidoPagamento = dadosFami.pedido_pagamento ?? process.env.FAMI_PEDIDO_PAGAMENTO ?? "";

  let row = 3;
  addRow(["INSTRUÇÕES DE PREENCHIMENTO"], row);
  ws.mergeCells(row, 1, row, 3);
  row++;
  addRow(
    [
      "- Preencher as células destacadas a cinzento;\n- Consultar a ajuda de contexto constante dos cabeçalhos das colunas, clicando sobre os mesmos ('Contratualizado', 'Executado' e 'Estimado');\n- Os indicadores executados devem corresponder apenas aos indicadores alcançados no período a que reporta o pedido de pagamento submetido. O apuramento dos valores acumulados é realizado pela AG FAMI 2030."
    ],
    row
  );
  ws.mergeCells(row, 1, row, 3);
  ws.getRow(row).getCell(1).alignment = { wrapText: true, vertical: "top" };
  ws.getRow(row).height = 60;
  row++;
  row++;
  addRow(["Código do aviso:", codigoAviso, "Código da operação:", codigoOperacao], row++);
  addRow(["Pedido de pagamento n.º:", pedidoPagamento], row++);
  addRow(["Fundo Asilo, Migração e Integração 2030"], row++);
  addRow(["Os Fundos Europeus mais próximos de si."], row++);
  addRow(["Cofinanciado pela União Europeia | CLAIM Bairro Alto - Casa do Brasil"], row++);
  addRow(
    [
      "Data de reporte:",
      dadosFami.data_reporte || "-",
      "Período:",
      (dadosFami.periodo?.inicio || "-") + " a " + (dadosFami.periodo?.fim || "-")
    ],
    row++
  );
  row++;

  const markers = {};
  markers.resumoH2 = row;
  addRow(["Resumo de registos e atendimentos"], row);
  ws.mergeCells(row, 1, row, 3);
  row++;
  addRow(["Novos registos", "Atend. pessoas já registadas", "Total atendimentos"], row++);
  addRow([resumo.novos_registros ?? 0, resumo.atendimentos_ja_registradas ?? 0, totalAtend], row++);
  row++;

  markers.genH3 = row;
  addRow(["Total de atendimentos por género"], row);
  ws.mergeCells(row, 1, row, 4);
  row++;
  markers.genTh = row;
  addRow(["Género", "Novos registos", "Atend. já registadas", "Total atendimentos"], row++);
  generosExp.forEach((g) => {
    const r = genMapExp[g] || {};
    addRow([g, r.novos_registros ?? 0, r.atendimentos_ja_registradas ?? 0, r.total_atendimentos ?? 0], row++);
  });
  markers.genTotal = row;
  addRow(["Total", totGen.novos, totGen.atendJa, totGen.total], row++);
  row++;

  markers.faixaH3 = row;
  addRow(["Por faixa etária"], row);
  ws.mergeCells(row, 1, row, 4);
  row++;
  markers.faixaTh = row;
  addRow(["Faixa etária", "Novos registos", "Atend. já registadas", "Total atendimentos"], row++);
  faixasExp.forEach((f) => {
    const r = faixaMapExp[f.key] || {};
    addRow([f.label, r.novos_registros ?? 0, r.atendimentos_ja_registradas ?? 0, r.total_atendimentos ?? 0], row++);
  });
  markers.faixaTotal = row;
  addRow(["Total", totFaixa.novos, totFaixa.atendJa, totFaixa.total], row++);
  row++;

  markers.matrizH3 = row;
  addRow(["Por género e faixa etária"], row);
  ws.mergeCells(row, 1, row, 13);
  row++;
  addRow(
    [
      "",
      "Feminino",
      "",
      "",
      "Masculino",
      "",
      "",
      "Não Binário",
      "",
      "",
      "Outros",
      "",
      ""
    ],
    row++
  );
  addRow(
    [
      "Faixa",
      "Novos",
      "Atend. já reg.",
      "Total",
      "Novos",
      "Atend. já reg.",
      "Total",
      "Novos",
      "Atend. já reg.",
      "Total",
      "Novos",
      "Atend. já reg.",
      "Total"
    ],
    row++
  );
  const matrizStart = row;
  faixasExp.forEach((f) => {
    const r = [f.label];
    generosExp.forEach((g) => {
      const x = matrizExp[f.key]?.[g] || {};
      r.push(x.novos_registros ?? 0, x.atendimentos_ja_registradas ?? 0, x.total_atendimentos ?? 0);
    });
    addRow(r, row++);
  });
  row++;

  markers.indH2 = row;
  addRow(["Indicadores de realização e resultado"], row);
  ws.mergeCells(row, 1, row, 6);
  row++;
  markers.indTh = row;
  addRow(
    [
      "Tipo de indicador",
      "Código do indicador",
      "Designação do indicador",
      "Contratualizado",
      "Executado",
      "Taxa de Execução"
    ],
    row++
  );
  const indDataStart = row;
  (dadosFami.indicadores || []).forEach((i) => {
    addRow(
      [
        i.tipo,
        i.codigo,
        i.designacao,
        i.contratualizado ?? 0,
        i.executado,
        taxaExecucao(i.contratualizado, i.executado)
      ],
      row++
    );
  });
  row++;

  markers.desagH2 = row;
  addRow(["Desagregação de participantes"], row);
  ws.mergeCells(row, 1, row, 9);
  row++;
  const desagRanges = [];
  indicadoresLista.forEach((ind) => {
    const matriz = d[ind.key] || {};
    const tituloRow = row;
    addRow([ind.titulo], row);
    ws.mergeCells(row, 1, row, 9);
    row++;
    addRow(
      ["", "Feminino", "", "Masculino", "", "Não Binário", "", "Total", ""],
      row++
    );
    addRow(
      [
        "",
        "Estimado",
        "Executado",
        "Estimado",
        "Executado",
        "Estimado",
        "Executado",
        "Estimado",
        "Executado"
      ],
      row++
    );
    const dataStart = row;
    faixas.forEach((faixa) => {
      const r = [faixa.label];
      generosDesagregacao.forEach((g) => {
        const cel =
          matriz[faixa.key] && matriz[faixa.key][g] ? matriz[faixa.key][g] : { estimado: 0, executado: 0 };
        r.push(cel.estimado ?? 0, cel.executado ?? 0);
      });
      addRow(r, row++);
    });
    desagRanges.push({ tituloRow, thStart: tituloRow + 1, dataStart, dataEnd: row - 1 });
    row++;
  });

  markers.listaH2 = row;
  addRow(["Lista de novos registos (nome, dados e documentos)"], row);
  ws.mergeCells(row, 1, row, 22);
  row++;
  const cols = [
    "data_registro",
    "nome",
    "n_atendimento_mensal",
    "data_nasc",
    "genero",
    "telefone",
    "email",
    "naturalidade",
    "nacionalidade",
    "cidade_residencia",
    "morada",
    "codigo_postal",
    "distrito",
    "concelho",
    "freguesia",
    "tipo_doc",
    "outro_doc_qual",
    "numero_doc",
    "numero_doc_mi_nipc",
    "link_doc_identificacao",
    "link_doc_rgpd",
    "mes_atendimento"
  ];
  const labels = [
    "Data de registo",
    "Nome",
    "Nº vezes atendido",
    "Data nasc.",
    "Género",
    "Telefone",
    "Email",
    "Naturalidade",
    "Nacionalidade",
    "Cidade residência",
    "Morada",
    "Cód. postal",
    "Distrito",
    "Concelho",
    "Freguesia",
    "Tipo doc",
    "Outro doc qual?",
    "Número doc",
    "Nº doc (MI, NIPC)",
    "Doc Identificação",
    "Doc RGPD",
    "Mês atendimento"
  ];
  addRow(labels, row++);
  const listaStartRow = row;
  const numListaCols = cols.length;
  const listaParticipantes = dadosFami.lista_participantes || [];
  listaParticipantes.forEach((r) => {
    const rowData = [];
    cols.forEach((c) => {
      let v = r[c] ?? "";
      if ((c === "data_nasc" || c === "data_registro") && v) v = formatarData(v);
      if ((c === "link_doc_identificacao" || c === "link_doc_rgpd") && v) {
        const paths = String(v)
          .split(/\s*\|\s*/)
          .filter(Boolean);
        v = paths
          .map((p) => p.split("/").pop() || p)
          .join("; ");
      }
      rowData.push(v);
    });
    addRow(rowData, row++);
  });

  // Rodapé: logos República, AIMA, FAMI (ordem conforme modelo)
  row++;
  const footerRow1Based = row;
  const footerRow0Based = footerRow1Based - 1;
  let footerCol = 0;
  if (imageIdRep) {
    ws.addImage(imageIdRep, { tl: { col: footerCol, row: footerRow0Based }, ext: { width: 60, height: 40 }, editAs: "oneCell" });
    footerCol += 2;
  }
  if (imageIdAima) {
    ws.addImage(imageIdAima, { tl: { col: footerCol, row: footerRow0Based }, ext: { width: 60, height: 40 }, editAs: "oneCell" });
    footerCol += 2;
  }
  if (imageIdFamiBarra) {
    ws.addImage(imageIdFamiBarra, { tl: { col: footerCol, row: footerRow0Based }, ext: { width: 60, height: 40 }, editAs: "oneCell" });
  }
  if (imageIdRep || imageIdAima || imageIdFamiBarra) {
    ws.getRow(footerRow1Based).height = 50;
  }

  // Estilos (sem divisórias de colunas, layout limpo como no modelo)
  const borderThin = borderNone;
  const styleH2 = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } },
    font: { bold: true, size: 12, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "left", vertical: "middle", indent: 1 },
    border: borderThin
  };
  const styleH3 = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF134E4A" } },
    font: { bold: true, size: 11, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "left", vertical: "middle", indent: 1 },
    border: borderThin
  };
  const styleTh = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } },
    font: { bold: true, size: 11, color: { argb: "FFFFFFFF" } },
    border: borderThin,
    alignment: { horizontal: "center", vertical: "middle", wrapText: true }
  };
  const styleThSub = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } },
    font: { bold: true, size: 10, color: { argb: "FFFFFFFF" } },
    border: borderThin,
    alignment: { horizontal: "center", vertical: "middle", wrapText: true }
  };
  const styleTotal = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2F1" } },
    font: { bold: true, size: 11 },
    border: borderThin,
    alignment: { horizontal: "center", vertical: "middle" }
  };
  const styleCell = {
    border: borderThin,
    alignment: { horizontal: "center", vertical: "middle" },
    font: { size: 11 }
  };
  const styleCellFirstCol = {
    border: borderThin,
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } },
    alignment: { horizontal: "left", vertical: "middle", indent: 1 },
    font: { size: 11 }
  };
  const styleDataRegistroEscuro = {
    border: borderThin,
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } },
    alignment: { horizontal: "center", vertical: "middle" },
    font: { size: 11, color: { argb: "FFFFFFFF" }, bold: false }
  };
  const styleDataRegistroClaro = {
    border: borderThin,
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFCCFBF1" } },
    alignment: { horizontal: "center", vertical: "middle" },
    font: { size: 11 }
  };
  const styleNomeClaro = {
    border: borderThin,
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFCCFBF1" } },
    alignment: { horizontal: "left", vertical: "middle", indent: 1 },
    font: { size: 11 }
  };
  const styleRowAlt = {
    ...styleCell,
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
  };
  const styleRowAltFirstCol = {
    ...styleCellFirstCol,
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } },
    alignment: { horizontal: "left", vertical: "middle", indent: 1 }
  };

  // Alturas de linha para melhor legibilidade
  ws.getRow(3).height = 22;
  ws.getRow(4).height = 55;
  for (let r = 6; r <= 11; r++) ws.getRow(r).height = 20;
  [markers.resumoH2, markers.genH3, markers.faixaH3, markers.matrizH3, markers.indH2, markers.desagH2].forEach((r) => {
    if (ws.getRow(r)) ws.getRow(r).height = 26;
  });
  desagRanges.forEach((rg) => {
    if (ws.getRow(rg.tituloRow)) ws.getRow(rg.tituloRow).height = 26;
  });

  const styleInstrucoes = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } },
    font: { size: 10 },
    alignment: { wrapText: true, vertical: "top" },
    border: borderCabecalho
  };
  for (let c = 1; c <= 3; c++) {
    ws.getRow(3).getCell(c).style = { ...styleCabecalho, font: { bold: true, size: 11 } };
    ws.getRow(4).getCell(c).style = styleInstrucoes;
  }
  for (let r = 6; r <= 11; r++) {
    const rowObj = ws.getRow(r);
    for (let c = 1; c <= 8; c++) {
      try {
        const cell = rowObj.getCell(c);
        cell.style = { ...styleCabecalho, border: borderCabecalho };
      } catch (_) {}
    }
  }
  ws.getRow(6).getCell(1).font = { bold: true, size: 12 };
  ws.getRow(markers.resumoH2).getCell(1).style = styleH2;
  for (let c = 1; c <= 3; c++) ws.getRow(markers.resumoH2 + 1).getCell(c).style = styleTh;
  for (let c = 1; c <= 3; c++) ws.getRow(markers.resumoH2 + 2).getCell(c).style = styleCell;
  ws.getRow(markers.resumoH2 + 2).getCell(1).style = styleCellFirstCol;

  ws.getRow(markers.genH3).getCell(1).style = styleH3;
  for (let c = 1; c <= 4; c++) ws.getRow(markers.genTh).getCell(c).style = styleTh;
  for (let i = markers.genTh + 1; i < markers.genTotal; i++) {
    const alt = (i - markers.genTh) % 2 === 0;
    for (let c = 1; c <= 4; c++) ws.getRow(i).getCell(c).style = alt ? styleRowAlt : styleCell;
    ws.getRow(i).getCell(1).style = alt ? styleRowAltFirstCol : styleCellFirstCol;
  }
  for (let c = 1; c <= 4; c++) ws.getRow(markers.genTotal).getCell(c).style = styleTotal;

  ws.getRow(markers.faixaH3).getCell(1).style = styleH3;
  for (let c = 1; c <= 4; c++) ws.getRow(markers.faixaTh).getCell(c).style = styleTh;
  for (let i = markers.faixaTh + 1; i < markers.faixaTotal; i++) {
    const alt = (i - markers.faixaTh) % 2 === 0;
    for (let c = 1; c <= 4; c++) ws.getRow(i).getCell(c).style = alt ? styleRowAlt : styleCell;
    ws.getRow(i).getCell(1).style = alt ? styleRowAltFirstCol : styleCellFirstCol;
  }
  for (let c = 1; c <= 4; c++) ws.getRow(markers.faixaTotal).getCell(c).style = styleTotal;

  ws.getRow(markers.matrizH3).getCell(1).style = styleH3;
  for (let c = 1; c <= 13; c++) {
    ws.getRow(markers.matrizH3 + 1).getCell(c).style = styleTh;
    ws.getRow(markers.matrizH3 + 2).getCell(c).style = styleThSub;
  }
  for (let i = matrizStart; i < matrizStart + faixasExp.length; i++) {
    const alt = (i - matrizStart) % 2 === 0;
    for (let c = 1; c <= 13; c++) ws.getRow(i).getCell(c).style = alt ? styleRowAlt : styleCell;
    ws.getRow(i).getCell(1).style = alt ? styleRowAltFirstCol : styleCellFirstCol;
  }

  ws.getRow(markers.indH2).getCell(1).style = styleH2;
  for (let c = 1; c <= 6; c++) ws.getRow(markers.indTh).getCell(c).style = styleTh;
  for (let i = indDataStart; i < indDataStart + (dadosFami.indicadores || []).length; i++) {
    const alt = (i - indDataStart) % 2 === 0;
    for (let c = 1; c <= 6; c++) ws.getRow(i).getCell(c).style = alt ? styleRowAlt : styleCell;
    ws.getRow(i).getCell(1).style = alt ? styleRowAltFirstCol : styleCellFirstCol;
  }

  ws.getRow(markers.desagH2).getCell(1).style = styleH2;
  desagRanges.forEach((rg) => {
    ws.getRow(rg.tituloRow).getCell(1).style = styleH3;
    for (let c = 1; c <= 9; c++) {
      ws.getRow(rg.thStart).getCell(c).style = styleTh;
      ws.getRow(rg.thStart + 1).getCell(c).style = styleThSub;
    }
    for (let i = rg.dataStart; i <= rg.dataEnd; i++) {
      const isTotal = i === rg.dataEnd;
      const alt = !isTotal && (i - rg.dataStart) % 2 === 0;
      const st = isTotal ? styleTotal : (alt ? styleRowAlt : styleCell);
      const stFirst = isTotal ? styleTotal : (alt ? styleRowAltFirstCol : styleCellFirstCol);
      for (let c = 1; c <= 9; c++) ws.getRow(i).getCell(c).style = st;
      if (!isTotal) ws.getRow(i).getCell(1).style = stFirst;
    }
  });

  ws.getRow(markers.listaH2).getCell(1).style = styleH2;
  const listaHeaderRow = listaStartRow - 1;
  for (let c = 1; c <= numListaCols; c++) ws.getRow(listaHeaderRow).getCell(c).style = styleTh;
  const colDataRegistro = 1;
  const colNome = 2;
  for (let i = listaStartRow + 1; i < listaStartRow + 1 + listaParticipantes.length; i++) {
    const alt = (i - listaStartRow - 1) % 2 === 0;
    ws.getRow(i).getCell(colDataRegistro).style = alt ? styleDataRegistroClaro : styleDataRegistroEscuro;
    ws.getRow(i).getCell(colNome).style = styleNomeClaro;
    for (let c = 3; c <= numListaCols; c++) ws.getRow(i).getCell(c).style = alt ? styleRowAlt : styleCell;
  }

  // Hiperlinks para documentos
  const colDocId = 20;
  const colDocRgpd = 21;
  listaParticipantes.forEach((r, idx) => {
    const addHyperlink = (linkVal, col) => {
      if (!linkVal) return;
      const paths = String(linkVal)
        .split(/\s*\|\s*/)
        .filter((p) => p.trim());
      const firstPath = paths[0]?.trim();
      if (firstPath) {
        const pathNorm = firstPath.startsWith("/") ? firstPath : "/" + firstPath;
        const fullUrl = baseUrl + pathNorm;
        const displayText = paths
          .map((p) => p.split("/").pop() || p)
          .join("; ");
        const cell = ws.getRow(listaStartRow + idx).getCell(col);
        cell.value = {
          text: displayText,
          hyperlink: fullUrl
        };
        cell.font = { color: { argb: "FF0F766E" }, underline: true };
      }
    };
    addHyperlink(r.link_doc_identificacao, colDocId);
    addHyperlink(r.link_doc_rgpd, colDocRgpd);
  });

  // Largura das colunas (valores mínimos para legibilidade)
  const colWidths = {
    1: 16, 2: 24, 3: 12, 4: 12, 5: 14, 6: 16, 7: 22, 8: 14, 9: 14, 10: 16,
    11: 24, 12: 10, 13: 12, 14: 14, 15: 14, 16: 12, 17: 12, 18: 14, 19: 14,
    20: 18, 21: 14, 22: 12
  };
  const maxCol = 25;
  for (let c = 1; c <= maxCol; c++) {
    let maxLen = colWidths[c] || 12;
    ws.eachRow({ includeEmpty: true }, (r, rowNumber) => {
      const v = r.getCell(c).value;
      if (v != null && v !== undefined) {
        const text = typeof v === "object" && v.text ? v.text : String(v);
        maxLen = Math.max(maxLen, Math.min(text.length, 45));
      }
    });
    ws.getColumn(c).width = Math.min(maxLen, 45);
  }

  // Alturas adicionais para linhas de cabeçalho e notas
  [markers.genTh, markers.faixaTh, markers.indTh, listaHeaderRow].forEach((r) => { if (ws.getRow(r)) ws.getRow(r).height = 22; });

  ws.pageSetup.printTitlesRow = `${listaHeaderRow}:${listaHeaderRow}`;
  const lastRow = row;
  const colLetter = (n) => {
    let s = "";
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };
  ws.pageSetup.printArea = `A1:${colLetter(numListaCols)}${lastRow}`;

  // Proteger a folha para que o Excel não possa ser editado após envio
  const senhaProtecao = process.env.FAMI_EXCEL_PASSWORD || "RelatorioFAMI";
  await ws.protect(senhaProtecao, {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    filter: false,
    useAutoFilter: false,
    pivotTables: false,
    editObjects: false,
    editScenarios: false
  });

  return workbook;
}

module.exports = { gerarExcel };
