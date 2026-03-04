const form = document.getElementById("loginForm");
const mensagem = document.getElementById("loginMensagem");
const registerForm = document.getElementById("registerForm");
const registerMensagem = document.getElementById("registerMensagem");
const tabButtons = document.querySelectorAll(".auth-tab");
const loginPanel = document.getElementById("loginPanel");
const registerPanel = document.getElementById("registerPanel");
const forgotToggle = document.getElementById("forgotToggle");
const forgotBox = document.getElementById("forgotBox");
const forgotForm = document.getElementById("forgotForm");
const forgotMensagem = document.getElementById("forgotMensagem");

function mostrarMensagem(texto, sucesso = false) {
  mensagem.textContent = texto;
  mensagem.classList.remove("hidden");
  mensagem.style.background = sucesso ? "#dcfce7" : "#fee2e2";
  mensagem.style.color = sucesso ? "#14532d" : "#991b1b";
}

function mostrarMensagemRegistro(texto, sucesso = false) {
  registerMensagem.textContent = texto;
  registerMensagem.classList.remove("hidden");
  registerMensagem.style.background = sucesso ? "#dcfce7" : "#fee2e2";
  registerMensagem.style.color = sucesso ? "#14532d" : "#991b1b";
}


function mostrarMensagemRecuperacao(texto, sucesso = false) {
  forgotMensagem.textContent = texto;
  forgotMensagem.classList.remove("hidden");
  forgotMensagem.style.background = sucesso ? "#dcfce7" : "#fee2e2";
  forgotMensagem.style.color = sucesso ? "#14532d" : "#991b1b";
}

function validarSenhaForte(senha) {
  if (!senha || senha.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[a-z]/.test(senha)) return "A senha deve ter pelo menos 1 letra minúscula.";
  if (!/[A-Z]/.test(senha)) return "A senha deve ter pelo menos 1 letra maiúscula.";
  if (!/[0-9]/.test(senha)) return "A senha deve ter pelo menos 1 número.";
  if (!/[^A-Za-z0-9]/.test(senha)) return "A senha deve ter pelo menos 1 caractere especial.";
  return null;
}

function authHeaders() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function dentroDoExpediente(data = new Date()) {
  const dia = data.getDay();
  if (dia === 0 || dia === 6) return false;
  const hora = data.getHours() + data.getMinutes() / 60;
  const manha = hora >= 10 && hora < 13;
  const tarde = hora >= 14 && hora < 19;
  return manha || tarde;
}

function trocarAba(alvo) {
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === alvo);
  });
  loginPanel.classList.toggle("hidden", alvo !== "loginPanel");
  registerPanel.classList.toggle("hidden", alvo !== "registerPanel");
  if (alvo === "registerPanel") {
    registerForm.reset();
    registerMensagem.classList.add("hidden");
    registerMensagem.textContent = "";
  }
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => trocarAba(btn.dataset.target));
});

forgotToggle.addEventListener("click", () => {
  forgotBox.classList.toggle("hidden");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  mensagem.classList.add("hidden");

  const payload = {
    email: form.email.value.trim(),
    senha: form.senha.value
  };

  try {
    const resposta = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      mostrarMensagem(dados.error || "Erro no login.");
      return;
    }

    localStorage.setItem("auth_token", dados.token);

    if (dados.aviso) {
      alert(`${dados.aviso} ${dados.motivo ? `Motivo: ${dados.motivo}` : ""}`);
    }

    window.location.href = "/dashboard";
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao comunicar com o servidor.");
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerMensagem.classList.add("hidden");

  const senhaErro = validarSenhaForte(registerForm.senha.value);
  if (senhaErro) {
    mostrarMensagemRegistro(senhaErro);
    return;
  }
  if (registerForm.senha.value !== registerForm.senha_confirmacao.value) {
    mostrarMensagemRegistro("As palavras-passe não coincidem.");
    return;
  }

  const payload = {
    codigo: registerForm.codigo.value.trim(),
    nome_completo: registerForm.nome_completo.value.trim(),
    email: registerForm.email.value.trim(),
    telefone: registerForm.telefone.value.trim(),
    cargo: registerForm.cargo.value.trim(),
    nivel_acesso: registerForm.nivel_acesso.value,
    usuario_login: registerForm.usuario_login.value.trim(),
    ativo: registerForm.ativo.checked,
    ativo_login: registerForm.ativo_login.checked,
    senha: registerForm.senha.value
  };

  try {
    const resposta = await fetch("/api/auth/registrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      mostrarMensagemRegistro(dados.error || "Erro ao registrar utilizador.");
      return;
    }
    mostrarMensagemRegistro("Utilizador registrado com sucesso.", true);
    registerForm.reset();
  } catch (error) {
    console.error(error);
    mostrarMensagemRegistro("Erro ao comunicar com o servidor.");
  }
});

forgotForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  forgotMensagem.classList.add("hidden");

  const email = forgotForm.email.value.trim();
  if (!email) {
    mostrarMensagemRecuperacao("Informe o email de acesso.");
    return;
  }

  try {
    const resposta = await fetch("/api/auth/recuperar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      mostrarMensagemRecuperacao(dados.error || "Erro ao solicitar recuperação.");
      return;
    }
    mostrarMensagemRecuperacao(
      dados.message ||
        "Se o email estiver cadastrado, enviaremos um link de recuperação.",
      true
    );
    forgotForm.reset();
  } catch (error) {
    console.error(error);
    mostrarMensagemRecuperacao("Erro ao comunicar com o servidor.");
  }
});

// Mostrar mensagem da URL (ex: token expirado)
const params = new URLSearchParams(window.location.search);
const msg = params.get("msg");
if (msg) {
  mostrarMensagem(decodeURIComponent(msg));
  trocarAba("loginPanel");
  history.replaceState({}, "", window.location.pathname);
}
