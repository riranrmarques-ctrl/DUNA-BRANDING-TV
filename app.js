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

const CHAVE_NOME = "nomeDispositivo";
const CHAVE_CODIGO = "codigoAtivo";
const CHAVE_JA_CONECTOU = "jaConectouManual";
const TEMPO_AUTO_ENTRADA = 30;

let intervaloAutoEntrada = null;
let timeoutAutoEntrada = null;
let autoEntradaCancelada = false;
let autoEntradaAtiva = false;
let segundosRestantes = TEMPO_AUTO_ENTRADA;

function mostrarMensagem(texto, cor = "#ff6b6b") {
  if (!mensagem) return;
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

function mostrarContador(texto) {
  if (!contadorTexto) return;
  contadorTexto.classList.remove("hidden");
  contadorTexto.textContent = texto;
}

function esconderContador() {
  if (!contadorTexto) return;
  contadorTexto.textContent = "";
  contadorTexto.classList.add("hidden");
}

function pararAutoEntrada() {
  if (intervaloAutoEntrada) {
    clearInterval(intervaloAutoEntrada);
    intervaloAutoEntrada = null;
  }

  if (timeoutAutoEntrada) {
    clearTimeout(timeoutAutoEntrada);
    timeoutAutoEntrada = null;
  }

  autoEntradaAtiva = false;
}

function cancelarAutoEntrada(motivo = "Auto entrada cancelada.") {
  if (!autoEntradaAtiva || autoEntradaCancelada) return;

  autoEntradaCancelada = true;
  pararAutoEntrada();
  mostrarMensagem("Você pode alterar o código.", "#facc15");
  mostrarContador(motivo);
}

function carregarDadosSalvos() {
  const nomeSalvo = localStorage.getItem(CHAVE_NOME) || "";
  const codigoSalvo = localStorage.getItem(CHAVE_CODIGO) || "";

  if (inputDispositivo) inputDispositivo.value = nomeSalvo;
  if (inputCodigo) inputCodigo.value = codigoSalvo;
}

function irParaPlayer(codigo) {
  window.location.href = `player.html?codigo=${encodeURIComponent(codigo)}`;
}

function iniciarAutoEntrada() {
  const codigoSalvo = (localStorage.getItem(CHAVE_CODIGO) || "").trim().toUpperCase();
  const nomeSalvo = localStorage.getItem(CHAVE_NOME) || "";
  const jaConectou = localStorage.getItem(CHAVE_JA_CONECTOU) === "1";

  if (!jaConectou) return;
  if (!codigoSalvo) return;
  if (!codigosValidos.includes(codigoSalvo)) return;

  if (inputCodigo) inputCodigo.value = codigoSalvo;
  if (inputDispositivo) inputDispositivo.value = nomeSalvo;

  autoEntradaCancelada = false;
  autoEntradaAtiva = true;
  segundosRestantes = TEMPO_AUTO_ENTRADA;

  mostrarMensagem("Modo automático ativado", "#86efac");
  mostrarContador(`Entrando automaticamente em ${segundosRestantes}s...`);

  intervaloAutoEntrada = setInterval(() => {
    segundosRestantes -= 1;

    if (segundosRestantes > 0) {
      mostrarContador(`Entrando automaticamente em ${segundosRestantes}s...`);
    }
  }, 1000);

  timeoutAutoEntrada = setTimeout(() => {
    pararAutoEntrada();

    if (autoEntradaCancelada) return;

    const codigoAtual = (inputCodigo?.value || "").trim().toUpperCase();
    const nomeAtual = (inputDispositivo?.value || "").trim();

    localStorage.setItem(CHAVE_CODIGO, codigoAtual);
    localStorage.setItem(CHAVE_NOME, nomeAtual);

    irParaPlayer(codigoAtual);
  }, TEMPO_AUTO_ENTRADA * 1000);
}

if (inputDispositivo) {
  inputDispositivo.addEventListener("input", () => {
    localStorage.setItem(CHAVE_NOME, inputDispositivo.value.trim());

    if (autoEntradaAtiva) {
      cancelarAutoEntrada("Auto entrada cancelada.");
    }
  });

  inputDispositivo.addEventListener("focus", () => {
    if (autoEntradaAtiva) {
      cancelarAutoEntrada("Auto entrada cancelada.");
    }
  });
}

if (inputCodigo) {
  inputCodigo.addEventListener("input", () => {
    const codigoFormatado = inputCodigo.value.trim().toUpperCase();

    inputCodigo.value = codigoFormatado;
    localStorage.setItem(CHAVE_CODIGO, codigoFormatado);

    if (autoEntradaAtiva) {
      cancelarAutoEntrada("Auto entrada cancelada.");
    }
  });

  inputCodigo.addEventListener("focus", () => {
    if (autoEntradaAtiva) {
      cancelarAutoEntrada("Auto entrada cancelada.");
    }
  });
}

if (form) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    pararAutoEntrada();
    esconderContador();

    const dispositivo = (inputDispositivo?.value || "").trim();
    const codigo = (inputCodigo?.value || "").trim().toUpperCase();

    if (inputCodigo) inputCodigo.value = codigo;

    if (!codigo) {
      mostrarMensagem("Digite o código do estabelecimento.");
      return;
    }

    if (!codigosValidos.includes(codigo)) {
      mostrarMensagem("Código incorreto.");
      return;
    }

    localStorage.setItem(CHAVE_CODIGO, codigo);
    localStorage.setItem(CHAVE_NOME, dispositivo);
    localStorage.setItem(CHAVE_JA_CONECTOU, "1");

    mostrarMensagem("Código válido. Redirecionando...", "#86efac");

    let segundos = 2;
    mostrarContador(`Entrando em ${segundos}...`);

    const intervalo = setInterval(() => {
      segundos--;
      mostrarContador(`Entrando em ${segundos}...`);

      if (segundos <= 0) {
        clearInterval(intervalo);
        irParaPlayer(codigo);
      }
    }, 1000);
  });
}

function limparAcesso() {
  pararAutoEntrada();
  localStorage.removeItem(CHAVE_CODIGO);
  localStorage.removeItem(CHAVE_NOME);
  localStorage.removeItem(CHAVE_JA_CONECTOU);
  location.reload();
}

carregarDadosSalvos();
iniciarAutoEntrada();
