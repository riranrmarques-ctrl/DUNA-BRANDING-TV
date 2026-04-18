const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const BUCKET = "pontos";
const TABELA = "playlists";
const TABELA_PONTOS = "pontos";
const TABELA_HISTORICO_CONEXAO = "historico_conexao";

const DURACAO_IMAGEM = 20000;
const DURACAO_SITE = 10000;
const INTERVALO_PING = 60000;
const INTERVALO_ATUALIZAR_PLAYLIST = 30000;

const WEATHER_LAT = -14.84167;
const WEATHER_LON = -39.98667;

let supabaseClient = null;
let codigoAtual = null;
let playlistAtual = [];
let indiceAtual = 0;
let timeoutMidia = null;
let cacheMidia = new Map();

function renderizarNoPlayer(html) {
  const playerMain = document.getElementById("playerMain");
  if (!playerMain) return;
  playerMain.innerHTML = html;
}

function mostrarMensagem(texto, detalhe = "") {
  renderizarNoPlayer(`
    <div class="player-container">
      <div class="mensagem">
        ${texto}
        ${detalhe ? `<small>${detalhe}</small>` : ""}
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

function detectarTipo(url, tipoOriginal = "") {
  const tipo = String(tipoOriginal || "").toLowerCase();
  const limpa = String(url || "").toLowerCase().split("?")[0];

  if (tipo === "imagem" || tipo === "image") return "imagem";
  if (tipo === "video") return "video";
  if (tipo === "site" || tipo === "texto" || tipo === "text") return "site";

  if (
    limpa.endsWith(".jpg") ||
    limpa.endsWith(".jpeg") ||
    limpa.endsWith(".png") ||
    limpa.endsWith(".webp")
  ) {
    return "imagem";
  }

  if (limpa.endsWith(".txt")) return "site";

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
    .map(linha => linha.trim())
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

async function registrarPing() {
  if (!codigoAtual || !supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from(TABELA_HISTORICO_CONEXAO)
      .insert({
        codigo: codigoAtual,
        evento: "conectou",
        data_hora: new Date().toISOString()
      });

    if (error) {
      console.warn("Erro ao registrar conexao:", error.message || error);
    }
  } catch (error) {
    console.warn("Erro ao registrar conexao:", error);
  }
}

async function resolverItem(item) {
  let url = item.video_url || item.arquivo_url || item.url || "";
  let tipo = detectarTipo(url, item.tipo);

  if (tipo === "site" && String(url).toLowerCase().split("?")[0].endsWith(".txt")) {
    try {
      const resposta = await fetch(url, { cache: "no-store" });

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
    nome: item.nome || "Arquivo",
    url,
    tipo
  };
}

function assinaturaPlaylist(lista) {
  return lista.map(item => `${item.id}:${item.url}:${item.tipo}`).join("|");
}

async function buscarPlaylist({ silencioso = false } = {}) {
  if (!silencioso) {
    mostrarMensagem("Buscando conteudo...", `Codigo: ${codigoAtual}`);
  }

  const { data, error } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigoAtual)
    .order("ordem", { ascending: true });

  if (error) {
    console.error("Erro Supabase:", error);

    if (!silencioso) {
      mostrarMensagem("Erro ao buscar playlist.", error.message || "Verifique a tabela playlists.");
    }

    return false;
  }

  const lista = (data || [])
    .filter(itemEstaAtivo)
    .filter(item => item.video_url || item.arquivo_url || item.url);

  if (!lista.length) {
    if (!silencioso) {
      mostrarMensagem("Sem conteudo para este codigo.", `Codigo: ${codigoAtual}`);
    }

    playlistAtual = [];
    return false;
  }

  const novaPlaylist = await Promise.all(lista.map(resolverItem));
  const limpa = novaPlaylist.filter(item => item.url);

  if (!limpa.length) {
    if (!silencioso) {
      mostrarMensagem("Conteudo encontrado, mas sem URL valida.");
    }

    playlistAtual = [];
    return false;
  }

  const assinaturaAntiga = assinaturaPlaylist(playlistAtual);
  const assinaturaNova = assinaturaPlaylist(limpa);

  playlistAtual = limpa;

  if (indiceAtual >= playlistAtual.length) {
    indiceAtual = 0;
  }

  if (assinaturaAntiga !== assinaturaNova) {
    limparCacheObsoleto();
    preCarregarProximos(2);
  }

  return true;
}

function limparCacheObsoleto() {
  const urlsAtuais = new Set(playlistAtual.map(item => item.url));

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
    video.preload = "auto";
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
      <img src="${imgSrc}" alt="">
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
      <iframe src="${url}" referrerpolicy="no-referrer-when-downgrade" allow="autoplay; fullscreen"></iframe>
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
      { cache: "no-store" }
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
            <span>${nomeDia(dia)}</span>
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

async function iniciar() {
  try {
    mostrarMensagem("Iniciando player...");

    if (!criarSupabaseClient()) return;

    const params = new URLSearchParams(window.location.search);
    codigoAtual = params.get("codigo");

    if (!codigoAtual) {
      mostrarMensagem("Codigo nao informado.", "Exemplo: player.html?codigo=H4E9L2A");
      return;
    }

    codigoAtual = String(codigoAtual).trim().toUpperCase();

    await atualizarClima();
    setInterval(atualizarClima, 30 * 60 * 1000);

    await registrarPing();

    const encontrou = await buscarPlaylist();

    if (encontrou) {
      preCarregarProximos(2);
      tocarMidia();
    }

    setInterval(registrarPing, INTERVALO_PING);

    setInterval(async () => {
      const tinhaConteudo = playlistAtual.length > 0;
      const encontrouAtualizacao = await buscarPlaylist({ silencioso: true });

      if (!tinhaConteudo && encontrouAtualizacao) {
        tocarMidia();
      }
    }, INTERVALO_ATUALIZAR_PLAYLIST);
  } catch (error) {
    console.error("Erro geral no player:", error);
    mostrarMensagem("Erro geral no player.", error.message || "Veja o console do navegador.");
  }
}

window.addEventListener("load", iniciar);
