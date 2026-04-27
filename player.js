const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";

const BUCKET = "midias";
const TABELA = "playlists";
const TABELA_PONTOS = "pontos";
const TABELA_HISTORICO_CONEXAO = "statuspontos";

const DURACAO_IMAGEM = 10000;
const DURACAO_SITE = 10000;
const DURACAO_VIDEO_FALLBACK = 20000;

const INTERVALO_STATUS_ATIVO = 20 * 60 * 1000;
const INTERVALO_ATUALIZAR_PLAYLIST = 5 * 60 * 1000;
const INTERVALO_CLIMA = 30 * 60 * 1000;

const CACHE_PLAYLIST_PREFIX = "player_playlist_cache_v5_";
const CACHE_PLAYLIST_TTL = 24 * 60 * 60 * 1000;

const WEATHER_LAT = -14.84167;
const WEATHER_LON = -39.98667;

let supabaseClient = null;
let codigoAtual = null;
let pontoAtual = null;
let playlistAtual = [];
let indiceAtual = 0;
let timeoutMidia = null;
let cacheMidia = new Map();

let intervaloStatus = null;
let intervaloPlaylist = null;
let intervaloClima = null;

let statusAtualRegistrado = null;
let ultimoStatusEnviadoEm = 0;

function renderizarNoPlayer(html) {
  const playerMain = document.getElementById("playerMain");
  if (!playerMain) return;
  playerMain.innerHTML = html;
}

function mostrarMensagem(texto, detalhe = "") {
  renderizarNoPlayer(`
    <div class="player-container">
      <div class="mensagem">
        ${escapeHtml(texto)}
        ${detalhe ? `<small>${escapeHtml(detalhe)}</small>` : ""}
      </div>
    </div>
  `);
}

function criarSupabaseClient() {
  if (!window.supabase || !window.supabase.createClient) {
    mostrarMensagem("Supabase nao carregou.", "Verifique a internet ou o CDN do Supabase.");
    return false;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return true;
}

function limparTimeout() {
  if (timeoutMidia) {
    clearTimeout(timeoutMidia);
    timeoutMidia = null;
  }
}

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function obterCodigoDaUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizarCodigo(params.get("codigo"));
}

function obterChaveCachePlaylist() {
  return `${CACHE_PLAYLIST_PREFIX}${codigoAtual}`;
}

function lerCachePlaylist() {
  if (!codigoAtual) return null;

  try {
    const bruto = localStorage.getItem(obterChaveCachePlaylist());
    if (!bruto) return null;

    const cache = JSON.parse(bruto);
    const playlist = Array.isArray(cache.playlist) ? cache.playlist : [];

    if (!playlist.length) return null;

    return {
      playlist,
      criadoEm: Number(cache.criadoEm || 0),
      assinatura: cache.assinatura || "",
      fresco: Date.now() - Number(cache.criadoEm || 0) < CACHE_PLAYLIST_TTL
    };
  } catch {
    return null;
  }
}

function salvarCachePlaylist(playlist) {
  if (!codigoAtual) return;

  try {
    localStorage.setItem(obterChaveCachePlaylist(), JSON.stringify({
      criadoEm: Date.now(),
      assinatura: assinaturaPlaylist(playlist),
      playlist
    }));
  } catch {
    return;
  }
}

function limparCachePlaylist() {
  if (!codigoAtual) return;

  try {
    localStorage.removeItem(obterChaveCachePlaylist());
  } catch {
    return;
  }
}

function detectarTipo(url, tipoOriginal = "") {
  const tipo = String(tipoOriginal || "").toLowerCase();
  const limpa = String(url || "").toLowerCase().split("?")[0];

  if (tipo === "imagem" || tipo === "image") return "imagem";
  if (tipo === "video" || tipo === "vídeo") return "video";
  if (tipo === "site" || tipo === "url" || tipo === "texto" || tipo === "text") return "site";

  if (
    limpa.endsWith(".jpg") ||
    limpa.endsWith(".jpeg") ||
    limpa.endsWith(".png") ||
    limpa.endsWith(".webp") ||
    limpa.endsWith(".gif")
  ) {
    return "imagem";
  }

  if (limpa.endsWith(".txt") || limpa.endsWith(".html") || limpa.endsWith(".htm")) return "site";

  if (limpa.match(/\.(mp4|mov|webm|m4v|m3u8)$/)) return "video";

  if (limpa.includes("youtube.com") || limpa.includes("youtu.be")) return "site";

  return "video";
}

