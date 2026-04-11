const form = document.getElementById("codeForm");
const codigoInput = document.getElementById("codigo");
const dispositivoInput = document.getElementById("dispositivo");
const mensagem = document.getElementById("mensagem");
const contadorTexto = document.getElementById("contadorTexto");

let countdown = 30;
let countdownInterval = null;
let codigosValidos = null;

/* CHAVES DE STORAGE */
const STORAGE_CODIGO = "codigoEstabelecimento";
const STORAGE_DISPOSITIVO = "nomeDispositivo";
const STORAGE_HISTORICO = "historicoLoginValido";

/* CARREGA DADOS SALVOS */
const codigoSalvo = localStorage.getItem(STORAGE_CODIGO) || "";
const dispositivoSalvo = localStorage.getItem(STORAGE_DISPOSITIVO) || "";
const historicoLoginValido = localStorage.getItem(STORAGE_HISTORICO) === "true";

codigoInput.value = codigoSalvo;
dispositivoInput.value = dispositivoSalvo;

/* SALVA CAMPOS */
function salvarCampos() {
  localStorage.setItem(STORAGE_CODIGO, codigoInput.value.trim());
  localStorage.setItem(STORAGE_DISPOSITIVO, dispositivoInput.value.trim());
}

/* CONTADOR */
function pararContador() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  countdown = 30;
  contadorTexto.textContent = "";
  contadorTexto.classList.add("hidden");
}

function iniciarContador() {
  pararContador();

  contadorTexto.classList.remove("hidden");
  contadorTexto.textContent = `Iniciando automaticamente em ${countdown}s`;

  countdownInterval = setInterval(async () => {
    countdown--;
    contadorTexto.textContent = `Iniciando automaticamente em ${countdown}s`;

    if (countdown <= 0) {
      pararContador();
      await entrarNoPlayer(true);
    }
  }, 1000);
}

/* CARREGA CÓDIGOS */
async function carregarCodigos() {
  if (codigosValidos) return codigosValidos;

  try {
    const resposta = await fetch("clientes.json", { cache: "no-store" });

    if (!resposta.ok) {
      throw new Error("Erro ao carregar clientes.json");
    }

    const dados = await resposta.json();

    if (Array.isArray(dados)) {
      codigosValidos = dados
        .map(item => String(item.codigo || "").trim().toLowerCase())
        .filter(Boolean);
      return codigosValidos;
    }

    if (typeof dados === "object" && dados !== null) {
      codigosValidos = Object.keys(dados)
        .map(chave => String(chave).trim().toLowerCase())
        .filter(Boolean);
      return codigosValidos;
    }

    codigosValidos = [];
    return codigosValidos;
  } catch (erro) {
    console.error("Erro ao carregar códigos:", erro);
    codigosValidos = [];
    return codigosValidos;
  }
}

/* VERIFICA CÓDIGO */
async function codigoExiste(codigo) {
  const lista = await carregarCodigos();
  return lista.includes(String(codigo).trim().toLowerCase());
}

/* ENTRAR */
async function entrarNoPlayer(vindoDoAutoStart = false) {
  const codigo = codigoInput.value.trim();
  const dispositivo = dispositivoInput.value.trim();

  mensagem.textContent = "";
  salvarCampos();

  if (!codigo) {
    mensagem.textContent = "Informe o código do estabelecimento.";
    localStorage.removeItem(STORAGE_HISTORICO);
    pararContador();
    return;
  }

  const valido = await codigoExiste(codigo);

  if (!valido) {
    mensagem.textContent = "Código incorreto!";
    localStorage.removeItem(STORAGE_HISTORICO);
    pararContador();
    return;
  }

  localStorage.setItem(STORAGE_CODIGO, codigo);
  localStorage.setItem(STORAGE_DISPOSITIVO, dispositivo);
  localStorage.setItem(STORAGE_HISTORICO, "true");

  window.location.href = `player.html?codigo=${encodeURIComponent(codigo)}`;
}

/* SUBMIT */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await entrarNoPlayer(false);
});

/* INPUT CÓDIGO */
codigoInput.addEventListener("input", () => {
  salvarCampos();
  mensagem.textContent = "";
  pararContador();
});

/* INPUT NOME */
dispositivoInput.addEventListener("input", () => {
  salvarCampos();
});

/* VALIDA AO SAIR DO CAMPO */
codigoInput.addEventListener("blur", async () => {
  const codigo = codigoInput.value.trim();

  if (!codigo) {
    mensagem.textContent = "";
    pararContador();
    return;
  }

  const valido = await codigoExiste(codigo);

  if (!valido) {
    mensagem.textContent = "Código incorreto!";
    pararContador();
    return;
  }

  mensagem.textContent = "";
});

/* INÍCIO */
async function iniciarSistema() {
  pararContador();
  await carregarCodigos();

  if (!historicoLoginValido) {
    return;
  }

  const codigoAtual = codigoInput.value.trim();

  if (!codigoAtual) {
    localStorage.removeItem(STORAGE_HISTORICO);
    return;
  }

  const valido = await codigoExiste(codigoAtual);

  if (!valido) {
    localStorage.removeItem(STORAGE_HISTORICO);
    mensagem.textContent = "Código incorreto!";
    return;
  }

  iniciarContador();
}

iniciarSistema();
