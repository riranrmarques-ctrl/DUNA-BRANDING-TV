const SUPABASE_URL = "https://yiyaxxnewjvmnusfxzom.supabase.co";
const SUPABASE_KEY = "sb_publishable_EjuRWhlusDG2RLTAHFREQQ_-qZjxm3g";
const TABELA = "playlists_novo";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CACHE_PLAYLIST_KEY = "duna_playlist_cache";
const CACHE_INDICE_KEY = "duna_playlist_indice";
const CACHE_CODIGO_KEY = "duna_playlist_codigo";

let codigoAtual = null;
let playlistAtual = [];
let indiceAtual = 0;
let timeoutMidia = null;

function mostrarMensagem(texto) {
  document.body.innerHTML = `<div class="mensagem">${texto}</div>`;
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

async function normalizarLista(registros) {
  const listaOrdenada = (registros || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const listaNormalizada = await Promise.all(
    listaOrdenada.map(async (item) => {
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
        url,
        tipo
      };
    })
  );

  return listaNormalizada.filter((item) => item.url);
}

async function buscarPlaylist() {
  const { data, error } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigoAtual)
    .order("ordem", { ascending: true });

  if (error) {
    throw error;
  }

  const novaPlaylist = await normalizarLista(data);

  if (!novaPlaylist.length) {
    playlistAtual = [];
    indiceAtual = 0;
    salvarCachePlaylist();
    return;
  }

  const itemAtual = playlistAtual[indiceAtual];
  playlistAtual = novaPlaylist;

  if (itemAtual) {
    const novoIndice = playlistAtual.findIndex((item) => item.id === itemAtual.id);
    indiceAtual = novoIndice >= 0 ? novoIndice : 0;
  } else if (indiceAtual >= playlistAtual.length) {
    indiceAtual = 0;
  }

  salvarCachePlaylist();
}

function limparTela() {
  clearTimeout(timeoutMid
