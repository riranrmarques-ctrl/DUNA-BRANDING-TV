const form = document.getElementById("codeForm");
const codigoInput = document.getElementById("codigo");
const dispositivoInput = document.getElementById("dispositivo");
const mensagem = document.getElementById("mensagem");
const contadorTexto = document.getElementById("contadorTexto");

let countdown = 30;
let countdownInterval = null;
let clientesData = null;

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

/* NORMALIZA CÓDIGO
   Mantém como STRING para preservar zeros à esquerda, ex: 0001 */
function normalizarCodigo(valor) {
  return String(valor || "").trim();
}

/* SALVA CAMPOS */
function salvarCampos() {
  localStorage.setItem(STORAGE_CODIGO, normalizarCodigo(codigoInput.value));
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

/* CARREGA CLIENTES */
async function carregarClientes() {
  if (clientesData) return clientesData;

  try {
    const resposta = await fetch(`clientes.json?v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!resposta.ok) {
      throw new Error("Erro ao carregar clientes.json");
    }

    const dados = await resposta.json();

    if (typeof dados === "object" && dados !== null) {
      clientesData = dados;
      return clientesData;
    }

    clientesData = {};
    return clientesData;
  } catch (erro) {
    console.error("Erro ao carregar clientes:", erro);
    clientesData = {};
    return clientesData;
  }
}

/* VERIFICA CÓDIGO */
async function codigoExiste(codigo) {
  const codigoNormalizado = normalizarCodigo(codigo);
  const clientes = await carregarClientes();

  return Object.prototype.hasOwnProperty.call(clientes, codigoNormalizado);
}

/* ENTRAR */
async function entrarNoPlayer(vindoDoAutoStart = false) {
  const codigo = normalizarCodigo(codigoInput.value);
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

/* INPUT NOME DO DISPOSITIVO */
dispositivoInput.addEventListener("input", () => {
  salvarCampos();
});

/* VALIDA AO SAIR DO CAMPO */
codigoInput.addEventListener("blur", async () => {
  const codigo = normalizarCodigo(codigoInput.value);

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
  await carregarClientes();

  if (!historicoLoginValido) {
    return;
  }

  const codigoAtual = normalizarCodigo(codigoInput.value);

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
