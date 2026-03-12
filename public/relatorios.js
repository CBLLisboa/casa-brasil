const dataInicioInput = document.getElementById("dataInicio");
const dataFimInput = document.getElementById("dataFim");
const generoSelect = document.getElementById("genero");
const faixaEtariaSelect = document.getElementById("faixaEtaria");
const elegivelNptSelect = document.getElementById("elegivelNpt");
const gerarBtn = document.getElementById("gerarRelatorio");
const exportarBtn = document.getElementById("exportarExcel");
const conteudoRelatorio = document.getElementById("conteudoRelatorio");
const mensagemRelatorio = document.getElementById("mensagemRelatorio");

const token = localStorage.getItem("auth_token");
if (!token) {
  window.location.href = "/login";
}

function authHeaders() {
  const stored = localStorage.getItem("auth_token");
  return stored ? { Authorization: `Bearer ${stored}` } : {};
}

function formatarData(data) {
  if (!data) return "-";
  const d = new Date(data);
  return d.toLocaleDateString("pt-PT");
}

function definirDatasPadrao() {
  const hoje = new Date();
  const mesAtras = new Date(hoje);
  mesAtras.setMonth(mesAtras.getMonth() - 1);
  const toYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  if (!dataInicioInput.value) dataInicioInput.value = toYMD(mesAtras);
  if (!dataFimInput.value) dataFimInput.value = toYMD(hoje);
}

let dadosFamiAtual = null;

function configurarSomasAutomaticas() {
  if (!conteudoRelatorio) return;

  function somarResumo() {
    const novos = parseInt(conteudoRelatorio.querySelector(".resumo-novos")?.value, 10) || 0;
    const atendja = parseInt(conteudoRelatorio.querySelector(".resumo-atendja")?.value, 10) || 0;
    const el = conteudoRelatorio.querySelector(".resumo-total");
    if (el) el.textContent = novos + atendja;
  }
  conteudoRelatorio.querySelectorAll(".resumo-novos, .resumo-atendja").forEach((inp) => {
    inp.addEventListener("input", somarResumo);
  });

  function somarGenero() {
    let n = 0, a = 0, t = 0;
    conteudoRelatorio.querySelectorAll(".gen-novos").forEach((inp) => { n += parseInt(inp.value, 10) || 0; });
    conteudoRelatorio.querySelectorAll(".gen-atendja").forEach((inp) => { a += parseInt(inp.value, 10) || 0; });
    conteudoRelatorio.querySelectorAll(".gen-total").forEach((inp) => { t += parseInt(inp.value, 10) || 0; });
    const totNovos = conteudoRelatorio.querySelector(".gen-tot-novos");
    const totAtendja = conteudoRelatorio.querySelector(".gen-tot-atendja");
    const totTotal = conteudoRelatorio.querySelector(".gen-tot-total");
    if (totNovos) totNovos.textContent = n;
    if (totAtendja) totAtendja.textContent = a;
    if (totTotal) totTotal.textContent = t;
  }
  conteudoRelatorio.querySelectorAll(".gen-novos, .gen-atendja, .gen-total").forEach((inp) => {
    inp.addEventListener("input", somarGenero);
  });

  function somarFaixa() {
    let n = 0, a = 0, t = 0;
    conteudoRelatorio.querySelectorAll(".faixa-novos").forEach((inp) => { n += parseInt(inp.value, 10) || 0; });
    conteudoRelatorio.querySelectorAll(".faixa-atendja").forEach((inp) => { a += parseInt(inp.value, 10) || 0; });
    conteudoRelatorio.querySelectorAll(".faixa-total").forEach((inp) => { t += parseInt(inp.value, 10) || 0; });
    const totNovos = conteudoRelatorio.querySelector(".faixa-tot-novos");
    const totAtendja = conteudoRelatorio.querySelector(".faixa-tot-atendja");
    const totTotal = conteudoRelatorio.querySelector(".faixa-tot-total");
    if (totNovos) totNovos.textContent = n;
    if (totAtendja) totAtendja.textContent = a;
    if (totTotal) totTotal.textContent = t;
  }
  conteudoRelatorio.querySelectorAll(".faixa-novos, .faixa-atendja, .faixa-total").forEach((inp) => {
    inp.addEventListener("input", somarFaixa);
  });

  function somarDesagregacao() {
    conteudoRelatorio.querySelectorAll("[data-key]").forEach((el) => {
      const key = el.dataset.key;
      if (!key || !el.classList.contains("desag-estim") && !el.classList.contains("desag-exec")) return;
    });
    const tables = conteudoRelatorio.querySelectorAll(".fami-table");
    tables.forEach((table) => {
      const desagInputs = table.querySelectorAll(".desag-estim, .desag-exec");
      if (desagInputs.length === 0) return;
      const key = desagInputs[0]?.dataset?.key;
      if (!key) return;
      const generos = ["Feminino", "Masculino", "Não Binário", "Outros", "Total"];
      generos.forEach((g) => {
        let sumEst = 0, sumExec = 0;
        table.querySelectorAll(`.desag-estim[data-gen="${g}"]`).forEach((inp) => { sumEst += parseInt(inp.value, 10) || 0; });
        table.querySelectorAll(`.desag-exec[data-gen="${g}"]`).forEach((inp) => { sumExec += parseInt(inp.value, 10) || 0; });
        const totEst = table.querySelector(`.desag-tot-est[data-gen="${g}"]`);
        const totExec = table.querySelector(`.desag-tot-exec[data-gen="${g}"]`);
        if (totEst) totEst.textContent = sumEst;
        if (totExec) totExec.textContent = sumExec;
      });
    });
  }
  conteudoRelatorio.querySelectorAll(".desag-estim, .desag-exec").forEach((inp) => {
    inp.addEventListener("input", somarDesagregacao);
  });

  conteudoRelatorio.querySelectorAll(".indicador-contrat, .indicador-exec").forEach((inp) => {
    inp.addEventListener("input", function () {
      const idx = parseInt(this.dataset.ind, 10);
      const tr = this.closest("tr");
      const contratInp = tr?.querySelector(".indicador-contrat");
      const execInp = tr?.querySelector(".indicador-exec");
      const taxaCell = tr?.querySelector(".taxa-cell");
      if (dadosFamiAtual?.indicadores[idx] && contratInp && execInp && taxaCell) {
        const contrat = parseInt(contratInp.value, 10) || 0;
        const exec = parseInt(execInp.value, 10) || 0;
        taxaCell.textContent = taxaExecucao(contrat, exec);
      }
    });
  });

  conteudoRelatorio.querySelectorAll(".lista-cell").forEach((td) => {
    td.addEventListener("blur", function () {
      const row = parseInt(this.dataset.row, 10);
      const col = this.dataset.col;
      if (!isNaN(row) && col && dadosFamiAtual?.lista_participantes?.[row]) {
        dadosFamiAtual.lista_participantes[row][col] = this.textContent?.trim() ?? "";
      }
    });
  });
}

