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

// 🔹 Carrega dados salvos nos inputs
function carregarDadosSalvos() {
  const nomeSalvo = localStorage.getItem("nomeDispositivo") || "";
  const codigoSalvo = localStorage.getItem("codigoAtivo") || "";

  inputDispositivo.value = nomeSalvo;
  inputCodigo.value = codigoSalvo;
}

// 🔥 AUTO ENTRADA COM TEMPO (1 MINUTO)
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

      // 🛑 Se usuário interagir, cancela auto entrada
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

      // ⏱️ Tempo acabou → entra
      if (segundos <= 0) {
        clearInterval(intervalo);
        window.location.href = `player.html?codigo=${codigoSalvo}`;
      }
    }, 1000);
  }
}

// 🔹 Salva automaticamente ao digitar
inputDispositivo.addEventListener("input", () => {
  localStorage.setItem("nomeDispositivo", inputDispositivo.value.trim());
});

inputCodigo.addEventListener("input", () => {
  localStorage.setItem("codigoAtivo", inputCodigo.value.trim());
});

// 🔹 Submit manual
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

  // 💾 salva dados
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

// 🔥 ORDEM IMPORTANTE
carregarDadosSalvos();
autoEntrar();

// 🔒 OPCIONAL: botão reset
function limparAcesso() {
  localStorage.removeItem("codigoAtivo");
  localStorage.removeItem("nomeDispositivo");
  location.reload();
}
