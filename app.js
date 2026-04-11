const form = document.getElementById("codeForm");
const inputDispositivo = document.getElementById("dispositivo");
const inputCodigo = document.getElementById("codigo");
const mensagem = document.getElementById("mensagem");
const contadorTexto = document.getElementById("contadorTexto");

function mostrarMensagem(texto, cor = "#ff6b6b") {
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const dispositivo = inputDispositivo.value.trim();
  const codigo = inputCodigo.value.trim();

  if (!codigo) {
    mostrarMensagem("Digite o código do estabelecimento.");
    return;
  }

  const dados = JSON.parse(localStorage.getItem("dunaPastas")) || {};
  const pasta = dados[codigo];

  if (!pasta) {
    mostrarMensagem("Código incorreto.");
    return;
  }

  if (!pasta.video || !pasta.video.trim()) {
    mostrarMensagem("Este código não possui vídeo cadastrado.");
    return;
  }

  localStorage.setItem("codigoAtivo", codigo);

  if (dispositivo) {
    localStorage.setItem("nomeDispositivo", dispositivo);
  }

  mostrarMensagem("Carregando vídeo...", "#86efac");

  setTimeout(() => {
    window.location.href = "player.html";
  }, 500);
});