function taxaExecucao(contrat, execut) {
  const c = parseInt(contrat, 10) || 0;
  const e = parseInt(execut, 10) || 0;
  if (c === 0) return e > 0 ? "100%" : "-";
  return Math.round((e / c) * 100) + "%";
}

function renderIndicadores(indicadores, resumo, resumoPorGenero, resumoPorFaixa, resumoPorGeneroFaixa) {
  const novos = resumo?.novos_registros ?? 0;
  const total = resumo?.total_atendimentos ?? (indicadores?.[1]?.executado ?? 0);
  const atendJa = resumo?.atendimentos_ja_registradas ?? Math.max(0, total - novos);
  let html = `
    <div class="fami-section">
      <h2>Resumo de registos e atendimentos</h2>
      <table class="fami-table" data-table="resumo">
        <thead><tr><th>Novos registos</th><th>Atend. pessoas já registadas</th><th>Total atendimentos</th></tr></thead>
        <tbody><tr>
          <td><input type="number" class="estimado resumo-novos" value="${novos}" min="0" /></td>
          <td><input type="number" class="estimado resumo-atendja" value="${atendJa}" min="0" /></td>
          <td class="total-cell resumo-total">${total}</td>
        </tr></tbody>
      </table>
      <p class="resumo-nota" style="margin-top:12px;font-size:12px;color:#64748b;">1.ª vez que a pessoa vem = novo registo. A partir do 2.º atendimento = pessoa já registada.</p>
  `;
  const generosLista = ["Feminino", "Masculino", "Não Binário", "Outros"];
  const faixasLista = [
    { key: "menor_18", label: "< 18 anos" },
    { key: "18_60", label: "18-60 anos" },
    { key: "maior_60", label: "> 60 anos" }
  ];
  const genMap = (Array.isArray(resumoPorGenero) ? resumoPorGenero : []).reduce((m, r) => { m[r.genero] = r; return m; }, {});
  const faixaMap = (Array.isArray(resumoPorFaixa) ? resumoPorFaixa : []).reduce((m, r) => { m[r.faixa_etaria] = r; return m; }, {});

  html += `
    <h3>Total de atendimentos por género</h3>
    <table class="fami-table" data-table="genero">
      <thead><tr><th>Género</th><th>Novos registos</th><th>Atend. já registadas</th><th>Total atendimentos</th></tr></thead>
      <tbody>`;
  let totGen = { novos: 0, atendJa: 0, total: 0 };
  generosLista.forEach((g) => {
    const r = genMap[g] || {};
    const n = r.novos_registros ?? 0, aJa = r.atendimentos_ja_registradas ?? 0, t = r.total_atendimentos ?? 0;
    totGen.novos += n; totGen.atendJa += aJa; totGen.total += t;
    html += `<tr><td>${g}</td><td><input type="number" class="estimado gen-novos" data-gen="${g}" value="${n}" min="0" /></td><td><input type="number" class="estimado gen-atendja" data-gen="${g}" value="${aJa}" min="0" /></td><td><input type="number" class="estimado gen-total" data-gen="${g}" value="${t}" min="0" /></td></tr>`;
  });
  html += `<tr class="total-row"><td>Total</td><td class="total-cell gen-tot-novos">${totGen.novos}</td><td class="total-cell gen-tot-atendja">${totGen.atendJa}</td><td class="total-cell gen-tot-total">${totGen.total}</td></tr></tbody></table>`;

  html += `
    <h3>Por faixa etária</h3>
    <table class="fami-table" data-table="faixa">
      <thead><tr><th>Faixa etária</th><th>Novos registos</th><th>Atend. já registadas</th><th>Total atendimentos</th></tr></thead>
      <tbody>`;
  let totFaixa = { novos: 0, atendJa: 0, total: 0 };
  faixasLista.forEach((f) => {
    const r = faixaMap[f.key] || {};
    const n = r.novos_registros ?? 0, aJa = r.atendimentos_ja_registradas ?? 0, t = r.total_atendimentos ?? 0;
    totFaixa.novos += n; totFaixa.atendJa += aJa; totFaixa.total += t;
    html += `<tr><td>${f.label}</td><td><input type="number" class="estimado faixa-novos" data-faixa="${f.key}" value="${n}" min="0" /></td><td><input type="number" class="estimado faixa-atendja" data-faixa="${f.key}" value="${aJa}" min="0" /></td><td><input type="number" class="estimado faixa-total" data-faixa="${f.key}" value="${t}" min="0" /></td></tr>`;
  });
  html += `<tr class="total-row"><td>Total</td><td class="total-cell faixa-tot-novos">${totFaixa.novos}</td><td class="total-cell faixa-tot-atendja">${totFaixa.atendJa}</td><td class="total-cell faixa-tot-total">${totFaixa.total}</td></tr></tbody></table>`;

  const matriz = (Array.isArray(resumoPorGeneroFaixa) ? resumoPorGeneroFaixa : []).reduce((m, r) => {
    if (!m[r.faixa_etaria]) m[r.faixa_etaria] = {};
    m[r.faixa_etaria][r.genero] = r;
    return m;
  }, {});
  html += `
    <h3>Por género e faixa etária</h3>
    <table class="fami-table" data-table="matriz">
      <thead><tr><th></th><th colspan="3">Feminino</th><th colspan="3">Masculino</th><th colspan="3">Não Binário</th><th colspan="3">Outros</th></tr>
      <tr class="sub"><th>Faixa</th><th>Novos</th><th>Atend. já reg.</th><th>Total</th><th>Novos</th><th>Atend. já reg.</th><th>Total</th><th>Novos</th><th>Atend. já reg.</th><th>Total</th><th>Novos</th><th>Atend. já reg.</th><th>Total</th></tr></thead>
      <tbody>`;
  faixasLista.forEach((f) => {
    html += `<tr><td>${f.label}</td>`;
    generosLista.forEach((g) => {
      const r = matriz[f.key]?.[g] || {};
      html += `<td><input type="number" class="estimado matriz-val" data-faixa="${f.key}" data-gen="${g}" data-campo="novos" value="${r.novos_registros ?? 0}" min="0" /></td><td><input type="number" class="estimado matriz-val" data-faixa="${f.key}" data-gen="${g}" data-campo="atendja" value="${r.atendimentos_ja_registradas ?? 0}" min="0" /></td><td><input type="number" class="estimado matriz-val" data-faixa="${f.key}" data-gen="${g}" data-campo="total" value="${r.total_atendimentos ?? 0}" min="0" /></td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;

  html += `<p class="resumo-nota" style="margin-top:12px;font-size:12px;color:#64748b;">A lista abaixo mostra apenas <strong>novos registros</strong> (nome, dados gerais e documentos), pois o registo é feito uma vez e a mesma pessoa pode ter vários atendimentos.</p>
    </div>
    <div class="fami-section">
      <h2>Indicadores de realização e resultado</h2>
      <table class="fami-table">
        <thead>
          <tr>
            <th>Tipo de indicador</th>
            <th>Código do indicador</th>
            <th>Designação do indicador</th>
            <th>Contratualizado</th>
            <th>Executado</th>
            <th>Taxa de Execução</th>
          </tr>
        </thead>
        <tbody>
  `;
  indicadores.forEach((ind, idx) => {
    const taxa = taxaExecucao(ind.contratualizado, ind.executado);
    html += `
      <tr>
        <td>${ind.tipo}</td>
        <td>${ind.codigo}</td>
        <td>${ind.designacao}</td>
        <td><input type="number" class="estimado indicador-contrat" data-ind="${idx}" value="${ind.contratualizado || 0}" min="0" /></td>
        <td><input type="number" class="estimado indicador-exec" data-ind="${idx}" value="${ind.executado}" min="0" /></td>
        <td class="taxa-cell">${taxa}</td>
      </tr>
    `;
  });
  html += "</tbody></table></div>";
  return html;
}

function renderDesagregacao(desagregacao) {
  const indicadores = [
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

  const generosDesag = ["Feminino", "Masculino", "Não Binário", "Total"];

  let html = '<div class="fami-section"><h2>Desagregação de participantes</h2>';

  indicadores.forEach((ind) => {
    const matriz = desagregacao[ind.key];
    if (!matriz) return;

    html += `<h3>${ind.titulo}</h3>`;
    html += `
      <table class="fami-table">
        <thead>
          <tr>
            <th></th>
            <th colspan="2">Feminino</th>
            <th colspan="2">Masculino</th>
            <th colspan="2">Não Binário</th>
            <th colspan="2">Total</th>
          </tr>
          <tr class="sub">
            <th></th>
            <th>Estimado</th>
            <th>Executado</th>
            <th>Estimado</th>
            <th>Executado</th>
            <th>Estimado</th>
            <th>Executado</th>
            <th>Estimado</th>
            <th>Executado</th>
          </tr>
        </thead>
        <tbody>
    `;

    faixas.forEach((faixa) => {
      const isTotal = faixa.key === "Total";
      const cells = [];
      generosDesag.forEach((g) => {
        const cel = matriz[faixa.key] && matriz[faixa.key][g] ? matriz[faixa.key][g] : { estimado: 0, executado: 0 };
        if (isTotal) {
          const sumEst = faixas.filter((x) => x.key !== "Total").reduce((s, x) => s + (matriz[x.key]?.[g]?.estimado ?? 0), 0);
          const sumExec = faixas.filter((x) => x.key !== "Total").reduce((s, x) => s + (matriz[x.key]?.[g]?.executado ?? 0), 0);
          cells.push(`<td class="total-cell desag-tot-est" data-key="${ind.key}" data-gen="${g}">${sumEst}</td>`);
          cells.push(`<td class="total-cell desag-tot-exec" data-key="${ind.key}" data-gen="${g}">${sumExec}</td>`);
        } else {
          cells.push(`<td><input type="number" class="estimado desag-estim" data-key="${ind.key}" data-faixa="${faixa.key}" data-gen="${g}" value="${cel.estimado || 0}" min="0" /></td>`);
          cells.push(`<td><input type="number" class="estimado desag-exec" data-key="${ind.key}" data-faixa="${faixa.key}" data-gen="${g}" value="${cel.executado || 0}" min="0" /></td>`);
        }
      });
      html += `
        <tr class="${isTotal ? "total-row" : ""}">
          <td>${faixa.label}</td>
          ${cells.join("")}
        </tr>
      `;
    });

    html += "</tbody></table>";
  });

  html += "</div>";
  return html;
}

function renderListaParticipantes(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    return '<div class="fami-section"><h2>Lista de novos registros (nome, dados e documentos)</h2><p>Nenhum novo registo no período.</p></div>';
  }
  const cols = [
    "data_registro", "nome", "n_atendimento_mensal", "data_nasc", "genero",
    "telefone", "email", "naturalidade", "nacionalidade", "cidade_residencia",
    "morada", "codigo_postal", "distrito", "concelho", "freguesia",
    "tipo_doc", "outro_doc_qual", "numero_doc", "numero_doc_mi_nipc",
    "link_doc_identificacao", "link_doc_rgpd", "mes_atendimento"
  ];
  const labels = {
    data_registro: "Data de registo",
    nome: "Nome",
    n_atendimento_mensal: "Nº vezes atendido",
    data_nasc: "Data nasc.",
    genero: "Género",
    telefone: "Telefone",
    email: "Email",
    naturalidade: "Naturalidade",
    nacionalidade: "Nacionalidade",
    cidade_residencia: "Cidade residência",
    morada: "Morada",
    codigo_postal: "Cód. postal",
    distrito: "Distrito",
    concelho: "Concelho",
    freguesia: "Freguesia",
    tipo_doc: "Tipo doc",
    outro_doc_qual: "Outro doc qual?",
    numero_doc: "Número doc",
    numero_doc_mi_nipc: "Nº doc (MI, NIPC)",
    link_doc_identificacao: "Doc Identificação",
    link_doc_rgpd: "Doc RGPD",
    mes_atendimento: "Mês atendimento"
  };
  let html = '<div class="fami-section"><h2>Lista de novos registros (nome, dados e documentos)</h2>';
  html += '<p class="resumo-nota" style="margin-bottom:12px;font-size:12px;color:#64748b;"><strong>Indicador importante:</strong> A coluna "Nº vezes atendido" mostra quantas vezes cada pessoa foi atendida no período (ex.: o Miguel com 3 = 3 atendimentos). Dados pessoais e morada refletem as alterações mais recentes da ficha do cliente.</p>';
  html += '<div class="table-wrapper" style="overflow-x:auto;"><table class="fami-table fami-lista"><thead><tr>';
  cols.forEach((c) => { html += `<th>${labels[c] || c}</th>`; });
  html += "</tr></thead><tbody>";
  lista.forEach((r, rowIdx) => {
    html += "<tr>";
    cols.forEach((c) => {
      let v = r[c] ?? "";
      const isLink = c === "link_doc_identificacao" || c === "link_doc_rgpd";
      if ((c === "data_nasc" || c === "data_registro") && v) v = formatarData(v);
      if (isLink && v) {
        const paths = String(v).split(/\s*\|\s*/).filter(Boolean);
        v = paths.map((p, i) => {
          const pathClean = p.trim();
          if (!pathClean || pathClean.startsWith("javascript:")) return "";
          const href = pathClean.startsWith("/") ? pathClean : `/${pathClean}`;
          const texto = pathClean.split("/").pop() || `Doc ${i + 1}`;
          return `<a href="${href}" target="_blank" rel="noopener" class="link-doc" title="${pathClean.replace(/"/g, "&quot;")}">${texto}</a>`;
        }).filter(Boolean).join(" ");
      }
      if (isLink) {
        html += `<td>${typeof v === "string" && v.includes("<a ") ? v : String(v)}</td>`;
      } else {
        html += `<td contenteditable="true" class="lista-cell" data-row="${rowIdx}" data-col="${c}">${String(v).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`;
      }
    });
    html += "</tr>";
  });
  html += "</tbody></table></div></div>";
  return html;
}