function normalizarUrlSite(url) {
  let final = String(url || "").trim();

  if (!final) return "";

  if (!/^https?:\/\//i.test(final)) {
    final = `https://${final.replace(/^\/+/, "")}`;
  }

  return final;
}

function extrairUrlDoTexto(texto) {
  const conteudo = String(texto || "").trim();

  const matchInternetShortcut = conteudo.match(/URL\s*=\s*(.+)/i);
  if (matchInternetShortcut && matchInternetShortcut[1]) {
    return normalizarUrlSite(matchInternetShortcut[1]);
  }

  const matchUrlDireta = conteudo.match(/https?:\/\/[^\s]+/i);
  if (matchUrlDireta && matchUrlDireta[0]) {
    return normalizarUrlSite(matchUrlDireta[0]);
  }

  const linhas = conteudo
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  for (const linha of linhas) {
    if (
      linha.includes(".com") ||
      linha.includes(".com.br") ||
      linha.includes(".app.br") ||
      linha.includes(".net") ||
      linha.includes(".org") ||
      linha.includes(".br/")
    ) {
      return normalizarUrlSite(linha.replace(/^URL\s*=/i, ""));
    }
  }

  return "";
}

function itemEstaAtivo(item) {
  if (item.ativo === false) return false;
  if (!item.data_fim) return true;

  const fim = new Date(item.data_fim);
  if (Number.isNaN(fim.getTime())) return true;

  fim.setHours(23, 59, 59, 999);
  return fim >= new Date();
}

function obterUrlItem(item) {
  return item.video_url || item.arquivo_url || item.url || "";
}

async function buscarPontoAtual(codigo) {
  const consultas = [
    "codigo,nome,nome_painel,titulo,ambiente,status,disponivel,ultimo_ping,updated_at",
    "codigo,nome,status,disponivel,updated_at",
    "*"
  ];

  let ultimoErro = null;

  for (const colunas of consultas) {
    const { data, error } = await supabaseClient
      .from(TABELA_PONTOS)
      .select(colunas)
      .eq("codigo", codigo)
      .maybeSingle();

    if (!error) return data || null;

    ultimoErro = error;
    console.warn("Falha ao buscar ponto com colunas:", colunas, error);
  }

  throw ultimoErro;
}

function pontoPodeRodar(ponto) {
  if (!ponto) return false;

  const status = String(ponto.status || "").trim().toLowerCase();

  if (ponto.disponivel === false) return false;
  if (status === "inativo") return false;

  return true;
}

async function atualizarPontoAtivo(agoraIso) {
  const tentativas = [
    { ultimo_ping: agoraIso, status: "ativo" },
    { ultimo_ping: agoraIso },
    { status: "ativo" }
  ];

  for (const payload of tentativas) {
    const { error } = await supabaseClient
      .from(TABELA_PONTOS)
      .update(payload)
      .eq("codigo", codigoAtual);

    if (!error) return true;

    console.warn("Falha ao atualizar ponto ativo:", error.message || error);
  }

  return false;
}

async function buscarUltimoStatusRegistrado() {
  const consultas = [
    { filtro: "ponto_codigo", ordem: "ultimo_ping" },
    { filtro: "codigo", ordem: "data_hora" },
    { filtro: "ponto_codigo", ordem: "created_at" }
  ];

  for (const consulta of consultas) {
    const { data, error } = await supabaseClient
      .from(TABELA_HISTORICO_CONEXAO)
      .select("*")
      .eq(consulta.filtro, codigoAtual)
      .order(consulta.ordem, { ascending: false })
      .limit(1);

    if (!error) {
      const item = data?.[0] || null;
      return String(item?.status || item?.evento || "").trim().toLowerCase() || null;
    }

    console.warn("Falha ao buscar último status:", error.message || error);
  }

  return null;
}

