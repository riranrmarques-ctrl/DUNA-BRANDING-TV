const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "videos";
const TABELA = "playlists";
const TABELA_PONTOS = "pontos";

const SENHA_PAINEL = "@Helena";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginBox = document.getElementById("loginBox");
const conteudoPainel = document.getElementById("conteudoPainel");
const senhaInput = document.getElementById("senhaInput");
const btnLogin = document.getElementById("btnLogin");
const loginErro = document.getElementById("loginErro");

const statusEl = document.getElementById("status");
const listaPontos = document.getElementById("listaPontos");
const pontoDetalhe = document.getElementById("pontoDetalhe");

const codigoAtual = document.getElementById("codigoAtual");
const tituloPasta = document.getElementById("tituloPasta");

const videoInput = document.getElementById("videoInput");
const btnUpload = document.getElementById("btnUpload");
const btnVoltar = document.getElementById("btnVoltar");

const dataInicioInput = document.getElementById("dataInicio");
const dataFimInput = document.getElementById("dataFim");

const playlistAtiva = document.getElementById("playlistAtiva");
const playlistInativa = document.getElementById("playlistInativa");

const btnCopiarCodigo = document.getElementById("btnCopiarCodigo");

let codigoSelecionado = null;
let pontosMap = {};
let statusPontosMap = {};
let dragIndex = null;

function setStatus(texto, tipo = "normal") {
  statusEl.textContent = texto;
  statusEl.className = "status-box";
  if (tipo === "ok") statusEl.classList.add("ok");
  if (tipo === "erro") statusEl.classList.add("erro");
}

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatarData(valor) {
  if (!valor) return "";
  return new Date(valor).toLocaleDateString("pt-BR");
}

function formatarDataHora(valor) {
  if (!valor) return "";
  return new Date(valor).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function normalizarDataInput(valor) {
  if (!valor) return null;
  return new Date(valor + "T00:00:00").toISOString();
}

function montarLinhaDatas(item) {
  const postado = formatarData(item.created_at);
  const encerrado = formatarData(item.data_fim);

  if (postado && encerrado) return `Postado: ${postado} • Encerra: ${encerrado}`;
  if (postado) return `Postado: ${postado}`;
  if (encerrado) return `Encerra: ${encerrado}`;
  return "";
}

function itemEstaInativo(item) {
  if (!item.data_fim) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fim = new Date(item.data_fim);
  fim.setHours(23, 59, 59, 999);

  return fim < hoje;
}

function obterStatusDoPonto(itens) {
  if (!itens.length) {
    return { tipo: "nao_conectado", texto: "Não conectado ainda" };
  }

  const ativos = itens.filter(item => !itemEstaInativo(item));

  if (ativos.length) {
    return { tipo: "ativo", texto: "Ativo" };
  }

  return { tipo: "inativo", texto: "Inativo" };
}

async function buscarResumoStatusPontos() {
  const { data } = await supabaseClient
    .from(TABELA)
    .select("codigo, data_fim");

  const agrupado = {};

  (data || []).forEach(item => {
    const codigo = String(item.codigo || "").trim();
    if (!codigo) return;
    if (!agrupado[codigo]) agrupado[codigo] = [];
    agrupado[codigo].push(item);
  });

  const resumo = {};

  document.querySelectorAll(".card-ponto").forEach(card => {
    const codigo = String(card.dataset.codigo || "").trim();
    resumo[codigo] = obterStatusDoPonto(agrupado[codigo] || []);
  });

  return resumo;
}

function aplicarStatusNosCards() {
  document.querySelectorAll(".card-ponto").forEach(card => {
    const codigo = card.dataset.codigo;
    const info = statusPontosMap[codigo] || { tipo: "nao_conectado", texto: "Não conectado" };

    let el = card.querySelector(".card-status-ponto");

    if (!el) {
      el = document.createElement("div");
      el.className = "card-status-ponto";
      card.querySelector(".card-acoes").appendChild(el);
    }

    el.textContent = info.texto;

    if (info.tipo === "ativo") el.style.color = "#7CFC9A";
    else if (info.tipo === "inativo") el.style.color = "#ffb347";
    else el.style.color = "#999";
  });
}

async function atualizarStatusDosPontos() {
  statusPontosMap = await buscarResumoStatusPontos();
  aplicarStatusNosCards();
}

async function carregarPlaylist() {
  const { data } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigoSelecionado)
    .order("ordem");

  const lista = data || [];

  const ativos = lista.filter(i => !itemEstaInativo(i));
  const inativos = lista.filter(i => itemEstaInativo(i));

  renderizarPlaylistAtiva(ativos);
  renderizarHistorico(inativos);
}
