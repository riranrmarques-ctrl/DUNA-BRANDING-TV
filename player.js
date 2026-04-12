const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const TABELA = "playlists";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const video = document.getElementById("videoPlayer");

let codigoAtual = null;
let playlistAtual = [];
let indiceAtual = 0;
let timeoutMidia = null;

/* =========================
   HELPERS
========================= */
function mostrarMensagem(texto) {
  document.body.innerHTML = `
    <div class="mensagem">${texto}</div>
  `;
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
  const { data } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigoAtual)
    .order("ordem", { ascending: true });

  playlistAtual = await normalizarLista(data);
}

/* =========================
   PLAYER INTELIGENTE
========================= */
function limparTela() {
  clearTimeout(timeoutMidia);
  document.body.innerHTML = `
    <div class="player-container">
      <video id="videoPlayer" autoplay muted playsinline></video>
    </div>
  `;
}

function tocarMidia() {
  if (!playlistAtual.length) {
    mostrarMensagem("Sem conteúdo");
    return;
  }

  const item = playlistAtual[indiceAtual];

  if (!item) return;

  if (item.tipo === "video") {
    limparTela();

    const vid = document.getElementById("videoPlayer");
    vid.src = item.url;
    vid.play().catch(() => {});
    vid.onended = proximo;

  } else if (item.tipo === "imagem") {
    document.body.innerHTML = `
      <img src="${item.url}" style="width:100vw;height:100vh;object-fit:cover">
    `;

    timeoutMidia = setTimeout(proximo, 20000);

  } else if (item.tipo === "site") {
    document.body.innerHTML = `
      <iframe src="${item.url}" style="width:100vw;height:100vh;border:none"></iframe>
    `;

    timeoutMidia = setTimeout(proximo, 20000);
  }
}

function proximo() {
  indiceAtual++;
  if (indiceAtual >= playlistAtual.length) {
    indiceAtual = 0;
  }
  tocarMidia();
}

/* =========================
   INIT
========================= */
async function iniciar() {
  const params = new URLSearchParams(window.location.search);
  codigoAtual = params.get("codigo");

  if (!codigoAtual) {
    mostrarMensagem("Código não informado");
    return;
  }

  await buscarPlaylist();
  tocarMidia();

  setInterval(async () => {
    await buscarPlaylist();
  }, 15000);
}

iniciar();