async function gerarRelatorio() {
  mensagemRelatorio.classList.add("hidden");
  mensagemRelatorio.textContent = "";
  conteudoRelatorio.classList.add("hidden");

  const params = new URLSearchParams();
  if (dataInicioInput.value) params.set("inicio", dataInicioInput.value);
  if (dataFimInput.value) params.set("fim", dataFimInput.value);
  if (generoSelect && generoSelect.value) params.set("genero", generoSelect.value);
  if (faixaEtariaSelect && faixaEtariaSelect.value) params.set("faixa_etaria", faixaEtariaSelect.value);
  if (elegivelNptSelect && elegivelNptSelect.value) params.set("elegivel_npt", elegivelNptSelect.value);

  try {
    const res = await fetch(`/api/relatorios/fami-desagregacao?${params}`, { headers: authHeaders() });
    const dados = await res.json();

    if (res.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/login?msg=Token expirado. Faça login novamente.";
      return;
    }

    if (!res.ok) {
      mensagemRelatorio.textContent = dados.error || "Erro ao gerar relatório.";
      mensagemRelatorio.style.background = "#fee2e2";
      mensagemRelatorio.style.color = "#991b1b";
      mensagemRelatorio.classList.remove("hidden");
      return;
    }

    dadosFamiAtual = dados;

    let html = renderIndicadores(dados.indicadores, dados.resumo_registros, dados.resumo_por_genero, dados.resumo_por_faixa, dados.resumo_por_genero_faixa);
    if (dados.desagregacao) {
      html += renderDesagregacao(dados.desagregacao);
    }
    html += renderListaParticipantes(dados.lista_participantes ?? []);

    conteudoRelatorio.innerHTML = html;
    conteudoRelatorio.classList.remove("hidden");

    configurarSomasAutomaticas();
  } catch (err) {
    console.error(err);
    mensagemRelatorio.textContent = "Erro ao comunicar com o servidor.";
    mensagemRelatorio.style.background = "#fee2e2";
    mensagemRelatorio.style.color = "#991b1b";
    mensagemRelatorio.classList.remove("hidden");
  }
}

