const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";

const TABELA_CLIENTES = "dadosclientes";
const TABELA_CLIENTE_PONTOS = "playercliente";
const TABELA_PONTOS = "pontos";
const TABELA_PLAYLIST = "playlists";
const TABELA_HISTORICO = "statuspontos";
const TABELA_CONTRATOS_CLIENTES = "contratos_clientes";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginScreen = document.getElementById("loginScreen");
const areaCliente = document.getElementById("areaCliente");
const codigoLogin = document.getElementById("codigoLogin");
const btnEntrarCliente = document.getElementById("btnEntrarCliente");
const loginErro = document.getElementById("loginErro");
const loadingOverlay = document.getElementById("loadingOverlay");

const btnAtualizar = document.getElementById("btnAtualizar");
const btnSair = document.getElementById("btnSair");
const tituloBoasVindas = document.getElementById("tituloBoasVindas");
const subtituloCliente = document.getElementById("subtituloCliente");
const contratoBadge = document.getElementById("contratoBadge");
const contratoInfo = document.getElementById("contratoInfo");
const codigoClienteEl = document.getElementById("codigoCliente");
const contratoCard = document.querySelector(".contrato-card");
const btnAssinarContrato = document.getElementById("btnAssinarContrato");
const historicoContratoCliente = document.getElementById("historicoContratoCliente");
const mensagemCliente = document.getElementById("mensagemCliente");
const contadorPontos = document.getElementById("contadorPontos");
const listaPontosCliente = document.getElementById("listaPontosCliente");

const estadoVazio = document.getElementById("estadoVazio");
const detalhePonto = document.getElementById("detalhePonto");
const nomePontoDetalhe = document.getElementById("nomePontoDetalhe");
const localPontoDetalhe = document.getElementById("localPontoDetalhe");
const statusPontoDetalhe = document.getElementById("statusPontoDetalhe");
const statusDesdeDetalhe = document.getElementById("statusDesdeDetalhe");
const previewNome = document.getElementById("previewNome");
const previewMidia = document.getElementById("previewMidia");
const listaMateriais = document.getElementById("listaMateriais");
const historicoStatusPonto = document.getElementById("historicoStatusPonto");
const nomeClienteTopo = document.getElementById("nomeClienteTopo");

let codigoClienteAtual = "";
let clienteAtual = null;
let contratoAtualCliente = null;
let pontosContratados = [];
let historicosPorPonto = {};
let pontoSelecionado = "";

let timerMensagem = null;
let timerLimparMensagem = null;
let timerPreviewPlaylist = null;
let canalClienteRealtime = null;
let canalContratoRealtime = null;

function setMensagem(texto, tipo = "normal") {
  if (!mensagemCliente) return;

  if (timerMensagem) {
    clearTimeout(timerMensagem);
    timerMensagem = null;
  }

  if (timerLimparMensagem) {
    clearTimeout(timerLimparMensagem);
    timerLimparMensagem = null;
  }

  mensagemCliente.textContent = texto || "";
  mensagemCliente.classList.remove("ok", "erro", "saindo");

  if (tipo === "ok") mensagemCliente.classList.add("ok");
  if (tipo === "erro") mensagemCliente.classList.add("erro");

  if (!texto) return;

  timerMensagem = setTimeout(() => {
    mensagemCliente.classList.add("saindo");

    timerLimparMensagem = setTimeout(() => {
      mensagemCliente.textContent = "";
      mensagemCliente.classList.remove("saindo", "ok", "erro");
    }, 350);
  }, 4500);
}

function setLoginErro(texto) {
  if (loginErro) loginErro.textContent = texto || "";
}

function mostrarLoading() {
  document.body.classList.add("loading-page");

  if (btnEntrarCliente) {
    btnEntrarCliente.classList.add("carregando");
    btnEntrarCliente.disabled = true;
    btnEntrarCliente.textContent = "Entrando...";
