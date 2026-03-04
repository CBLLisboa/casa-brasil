const form = document.getElementById("formAtendimento");
const resultado = document.getElementById("resultado");
const botaoBuscar = document.getElementById("buscarPessoa");
const campoBusca = document.getElementById("buscaPessoa");
const listaBuscaPessoas = document.getElementById("listaBuscaPessoas");
const botaoLimpar = document.getElementById("limparPessoa");
const campoParenteId = document.querySelector("input[name='parente_id']");
const selectParentesco = document.querySelector("select[name='grau_parentesco']");
const campoParentescoOutro = document.querySelector("input[name='grau_parentesco_outro']");
const parentescoOutroWrapper = document.getElementById("parentescoOutroWrapper");
const pessoaSelecionadaInfo = document.getElementById("pessoaSelecionadaInfo");
const parenteInfo = document.getElementById("parenteInfo");
const nacionalidadeSelect = document.getElementById("nacionalidadeSelect");
const nacionalidadeOutraWrapper = document.getElementById("nacionalidadeOutraWrapper");
const nacionalidadeOutraInput = document.querySelector("input[name='nacionalidade_outro']");
const salvarPessoaBtn = document.getElementById("salvarPessoa");
const distritoSelect = document.querySelector("select[name='distrito']");
const buscaParenteInput = document.getElementById("buscaParente");
const buscarParenteBtn = document.getElementById("buscarParente");
const parenteSelect = document.getElementById("parenteSelect");
const logoutBtn = document.getElementById("logoutBtn");
const voltarPainelBtn = document.getElementById("voltarPainelBtn");
const procurarPessoaBtn = document.getElementById("procurarPessoaBtn");
const criarPessoaTopoBtn = document.getElementById("criarPessoaTopoBtn");
const criarPessoaTopoBtnInline = document.getElementById("criarPessoaTopoBtnInline");
const topoBusca = document.getElementById("topoBusca");
const menuBtn = document.getElementById("menuBtn");
const menuPanel = document.getElementById("menuPanel");
let pessoaSelecionadaId = null;
let atendimentoIdToEdit = null;

const token = localStorage.getItem("auth_token");
if (!token) {
  window.location.href = "/login";
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("auth_token");
    window.location.href = "/login";
  });
}

if (voltarPainelBtn) {
  voltarPainelBtn.addEventListener("click", () => {
    window.location.href = "/dashboard";
  });
}

if (procurarPessoaBtn) {
  procurarPessoaBtn.addEventListener("click", () => {
    if (topoBusca) topoBusca.scrollIntoView({ behavior: "smooth" });
    campoBusca.focus();
  });
}

if (document.getElementById("relatoriosBtn")) {
  document.getElementById("relatoriosBtn").addEventListener("click", () => {
    window.location.href = "/relatorios";
  });
}


function iniciarNovoRegistro() {
  form.reset();
  atendimentoIdToEdit = null;
  pessoaSelecionadaId = null;
  mostrarInfoBox(pessoaSelecionadaInfo, "");
  salvarPessoaBtn.classList.add("hidden");
  resultado.textContent = "";
  const submitBtn = document.getElementById("submitAtendimentoBtn");
  if (submitBtn) submitBtn.textContent = "Gravar atendimento";
  const secaoDocs = document.getElementById("secaoDocumentos");
  if (secaoDocs) secaoDocs.classList.remove("hidden");
  if (listaBuscaPessoas) {
    listaBuscaPessoas.classList.add("hidden");
    listaBuscaPessoas.innerHTML = "";
  }
  ajustarNacionalidadeOutro();
  ajustarParentescoOutro();
  form.scrollIntoView({ behavior: "smooth" });
  if (form.nome_completo) {
    form.nome_completo.focus();
  }
}

if (criarPessoaTopoBtn) {
  criarPessoaTopoBtn.addEventListener("click", () => iniciarNovoRegistro());
}

