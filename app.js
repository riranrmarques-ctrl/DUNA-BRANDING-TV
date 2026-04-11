const form = document.getElementById("codeForm");
const inputDispositivo = document.getElementById("dispositivo");
const inputCodigo = document.getElementById("codigo");
const mensagem = document.getElementById("mensagem");
const contadorTexto = document.getElementById("contadorTexto");

const codigosValidos = ["0001", "0002", "0003", "0004", "0005"];

function mostrarMensagem(texto, cor = "#ff6b6b") {
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const dispositivo = inputDispositivo.value.trim();
  const codigo = inputCodigo.value.trim();

  mensagem.textContent = "";
  contadorTexto.textContent = "";
  contadorTexto.classList.add("hidden");

  if (!codigo) {
    mostrarMensagem("Digite o código do estabelecimento.");
    return;
  }

  if (!codigosValidos.includes(codigo)) {
    mostrarMensagem("Código incorreto.");
    return;
  }

  localStorage.setItem("codigoAtivo", codigo);

  if (dispositivo) {
    localStorage.setItem("nomeDispositivo", dispositivo);
  }

  mostrarMensagem("Código válido. Redirecionando...", "#86efac");

  let segundos = 2;
  contadorTexto.classList.remove("hidden");
  contadorTexto.textContent = `Entrando em ${segundos}...`;

  const intervalo = setInterval(() => {
    segundos--;
    contadorTexto.textContent = `Entrando em ${segundos}...`;

    if (segundos <= 0) {
      clearInterval(intervalo);
      window.location.href = `player.html?codigo=${codigo}`;
    }
  }, 1000);
});
