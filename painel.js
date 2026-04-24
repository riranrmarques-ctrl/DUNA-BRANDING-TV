const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";
const BUCKET = "midias";

const TABELA = "playlists";
const TABELA_PONTOS = "pontos";
const TABELA_STATUS_PONTOS = "statuspontos";

const CACHE_PONTOS_KEY = "painel_pontos_cache_v10";
const CACHE_PONTOS_TTL = 15 * 60 * 1000;
const CACHE_PLAYLIST_PREFIX = "painel_playlist_cache_v9_";
const CACHE_PLAYLIST_TTL = 60 * 1000;
const LIMITE_STATUS_ATIVO_MS = 60 * 1000;

function limparCachesAntigos() {
  try {
    sessionStorage.removeItem("painel_pontos_cache_v1");
    sessionStorage.removeItem("painel_pontos_cache_v2");
    sessionStorage.removeItem("painel_pontos_cache_v3");
    sessionStorage.removeItem("painel_pontos_cache_v4");
    sessionStorage.removeItem("painel_pontos_cache_v5");
    sessionStorage.removeItem("painel_pontos_cache_v6");
    sessionStorage.removeItem("painel_pontos_cache_v7");
    sessionStorage.removeItem("painel_pontos_cache_v8");
    sessionStorage.removeItem("painel_pontos_cache_v9");

    Object.keys(sessionStorage).forEach((key) => {
      if (
        key.startsWith("painel_playlist_cache_v1_") ||
        key.startsWith("painel_playlist_cache_v2_") ||
        key.startsWith("painel_playlist_cache_v3_") ||
        key.startsWith("painel_playlist_cache_v4_") ||
        key.startsWith("painel_playlist_cache_v5_") ||
        key.startsWith("painel_playlist_cache_v6_") ||
        key.startsWith("painel_playlist_cache_v7_") ||
        key.startsWith("painel_playlist_cache_v8_")
      ) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    return;
  }
}

limparCachesAntigos();

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

if (sessionStorage.getItem("painelLiberado") !== "1") {
  window.location.replace("centralpainel.html");
  throw new Error("Acesso bloqueado. Entre pela centralpainel.html");
}

const statusEl = document.querySelector(".status-topo") || document.getElementById("status");
const listaPontos = document.getElementById("listaPontos");
const pontoDetalhe = document.getElementById("pontoDetalhe");
const pontosBox = document.querySelector(".pontos-box");

const codigoAtual = document.getElementById("codigoAtual");
const tituloPasta = document.getElementById("tituloPasta");

const btnVoltar = document.getElementById("btnVoltar");
const btnCopiarCodigo = document.getElementById("btnCopiarCodigo");
const btnEditarInfo = document.getElementById("btnEditarInfo");
const btnToggleDisponibilidade = document.getElementById("btnToggleDisponibilidade");
const btnNovoPonto = document.getElementById("btnNovoPonto");
const btnUpgradePlaylist = document.getElementById("btnUpgradePlaylist");
const inputUpgradePlaylist = document.getElementById("inputUpgradePlaylist");
const btnDeletarPonto = document.getElementById("btnDeletarPonto");

const modalEditar = document.getElementById("modalEditar");
const editNome = document.getElementById("editNome");
const editCidade = document.getElementById("editCidade");
const editEndereco = document.getElementById("editEndereco");
const previewImagem = document.getElementById("previewImagem");
const inputImagem = document.getElementById("inputImagem");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const btnFecharModal = document.getElementById("btnFecharModal");

let codigoSelecionado = null;
let pontosMap = {};
let dragIndex = null;
let arquivoImagemEdicao = null;
let painelIniciado = false;
let carregandoPontos = false;
let carregandoPlaylist = false;
let criandoNovoPonto = false;

let posicaoImagemAtual = { x: 50, y: 50 };
let arrastandoPreview = false;

function setStatus(msg, tipo = "normal") {
  if (!statusEl) return;

  statusEl.textContent = msg;
  statusEl.classList.remove("ok", "erro");

  if (tipo === "ok") statusEl.classList.add("ok");
  if (tipo === "erro") statusEl.classList.add("erro");
}

function salvarCachePontos(pontos) {
  try {
    sessionStorage.setItem(
      CACHE_PONTOS_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        dados: pontos
      })
    );
  } catch {}
}

function lerCachePontos() {
  try {
    const cache = sessionStorage.getItem(CACHE_PONTOS_KEY);
    if (!cache) return null;

    const obj = JSON.parse(cache);

    if (Date.now() - obj.timestamp > CACHE_PONTOS_TTL) {
      sessionStorage.removeItem(CACHE_PONTOS_KEY);
      return null;
    }

    return obj.dados;
  } catch {
    return null;
  }
}

function salvarCachePlaylist(codigo, dados) {
  try {
    sessionStorage.setItem(
      CACHE_PLAYLIST_PREFIX + codigo,
      JSON.stringify({
        timestamp: Date.now(),
        dados
      })
    );
  } catch {}
}

function lerCachePlaylist(codigo) {
  try {
    const cache = sessionStorage.getItem(CACHE_PLAYLIST_PREFIX + codigo);
    if (!cache) return null;

    const obj = JSON.parse(cache);

    if (Date.now() - obj.timestamp > CACHE_PLAYLIST_TTL) {
      sessionStorage.removeItem(CACHE_PLAYLIST_PREFIX + codigo);
      return null;
    }

    return obj.dados;
  } catch {
    return null;
  }
}

function limparCachePlaylist(codigo) {
  try {
    sessionStorage.removeItem(CACHE_PLAYLIST_PREFIX + codigo);
  } catch {}
}

function iniciarPainel() {
  if (painelIniciado) return;
  painelIniciado = true;

  setStatus("Carregando pontos...", "normal");

  const cache = lerCachePontos();

  if (cache) {
    renderizarPontos(cache);
  }

  carregarPontosRemoto();
}

async function carregarPontosRemoto() {
  if (carregandoPontos) return;
  carregandoPontos = true;

  try {
    const { data, error } = await supabaseClient
      .from(TABELA_PONTOS)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    pontosMap = {};
    (data || []).forEach(p => {
      pontosMap[p.codigo] = p;
    });

    salvarCachePontos(data);
    renderizarPontos(data);

    setStatus("Pontos carregados", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Erro ao carregar pontos", "erro");
  } finally {
    carregandoPontos = false;
  }
}

function renderizarPontos(pontos) {
  if (!pontosBox) return;

  if (!pontos || !pontos.length) {
    pontosBox.innerHTML = `<div class="empty-state">Nenhum ponto encontrado</div>`;
    return;
  }

  pontosBox.innerHTML = pontos.map(p => `
    <div class="card-ponto" onclick="abrirPonto('${p.codigo}')">
      <div class="card-conteudo">
        <div class="card-nome">${p.nome || "Sem nome"}</div>
        <div class="card-cidade">${p.endereco || ""}</div>
      </div>
    </div>
  `).join("");
}
