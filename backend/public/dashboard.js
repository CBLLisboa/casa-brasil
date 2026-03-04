const buscaInput = document.getElementById("buscaPessoa");
const buscarBtn = document.getElementById("buscarPessoa");
const novaPessoaBtn = document.getElementById("novaPessoa");
const listaPessoas = document.getElementById("listaPessoas");
const contadorHoje = document.getElementById("contadorHoje");
const listaHoje = document.getElementById("listaHoje");
const logoutBtn = document.getElementById("logoutBtn");
const listaTecnicos = document.getElementById("listaTecnicos");
const alertaExpediente = document.getElementById("alertaExpediente");
const procurarPessoaBtn = document.getElementById("procurarPessoaBtn");
const novaPessoaTopoBtn = document.getElementById("novaPessoaTopoBtn");
const secaoBusca = document.getElementById("secaoBusca");
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

function dentroDoExpediente(data = new Date()) {
  const dia = data.getDay();
  if (dia === 0 || dia === 6) return false;
  const hora = data.getHours() + data.getMinutes() / 60;
  const manha = hora >= 10 && hora < 13;
  const tarde = hora >= 14 && hora < 19;
  return manha || tarde;
}

if (!dentroDoExpediente()) {
  alertaExpediente.classList.remove("hidden");
  alertaExpediente.textContent =
    "Atenção: acesso fora do horário de atendimento (seg-sex 10-13 e 14-19).";
}

function renderListaPessoas(pessoas) {
  if (!pessoas || pessoas.length === 0) {
    listaPessoas.classList.remove("hidden");
    listaPessoas.textContent = "Nenhuma pessoa encontrada.";
    return;
  }

  const html = pessoas
    .map(
      (p) =>
        `<div class="list-row">
          <div>
            <strong>${p.nome_completo}</strong>
            <span>${p.numero_documento || "sem doc"}</span>
          </div>
          <div class="row-actions">
            <button class="btn secondary" data-id="${p.id}">Abrir ficha</button>
            <button class="btn tertiary" data-at="${p.id}">Novo atendimento</button>
          </div>
        </div>`
    )
    .join("");

  listaPessoas.classList.remove("hidden");
  listaPessoas.innerHTML = html;

  listaPessoas.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.href = `/cliente?pessoa_id=${btn.dataset.id}`;
    });
  });
  listaPessoas.querySelectorAll("button[data-at]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.href = `/atendimento?pessoa_id=${btn.dataset.at}`;
    });
  });
}

async function buscarPessoas() {
  const termo = buscaInput.value.trim();
  if (termo.length < 2) {
    listaPessoas.classList.remove("hidden");
    listaPessoas.textContent = "Digite pelo menos 2 letras para buscar.";
    return;
  }

  const resposta = await fetch(`/api/pessoas?q=${encodeURIComponent(termo)}`, {
    headers: authHeaders()
  });
  const pessoas = await resposta.json();
  renderListaPessoas(pessoas);
}

async function carregarContador() {
  const resposta = await fetch("/api/atendimentos/contador-hoje", {
    headers: authHeaders()
  });
  const dados = await resposta.json();
  contadorHoje.textContent = dados.total || 0;
}

async function carregarListaHoje() {
  const resposta = await fetch("/api/atendimentos/hoje", {
    headers: authHeaders()
  });
  const lista = await resposta.json();

  if (!Array.isArray(lista) || lista.length === 0) {
    listaHoje.innerHTML = "<p>Nenhum atendimento hoje.</p>";
    return;
  }

  listaHoje.innerHTML = lista
    .map(
      (item) =>
        `<div class="list-row">
          <div>
            <strong>${item.pessoa}</strong>
            <span>${item.tipo_atendimento}${item.modalidade_atendimento ? ` (${item.modalidade_atendimento})` : ""}</span>
          </div>
          <div>
            <span>${item.hora || "--:--"}</span>
            <strong>Funcionário:</strong> ${item.atendido_por || "-"}
          </div>
        </div>`
    )
    .join("");
}

async function carregarPorTecnico() {
  const resposta = await fetch("/api/atendimentos/por-tecnico", {
    headers: authHeaders()
  });
  const lista = await resposta.json();

  if (!Array.isArray(lista) || lista.length === 0) {
    listaTecnicos.innerHTML = "<p>Sem atendimentos hoje.</p>";
    return;
  }

  listaTecnicos.innerHTML = lista
    .map(
      (item) =>
        `<div class="list-row">
          <div><strong>${item.tecnico}</strong></div>
          <div><span>${item.total}</span></div>
        </div>`
    )
    .join("");
}

buscarBtn.addEventListener("click", () => {
  buscarPessoas().catch(() => {
    listaPessoas.classList.remove("hidden");
    listaPessoas.textContent = "Erro ao buscar pessoas.";
  });
});

novaPessoaBtn.addEventListener("click", () => {
  window.location.href = "/atendimento";
});

if (document.getElementById("relatoriosBtn")) {
  document.getElementById("relatoriosBtn").addEventListener("click", () => {
    window.location.href = "/relatorios";
  });
}

if (procurarPessoaBtn) {
  procurarPessoaBtn.addEventListener("click", () => {
    if (secaoBusca) secaoBusca.scrollIntoView({ behavior: "smooth" });
    buscaInput.focus();
  });
}

if (novaPessoaTopoBtn) {
  novaPessoaTopoBtn.addEventListener("click", () => {
    window.location.href = "/atendimento";
  });
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("auth_token");
  window.location.href = "/login";
});

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

carregarContador();
carregarListaHoje();
carregarPorTecnico();