if (criarPessoaTopoBtnInline) {
  criarPessoaTopoBtnInline.addEventListener("click", () => {
    iniciarNovoRegistro();
  });
}

if (menuBtn && menuPanel) {
  menuBtn.addEventListener("click", () => {
    menuPanel.classList.toggle("open");
  });
  document.addEventListener("click", (event) => {
    if (!menuPanel.contains(event.target) && !menuBtn.contains(event.target)) {
      menuPanel.classList.remove("open");
    }
  });
}

function authHeaders() {
  const stored = localStorage.getItem("auth_token");
  return stored ? { Authorization: `Bearer ${stored}` } : {};
}

async function pessoaTemAtendimentos(pessoaId) {
  if (!pessoaId) return false;
  try {
    const res = await fetch(`/api/atendimentos/pessoa/${pessoaId}`, { headers: authHeaders() });
    const dados = await res.json();
    return Array.isArray(dados) && dados.length > 0;
  } catch {
    return false;
  }
}

function mostrarMensagem(texto, sucesso = true) {
  resultado.textContent = texto;
  resultado.style.background = sucesso ? "#dcfce7" : "#fee2e2";
  resultado.style.color = sucesso ? "#14532d" : "#991b1b";
}

function formatarData(data) {
  if (!data) return "";
  const d = new Date(data);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return "";
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade -= 1;
  }
  return idade;
}

function mostrarInfoBox(elemento, texto) {
  if (!texto) {
    elemento.classList.add("hidden");
    elemento.textContent = "";
    return;
  }
  elemento.textContent = texto;
  elemento.classList.remove("hidden");
}

async function carregarPaises() {
  const resposta = await fetch("/api/paises", { headers: authHeaders() });
  const paises = await resposta.json();

  nacionalidadeSelect.innerHTML = '<option value="">Selecione</option>';
  paises.forEach((pais) => {
    const option = document.createElement("option");
    option.value = pais.nome_pt;
    option.textContent = pais.nome_pt;
    nacionalidadeSelect.appendChild(option);
  });
  const optionOutro = document.createElement("option");
  optionOutro.value = "Outro";
  optionOutro.textContent = "Outro";
  nacionalidadeSelect.appendChild(optionOutro);
}

function ajustarNacionalidadeOutro() {
  const precisaOutro = nacionalidadeSelect.value === "Outro";
  nacionalidadeOutraWrapper.classList.toggle("hidden", !precisaOutro);
  nacionalidadeOutraInput.required = precisaOutro;
  if (!precisaOutro) {
    nacionalidadeOutraInput.value = "";
  }
}

