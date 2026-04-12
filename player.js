const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const TABELA = "playlists";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const video = document.getElementById("videoPlayer");

const CACHE_PLAYLIST_KEY = "duna_playlist_cache";
const CACHE_INDICE_KEY = "duna_playlist_indice";
const CACHE_CODIGO_KEY = "duna_playlist_codigo";

let codigoAtual = null;
let playlistAtual = [];
let indiceAtual = 0;
let timeoutMidia = null;
let activeLayerIndex = 0;

/* =========================
   HELPERS
========================= */
function mostrarMensagem(texto) {
  clearTimeout(timeoutMidia);
  document.body.innerHTML = `
    <div class="mensagem">${texto}</div>
  `;
}

function salvarCachePlaylist() {
  try {
    localStorage.setItem(CACHE_PLAYLIST_KEY, JSON.stringify(playlistAtual));
    localStorage.setItem(CACHE_INDICE_KEY, String(indiceAtual));
    localStorage.setItem(CACHE_CODIGO_KEY, codigoAtual || "");
  } catch (error) {
    console.error("Erro ao salvar cache local:", error);
  }
}

function carregarCachePlaylist() {
  try {
    const codigoSalvo = localStorage.getItem(CACHE_CODIGO_KEY);
    const playlistSalva = localStorage.getItem(CACHE_PLAYLIST_KEY);
    const indiceSalvo = localStorage.getItem(CACHE_INDICE_KEY);

    if (codigoSalvo && codigoSalvo === codigoAtual && playlistSalva) {
      playlistAtual = JSON.parse(playlistSalva) || [];
      indiceAtual = parseInt(indiceSalvo || "0", 10) || 0;

      if (indiceAtual >= playlistAtual.length) {
        indiceAtual = 0;
      }

      return true;
    }
  } catch (error) {
    console.error("Erro ao carregar cache local:", error);
  }

  return false;
}

