const dadosPessoa = document.getElementById("dadosPessoa");
const listaAtendimentos = document.getElementById("listaAtendimentos");
const listaDocumentos = document.getElementById("listaDocumentos");
const logoutBtn = document.getElementById("logoutBtn");
const voltarPainelBtn = document.getElementById("voltarPainelBtn");
const novoAtendimentoBtn = document.getElementById("novoAtendimentoBtn");
const menuBtn = document.getElementById("menuBtn");
const menuPanel = document.getElementById("menuPanel");

const token = localStorage.getItem("auth_token");
if (!token) {
  window.location.href = "/login";
}

function authHeaders() {
  const stored = localStorage.getItem("auth_token");
  return stored ? { Authorization: `Bearer ${stored}` } : {};
}

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return "-";
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade -= 1;
  }
  return idade;
}

function formatarData(data) {
  if (!data) return "-";
  const d = new Date(data);
  return d.toLocaleDateString("pt-PT");
}

function montarMorada(pessoa) {
  const partes = [
    pessoa.morada,
    pessoa.codigo_postal,
    pessoa.freguesia,
    pessoa.concelho,
    pessoa.distrito
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(", ") : "-";
}

function renderDadosPessoa(pessoa, documentos = []) {
  const tipoDoc = pessoa.tipo_documento || "-";
  const numDoc = pessoa.numero_documento || "-";
  const docCompleto = tipoDoc !== "-" && numDoc !== "-" ? `${tipoDoc}: ${numDoc}` : numDoc;
  const temDocAnexado = Array.isArray(documentos) && documentos.some(
    (d) => d.tipo_documento && !d.tipo_documento.toLowerCase().includes("declaração")
  );

  const itens = [
    ["Nome completo", pessoa.nome_completo || "-"],
    ["Documento", docCompleto],
    ["Documento anexado", temDocAnexado ? "Sim" : "Não"],
    ["Validade do documento", formatarData(pessoa.documento_validade)],
    ["Data de nascimento", formatarData(pessoa.data_nascimento)],
    ["Idade", calcularIdade(pessoa.data_nascimento)],
    ["Nacionalidade", pessoa.nacionalidade || "-"],
    ["Naturalidade", pessoa.naturalidade || "-"],
    ["Estado civil", pessoa.estado_civil || "-"],
    ["Profissão", pessoa.profissao || "-"],
    ["Morada", montarMorada(pessoa)],
    ["Email", pessoa.email || "-"],
    ["Telefone", pessoa.telefone || "-"]
  ];

  dadosPessoa.innerHTML = itens
    .map(
      ([titulo, valor]) =>
        `<div>
          <strong>${titulo}</strong>
          <span>${valor}</span>
        </div>`
    )
    .join("");
}

let atendimentosCarregados = [];

function renderAtendimentos(lista) {
  atendimentosCarregados = lista || [];
  if (!Array.isArray(lista) || lista.length === 0) {
    listaAtendimentos.innerHTML = "<p>Sem atendimentos registados.</p>";
    return;
  }

  listaAtendimentos.innerHTML = lista
    .map(
      (item) =>
        `<div class="list-row">
          <div>
            <strong>${item.tipo_atendimento}</strong>
            <span>${item.modalidade_atendimento ? ` (${item.modalidade_atendimento})` : ""} | ${formatarData(item.data_atendimento)} | ${item.hora || "--:--"}</span>
            <strong>Funcionário:</strong> ${item.atendido_por || "-"}
          </div>
          <div class="row-actions">
            <button class="btn secondary corrigir-atendimento" data-id="${item.id}" type="button">Corrigir</button>
          </div>
        </div>`
    )
    .join("");

  listaAtendimentos.querySelectorAll(".corrigir-atendimento").forEach((btn) => {
    btn.addEventListener("click", () => {
      const params = new URLSearchParams(window.location.search);
      const pessoaId = params.get("pessoa_id");
      window.location.href = `/atendimento?atendimento_id=${btn.dataset.id}&pessoa_id=${pessoaId || ""}`;
    });
  });
}

function classificarDocumento(tipo) {
  if (!tipo) return "outros";
  const t = tipo.toLowerCase();
  if (t.includes("declaração") || t.includes("declaracao") || t.includes("rgpd")) return "rgpd";
  if (t.includes("questionário") || t.includes("questionario") || t.includes("avaliação") || t.includes("avaliacao")) return "questionario";
  return "identificacao";
}

function renderDocumentos(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    listaDocumentos.innerHTML = "<p>Nenhum documento anexado. Os documentos carregados no atendimento aparecerão aqui.</p>";
    return;
  }
  const secao = (titulo, docs) => {
    if (docs.length === 0) return "";
    return `<h4 style="margin:12px 0 6px;font-size:13px;color:#0f766e;">${titulo}</h4>` + docs.map((doc) =>
      `<div class="list-row">
        <div>
          <strong>${doc.tipo_documento}</strong>
          <span>${doc.nome_arquivo}</span>
          ${doc.criado_em ? `<span class="hint">${formatarData(doc.criado_em)}</span>` : ""}
        </div>
        <div>
          <a href="${doc.caminho_arquivo}" target="_blank" rel="noopener">Abrir</a>
        </div>
      </div>`
    ).join("");
  };
  const idDocs = lista.filter((d) => classificarDocumento(d.tipo_documento) === "identificacao");
  const rgpdDocs = lista.filter((d) => classificarDocumento(d.tipo_documento) === "rgpd");
  const questDocs = lista.filter((d) => classificarDocumento(d.tipo_documento) === "questionario");
  const outrosDocs = lista.filter((d) => classificarDocumento(d.tipo_documento) === "outros");
  listaDocumentos.innerHTML =
    secao("Identificação", idDocs) +
    secao("Declaração RGPD", rgpdDocs) +
    secao("Questionário de avaliação", questDocs) +
    (outrosDocs.length ? secao("Outros", outrosDocs) : "");
}