async function carregarPessoaSelecionada(id) {
  if (!id) {
    mostrarInfoBox(pessoaSelecionadaInfo, "");
    salvarPessoaBtn.classList.add("hidden");
    return;
  }
  const resposta = await fetch(`/api/pessoas/${id}`, { headers: authHeaders() });
  if (!resposta.ok) {
    mostrarInfoBox(pessoaSelecionadaInfo, "Pessoa nao encontrada.");
    return;
  }
  const pessoa = await resposta.json();

  form.nome_completo.value = pessoa.nome_completo || "";
  form.data_nascimento.value = formatarData(pessoa.data_nascimento);
  form.idade.value = calcularIdade(pessoa.data_nascimento);
  form.naturalidade.value = pessoa.naturalidade || "";
  form.genero.value = pessoa.genero || "";
  form.estado_civil.value = pessoa.estado_civil || "";
  form.profissao.value = pessoa.profissao || "";
  form.habilitacoes_literarias.value = pessoa.habilitacoes_literarias || "";
  form.idioma_origem.value = pessoa.idioma_origem || "";
  form.email.value = pessoa.email || "";
  form.telefone.value = pessoa.telefone || "";
  form.telefone_alternativo.value = pessoa.telefone_alternativo || "";
  // cidade_residencia removido - usar concelho
  form.morada.value = pessoa.morada || "";
  form.codigo_postal.value = pessoa.codigo_postal || "";
  distritoSelect.value = pessoa.distrito || "";
  form.concelho.value = pessoa.concelho || "";
  form.freguesia.value = pessoa.freguesia || "";
  form.tipo_documento.value = pessoa.tipo_documento || "";
  form.numero_documento.value = pessoa.numero_documento || "";
  form.situacao_regular.value = pessoa.situacao_regular || "";
  form.documento_emissao.value = formatarData(pessoa.documento_emissao);
  form.documento_validade.value = formatarData(pessoa.documento_validade);
  form.tipo_visto.value = pessoa.tipo_visto || "";
  form.tipo_ar.value = pessoa.tipo_ar || "";

  const nacionalidade = pessoa.nacionalidade || "";
  const opcaoExiste = Array.from(nacionalidadeSelect.options).some(
    (opt) => opt.value === nacionalidade
  );
  if (nacionalidade && opcaoExiste) {
    nacionalidadeSelect.value = nacionalidade;
    ajustarNacionalidadeOutro();
  } else if (nacionalidade) {
    nacionalidadeSelect.value = "Outro";
    ajustarNacionalidadeOutro();
    nacionalidadeOutraInput.value = nacionalidade;
  } else {
    nacionalidadeSelect.value = "";
    ajustarNacionalidadeOutro();
  }

  const info = [
    `Nome: ${pessoa.nome_completo || "-"}`,
    `Documento: ${pessoa.numero_documento || "-"}`
  ].join(" | ");
  mostrarInfoBox(pessoaSelecionadaInfo, info);
  salvarPessoaBtn.classList.remove("hidden");
}

async function carregarParente(id) {
  if (!id) {
    mostrarInfoBox(parenteInfo, "");
    return;
  }
  const resposta = await fetch(`/api/pessoas/${id}`, { headers: authHeaders() });
  if (!resposta.ok) {
    mostrarInfoBox(parenteInfo, "Familiar nao encontrado.");
    return;
  }
  const pessoa = await resposta.json();
  const info = [
    `Familiar: ${pessoa.nome_completo || "-"}`,
    `Documento: ${pessoa.numero_documento || "-"}`
  ].join(" | ");
  mostrarInfoBox(parenteInfo, info);
}

function ajustarObrigatoriedadeParentesco() {
  const parenteId = campoParenteId.value.trim();
  const precisaParentesco = parenteId.length > 0;

  selectParentesco.required = precisaParentesco;
  ajustarParentescoOutro();
  if (!precisaParentesco) {
    selectParentesco.value = "";
    campoParentescoOutro.value = "";
  }
}

campoParenteId.addEventListener("input", ajustarObrigatoriedadeParentesco);
selectParentesco.addEventListener("change", ajustarParentescoOutro);

function ajustarParentescoOutro() {
  const opcao = selectParentesco.value;
  const precisaOutro = opcao === "Outro familiar a cargo";

  campoParentescoOutro.required = precisaOutro;
  parentescoOutroWrapper.classList.toggle("hidden", !precisaOutro);
  if (!precisaOutro) {
    campoParentescoOutro.value = "";
  }
}

ajustarParentescoOutro();

async function buscarPessoas() {
  const termo = campoBusca.value.trim();
  if (termo.length < 2) {
    mostrarMensagem("Digite pelo menos 2 letras para buscar.", false);
    return;
  }

  const resposta = await fetch(`/api/pessoas?q=${encodeURIComponent(termo)}`, {
    headers: authHeaders()
  });
  const pessoas = await resposta.json();

  if (pessoas.length === 0) {
    mostrarMensagem("Nenhuma pessoa encontrada.", false);
    if (listaBuscaPessoas) {
      listaBuscaPessoas.classList.add("hidden");
      listaBuscaPessoas.innerHTML = "";
    }
  } else {
    mostrarMensagem(`Encontradas ${pessoas.length} pessoas.`, true);
    if (listaBuscaPessoas) {
      const html = pessoas
        .map(
          (pessoa) =>
            `<div class="list-row">
              <div>
                <strong>${pessoa.nome_completo}</strong>
                <span>${pessoa.numero_documento || "sem doc"}</span>
              </div>
              <div class="row-actions">
                <button class="btn secondary" data-id="${pessoa.id}">
                  Selecionar
                </button>
              </div>
            </div>`
        )
        .join("");
      listaBuscaPessoas.innerHTML = html;
      listaBuscaPessoas.classList.remove("hidden");
      listaBuscaPessoas.querySelectorAll("button[data-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          pessoaSelecionadaId = id;
          carregarPessoaSelecionada(id).catch((error) => {
            console.error(error);
            mostrarInfoBox(pessoaSelecionadaInfo, "Erro ao carregar pessoa.");
          });
        });
      });
    }
  }
}