async function registrarStatusHistorico(status) {
  if (!codigoAtual || !supabaseClient) return false;

  const statusFinal = String(status || "").trim().toLowerCase();
  if (statusFinal !== "ativo" && statusFinal !== "inativo") return false;

  const agoraIso = new Date().toISOString();

  const payloads = [
    {
      ponto_codigo: codigoAtual,
      status: statusFinal,
      ultimo_ping: agoraIso
    },
    {
      codigo: codigoAtual,
      evento: statusFinal,
      data_hora: agoraIso
    }
  ];

  for (const payload of payloads) {
    const { error } = await supabaseClient
      .from(TABELA_HISTORICO_CONEXAO)
      .insert(payload);

    if (!error) {
      statusAtualRegistrado = statusFinal;
      ultimoStatusEnviadoEm = Date.now();
      return true;
    }

    console.warn("Falha ao registrar status:", error.message || error);
  }

  return false;
}

async function registrarAtivoSeNecessario({ forcar = false } = {}) {
  if (!codigoAtual || !supabaseClient) return;

  const agoraIso = new Date().toISOString();
  const atualizouPonto = await atualizarPontoAtivo(agoraIso);

  if (!atualizouPonto) return;

  if (!statusAtualRegistrado) {
    statusAtualRegistrado = await buscarUltimoStatusRegistrado();
  }

  const deveRegistrar =
    forcar ||
    statusAtualRegistrado !== "ativo" ||
    Date.now() - ultimoStatusEnviadoEm > 24 * 60 * 60 * 1000;

  if (deveRegistrar) {
    await registrarStatusHistorico("ativo");
  }
}

function iniciarMonitoramentoStatus() {
  registrarAtivoSeNecessario({ forcar: true });

  intervaloStatus = setInterval(() => {
    registrarAtivoSeNecessario();
  }, INTERVALO_STATUS_ATIVO);
}

async function resolverItem(item) {
  let url = obterUrlItem(item);
  let tipo = detectarTipo(url, item.tipo);

  if (tipo === "site" && String(url).toLowerCase().split("?")[0].endsWith(".txt")) {
    try {
      const resposta = await fetch(url, { cache: "force-cache" });

      if (!resposta.ok) {
        throw new Error(`Erro ao ler TXT: ${resposta.status}`);
      }

      const texto = await resposta.text();
      const urlExtraida = extrairUrlDoTexto(texto);

      if (urlExtraida) {
        url = urlExtraida;
      }
    } catch (error) {
      console.error("Erro ao processar arquivo TXT:", error);
    }
  }

  return {
    id: item.id,
    nome: item.titulo_arquivo || item.nome || item.nome_arquivo || "Arquivo",
    codigo_cliente: item.codigo_cliente || null,
    url,
    tipo,
    ordem: Number(item.ordem || 0),
    data_fim: item.data_fim || null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null
  };
}

function assinaturaPlaylist(lista) {
  return (lista || [])
    .map((item) => [
      item.id,
      item.url,
      item.tipo,
      item.ordem,
      item.data_fim || "",
      item.updated_at || ""
    ].join(":"))
    .join("|");
}

function assinaturaMetadados(lista) {
  return (lista || [])
    .map((item) => [
      item.id,
      obterUrlItem(item),
      item.tipo || "",
      item.ordem || "",
      item.data_fim || "",
      item.updated_at || ""
    ].join(":"))
    .join("|");
}

async function buscarMetadadosPlaylist() {
  const consultas = [
    "id,nome,titulo_arquivo,video_url,arquivo_url,url,storage_path,tipo,data_fim,ordem,codigo,codigo_cliente,created_at,updated_at,ativo",
    "id,nome,titulo_arquivo,video_url,storage_path,tipo,data_fim,ordem,codigo,codigo_cliente,created_at,ativo",
    "*"
  ];

  let ultimoErro = null;

  for (const colunas of consultas) {
    const { data, error } = await supabaseClient
      .from(TABELA)
      .select(colunas)
      .eq("codigo", codigoAtual)
      .order("ordem", { ascending: true });

    if (!error) {
      return (data || []).filter(itemEstaAtivo).filter((item) => obterUrlItem(item));
    }

    ultimoErro = error;
    console.warn("Falha ao buscar playlist com colunas:", colunas, error);
  }

  throw ultimoErro;
}

