const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "videos";
const TABELA = "playlists";
const TABELA_PONTOS = "pontos";

const SENHA_PAINEL = "@Helena26";

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

const btnVoltar = document.getElementById("btnVoltar");
const btnCopiarCodigo = document.getElementById("btnCopiarCodigo");
const btnEditarInfo = document.getElementById("btnEditarInfo");

let codigoSelecionado = null;
let pontosMap = {};
let dragIndex = null;

function setStatus(texto, tipo = "normal") {
  if (!statusEl) return;
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

function calcularStatus(ponto) {
  if (!ponto.ultimo_ping) return "🔴 Inativo";

  const diff = Date.now() - new Date(ponto.ultimo_ping).getTime();

  if (diff < 5 * 60 * 1000) {
    const hora = new Date(ponto.ultimo_ping).toLocaleTimeString("pt-BR");
    return `🟢 Ativo • ${hora}`;
  }

  return "🔴 Inativo";
}

function validarLogin() {
  if (!senhaInput || senhaInput.value.trim() !== SENHA_PAINEL) {
    if (loginErro) loginErro.textContent = "Código inválido";
    return;
  }

  loginBox.style.display = "none";
  conteudoPainel.style.display = "block";
  setStatus("Painel Ativo", "ok");
  iniciarPainel();
}

if (btnLogin) btnLogin.onclick = validarLogin;

async function buscarPontos() {
  const { data } = await supabaseClient.from(TABELA_PONTOS).select("*");
  return data || [];
}

function renderizarCardsPontos(lista) {
  pontosMap = {};
  lista.forEach(p => (pontosMap[p.codigo] = p));

  document.querySelectorAll(".card-ponto").forEach(card => {
    const codigo = card.dataset.codigo;
    const ponto = pontosMap[codigo] || {};

    const nomeEl = card.querySelector(".card-nome");
    const cidadeEl = card.querySelector(".card-cidade");
    const statusEl = card.querySelector(".card-status");

    if (nomeEl) nomeEl.textContent = ponto.nome || codigo;
    if (cidadeEl) cidadeEl.textContent = ponto.cidade || "Sem cidade";
    if (statusEl) statusEl.innerHTML = calcularStatus(ponto);
  });
}

function abrirPonto(codigo) {
  codigoSelecionado = String(codigo).trim();
  const ponto = pontosMap[codigoSelecionado] || {};

  listaPontos.style.display = "none";
  pontoDetalhe.style.display = "block";

  codigoAtual.textContent = codigoSelecionado;
  tituloPasta.textContent = ponto.nome || codigoSelecionado;

  document.getElementById("cidadePonto").textContent = ponto.cidade || "";
  document.getElementById("enderecoPonto").textContent = ponto.endereco || "";
  document.getElementById("statusPonto").innerHTML = calcularStatus(ponto);

  carregarPlaylist();
}

if (btnVoltar) {
  btnVoltar.onclick = () => {
    listaPontos.style.display = "grid";
    pontoDetalhe.style.display = "none";
  };
}

if (btnCopiarCodigo) {
  btnCopiarCodigo.onclick = async () => {
    await navigator.clipboard.writeText(codigoSelecionado);
    setStatus("Código copiado", "ok");
  };
}

if (btnEditarInfo) {
  btnEditarInfo.onclick = async () => {
    const ponto = pontosMap[codigoSelecionado] || {};

    const nome = prompt("Nome:", ponto.nome || "");
    if (nome === null) return;

    const cidade = prompt("Cidade:", ponto.cidade || "");
    if (cidade === null) return;

    const endereco = prompt("Endereço:", ponto.endereco || "");
    if (endereco === null) return;

    await supabaseClient
      .from(TABELA_PONTOS)
      .update({ nome, cidade, endereco })
      .eq("codigo", codigoSelecionado);

    ponto.nome = nome;
    ponto.cidade = cidade;
    ponto.endereco = endereco;

    abrirPonto(codigoSelecionado);
    renderizarCardsPontos(Object.values(pontosMap));

    setStatus("Atualizado com sucesso", "ok");
  };
}

async function carregarPlaylist() {
  const { data } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigoSelecionado)
    .order("ordem");

  const lista = data || [];

  document.getElementById("playlistAtiva").innerHTML = lista.map(item => `
    <div>${escapeHtml(item.nome)}</div>
  `).join("");
}

async function iniciarPainel() {
  const pontos = await buscarPontos();
  renderizarCardsPontos(pontos);

  document.querySelectorAll(".btn-abrir").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      abrirPonto(btn.dataset.codigo);
    };
  });

  document.querySelectorAll(".btn-copiar").forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      await navigator.clipboard.writeText(btn.dataset.codigo);
      setStatus("Código copiado", "ok");
    };
  });
}