function lerValoresEditados() {
  if (!dadosFamiAtual) return;
  const codigoAvisoEl = document.getElementById("codigoAviso");
  const codigoOperacaoEl = document.getElementById("codigoOperacao");
  const pedidoPagamentoEl = document.getElementById("pedidoPagamento");
  if (codigoAvisoEl) dadosFamiAtual.codigo_aviso = codigoAvisoEl.value || "";
  if (codigoOperacaoEl) dadosFamiAtual.codigo_operacao = codigoOperacaoEl.value || "";
  if (pedidoPagamentoEl) dadosFamiAtual.pedido_pagamento = pedidoPagamentoEl.value || "";

  const resumoNovos = document.querySelector(".resumo-novos");
  const resumoAtendja = document.querySelector(".resumo-atendja");
  if (resumoNovos && dadosFamiAtual.resumo_registros) dadosFamiAtual.resumo_registros.novos_registros = parseInt(resumoNovos.value, 10) || 0;
  if (resumoAtendja && dadosFamiAtual.resumo_registros) dadosFamiAtual.resumo_registros.atendimentos_ja_registradas = parseInt(resumoAtendja.value, 10) || 0;
  if (dadosFamiAtual.resumo_registros) {
    dadosFamiAtual.resumo_registros.total_atendimentos = (dadosFamiAtual.resumo_registros.novos_registros || 0) + (dadosFamiAtual.resumo_registros.atendimentos_ja_registradas || 0);
  }

  const generosLista = ["Feminino", "Masculino", "Não Binário", "Outros"];
  if (!dadosFamiAtual.resumo_por_genero) dadosFamiAtual.resumo_por_genero = [];
  generosLista.forEach((g) => {
    const n = parseInt(conteudoRelatorio?.querySelector(`.gen-novos[data-gen="${g}"]`)?.value, 10) || 0;
    const a = parseInt(conteudoRelatorio?.querySelector(`.gen-atendja[data-gen="${g}"]`)?.value, 10) || 0;
    const t = parseInt(conteudoRelatorio?.querySelector(`.gen-total[data-gen="${g}"]`)?.value, 10) || 0;
    let r = dadosFamiAtual.resumo_por_genero.find((x) => x.genero === g);
    if (!r) { r = { genero: g }; dadosFamiAtual.resumo_por_genero.push(r); }
    r.novos_registros = n;
    r.atendimentos_ja_registradas = a;
    r.total_atendimentos = t;
  });

  if (!dadosFamiAtual.resumo_por_faixa) dadosFamiAtual.resumo_por_faixa = [];
  const faixasLista = [{ key: "menor_18" }, { key: "18_60" }, { key: "maior_60" }];
  faixasLista.forEach((f) => {
    const n = parseInt(conteudoRelatorio?.querySelector(`.faixa-novos[data-faixa="${f.key}"]`)?.value, 10) || 0;
    const a = parseInt(conteudoRelatorio?.querySelector(`.faixa-atendja[data-faixa="${f.key}"]`)?.value, 10) || 0;
    const t = parseInt(conteudoRelatorio?.querySelector(`.faixa-total[data-faixa="${f.key}"]`)?.value, 10) || 0;
    let r = dadosFamiAtual.resumo_por_faixa.find((x) => x.faixa_etaria === f.key);
    if (!r) { r = { faixa_etaria: f.key }; dadosFamiAtual.resumo_por_faixa.push(r); }
    r.novos_registros = n;
    r.atendimentos_ja_registradas = a;
    r.total_atendimentos = t;
  });

  conteudoRelatorio?.querySelectorAll(".matriz-val").forEach((inp) => {
    const faixa = inp.dataset.faixa;
    const gen = inp.dataset.gen;
    const campo = inp.dataset.campo;
    if (!faixa || !gen || !campo || !dadosFamiAtual.resumo_por_genero_faixa) return;
    let r = dadosFamiAtual.resumo_por_genero_faixa.find((x) => x.faixa_etaria === faixa && x.genero === gen);
    if (!r) {
      r = { faixa_etaria: faixa, genero: gen, novos_registros: 0, atendimentos_ja_registradas: 0, total_atendimentos: 0 };
      dadosFamiAtual.resumo_por_genero_faixa.push(r);
    }
    const val = parseInt(inp.value, 10) || 0;
    if (campo === "novos") r.novos_registros = val;
    else if (campo === "atendja") r.atendimentos_ja_registradas = val;
    else if (campo === "total") r.total_atendimentos = val;
  });

  document.querySelectorAll(".indicador-contrat").forEach((inp) => {
    const idx = parseInt(inp.dataset.ind, 10);
    if (!isNaN(idx) && dadosFamiAtual.indicadores[idx]) {
      dadosFamiAtual.indicadores[idx].contratualizado = parseInt(inp.value, 10) || 0;
    }
  });
  document.querySelectorAll(".indicador-exec").forEach((inp) => {
    const idx = parseInt(inp.dataset.ind, 10);
    if (!isNaN(idx) && dadosFamiAtual.indicadores[idx]) {
      dadosFamiAtual.indicadores[idx].executado = parseInt(inp.value, 10) || 0;
    }
  });
  document.querySelectorAll(".desag-estim").forEach((inp) => {
    const { key, faixa, gen } = inp.dataset;
    if (key && faixa && gen && dadosFamiAtual.desagregacao?.[key]?.[faixa]?.[gen]) {
      dadosFamiAtual.desagregacao[key][faixa][gen].estimado = parseInt(inp.value, 10) || 0;
    }
  });
  document.querySelectorAll(".desag-exec").forEach((inp) => {
    const { key, faixa, gen } = inp.dataset;
    if (key && faixa && gen && dadosFamiAtual.desagregacao?.[key]?.[faixa]?.[gen]) {
      dadosFamiAtual.desagregacao[key][faixa][gen].executado = parseInt(inp.value, 10) || 0;
    }
  });

  if (dadosFamiAtual.desagregacao) {
    const faixasData = ["menor_18", "18_60", "maior_60"];
    const generos = ["Feminino", "Masculino", "Não Binário", "Outros", "Total"];
    Object.keys(dadosFamiAtual.desagregacao).forEach((key) => {
      if (!dadosFamiAtual.desagregacao[key].Total) dadosFamiAtual.desagregacao[key].Total = {};
      generos.forEach((g) => {
        let sumEst = 0, sumExec = 0;
        faixasData.forEach((faixa) => {
          const cel = dadosFamiAtual.desagregacao[key][faixa]?.[g];
          if (cel) {
            sumEst += cel.estimado ?? 0;
            sumExec += cel.executado ?? 0;
          }
        });
        if (!dadosFamiAtual.desagregacao[key].Total[g]) dadosFamiAtual.desagregacao[key].Total[g] = {};
        dadosFamiAtual.desagregacao[key].Total[g].estimado = sumEst;
        dadosFamiAtual.desagregacao[key].Total[g].executado = sumExec;
      });
    });
  }
}