function setBuscarParenteLoading(loading) {
  if (!buscarParenteBtn) return;
  const btnText = buscarParenteBtn.querySelector(".btn-text");
  const btnLoading = buscarParenteBtn.querySelector(".btn-loading");
  if (btnText && btnLoading) {
    btnText.classList.toggle("hidden", loading);
    btnLoading.classList.toggle("hidden", !loading);
  } else {
    buscarParenteBtn.textContent = loading ? "A buscar…" : "Buscar familiar";
  }
  buscarParenteBtn.disabled = loading;
}

const listaParentesResultados = document.getElementById("listaParentesResultados");

function selecionarParente(pessoa) {
  if (!campoParenteId || !parenteSelect) return;
  campoParenteId.value = pessoa.id;
  parenteSelect.value = String(pessoa.id);
  carregarParente(pessoa.id).catch((error) => {
    console.error(error);
    mostrarInfoBox(parenteInfo, "Erro ao buscar familiar.");
  });
  ajustarObrigatoriedadeParentesco();
  if (listaParentesResultados) listaParentesResultados.classList.add("hidden");
  const grauLabel = document.getElementById("grauParentescoLabel");
  if (grauLabel) grauLabel.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function buscarParentes() {
  if (!buscaParenteInput || !buscarParenteBtn || !parenteSelect) return;

  const termo = buscaParenteInput.value.trim();
  if (termo.length < 2) {
    mostrarMensagem("Digite pelo menos 2 letras para buscar.", false);
    buscaParenteInput.focus();
    return;
  }

  setBuscarParenteLoading(true);
  if (listaParentesResultados) {
    listaParentesResultados.classList.add("hidden");
    listaParentesResultados.innerHTML = "";
  }
  try {
    const resposta = await fetch(`/api/pessoas?q=${encodeURIComponent(termo)}`, {
      headers: authHeaders()
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarMensagem(dados.error || "Erro ao buscar.", false);
      return;
    }

    const pessoas = Array.isArray(dados) ? dados : (dados.pessoas || dados.rows || []);
    parenteSelect.innerHTML = '<option value="">Selecione</option>';

    pessoas.forEach((pessoa) => {
      const option = document.createElement("option");
      option.value = pessoa.id;
      option.textContent = `${pessoa.nome_completo || pessoa.nome || "-"} (${pessoa.numero_documento || "sem doc"})`;
      parenteSelect.appendChild(option);
    });

    if (pessoas.length === 0) {
      mostrarMensagem("Nenhuma pessoa encontrada.", false);
    } else {
      mostrarMensagem(`Encontradas ${pessoas.length} pessoas. Selecione para relacionar.`, true);
      if (listaParentesResultados) {
        const html = pessoas
          .map(
            (p) =>
              `<div class="list-row">
                <div>
                  <strong>${p.nome_completo || p.nome || "-"}</strong>
                  <span>${p.numero_documento || "sem doc"}</span>
                </div>
                <div class="row-actions">
                  <button class="btn secondary btn-relacionar-parente" data-id="${p.id}" type="button">Relacionar</button>
                </div>
              </div>`
          )
          .join("");
        listaParentesResultados.innerHTML = html;
        listaParentesResultados.classList.remove("hidden");
        listaParentesResultados.querySelectorAll(".btn-relacionar-parente").forEach((btn) => {
          btn.addEventListener("click", () => {
            const pessoa = pessoas.find((x) => String(x.id) === btn.dataset.id);
            if (pessoa) selecionarParente(pessoa);
          });
        });
      }
      if (pessoas.length === 1) {
        selecionarParente(pessoas[0]);
      }
    }
  } catch (error) {
    console.error("Erro buscar parentes:", error);
    mostrarMensagem("Erro de ligação. Verifique a rede.", false);
  } finally {
    setBuscarParenteLoading(false);
  }
}


botaoBuscar.addEventListener("click", () => {
  buscarPessoas().catch((error) => {
    console.error(error);
    mostrarMensagem("Erro ao buscar pessoas.", false);
  });
});

function toggleBotaoLimpar() {
  if (campoBusca.value.trim().length > 0 || pessoaSelecionadaId) {
    botaoLimpar.classList.remove("hidden");
  } else {
    botaoLimpar.classList.add("hidden");
  }
}

campoBusca.addEventListener("input", toggleBotaoLimpar);

botaoLimpar.addEventListener("click", () => {
  pessoaSelecionadaId = null;
  campoBusca.value = "";
  mostrarInfoBox(pessoaSelecionadaInfo, "");
  salvarPessoaBtn.classList.add("hidden");
  botaoLimpar.classList.add("hidden");
  if (listaBuscaPessoas) {
    listaBuscaPessoas.classList.add("hidden");
    listaBuscaPessoas.innerHTML = "";
  }
});

if (buscarParenteBtn) {
  buscarParenteBtn.addEventListener("click", (e) => {
    e.preventDefault();
    buscarParentes().catch((error) => {
      console.error(error);
      mostrarMensagem("Erro ao buscar familiar.", false);
    });
  });
}

if (buscaParenteInput) {
  buscaParenteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      buscarParentes().catch((error) => {
        console.error(error);
        mostrarMensagem("Erro ao buscar familiar.", false);
      });
    }
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  resultado.textContent = "";

  if (atendimentoIdToEdit) {
    try {
      const payload = {
        modalidade_atendimento: form.modalidade_atendimento?.value || null,
        tipo_atendimento: form.tipo_atendimento.value,
        data_atendimento: form.data_atendimento.value || null,
        descricao: form.descricao.value || null,
        observacoes: form.observacoes.value || null,
        itens_entregues: form.itens_entregues.value || null,
        funcionario_id: form.funcionario_id?.value || null,
        elegivel_npt: form.elegivel_npt.value || null,
        orientacao_profissional: form.orientacao_profissional?.value || null,
        avaliou: form.avaliou?.value || null,
        servico_util: form.servico_util?.value || null
      };
      const resposta = await fetch(`/api/atendimentos/${atendimentoIdToEdit}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload)
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        mostrarMensagem(dados.error || "Erro ao corrigir atendimento.", false);
        return;
      }
      mostrarMensagem("Atendimento corrigido! Redirecionando para a ficha...");
      setTimeout(() => {
        window.location.href = `/cliente?pessoa_id=${dados.pessoa_id}`;
      }, 1500);
    } catch (error) {
      console.error(error);
      mostrarMensagem("Erro ao corrigir atendimento.", false);
    }
    return;
  }

  const docIdInput = form.querySelector("input[name='documento_identificacao']");
  const docRgpdInput = form.querySelector("input[name='documento_rgpd']");
  const docExtrasInput = form.querySelector("input[name='documentos_extras']");
  const tipoId = form.querySelector(
    "select[name='tipo_documento_identificacao']"
  ).value;
  const tipoExtra = form.querySelector("select[name='tipo_documento_extra']").value;

  const arquivosId = docIdInput?.files || [];
  const arquivosRgpd = docRgpdInput?.files || [];
  const arquivosExtras = docExtrasInput?.files || [];
  const totalArquivos =
    arquivosId.length + arquivosRgpd.length + arquivosExtras.length;

  const rgpdObrigatorio = !pessoaSelecionadaId ? true : !(await pessoaTemAtendimentos(pessoaSelecionadaId));
  if (rgpdObrigatorio && arquivosRgpd.length < 1) {
    mostrarMensagem("Anexe a declaração RGPD (obrigatório no primeiro atendimento).", false);
    return;
  }
  if (totalArquivos > 10) {
    mostrarMensagem("Maximo de 10 documentos por atendimento.", false);
    return;
  }
  if (arquivosId.length > 0 && !tipoId) {
    mostrarMensagem("Selecione o tipo do documento de identificação.", false);
    return;
  }
  if (arquivosExtras.length > 0 && !tipoExtra) {
    mostrarMensagem("Selecione o tipo dos documentos extras.", false);
    return;
  }

  const parenteId = campoParenteId.value.trim();
  const parentescoSelecionado = selectParentesco.value.trim();
  const parentescoOutro = campoParentescoOutro.value.trim();
  if (parenteId && !parentescoSelecionado && !parentescoOutro) {
    mostrarMensagem("Informe o grau de parentesco quando o ID do familiar for preenchido.", false);
    return;
  }

  const formData = new FormData();
  const excluir = ["documento_identificacao", "documento_rgpd", "documentos_extras", "tipo_documento_identificacao", "tipo_documento_extra"];
  for (const [key, value] of new FormData(form)) {
    if (!excluir.includes(key) && value != null && value !== "") {
      formData.append(key, value);
    }
  }

  const tiposDocumento = [];
  Array.from(arquivosId).forEach((arquivo) => {
    formData.append("documentos", arquivo, arquivo.name || "identificacao.pdf");
    tiposDocumento.push(tipoId);
  });
  Array.from(arquivosRgpd).forEach((arquivo) => {
    formData.append("documentos", arquivo, arquivo.name || "rgpd.pdf");
    tiposDocumento.push("Declaração");
  });
  Array.from(arquivosExtras).forEach((arquivo) => {
    formData.append("documentos", arquivo, arquivo.name || "extra.pdf");
    tiposDocumento.push(tipoExtra || "Outro");
  });
  formData.set("tipos_documento", JSON.stringify(tiposDocumento));
  if (pessoaSelecionadaId) {
    formData.set("pessoa_id", pessoaSelecionadaId);
  }
  if (nacionalidadeSelect.value === "Outro" && nacionalidadeOutraInput.value.trim()) {
    formData.set("nacionalidade", nacionalidadeOutraInput.value.trim());
  }

  try {
    const resposta = await fetch("/api/atendimentos/registrar", {
      method: "POST",
      headers: authHeaders(),
      body: formData
    });

    const dados = await resposta.json();
    if (!resposta.ok) {
      const mensagem = dados.error || "Erro ao registrar atendimento.";
      mostrarMensagem(mensagem, false);
      return;
    }

    mostrarMensagem(
      `Atendimento registrado! Redirecionando para a ficha...`
    );
    form.reset();
    pessoaSelecionadaId = null;
    setTimeout(() => {
      window.location.href = `/cliente?pessoa_id=${dados.pessoa_id}`;
    }, 1500);
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao registrar atendimento.", false);
  }
});

nacionalidadeSelect.addEventListener("change", ajustarNacionalidadeOutro);
form.data_nascimento.addEventListener("change", () => {
  form.idade.value = calcularIdade(form.data_nascimento.value);
});

campoParenteId.addEventListener("change", () => {
  carregarParente(campoParenteId.value).catch((error) => {
    console.error(error);
    mostrarInfoBox(parenteInfo, "Erro ao buscar familiar.");
  });
});
parenteSelect.addEventListener("change", () => {
  campoParenteId.value = parenteSelect.value;
  ajustarObrigatoriedadeParentesco();
  carregarParente(campoParenteId.value).catch((error) => {
    console.error(error);
    mostrarInfoBox(parenteInfo, "Erro ao buscar familiar.");
  });
});

const avaliouSelect = document.getElementById("avaliouSelect");
const servicoUtilWrapper = document.getElementById("servicoUtilWrapper");
if (avaliouSelect && servicoUtilWrapper) {
  function toggleServicoUtil() {
    if (avaliouSelect.value === "sim") {
      servicoUtilWrapper.classList.remove("hidden");
    } else {
      servicoUtilWrapper.classList.add("hidden");
      const servicoUtilSelect = form.querySelector("select[name='servico_util']");
      if (servicoUtilSelect) servicoUtilSelect.value = "";
    }
  }
  avaliouSelect.addEventListener("change", toggleServicoUtil);
  toggleServicoUtil();
}

ajustarNacionalidadeOutro();
carregarPaises().catch((error) => {
  console.error(error);
});

async function carregarFuncionarios() {
  const select = form.querySelector("select[name='funcionario_id']");
  if (!select) return;
  try {
    const res = await fetch("/api/atendimentos/funcionarios", { headers: authHeaders() });
    const lista = await res.json();
    select.innerHTML = '<option value="">Selecione o funcionário</option>';
    (lista || []).forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = f.nome || `Funcionário ${f.id}`;
      select.appendChild(opt);
    });
  } catch (e) {
    console.error("Erro ao carregar funcionários:", e);
  }
}
carregarFuncionarios();

if (salvarPessoaBtn) {
  salvarPessoaBtn.addEventListener("click", async () => {
    const pessoaId = pessoaSelecionadaId;
    if (!pessoaId) {
      mostrarMensagem("Selecione uma pessoa para salvar as alterações.", false);
      return;
    }

    salvarPessoaBtn.disabled = true;
    salvarPessoaBtn.textContent = "A guardar...";

    const payload = {
      nome_completo: (form.nome_completo?.value ?? "").trim(),
      data_nascimento: form.data_nascimento?.value || null,
      naturalidade: (form.naturalidade?.value ?? "").trim(),
      nacionalidade:
        nacionalidadeSelect?.value === "Outro" && nacionalidadeOutraInput?.value?.trim()
          ? nacionalidadeOutraInput.value.trim()
          : (nacionalidadeSelect?.value ?? ""),
      genero: form.genero?.value ?? "",
      estado_civil: (form.estado_civil?.value ?? "").trim(),
      profissao: (form.profissao?.value ?? "").trim(),
      habilitacoes_literarias: (form.habilitacoes_literarias?.value ?? "").trim(),
      idioma_origem: (form.idioma_origem?.value ?? "").trim(),
      email: (form.email?.value ?? "").trim(),
      telefone: (form.telefone?.value ?? "").trim(),
      telefone_alternativo: (form.telefone_alternativo?.value ?? "").trim(),
      morada: (form.morada?.value ?? "").trim(),
      codigo_postal: (form.codigo_postal?.value ?? "").trim(),
      distrito: distritoSelect?.value ?? "",
      concelho: (form.concelho?.value ?? "").trim(),
      freguesia: (form.freguesia?.value ?? "").trim(),
      tipo_documento: form.tipo_documento?.value ?? "",
      numero_documento: (form.numero_documento?.value ?? "").trim(),
      documento_emissao: form.documento_emissao?.value || null,
      documento_validade: form.documento_validade?.value || null,
      tipo_visto: (form.tipo_visto?.value ?? "").trim(),
      tipo_ar: (form.tipo_ar?.value ?? "").trim(),
      situacao_regular: form.situacao_regular?.value ?? ""
    };

    try {
      const resposta = await fetch(`/api/pessoas/${pessoaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload)
      });
      let dados = {};
      try {
        dados = await resposta.json();
      } catch (_) {
        dados = { error: "Resposta inválida do servidor." };
      }
      if (!resposta.ok) {
        mostrarMensagem(dados.error || "Erro ao salvar pessoa.", false);
        return;
      }
      mostrarMensagem("Pessoa atualizada com sucesso.");
      await carregarPessoaSelecionada(pessoaId);
    } catch (error) {
      console.error(error);
      mostrarMensagem("Erro ao salvar pessoa.", false);
    } finally {
      salvarPessoaBtn.disabled = false;
      salvarPessoaBtn.textContent = "Salvar alterações da pessoa";
    }
  });
}