async function carregar() {
  const params = new URLSearchParams(window.location.search);
  const pessoaId = params.get("pessoa_id");
  if (!pessoaId) {
    dadosPessoa.innerHTML = "<p>Selecione uma pessoa no painel.</p>";
    return;
  }

  const [resPessoa, resAtend, resDocs] = await Promise.all([
    fetch(`/api/pessoas/${pessoaId}`, { headers: authHeaders() }),
    fetch(`/api/atendimentos/pessoa/${pessoaId}`, { headers: authHeaders() }),
    fetch(`/api/documentos/pessoa/${pessoaId}`, { headers: authHeaders() })
  ]);

  if (!resPessoa.ok) {
    dadosPessoa.innerHTML = "<p>Erro ao carregar dados da pessoa.</p>";
    return;
  }

  const pessoa = await resPessoa.json();
  const documentos = resDocs.ok ? await resDocs.json() : [];
  renderDadosPessoa(pessoa, documentos);

  const atendimentos = await resAtend.json();
  renderAtendimentos(atendimentos);

  renderDocumentos(documentos);

  if (novoAtendimentoBtn) {
    novoAtendimentoBtn.addEventListener("click", () => {
      window.location.href = `/atendimento?pessoa_id=${pessoaId}`;
    });
  }

  const uploadForm = document.getElementById("uploadDocumentosForm");
  const uploadMensagem = document.getElementById("uploadMensagem");
  if (uploadForm && uploadMensagem) {
    uploadForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const tipoSelect = uploadForm.querySelector("select[name='tipo_documento_identificacao']");
      const fileInput = uploadForm.querySelector("input[name='documento_identificacao']");
      const tipo = tipoSelect?.value;
      const arquivo = fileInput?.files?.[0];
      if (!tipo) {
        uploadMensagem.textContent = "Selecione o tipo do documento.";
        uploadMensagem.classList.remove("hidden");
        uploadMensagem.style.background = "#fee2e2";
        uploadMensagem.style.color = "#991b1b";
        return;
      }
      if (!arquivo) {
        uploadMensagem.textContent = "Selecione um ficheiro.";
        uploadMensagem.classList.remove("hidden");
        uploadMensagem.style.background = "#fee2e2";
        uploadMensagem.style.color = "#991b1b";
        return;
      }
      const formData = new FormData();
      formData.append("documentos", arquivo, arquivo.name);
      formData.set("tipos_documento", JSON.stringify([tipo]));
      try {
        const resposta = await fetch(`/api/documentos/pessoa/${pessoaId}`, {
          method: "POST",
          headers: authHeaders(),
          body: formData
        });
        const dados = await resposta.json();
        if (!resposta.ok) {
          uploadMensagem.textContent = dados.error || "Erro ao enviar documento.";
          uploadMensagem.style.background = "#fee2e2";
          uploadMensagem.style.color = "#991b1b";
        } else {
          uploadMensagem.textContent = "Documento enviado com sucesso.";
          uploadMensagem.style.background = "#dcfce7";
          uploadMensagem.style.color = "#14532d";
          uploadForm.reset();
          const atualizados = await fetch(`/api/documentos/pessoa/${pessoaId}`, { headers: authHeaders() });
          renderDocumentos(await atualizados.json());
        }
        uploadMensagem.classList.remove("hidden");
      } catch (error) {
        console.error(error);
        uploadMensagem.textContent = "Erro ao comunicar com o servidor.";
        uploadMensagem.style.background = "#fee2e2";
        uploadMensagem.style.color = "#991b1b";
        uploadMensagem.classList.remove("hidden");
      }
    });
  }
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

if (document.getElementById("relatoriosBtn")) {
  document.getElementById("relatoriosBtn").addEventListener("click", () => {
    window.location.href = "/relatorios";
  });
}

if (document.getElementById("corrigirAtendimentoBtn")) {
  document.getElementById("corrigirAtendimentoBtn").addEventListener("click", () => {
    const params = new URLSearchParams(window.location.search);
    const pessoaId = params.get("pessoa_id");
    const ultimoAtendimento = atendimentosCarregados && atendimentosCarregados[0];
    if (ultimoAtendimento && pessoaId) {
      window.location.href = `/atendimento?atendimento_id=${ultimoAtendimento.id}&pessoa_id=${pessoaId}`;
    } else if (pessoaId) {
      window.location.href = `/atendimento?pessoa_id=${pessoaId}`;
    } else {
      window.location.href = "/dashboard";
    }
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

carregar().catch(() => {
  dadosPessoa.innerHTML = "<p>Erro ao carregar a ficha do cliente.</p>";
});
