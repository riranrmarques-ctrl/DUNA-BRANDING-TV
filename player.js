const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const TABELA = "playlists";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const video = document.getElementById("videoPlayer");

let codigoAtual = null;
let playlistAtual = [];
let indiceAtual = 0;
let realtimeChannel = null;
let pollingInterval = null;

function mostrarMensagem(texto) {
  document.body.innerHTML = `
    <div style="
      width: 100vw;
      height: 100vh;
      background: black;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 24px;
      padding: 20px;
      box-sizing: border-box;
    ">
      ${texto}
    </div>
  `;
}

function normalizarLista(registros) {
  return (registros || [])
    .sort((a, b) => {
      const ordemA = Number(a.ordem) || 0;
      const ordemB = Number(b.ordem) || 0;
      if (ordemA !== ordemB) return ordemA - ordemB;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    })
    .filter(item => item.video_url)
    .map(item => ({
      id: item.id,
      nome: item.nome || "Sem nome",
      video_url: item.video_url,
      ordem: Number(item.ordem) || 0
    }));
}

function listasIguais(listaA, listaB) {
  if (listaA.length !== listaB.length) return false;

  for (let i = 0; i < listaA.length; i++) {
    if (
      listaA[i].id !== listaB[i].id ||
      listaA[i].video_url !== listaB[i].video_url ||
      listaA[i].ordem !== listaB[i].ordem
    ) {
      return false;
    }
  }

  return true;
}

async function buscarPlaylist(codigo) {
  const { data, error } = await supabaseClient
    .from(TABELA)
    .select("id, nome, video_url, ordem, codigo")
    .eq("codigo", codigo)
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  return normalizarLista(data);
}

function tocarIndice(indice) {
  if (!playlistAtual.length) {
    mostrarMensagem("Nenhum vídeo cadastrado para este código.");
    return;
  }

  if (indice < 0 || indice >= playlistAtual.length) {
    indiceAtual = 0;
  } else {
    indiceAtual = indice;
  }

  const item = playlistAtual[indiceAtual];

  if (!item || !item.video_url) {
    mostrarMensagem("Link de vídeo inválido.");
    return;
  }

  const urlAnterior = video.getAttribute("data-src-atual") || "";
  const novaUrl = item.video_url;

  if (urlAnterior === novaUrl) {
    return;
  }

  video.setAttribute("data-src-atual", novaUrl);
  video.src = novaUrl;
  video.load();

  video.play().catch((erro) => {
    console.error("Erro ao reproduzir vídeo:", erro);
    mostrarMensagem("Erro ao reproduzir o vídeo.");
  });
}

function proximoVideo() {
  if (!playlistAtual.length) return;

  indiceAtual++;
  if (indiceAtual >= playlistAtual.length) {
    indiceAtual = 0;
  }

  tocarIndice(indiceAtual);
}

async function aplicarPlaylistNova(forcarTroca = false) {
  try {
    const novaLista = await buscarPlaylist(codigoAtual);

    if (!novaLista.length) {
      playlistAtual = [];
      indiceAtual = 0;
      mostrarMensagem("Nenhum vídeo cadastrado para este código.");
      return;
    }

    const idAtual = playlistAtual[indiceAtual]?.id ?? null;
    const indiceCorrespondente = idAtual
      ? novaLista.findIndex(item => item.id === idAtual)
      : 0;

    const mudou = !listasIguais(playlistAtual, novaLista);

    playlistAtual = novaLista;

    if (indiceCorrespondente >= 0) {
      indiceAtual = indiceCorrespondente;
    } else {
      indiceAtual = 0;
    }

    const srcAtual = video.getAttribute("data-src-atual") || "";
    const srcDesejado = playlistAtual[indiceAtual]?.video_url || "";

    if (forcarTroca || mudou) {
      if (srcAtual !== srcDesejado) {
        tocarIndice(indiceAtual);
      }
    }

    if (!video.src && playlistAtual.length) {
      tocarIndice(indiceAtual);
    }
  } catch (erro) {
    console.error("Erro ao atualizar playlist:", erro);
    mostrarMensagem("Erro ao carregar a playlist.");
  }
}

function iniciarEventosDoVideo() {
  video.addEventListener("ended", () => {
    proximoVideo();
  });

  video.addEventListener("error", () => {
    console.error("Erro no vídeo atual:", playlistAtual[indiceAtual]);
    proximoVideo();
  });
}

function iniciarRealtime() {
  if (realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = supabaseClient
    .channel(`playlist-${codigoAtual}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABELA,
        filter: `codigo=eq.${codigoAtual}`
      },
      async () => {
        console.log("Mudança detectada no realtime. Atualizando playlist...");
        await aplicarPlaylistNova(false);
      }
    )
    .subscribe((status) => {
      console.log("Status realtime:", status);
    });
}

function iniciarPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  pollingInterval = setInterval(async () => {
    await aplicarPlaylistNova(false);
  }, 15000);
}

async function carregarPlaylist() {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get("codigo");

  if (!codigo) {
    mostrarMensagem("Código não informado na URL.");
    return;
  }

  if (!video) {
    mostrarMensagem("Elemento de vídeo não encontrado.");
    return;
  }

  codigoAtual = codigo;

  try {
    iniciarEventosDoVideo();
    await aplicarPlaylistNova(true);
    iniciarRealtime();
    iniciarPolling();
  } catch (erro) {
    console.error("Erro geral no player:", erro);
    mostrarMensagem("Erro ao carregar a playlist.");
  }
}

window.addEventListener("beforeunload", () => {
  if (realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
  }

  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});

carregarPlaylist();