async function buscarPlaylistRemota({ silencioso = false } = {}) {
  if (!silencioso) {
    mostrarMensagem("Buscando conteudo...", `Codigo: ${codigoAtual}`);
  }

  let lista = [];

  try {
    lista = await buscarMetadadosPlaylist();
  } catch (error) {
    console.error("Erro Supabase:", error);

    if (!silencioso) {
      mostrarMensagem("Erro ao buscar playlist.", error.message || "Verifique a tabela playlists.");
    }

    return false;
  }

  if (!lista.length) {
    if (!silencioso) {
      mostrarMensagem("Sem conteudo para este codigo.", `Codigo: ${codigoAtual}`);
    }

    playlistAtual = [];
    limparCachePlaylist();
    return false;
  }

  const assinaturaRemota = assinaturaMetadados(lista);
  const assinaturaAtual = assinaturaPlaylist(playlistAtual);

  if (silencioso && playlistAtual.length && assinaturaRemota === assinaturaAtual) {
    return true;
  }

  const novaPlaylist = await Promise.all(lista.map(resolverItem));
  const limpa = novaPlaylist.filter((item) => item.url);

  if (!limpa.length) {
    if (!silencioso) {
      mostrarMensagem("Conteudo encontrado, mas sem URL valida.");
    }

    playlistAtual = [];
    limparCachePlaylist();
    return false;
  }

  aplicarPlaylistIncremental(limpa);
  salvarCachePlaylist(playlistAtual);

  return true;
}

function aplicarPlaylistIncremental(listaNova) {
  const assinaturaAntiga = assinaturaPlaylist(playlistAtual);
  const itemAtual = playlistAtual[indiceAtual] || null;
  const mapaAtual = new Map(playlistAtual.map((item) => [String(item.id), item]));

  playlistAtual = listaNova.map((itemNovo) => {
    const itemExistente = mapaAtual.get(String(itemNovo.id));

    if (
      itemExistente &&
      itemExistente.url === itemNovo.url &&
      itemExistente.tipo === itemNovo.tipo
    ) {
      return { ...itemExistente, ...itemNovo };
    }

    preCarregarItem(itemNovo);
    return itemNovo;
  });

  if (itemAtual) {
    const novoIndice = playlistAtual.findIndex((item) => String(item.id) === String(itemAtual.id));
    indiceAtual = novoIndice >= 0 ? novoIndice : Math.min(indiceAtual, playlistAtual.length - 1);
  }

  if (indiceAtual < 0 || indiceAtual >= playlistAtual.length) {
    indiceAtual = 0;
  }

  const assinaturaNova = assinaturaPlaylist(playlistAtual);

  if (assinaturaAntiga !== assinaturaNova) {
    limparCacheObsoleto();
    preCarregarProximos(2);
  }
}

async function buscarPlaylist({ silencioso = false, usarCache = true } = {}) {
  if (usarCache) {
    const cache = lerCachePlaylist();

    if (cache?.playlist?.length) {
      aplicarPlaylistIncremental(cache.playlist);

      if (cache.fresco) {
        return true;
      }
    }
  }

  const encontrouRemoto = await buscarPlaylistRemota({ silencioso });

  if (encontrouRemoto) {
    return true;
  }

  const cache = lerCachePlaylist();

  if (cache?.playlist?.length) {
    aplicarPlaylistIncremental(cache.playlist);
    return true;
  }

  return false;
}

function limparCacheObsoleto() {
  const urlsAtuais = new Set(playlistAtual.map((item) => item.url));

  for (const url of cacheMidia.keys()) {
    if (!urlsAtuais.has(url)) {
      cacheMidia.delete(url);
    }
  }
}