async function exportarParaExcel() {
  if (!dadosFamiAtual) {
    alert("Gere o relatório primeiro.");
    return;
  }
  lerValoresEditados();

  try {
    exportarBtn.disabled = true;
    exportarBtn.textContent = "A exportar…";

    const bases = [window.location.origin];
    if (!window.location.origin.includes(":5000")) bases.push("http://localhost:5000");
    let res = null;
    for (const base of bases) {
      res = await fetch(`${base}/api/relatorios/export-excel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(dadosFamiAtual)
      });
      if (res.ok) break;
      if (res.status !== 404) break;
    }

    if (res && res.ok) {
      const blob = await res.blob();
      const dataReporte = (dadosFamiAtual.data_reporte || "").replace(/-/g, "") || new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const filename = `Relatorio-FAMI-Casa-do-Brasil-${dataReporte}.xlsx`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }

    if (res && res.status === 404 && typeof XLSX !== "undefined") {
      exportarParaExcelCliente();
      return;
    }

    const err = res ? await res.json().catch(() => ({})) : {};
    throw new Error(err.error || (res ? `Erro ${res.status}` : "Erro de ligação"));
  } catch (err) {
    if (typeof XLSX !== "undefined") {
      exportarParaExcelCliente();
    } else {
      alert(err.message || "Erro ao exportar Excel.");
    }
  } finally {
    exportarBtn.disabled = false;
    exportarBtn.textContent = "Exportar para Excel";
  }
}

function exportarParaExcelCliente() {
  if (!dadosFamiAtual || typeof XLSX === "undefined") return;
  const d = dadosFamiAtual.desagregacao || {};
  const indicadoresLista = [
    { key: "participantes_apoiados", titulo: "Participantes apoiados" },
    { key: "participantes_orientacao_profissional", titulo: "Participantes que receberam orientação profissional individual" },
    { key: "atendimentos_realizados", titulo: "Atendimentos realizados e inscritos na plataforma de registo da RNAIM" },
    { key: "participantes_atividade_util", titulo: "Participantes que comunicaram que a atividade foi útil para a sua integração" }
  ];
  const faixas = [{ key: "menor_18", label: "< 18 anos" }, { key: "18_60", label: "18-60 anos" }, { key: "maior_60", label: "> 60 anos" }, { key: "Total", label: "Total" }];
  const generos = ["Feminino", "Masculino", "Não Binário", "Outros", "Total"];
  const generosDesag = ["Feminino", "Masculino", "Não Binário", "Total"];
  const generosExp = ["Feminino", "Masculino", "Não Binário", "Outros"];
  const faixasExp = [{ key: "menor_18", label: "< 18 anos" }, { key: "18_60", label: "18-60 anos" }, { key: "maior_60", label: "> 60 anos" }];
  const resumo = dadosFamiAtual.resumo_registros || {};
  const totalAtend = resumo.total_atendimentos ?? dadosFamiAtual.indicadores?.[1]?.executado ?? 0;
  const genMapExp = (dadosFamiAtual.resumo_por_genero || []).reduce((m, r) => { m[r.genero] = r; return m; }, {});
  const totGen = generosExp.reduce((a, g) => { const r = genMapExp[g] || {}; return { novos: a.novos + (r.novos_registros ?? 0), atendJa: a.atendJa + (r.atendimentos_ja_registradas ?? 0), total: a.total + (r.total_atendimentos ?? 0) }; }, { novos: 0, atendJa: 0, total: 0 });
  const faixaMapExp = (dadosFamiAtual.resumo_por_faixa || []).reduce((m, r) => { m[r.faixa_etaria] = r; return m; }, {});
  const totFaixa = faixasExp.reduce((a, f) => { const r = faixaMapExp[f.key] || {}; return { novos: a.novos + (r.novos_registros ?? 0), atendJa: a.atendJa + (r.atendimentos_ja_registradas ?? 0), total: a.total + (r.total_atendimentos ?? 0) }; }, { novos: 0, atendJa: 0, total: 0 });
  const matrizExp = (dadosFamiAtual.resumo_por_genero_faixa || []).reduce((m, r) => { if (!m[r.faixa_etaria]) m[r.faixa_etaria] = {}; m[r.faixa_etaria][r.genero] = r; return m; }, {});

  const borderThin = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  const styleH2 = { fill: { patternType: "solid", fgColor: { rgb: "FF0F766E" } }, font: { bold: true, color: { rgb: "FFFFFFFF" } }, alignment: { horizontal: "left" } };
  const styleH3 = { fill: { patternType: "solid", fgColor: { rgb: "FF134E4A" } }, font: { bold: true, color: { rgb: "FFFFFFFF" } }, alignment: { horizontal: "left" } };
  const styleTh = { fill: { patternType: "solid", fgColor: { rgb: "FF0F766E" } }, font: { bold: true, color: { rgb: "FFFFFFFF" } }, border: borderThin, alignment: { horizontal: "center", wrapText: true } };
  const styleThSub = { fill: { patternType: "solid", fgColor: { rgb: "FF0D9488" } }, font: { bold: true, color: { rgb: "FFFFFFFF" } }, border: borderThin, alignment: { horizontal: "center", wrapText: true } };
  const styleTotal = { fill: { patternType: "solid", fgColor: { rgb: "FFE0F2F1" } }, font: { bold: true }, border: borderThin };
  const styleCell = { border: borderThin, alignment: { horizontal: "center" } };
  const styleCellFirstCol = { border: borderThin, fill: { patternType: "solid", fgColor: { rgb: "FFF8FAFC" } }, alignment: { horizontal: "left" } };
  const styleDataRegistro = { border: borderThin, fill: { patternType: "solid", fgColor: { rgb: "FFE0F2F1" } }, alignment: { horizontal: "center" } };
  const styleCabecalho = { fill: { patternType: "solid", fgColor: { rgb: "FFE0F2F1" } }, font: { bold: true }, alignment: { horizontal: "left" } };

  const excelStyle = (ws, r, c, style) => { const ref = XLSX.utils.encode_cell({ r, c }); if (ws[ref]) ws[ref].s = style; };
  const excelStyleRange = (ws, sr, sc, er, ec, style) => { for (let rr = sr; rr <= er; rr++) for (let cc = sc; cc <= ec; cc++) excelStyle(ws, rr, cc, style); };

  const codigoAviso = dadosFamiAtual.codigo_aviso || "";
  const codigoOperacao = dadosFamiAtual.codigo_operacao || "";
  const pedidoPagamento = dadosFamiAtual.pedido_pagamento || "";
  const textoInstrucoes = dadosFamiAtual.instrucoes_preenchimento || "Selecione o período e gere o relatório. Os dados vêm preenchidos. Pode alterar valores na página antes de exportar ou editar no ficheiro .xlsx após exportar.";

  const rows = [];
  const add = (arr) => { rows.push(arr); return rows.length - 1; };
  add(["Código de aviso:", codigoAviso, "Código da operação:", codigoOperacao, "Instruções de preenchimento\n\n" + textoInstrucoes]);
  add(["", "", "", "", ""]);
  add(["", "", "", "", ""]);
  add(["", "", "", "", ""]);
  add(["Pedido de pagamento n.º:", pedidoPagamento]);
  add(["Fundo Asilo, Migração e Integração 2030"]);
  add(["Os Fundos Europeus mais próximos de si."]);
  add(["Cofinanciado pela União Europeia | CLAIM Bairro Alto - Casa do Brasil"]);
  add(["Data de reporte:", dadosFamiAtual.data_reporte || "-", "Período:", (dadosFamiAtual.periodo?.inicio || "-") + " a " + (dadosFamiAtual.periodo?.fim || "-")]);
  rows.push([]);
  const mr = {};
  mr.resumoH2 = add(["Resumo de registos e atendimentos"]);
  add(["Novos registos", "Atend. pessoas já registadas", "Total atendimentos"]);
  add([resumo.novos_registros ?? 0, resumo.atendimentos_ja_registradas ?? 0, totalAtend]);
  add(["1.ª vez que a pessoa vem = novo registo. A partir do 2.º atendimento = pessoa já registada."]);
  rows.push([]);
  mr.genH3 = add(["Total de atendimentos por género"]);
  mr.genTh = add(["Género", "Novos registos", "Atend. já registadas", "Total atendimentos"]);
  generosExp.forEach((g) => { const r = genMapExp[g] || {}; add([g, r.novos_registros ?? 0, r.atendimentos_ja_registradas ?? 0, r.total_atendimentos ?? 0]); });
  mr.genTotal = add(["Total", totGen.novos, totGen.atendJa, totGen.total]);
  rows.push([]);
  mr.faixaH3 = add(["Por faixa etária"]);
  mr.faixaTh = add(["Faixa etária", "Novos registos", "Atend. já registadas", "Total atendimentos"]);
  faixasExp.forEach((f) => { const r = faixaMapExp[f.key] || {}; add([f.label, r.novos_registros ?? 0, r.atendimentos_ja_registradas ?? 0, r.total_atendimentos ?? 0]); });
  mr.faixaTotal = add(["Total", totFaixa.novos, totFaixa.atendJa, totFaixa.total]);
  rows.push([]);
  mr.matrizH3 = add(["Por género e faixa etária"]);
  add(["", "Feminino", "", "", "Masculino", "", "", "Não Binário", "", "", "Outros", "", ""]);
  add(["Faixa", "Novos", "Atend. já reg.", "Total", "Novos", "Atend. já reg.", "Total", "Novos", "Atend. já reg.", "Total", "Novos", "Atend. já reg.", "Total"]);
  const matrizStart = rows.length;
  faixasExp.forEach((f) => { const r = [f.label]; generosExp.forEach((g) => { const x = matrizExp[f.key]?.[g] || {}; r.push(x.novos_registros ?? 0, x.atendimentos_ja_registradas ?? 0, x.total_atendimentos ?? 0); }); add(r); });
  rows.push([]);
  mr.indH2 = add(["Indicadores de realização e resultado"]);
  mr.indTh = add(["Tipo de indicador", "Código do indicador", "Designação do indicador", "Contratualizado", "Executado", "Taxa de Execução"]);
  const indDataStart = rows.length;
  (dadosFamiAtual.indicadores || []).forEach((i) => add([i.tipo, i.codigo, i.designacao, i.contratualizado ?? 0, i.executado, taxaExecucao(i.contratualizado, i.executado)]));
  rows.push([]);
  mr.desagH2 = add(["Desagregação de participantes"]);
  const desagRanges = [];
  indicadoresLista.forEach((ind) => {
    const matriz = d[ind.key] || {};
    const tituloRow = add([ind.titulo]);
    add(["", "Feminino", "", "Masculino", "", "Não Binário", "", "Total", ""]);
    add(["", "Estimado", "Executado", "Estimado", "Executado", "Estimado", "Executado", "Estimado", "Executado"]);
    const dataStart = rows.length;
    faixas.forEach((faixa) => { const r = [faixa.label]; generosDesag.forEach((g) => { const cel = matriz[faixa.key]?.[g] || { estimado: 0, executado: 0 }; r.push(cel.estimado ?? 0, cel.executado ?? 0); }); add(r); });
    desagRanges.push({ tituloRow, thStart: tituloRow + 1, dataStart, dataEnd: rows.length - 1 });
    rows.push([]);
  });
  mr.listaH2 = add(["Lista de novos registros (nome, dados e documentos)"]);
  add(["A lista abaixo mostra apenas novos registros (nome, dados gerais e documentos), pois o registo é feito uma vez e a mesma pessoa pode ter vários atendimentos."]);
  add(["Indicador importante: A coluna Nº vezes atendido mostra quantas vezes cada pessoa foi atendida no período. Dados pessoais e morada refletem as alterações mais recentes da ficha."]);
  const cols = ["data_registro", "nome", "n_atendimento_mensal", "data_nasc", "genero", "telefone", "email", "naturalidade", "nacionalidade", "cidade_residencia", "morada", "codigo_postal", "distrito", "concelho", "freguesia", "tipo_doc", "outro_doc_qual", "numero_doc", "numero_doc_mi_nipc", "link_doc_identificacao", "link_doc_rgpd", "mes_atendimento"];
  const labels = ["Data de registo", "Nome", "Nº vezes atendido", "Data nasc.", "Género", "Telefone", "Email", "Naturalidade", "Nacionalidade", "Cidade residência", "Morada", "Cód. postal", "Distrito", "Concelho", "Freguesia", "Tipo doc", "Outro doc qual?", "Número doc", "Nº doc (MI, NIPC)", "Doc Identificação", "Doc RGPD", "Mês atendimento"];
  add(labels);
  const listaStartRow = rows.length;
  const colDocId = 19;
  const colDocRgpd = 20;
  (dadosFamiAtual.lista_participantes || []).forEach((r) => {
    const row = [];
    cols.forEach((c) => { let v = r[c] ?? ""; if ((c === "data_nasc" || c === "data_registro") && v) v = formatarData(v); if ((c === "link_doc_identificacao" || c === "link_doc_rgpd") && v) { const paths = String(v).split(/\s*\|\s*/).filter(Boolean); v = paths.map((p) => p.split("/").pop() || p).join("; "); } row.push(v); });
    add(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({ s: { r: 0, c: 4 }, e: { r: 3, c: 7 } });
  const maxCols = Math.max(...rows.map((r) => r.length), 1);
  ws["!cols"] = Array.from({ length: maxCols }, (_, i) => ({ wch: Math.max(...rows.map((r) => String(r[i] ?? "").length), 10) }));
  ws["!margins"] = { left: 1, right: 1, top: 1, bottom: 1, header: 0.5, footer: 0.5 };
  for (let r = 0; r <= 9; r++) for (let c = 0; c < Math.max(1, (rows[r] || []).length); c++) excelStyle(ws, r, c, styleCabecalho);
  excelStyle(ws, 0, 0, { fill: { patternType: "solid", fgColor: { rgb: "FFE0F2F1" } }, font: { bold: true, sz: 14 }, alignment: { horizontal: "left" } });
  excelStyle(ws, 0, 4, { fill: { patternType: "solid", fgColor: { rgb: "FFF8FAFC" } }, font: { bold: true, sz: 11 }, alignment: { horizontal: "left", vertical: "top", wrapText: true } });
  excelStyle(ws, mr.resumoH2, 0, styleH2);
  excelStyleRange(ws, mr.resumoH2 + 1, 0, mr.resumoH2 + 1, 2, styleTh);
  excelStyleRange(ws, mr.resumoH2 + 2, 0, mr.resumoH2 + 2, 2, styleCell);
  excelStyle(ws, mr.resumoH2 + 2, 0, styleCellFirstCol);
  for (let i = mr.genTh + 1; i < mr.genTotal; i++) { excelStyleRange(ws, i, 0, i, 3, styleCell); excelStyle(ws, i, 0, styleCellFirstCol); }
  excelStyleRange(ws, mr.genTotal, 0, mr.genTotal, 3, styleTotal);
  excelStyle(ws, mr.faixaH3, 0, styleH3);
  excelStyleRange(ws, mr.faixaTh, 0, mr.faixaTh, 3, styleTh);
  for (let i = mr.faixaTh + 1; i < mr.faixaTotal; i++) { excelStyleRange(ws, i, 0, i, 3, styleCell); excelStyle(ws, i, 0, styleCellFirstCol); }
  excelStyleRange(ws, mr.faixaTotal, 0, mr.faixaTotal, 3, styleTotal);
  excelStyle(ws, mr.matrizH3, 0, styleH3);
  excelStyleRange(ws, mr.matrizH3 + 1, 0, mr.matrizH3 + 2, 12, styleTh);
  excelStyleRange(ws, mr.matrizH3 + 2, 0, mr.matrizH3 + 2, 12, styleThSub);
  for (let i = matrizStart; i < matrizStart + faixasExp.length; i++) { excelStyleRange(ws, i, 0, i, 12, styleCell); excelStyle(ws, i, 0, styleCellFirstCol); }
  excelStyle(ws, mr.indH2, 0, styleH2);
  excelStyleRange(ws, mr.indTh, 0, mr.indTh, 5, styleTh);
  for (let i = indDataStart; i < indDataStart + (dadosFamiAtual.indicadores || []).length; i++) { excelStyleRange(ws, i, 0, i, 5, styleCell); excelStyle(ws, i, 0, styleCellFirstCol); }
  excelStyle(ws, mr.desagH2, 0, styleH2);
  desagRanges.forEach((rg) => {
    excelStyle(ws, rg.tituloRow, 0, styleH3);
    excelStyleRange(ws, rg.thStart, 0, rg.thStart, 10, styleTh);
    excelStyleRange(ws, rg.thStart + 1, 0, rg.thStart + 1, 10, styleThSub);
    for (let i = rg.dataStart; i <= rg.dataEnd; i++) { excelStyleRange(ws, i, 0, i, 10, i === rg.dataEnd ? styleTotal : styleCell); if (i !== rg.dataEnd) excelStyle(ws, i, 0, styleCellFirstCol); }
  });
  excelStyle(ws, mr.listaH2, 0, styleH2);
  excelStyle(ws, mr.listaH2 + 1, 0, { font: { sz: 10, color: { rgb: "FF64748B" } }, alignment: { wrapText: true, vertical: "top" } });
  excelStyle(ws, mr.listaH2 + 2, 0, { font: { sz: 10, color: { rgb: "FF64748B" } }, alignment: { wrapText: true, vertical: "top" } });
  excelStyleRange(ws, listaStartRow, 0, listaStartRow, cols.length - 1, styleTh);
  const numListaRows = (dadosFamiAtual.lista_participantes || []).length;
  const colDataRegistro = 0;
  const baseUrl = window.location.origin;
  const styleLink = { font: { color: { rgb: "FF0F766E" }, underline: true }, border: borderThin, alignment: { horizontal: "center" } };
  for (let i = listaStartRow + 1; i < listaStartRow + 1 + numListaRows; i++) {
    excelStyle(ws, i, colDataRegistro, styleDataRegistro);
    for (let c = 1; c <= cols.length - 1; c++) excelStyle(ws, i, c, styleCell);
  }
  (dadosFamiAtual.lista_participantes || []).forEach((r, idx) => {
    const addHyperlink = (linkVal, col) => {
      if (!linkVal) return;
      const paths = String(linkVal).split(/\s*\|\s*/).filter((p) => p.trim());
      const firstPath = paths[0]?.trim();
      if (firstPath) {
        const pathNorm = firstPath.startsWith("/") ? firstPath : "/" + firstPath;
        const fullUrl = baseUrl + pathNorm;
        const displayText = paths.map((p) => p.split("/").pop() || p).join("; ");
        const cellRef = XLSX.utils.encode_cell({ r: listaStartRow + idx, c: col });
        ws[cellRef] = { t: "s", v: displayText, l: { Target: fullUrl, Tooltip: "Abrir documento" }, s: styleLink };
      }
    };
    addHyperlink(r.link_doc_identificacao, colDocId);
    addHyperlink(r.link_doc_rgpd, colDocRgpd);
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório FAMI");
  const dataReporte = (dadosFamiAtual.data_reporte || "").replace(/-/g, "") || new Date().toISOString().slice(0, 10).replace(/-/g, "");
  XLSX.writeFile(wb, `Relatorio-FAMI-Casa-do-Brasil-${dataReporte}.xlsx`, { cellStyles: true });
}

gerarBtn.addEventListener("click", gerarRelatorio);
exportarBtn.addEventListener("click", exportarParaExcel);

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("auth_token");
  window.location.href = "/login";
});

document.getElementById("voltarPainelBtn").addEventListener("click", () => {
  window.location.href = "/dashboard";
});

if (document.getElementById("alteracaoBtn")) {
  document.getElementById("alteracaoBtn").addEventListener("click", () => {
    window.location.href = "/dashboard";
  });
}

const menuBtn = document.getElementById("menuBtn");
const menuPanel = document.getElementById("menuPanel");
if (menuBtn && menuPanel) {
  menuBtn.addEventListener("click", () => menuPanel.classList.toggle("open"));
  document.addEventListener("click", (e) => {
    if (!menuPanel.contains(e.target) && !menuBtn.contains(e.target)) {
      menuPanel.classList.remove("open");
    }
  });
}

definirDatasPadrao();