function dentroDoExpediente(data = new Date()) {
  const dia = data.getDay();
  if (dia === 0 || dia === 6) return false;
  const hora = data.getHours() + data.getMinutes() / 60;
  const manha = hora >= 10 && hora < 13;
  const tarde = hora >= 14 && hora < 19;
  return manha || tarde;
}

if (!dentroDoExpediente()) {
  alert("Atenção: login/registro fora do horário de atendimento.");
}

async function carregarAtendimentoParaEdicao(id) {
  const idNum = parseInt(id, 10);
  if (!id || id === "undefined" || isNaN(idNum) || idNum <= 0) {
    return false;
  }
  try {
    const resposta = await fetch(`/api/atendimentos/${idNum}`, { headers: authHeaders() });
    if (!resposta.ok) {
      return false;
    }
    const att = await resposta.json();
    atendimentoIdToEdit = id;
    pessoaSelecionadaId = String(att.beneficiario_id);
    await carregarPessoaSelecionada(att.beneficiario_id);

    if (form.modalidade_atendimento) form.modalidade_atendimento.value = att.modalidade_atendimento || "";
    form.tipo_atendimento.value = att.tipo_atendimento || "";
    form.data_atendimento.value = formatarData(att.data_atendimento) || "";
    form.descricao.value = att.descricao || "";
    form.observacoes.value = att.observacoes || "";
    form.itens_entregues.value = att.itens_entregues || "";
    if (form.funcionario_id) form.funcionario_id.value = att.funcionario_id || "";
    form.elegivel_npt.value = att.elegivel_npt === true ? "true" : att.elegivel_npt === false ? "false" : "";
    if (form.orientacao_profissional) form.orientacao_profissional.value = att.orientacao_profissional === true ? "true" : att.orientacao_profissional === false ? "false" : "";
    if (form.avaliou) form.avaliou.value = att.avaliou || "";
    if (form.servico_util) form.servico_util.value = att.servico_util || "";

    const secaoDocs = document.getElementById("secaoDocumentos");
    if (secaoDocs) secaoDocs.classList.add("hidden");
    const submitBtn = document.getElementById("submitAtendimentoBtn");
    if (submitBtn) submitBtn.textContent = "Corrigir";
    if (avaliouSelect && servicoUtilWrapper) {
      const v = form.avaliou?.value;
      servicoUtilWrapper.classList.toggle("hidden", v !== "sim");
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

const params = new URLSearchParams(window.location.search);
const pessoaParam = params.get("pessoa_id");
const atendimentoParam = params.get("atendimento_id");
if (atendimentoParam) {
  carregarAtendimentoParaEdicao(atendimentoParam).then((ok) => {
    if (!ok && pessoaParam) {
      atendimentoIdToEdit = null;
      pessoaSelecionadaId = pessoaParam;
      carregarPessoaSelecionada(pessoaParam).catch((e) => console.error(e));
    } else if (!ok) {
      mostrarMensagem("Atendimento não encontrado.", false);
    }
  }).catch((error) => {
    console.error(error);
    if (pessoaParam) {
      pessoaSelecionadaId = pessoaParam;
      carregarPessoaSelecionada(pessoaParam).catch((e) => console.error(e));
    } else {
      mostrarMensagem("Erro ao carregar atendimento.", false);
    }
  });
} else if (pessoaParam) {
  pessoaSelecionadaId = pessoaParam;
  carregarPessoaSelecionada(pessoaParam).catch((error) => {
    console.error(error);
  });
}
