const form = document.getElementById("codeForm");
const inputDispositivo = document.getElementById("dispositivo");
const inputCodigo = document.getElementById("codigo");
const mensagem = document.getElementById("mensagem");
const contadorTexto = document.getElementById("contadorTexto");

const codigosValidos = [
  "H4E9L2A",
  "N7H3E8L",
  "E2A6H9N",
  "L8E1N5A",
  "H6N4E7A",
  "A9L3E2H",
  "E5H8A1N",
  "N2E7L4A"
];

function mostrarMensagem(texto, cor = "#ff6b6b") {
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

function carregarDadosSalvos() {
  const nomeSalvo = localStorage.getItem("nomeDispositivo") || "";
  const codigoSalvo = localStorage.getItem("codigoAtivo") || "";

  inputDispositivo.value = nomeSalvo;
  inputCodigo.value = codigoSalvo;
}

function autoEntrar() {
  const codigoSalvo = localStorage.getItem("codigoAtivo");

  if (codigoSalvo && codigosValidos.includes(codigoSalvo)) {
    let segundos = 60;

    mostrarMensagem("Modo automático ativado", "#86efac");

    contadorTexto.classList.remove("hidden");
    contadorTexto.textContent = `Entrando automaticamente em ${segundos}s...`;

    const intervalo = setInterval(() => {
      segundos--;
      contadorTexto.textContent = `Entrando automaticamente em ${segundos}s...`;

      if (
        document.activeElement === inputCodigo ||
        document.activeElement === inputDispositivo ||
        inputCodigo.value.trim() !== codigoSalvo
      ) {
        clearInterval(intervalo);
        contadorTexto.textContent = "Auto entrada cancelada.";
        mostrarMensagem("Você pode alterar o código.", "#facc15");
        return;
      }

      if (segundos <= 0) {
        clearInterval(intervalo);
        window.location.href = `player.html?codigo=${codigoSalvo}`;
      }
    }, 1000);
  }
}

inputDispositivo.addEventListener("input", () => {
  localStorage.setItem("nomeDispositivo", inputDispositivo.value.trim());
});

inputCodigo.addEventListener("input", () => {
  localStorage.setItem("codigoAtivo", inputCodigo.value.trim());
});

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
  localStorage.setItem("nomeDispositivo", dispositivo);

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

carregarDadosSalvos();
autoEntrar();

function limparAcesso() {
  localStorage.removeItem("codigoAtivo");
  localStorage.removeItem("nomeDispositivo");
  location.reload();
}
