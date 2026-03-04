const form = document.getElementById("resetForm");
const mensagem = document.getElementById("resetMensagem");

function mostrarMensagem(texto, sucesso = false) {
  mensagem.textContent = texto;
  mensagem.classList.remove("hidden");
  mensagem.style.background = sucesso ? "#dcfce7" : "#fee2e2";
  mensagem.style.color = sucesso ? "#14532d" : "#991b1b";
}

function validarSenhaForte(senha) {
  if (!senha || senha.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[a-z]/.test(senha)) return "A senha deve ter pelo menos 1 letra minúscula.";
  if (!/[A-Z]/.test(senha)) return "A senha deve ter pelo menos 1 letra maiúscula.";
  if (!/[0-9]/.test(senha)) return "A senha deve ter pelo menos 1 número.";
  if (!/[^A-Za-z0-9]/.test(senha)) return "A senha deve ter pelo menos 1 caractere especial.";
  return null;
}

function obterToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  mensagem.classList.add("hidden");

  const token = obterToken();
  if (!token) {
    mostrarMensagem("Token inválido ou ausente.");
    return;
  }

  const senha = form.senha.value;
  const confirmacao = form.senha_confirmacao.value;

  const senhaErro = validarSenhaForte(senha);
  if (senhaErro) {
    mostrarMensagem(senhaErro);
    return;
  }

  if (senha !== confirmacao) {
    mostrarMensagem("As palavras-passe não coincidem.");
    return;
  }

  try {
    const resposta = await fetch("/api/auth/redefinir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, nova_senha: senha })
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      mostrarMensagem(dados.error || "Erro ao redefinir palavra-passe.");
      return;
    }
    mostrarMensagem("Palavra-passe redefinida com sucesso.", true);
    form.reset();
    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao comunicar com o servidor.");
  }
});