function obterIndiceCircular(base, deslocamento) {
  if (!playlistAtual.length) return 0;
  return (base + deslocamento + playlistAtual.length) % playlistAtual.length;
}

function preCarregarItem(item) {
  if (!item || !item.url || cacheMidia.has(item.url)) return;

  if (item.tipo === "imagem") {
    const img = new Image();
    img.src = item.url;
    cacheMidia.set(item.url, img);
    return;
  }

  if (item.tipo === "video") {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = item.url;
    video.load();
    cacheMidia.set(item.url, video);
  }
}

function preCarregarProximos(quantidade = 2) {
  if (!playlistAtual.length) return;

  for (let i = 1; i <= quantidade; i++) {
    const index = obterIndiceCircular(indiceAtual, i);
    preCarregarItem(playlistAtual[index]);
  }
}

function proximo() {
  limparTimeout();

  if (!playlistAtual.length) {
    mostrarMensagem("Sem conteudo para reproduzir.");
    return;
  }

  indiceAtual = obterIndiceCircular(indiceAtual, 1);
  tocarMidia();
}

function tocarImagem(item) {
  const imgCache = cacheMidia.get(item.url);
  const imgSrc = imgCache instanceof HTMLImageElement ? imgCache.src : item.url;

  renderizarNoPlayer(`
    <div class="player-container">
      <img src="${escapeHtml(imgSrc)}" alt="">
    </div>
  `);

  preCarregarProximos(2);
  timeoutMidia = setTimeout(proximo, DURACAO_IMAGEM);
}

function tocarVideo(item) {
  renderizarNoPlayer(`
    <div class="player-container">
      <video id="videoPlayer" autoplay muted playsinline></video>
    </div>
  `);

  const video = document.getElementById("videoPlayer");
  if (!video) return;

  video.src = item.url;
  video.onended = proximo;

  video.onerror = () => {
    mostrarMensagem("Erro ao carregar video.", item.nome);
    timeoutMidia = setTimeout(proximo, 3000);
  };

  video.play().catch(() => {
    timeoutMidia = setTimeout(proximo, 3000);
  });

  timeoutMidia = setTimeout(() => {
    if (!video.ended) proximo();
  }, Math.max(DURACAO_VIDEO_FALLBACK, 3000));

  preCarregarProximos(2);
}

function tocarSite(item) {
  const url = normalizarUrlSite(item.url);

  if (!url) {
    mostrarMensagem("URL do site invalida.", item.nome);
    timeoutMidia = setTimeout(proximo, 3000);
    return;
  }

  renderizarNoPlayer(`
    <div class="player-container">
      <iframe src="${escapeHtml(url)}" referrerpolicy="no-referrer-when-downgrade" allow="autoplay; fullscreen"></iframe>
    </div>
  `);

  preCarregarProximos(2);
  timeoutMidia = setTimeout(proximo, DURACAO_SITE);
}

function tocarMidia() {
  limparTimeout();

  if (!playlistAtual.length) {
    mostrarMensagem("Sem conteudo para reproduzir.");
    return;
  }

  if (indiceAtual >= playlistAtual.length) {
    indiceAtual = 0;
  }

  const item = playlistAtual[indiceAtual];

  if (!item || !item.url) {
    proximo();
    return;
  }

  if (item.tipo === "imagem") {
    tocarImagem(item);
    return;
  }

  if (item.tipo === "site") {
    tocarSite(item);
    return;
  }

  tocarVideo(item);
}

function obterDescricaoClima(code) {
  const mapa = {
    0: "Ceu limpo",
    1: "Predominio de sol",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Neblina",
    48: "Neblina intensa",
    51: "Garoa fraca",
    53: "Garoa",
    55: "Garoa forte",
    61: "Chuva fraca",
    63: "Chuva",
    65: "Chuva forte",
    71: "Frio com neve",
    80: "Pancadas fracas",
    81: "Pancadas",
    82: "Pancadas fortes",
    95: "Trovoada"
  };

  return mapa[code] || "Tempo instavel";
}

