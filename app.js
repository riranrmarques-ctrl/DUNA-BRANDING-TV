const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";

const TABELA_PONTOS = "pontos";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("codeForm");
const inputDispositivo = document.getElementById("dispositivo");
const inputCodigo = document.getElementById("codigo");
const mensagem = document.getElementById("mensagem");
const contadorTexto = document.getElementById("contadorTexto");

const CHAVE_NOME = "nomeDispositivo";
const CHAVE_CODIGO = "codigoAtivo";
const CHAVE_JA_CONECTOU = "jaConectouManual";
const TEMPO_AUTO_ENTRADA = 30;

let intervaloAutoEntrada = null;
let timeoutAutoEntrada = null;
let autoEntradaCancelada = false;
let autoEntradaAtiva = false;
let segundosRestantes = TEMPO_AUTO_ENTRADA;
let validandoCodigo = false;

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

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
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
  window.location.href = `/player?codigo=${encodeURIComponent(codigo)}`;
}

async function buscarPontoPorCodigo(codigo) {
  const codigoNormalizado = normalizarCodigo(codigo);

  if (!codigoNormalizado) return null;

  const consultas = [
    "codigo,nome,status,disponivel",
    "codigo,nome",
    "*"
  ];

  let ultimoErro = null;

  for (const colunas of consultas) {
    const { data, error } = await supabaseClient
      .from(TABELA_PONTOS)
      .select(colunas)
      .eq("codigo", codigoNormalizado)
      .maybeSingle();

    if (!error) return data || null;

    ultimoErro = error;
    console.warn("Falha ao validar código com colunas:", colunas, error);
  }

  throw ultimoErro;
}

function pontoPodeEntrar(ponto) {
  if (!ponto) return false;

  const status = String(ponto.status || "").trim().toLowerCase();

  if (ponto.disponivel === false) return false;
  if (status === "inativo") return false;

  return true;
}

async function validarCodigoPonto(codigo) {
  const ponto = await buscarPontoPorCodigo(codigo);

  if (!ponto) {
    return {
      valido: false,
      motivo: "Código não encontrado."
    };
  }

  if (!pontoPodeEntrar(ponto)) {
    return {
      valido: false,
      motivo: "Este ponto está indisponível no momento."
    };
  }

  return {
    valido: true,
    ponto
  };
}

async function iniciarAutoEntrada() {
  const codigoSalvo = normalizarCodigo(localStorage.getItem(CHAVE_CODIGO) || "");
  const nomeSalvo = localStorage.getItem(CHAVE_NOME) || "";
  const jaConectou = localStorage.getItem(CHAVE_JA_CONECTOU) === "1";

  if (!jaConectou) return;
  if (!codigoSalvo) return;

  if (inputCodigo) inputCodigo.value = codigoSalvo;
  if (inputDispositivo) inputDispositivo.value = nomeSalvo;

  try {
    mostrarMensagem("Validando código salvo...", "#9fd2ff");

    const resultado = await validarCodigoPonto(codigoSalvo);

    if (!resultado.valido) {
      mostrarMensagem(resultado.motivo || "Código salvo inválido.");
      esconderContador();
      return;
    }
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao validar código salvo.");
    esconderContador();
    return;
  }

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

    const codigoAtual = normalizarCodigo(inputCodigo?.value || "");
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
    const codigoFormatado = normalizarCodigo(inputCodigo.value);

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
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (validandoCodigo) return;

    pararAutoEntrada();
    esconderContador();

    const dispositivo = (inputDispositivo?.value || "").trim();
    const codigo = normalizarCodigo(inputCodigo?.value || "");

    if (inputCodigo) inputCodigo.value = codigo;

    if (!codigo) {
      mostrarMensagem("Digite o código do estabelecimento.");
      return;
    }

    try {
      validandoCodigo = true;
      mostrarMensagem("Validando código...", "#9fd2ff");

      const resultado = await validarCodigoPonto(codigo);

      if (!resultado.valido) {
        mostrarMensagem(resultado.motivo || "Código incorreto.");
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
    } catch (error) {
      console.error(error);
      mostrarMensagem("Erro ao validar código. Tente novamente.");
    } finally {
      validandoCodigo = false;
    }
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