function extrairUrlDoTexto(texto) {
  const conteudo = (texto || "").trim();

  const matchInternetShortcut = conteudo.match(/URL\s*=\s*(.+)/i);
  if (matchInternetShortcut && matchInternetShortcut[1]) {
    let url = matchInternetShortcut[1].trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url.replace(/^\/+/, "")}`;
    }
    return url;
  }

  const matchUrlDireta = conteudo.match(/https?:\/\/[^\s]+/i);
  if (matchUrlDireta && matchUrlDireta[0]) {
    return matchUrlDireta[0].trim();
  }

  return "";
}

function garantirPalco() {
  let container = document.getElementById("playerStage");

  if (!container) {
    document.body.innerHTML = `
      <div
        id="playerStage"
        style="position:fixed;inset:0;width:100vw;height:100vh;background:#000;overflow:hidden;"
      >
        <div
          id="layer0"
          style="position:absolute;inset:0;width:100%;height:100%;opacity:1;transition:opacity .35s linear;background:#000;"
        ></div>
        <div
          id="layer1"
          style="position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .35s linear;background:#000;"
        ></div>
      </div>
    `;
    container = document.getElementById("playerStage");
  }

  return container;
}

function obterCamadas() {
  garantirPalco();
  return [
    document.getElementById("layer0"),
    document.getElementById("layer1")
  ];
}

function limparLayer(layer) {
  if (!layer) return;

  const videos = layer.querySelectorAll("video");
  videos.forEach(v => {
    try {
      v.pause();
      v.removeAttribute("src");
      v.load();
    } catch (_) {}
  });

  const iframes = layer.querySelectorAll("iframe");
  iframes.forEach(frame => {
    try {
      frame.src = "about:blank";
    } catch (_) {}
  });

  layer.innerHTML = "";
}

async function normalizarLista(registros) {
  const listaOrdenada = (registros || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const listaNormalizada = await Promise.all(
    listaOrdenada.map(async item => {
      let url = item.video_url;
      let tipo = item.tipo || "video";

      if (url && url.toLowerCase().endsWith(".txt")) {
        tipo = "site";

        try {
          const resposta = await fetch(url, { cache: "no-store" });
          const texto = await resposta.text();
          const urlExtraida = extrairUrlDoTexto(texto);

          if (urlExtraida) {
            url = urlExtraida;
          }
        } catch (error) {
          console.error("Erro ao ler arquivo TXT:", error);
        }
      }

      return {
        id: item.id,
        nome: item.nome,
        url: url,
        tipo: tipo
      };
    })
  );

  return listaNormalizada;
}

async function buscarPlaylist() {
  try {
    const { data, error } = await supabaseClient
      .from(TABELA)
      .select("*")
      .eq("codigo", codigoAtual)
      .order("ordem", { ascending: true });

    if (error) {
      throw error;
    }

    const novaPlaylist = await normalizarLista(data);

    if (novaPlaylist.length) {
      const itemAtual = playlistAtual[indiceAtual];
      playlistAtual = novaPlaylist;

      if (itemAtual) {
        const novoIndice = playlistAtual.findIndex(item => item.id === itemAtual.id);
        indiceAtual = novoIndice >= 0 ? novoIndice : 0;
      } else if (indiceAtual >= playlistAtual.length) {
        indiceAtual = 0;
      }

      salvarCachePlaylist();
    }
  } catch (error) {
    console.error("Erro ao buscar playlist online:", error);
  }
}

function prepararElemento(item) {
  return new Promise(resolve => {
    let finalizado = false;

    const concluir = element => {
      if (finalizado) return;
      finalizado = true;
      resolve(element);
    };

    if (item.tipo === "video") {
      const vid = document.createElement("video");
      vid.autoplay = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = "auto";
      vid.src = item.url;
      vid.style.width = "100%";
      vid.style.height = "100%";
      vid.style.objectFit = "cover";
      vid.style.background = "#000";
      vid.onloadeddata = () => concluir(vid);
      vid.onerror = () => concluir(vid);
      setTimeout(() => concluir(vid), 8000);
      return;
    }

    if (item.tipo === "imagem") {
      const img = document.createElement("img");
      img.src = item.url;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.onload = () => concluir(img);
      img.onerror = () => concluir(img);
      setTimeout(() => concluir(img), 8000);
      return;
    }

    if (item.tipo === "site") {
      const iframe = document.createElement("iframe");
      iframe.src = item.url;
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.background = "#000";
      iframe.setAttribute("allowfullscreen", "");
      iframe.onload = () => concluir(iframe);
      iframe.onerror = () => concluir(iframe);
      setTimeout(() => concluir(iframe), 2500);
      return;
    }

    const fallback = document.createElement("div");
    fallback.style.width = "100%";
    fallback.style.height = "100%";
    fallback.style.background = "#000";
    concluir(fallback);
  });
}

async function prepararLayer(layer, item) {
  limparLayer(layer);
  const elemento = await prepararElemento(item);
  layer.appendChild(elemento);
  return elemento;
}

/* =========================
   PLAYER INTELIGENTE
========================= */
function limparTela() {
  clearTimeout(timeoutMidia);
  const layers = obterCamadas();
  limparLayer(layers[0]);
  limparLayer(layers[1]);
  layers[0].style.opacity = "1";
  layers[1].style.opacity = "0";
  activeLayerIndex = 0;
}

function alternarParaLayer(novoIndice) {
  const layers = obterCamadas();
  const layerAtual = layers[activeLayerIndex];
  const novaLayer = layers[novoIndice];
  const layerAnteriorIndice = activeLayerIndex;

  novaLayer.style.opacity = "1";
  layerAtual.style.opacity = "0";
  activeLayerIndex = novoIndice;

  setTimeout(() => {
    if (layerAnteriorIndice !== activeLayerIndex) {
      limparLayer(layers[layerAnteriorIndice]);
    }
  }, 500);
}

async function tocarMidia() {
  if (!playlistAtual.length) {
    mostrarMensagem("Sem conteúdo");
    return;
  }

  if (indiceAtual >= playlistAtual.length) {
    indiceAtual = 0;
  }

  const item = playlistAtual[indiceAtual];
  if (!item) return;

  salvarCachePlaylist();

  garantirPalco();
  clearTimeout(timeoutMidia);

  const layers = obterCamadas();
  const proximaLayerIndex = activeLayerIndex === 0 ? 1 : 0;
  const proximaLayer = layers[proximaLayerIndex];

  const elemento = await prepararLayer(proximaLayer, item);

  alternarParaLayer(proximaLayerIndex);

  if (item.tipo === "video" && elemento && elemento.tagName === "VIDEO") {
    elemento.currentTime = 0;
    elemento.onended = proximo;
    elemento.play().catch(() => {});
  } else if (item.tipo === "imagem") {
    timeoutMidia = setTimeout(proximo, 20000);
  } else if (item.tipo === "site") {
    timeoutMidia = setTimeout(proximo, 20000);
  }
}

function proximo() {
  indiceAtual++;
  if (indiceAtual >= playlistAtual.length) {
    indiceAtual = 0;
  }
  salvarCachePlaylist();
  tocarMidia();
}

/* =========================
   INIT
========================= */
async function iniciar() {
  const params = new URLSearchParams(window.location.search);
  codigoAtual = params.get("codigo") || localStorage.getItem(CACHE_CODIGO_KEY);

  if (!codigoAtual) {
    mostrarMensagem("Código não informado");
    return;
  }

  const temCache = carregarCachePlaylist();

  if (temCache && playlistAtual.length) {
    tocarMidia();
  } else {
    mostrarMensagem("Carregando conteúdo...");
  }

  await buscarPlaylist();

  if (playlistAtual.length) {
    tocarMidia();
  } else if (!temCache) {
    mostrarMensagem("Sem conteúdo");
  }

  setInterval(async () => {
    await buscarPlaylist();
  }, 600000);
}

iniciar();