function nomeDia(dataStr) {
  const data = new Date(`${dataStr}T12:00:00`);
  return data.toLocaleDateString("pt-BR", { weekday: "short" });
}

async function atualizarClima() {
  try {
    const resposta = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America%2FSao_Paulo`,
      { cache: "force-cache" }
    );

    if (!resposta.ok) {
      throw new Error(`Clima ${resposta.status}`);
    }

    const dados = await resposta.json();

    const cidade = document.getElementById("weatherCidade");
    const temp = document.getElementById("weatherTemp");
    const desc = document.getElementById("weatherDesc");
    const lista = document.getElementById("weatherLista");

    if (cidade) cidade.textContent = "Ibicui";
    if (temp) temp.textContent = `${Math.round(dados.current.temperature_2m)}°`;
    if (desc) desc.textContent = obterDescricaoClima(dados.current.weather_code);

    if (lista && dados.daily?.time?.length) {
      const itens = dados.daily.time.slice(0, 4).map((dia, index) => {
        const min = Math.round(dados.daily.temperature_2m_min[index]);
        const max = Math.round(dados.daily.temperature_2m_max[index]);

        return `
          <div class="weather-dia">
            <span>${escapeHtml(nomeDia(dia))}</span>
            <span>${max}° / ${min}°</span>
          </div>
        `;
      });

      lista.innerHTML = itens.join("");
    }
  } catch (error) {
    console.error("Erro ao atualizar clima:", error);
  }
}

function pararTudo() {
  limparTimeout();

  if (intervaloStatus) clearInterval(intervaloStatus);
  if (intervaloPlaylist) clearInterval(intervaloPlaylist);
  if (intervaloClima) clearInterval(intervaloClima);

  intervaloStatus = null;
  intervaloPlaylist = null;
  intervaloClima = null;
}

async function iniciar() {
  try {
    mostrarMensagem("Iniciando player...");

    if (!criarSupabaseClient()) return;

    codigoAtual = obterCodigoDaUrl();

    if (!codigoAtual) {
      mostrarMensagem(
        "Codigo do ponto nao informado.",
        "Abra o player usando: player.html?codigo=CODIGO_DO_PONTO"
      );
      return;
    }

    mostrarMensagem("Validando ponto...", `Codigo: ${codigoAtual}`);

    pontoAtual = await buscarPontoAtual(codigoAtual);

    if (!pontoAtual) {
      mostrarMensagem(
        "Ponto nao encontrado.",
        `O codigo ${codigoAtual} nao existe na tabela pontos.`
      );
      return;
    }

    if (!pontoPodeRodar(pontoAtual)) {
      mostrarMensagem(
        "Ponto indisponivel.",
        `O codigo ${codigoAtual} esta marcado como indisponivel.`
      );
      return;
    }

    iniciarMonitoramentoStatus();

    await atualizarClima();
    intervaloClima = setInterval(atualizarClima, INTERVALO_CLIMA);

    const encontrou = await buscarPlaylist({ usarCache: true });

    if (encontrou) {
      preCarregarProximos(2);
      tocarMidia();
    }

    intervaloPlaylist = setInterval(async () => {
      const tinhaConteudo = playlistAtual.length > 0;
      const assinaturaAntes = assinaturaPlaylist(playlistAtual);

      const encontrouAtualizacao = await buscarPlaylist({
        silencioso: true,
        usarCache: false
      });

      const assinaturaDepois = assinaturaPlaylist(playlistAtual);

      if (!tinhaConteudo && encontrouAtualizacao) {
        tocarMidia();
        return;
      }

      if (assinaturaAntes !== assinaturaDepois && playlistAtual.length) {
        salvarCachePlaylist(playlistAtual);
      }
    }, INTERVALO_ATUALIZAR_PLAYLIST);
  } catch (error) {
    console.error("Erro geral no player:", error);
    mostrarMensagem("Erro geral no player.", error.message || "Veja o console do navegador.");
  }
}

window.addEventListener("load", iniciar);

window.addEventListener("beforeunload", () => {
  pararTudo();
});

window.addEventListener("pagehide", () => {
  pararTudo();
});
