const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const TABELA_CLIENTES = "clientes_app";
const TABELA_CLIENTE_PONTOS = "cliente_pontos";
const TABELA_PONTOS = "pontos";
const TABELA_PLAYLIST = "playlists";
const TABELA_HISTORICO = "historico_conexao";

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
let pontosContratados = [];
let historicosPorPonto = {};
let pontoSelecionado = "";
let timerPreviewPlaylist = null;
let canalClienteRealtime = null;

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function abrirAreaCliente() {
  if (loginScreen) loginScreen.style.display = "none";
  if (areaCliente) areaCliente.style.display = "block";
}

function abrirLogin() {
  if (areaCliente) areaCliente.style.display = "none";
  if (loginScreen) loginScreen.style.display = "flex";
}

function mostrarLoading() {
  if (loadingOverlay) loadingOverlay.style.display = "flex";
}

function esconderLoading() {
  if (loadingOverlay) loadingOverlay.style.display = "none";
}

async function buscarCliente(codigo) {
  const { data } = await supabaseClient
    .from(TABELA_CLIENTES)
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();
  return data;
}

async function buscarVinculosCliente(codigo) {
  const { data } = await supabaseClient
    .from(TABELA_CLIENTE_PONTOS)
    .select("ponto_codigo")
    .eq("cliente_codigo", codigo);
  return (data || []).map(i => normalizarCodigo(i.ponto_codigo));
}

async function buscarPontos(codigos) {
  const { data } = await supabaseClient
    .from(TABELA_PONTOS)
    .select("*")
    .in("codigo", codigos);
  return data || [];
}

function renderizarListaPontos() {
  if (!listaPontosCliente) return;

  listaPontosCliente.innerHTML = pontosContratados.map(p => `
    <button class="ponto-card" data-codigo="${p.codigo}">
      <img src="${p.imagem_url || ""}">
      <div>
        <h3>${p.nome || "Ponto"}</h3>
      </div>
    </button>
  `).join("");

  document.querySelectorAll(".ponto-card").forEach(btn => {
    btn.onclick = () => abrirPonto(btn.dataset.codigo);
  });
}

async function abrirPonto(codigo) {
  pontoSelecionado = codigo;

  if (estadoVazio) estadoVazio.style.display = "none";
  if (detalhePonto) detalhePonto.style.display = "block";

  if (nomePontoDetalhe) nomePontoDetalhe.textContent = codigo;
}

async function carregarAreaCliente(codigo) {
  codigoClienteAtual = normalizarCodigo(codigo);
  mostrarLoading();

  try {
    clienteAtual = await buscarCliente(codigoClienteAtual);

    if (!clienteAtual) {
      abrirLogin();
      return;
    }

    const codigos = await buscarVinculosCliente(codigoClienteAtual);
    pontosContratados = await buscarPontos(codigos);

    renderizarListaPontos();
    abrirAreaCliente();

    if (pontosContratados.length) {
      abrirPonto(pontosContratados[0].codigo);
    }

  } catch {
    abrirLogin();
  }

  esconderLoading();
}

function entrarComCodigoDigitado() {
  const codigo = normalizarCodigo(codigoLogin?.value);
  if (!codigo) return;
  carregarAreaCliente(codigo);
}

if (btnEntrarCliente) btnEntrarCliente.onclick = entrarComCodigoDigitado;

if (codigoLogin) {
  codigoLogin.addEventListener("keydown", e => {
    if (e.key === "Enter") entrarComCodigoDigitado();
  });
}

if (btnSair) {
  btnSair.onclick = abrirLogin;
}

window.addEventListener("load", () => {
  abrirLogin();
});

function reorganizarMobile() {
  const contrato = document.querySelector(".contrato-card");
  const contratoOrigem = document.getElementById("contratoOrigem");
  const contratoMobileFinal = document.getElementById("contratoMobileFinal");

  const historicoBloco = document.querySelector("#historicoOrigem .historico-secao");
  const historicoOrigem = document.getElementById("historicoOrigem");
  const historicoMobileFinal = document.getElementById("historicoMobileFinal");

  if (!contrato || !contratoOrigem || !contratoMobileFinal || !historicoBloco || !historicoOrigem || !historicoMobileFinal) {
    return;
  }

  if (window.innerWidth <= 760) {
    if (contrato.parentElement !== contratoMobileFinal) {
      contratoMobileFinal.appendChild(contrato);
    }

    if (historicoBloco.parentElement !== historicoMobileFinal) {
      historicoMobileFinal.appendChild(historicoBloco);
    }

  } else {
    if (contrato.parentElement !== contratoOrigem) {
      contratoOrigem.appendChild(contrato);
    }

    if (historicoBloco.parentElement !== historicoOrigem) {
      historicoOrigem.appendChild(historicoBloco);
    }
  }
}

window.addEventListener("load", reorganizarMobile);
window.addEventListener("resize", reorganizarMobile);
