const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "videos";
const TABELA = "playlists";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const codigoSelect = document.getElementById("codigoSelect");
const codigoAtual = document.getElementById("codigoAtual");
const videoInput = document.getElementById("videoInput");
const btnUpload = document.getElementById("btnUpload");
const statusEl = document.getElementById("status");
const playlistLista = document.getElementById("playlistLista");

function setStatus(texto, tipo = "normal") {
  statusEl.textContent = texto;
  statusEl.className = "status-box";

  if (tipo === "erro") statusEl.classList.add("erro");
  if (tipo === "ok") statusEl.classList.add("ok");
}

function escaparHtml(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pegarCodigoAtual() {
  return codigoSelect.value;
}

async function buscarPlaylist(codigo) {
  const { data, error } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigo)
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function pegarProximaOrdem(codigo) {
  const lista = await buscarPlaylist(codigo);

  if (!lista.length) return 0;

  const maior = Math.max(...lista.map(item => Number(item.ordem) || 0));
  return maior + 1;
}

function montarItemHtml(item, indice, total) {
  const nome = escaparHtml(item.nome || "Sem nome");
  const url = escaparHtml(item.video_url || "");
  const storagePathEscapado = escaparHtml(item.storage_path || "");

  return `
    <div class="playlist-item" data-id="${item.id}">
      <div class="playlist-item-topo">
        <strong>${indice + 1}. ${nome}</strong>
      </div>

      <div class="playlist-item-url">
        <a href="${url}" target="_blank" rel="noopener noreferrer">Abrir vídeo</a>
      </div>

      <div class="playlist-item-acoes">
        <button onclick="moverVideo(${item.id}, 'up')" ${indice === 0 ? "disabled" : ""}>↑ Subir</button>
        <button onclick="moverVideo(${item.id}, 'down')" ${indice === total - 1 ? "disabled" : ""}>↓ Descer</button>
        <button onclick="removerVideo(${item.id}, '${storagePathEscapado}')">Remover</button>
        <button onclick="copiarLinkPlayer('${item.codigo}')">Copiar link do player</button>
      </div>
    </div>
  `;
}

async function renderizarPlaylist() {
  const codigo = pegarCodigoAtual();
  codigoAtual.textContent = codigo;
  playlistLista.innerHTML = "<p>Carregando playlist...</p>";

  try {
    const lista = await buscarPlaylist(codigo);

    if (!lista.length) {
      playlistLista.innerHTML = "<p>Nenhum vídeo carregado.</p>";
      return;
    }

    playlistLista.innerHTML = lista
      .map((item, indice) => montarItemHtml(item, indice, lista.length))
      .join("");
  } catch (error) {
    console.error("Erro ao renderizar playlist:", error);
    playlistLista.innerHTML = "<p>Erro ao carregar playlist.</p>";
    setStatus("Erro ao carregar playlist: " + error.message, "erro");
  }
}

async function uploadVideo() {
  const codigo = pegarCodigoAtual();
  const arquivo = videoInput.files[0];

  if (!arquivo) {
    setStatus("Selecione um vídeo antes de enviar.", "erro");
    return;
  }

  try {
    btnUpload.disabled = true;
    setStatus("Enviando vídeo...");

    const nomeSeguro = arquivo.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const nomeFinal = `${Date.now()}-${nomeSeguro || "video.mp4"}`;
    const caminho = `${codigo}/${nomeFinal}`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from(BUCKET)
      .upload(caminho, arquivo, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } = supabaseClient
      .storage
      .from(BUCKET)
      .getPublicUrl(caminho);

    const videoUrl = publicData.publicUrl;
    const ordem = await pegarProximaOrdem(codigo);

    const { error: insertError } = await supabaseClient
      .from(TABELA)
      .insert({
        codigo: codigo,
        nome: arquivo.name,
        video_url: videoUrl,
        storage_path: caminho,
        ordem: ordem
      });

    if (insertError) {
      throw insertError;
    }

    videoInput.value = "";
    setStatus("Vídeo enviado com sucesso.", "ok");
    await renderizarPlaylist();
  } catch (error) {
    console.error("Erro no upload:", error);
    setStatus("Erro ao enviar vídeo: " + error.message, "erro");
  } finally {
    btnUpload.disabled = false;
  }
}

async function removerVideo(id, storagePath) {
  const confirmar = window.confirm("Deseja remover este vídeo?");
  if (!confirmar) return;

  try {
    setStatus("Removendo vídeo...");

    const { error: storageError } = await supabaseClient
      .storage
      .from(BUCKET)
      .remove([storagePath]);

    if (storageError) {
      throw storageError;
    }

    const { error: deleteError } = await supabaseClient
      .from(TABELA)
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    await reordenarCodigo(pegarCodigoAtual());
    setStatus("Vídeo removido com sucesso.", "ok");
    await renderizarPlaylist();
  } catch (error) {
    console.error("Erro ao remover vídeo:", error);
    setStatus("Erro ao remover vídeo: " + error.message, "erro");
  }
}

async function moverVideo(id, direcao) {
  try {
    const codigo = pegarCodigoAtual();
    const lista = await buscarPlaylist(codigo);

    const indiceAtualLista = lista.findIndex(item => Number(item.id) === Number(id));
    if (indiceAtualLista === -1) return;

    const novoIndice = direcao === "up" ? indiceAtualLista - 1 : indiceAtualLista + 1;

    if (novoIndice < 0 || novoIndice >= lista.length) return;

    const atual = lista[indiceAtualLista];
    const destino = lista[novoIndice];

    const ordemAtual = atual.ordem;
    const ordemDestino = destino.ordem;

    const { error: error1 } = await supabaseClient
      .from(TABELA)
      .update({ ordem: ordemDestino })
      .eq("id", atual.id);

    if (error1) throw error1;

    const { error: error2 } = await supabaseClient
      .from(TABELA)
      .update({ ordem: ordemAtual })
      .eq("id", destino.id);

    if (error2) throw error2;

    setStatus("Ordem atualizada.", "ok");
    await renderizarPlaylist();
  } catch (error) {
    console.error("Erro ao mover vídeo:", error);
    setStatus("Erro ao mover vídeo: " + error.message, "erro");
  }
}

async function reordenarCodigo(codigo) {
  const lista = await buscarPlaylist(codigo);

  for (let i = 0; i < lista.length; i++) {
    const item = lista[i];

    if ((Number(item.ordem) || 0) !== i) {
      const { error } = await supabaseClient
        .from(TABELA)
        .update({ ordem: i })
        .eq("id", item.id);

      if (error) throw error;
    }
  }
}

function copiarLinkPlayer(codigo) {
  const link = `${window.location.origin}/player.html?codigo=${codigo}`;

  navigator.clipboard.writeText(link)
    .then(() => {
      setStatus("Link copiado: " + link, "ok");
    })
    .catch(() => {
      setStatus("Não foi possível copiar o link.", "erro");
    });
}

codigoSelect.addEventListener("change", async () => {
  codigoAtual.textContent = pegarCodigoAtual();
  setStatus("Carregando playlist...");
  await renderizarPlaylist();
  setStatus("Playlist carregada.", "ok");
});

btnUpload.addEventListener("click", uploadVideo);

window.removerVideo = removerVideo;
window.moverVideo = moverVideo;
window.copiarLinkPlayer = copiarLinkPlayer;

async function iniciarPainel() {
  codigoAtual.textContent = pegarCodigoAtual();
  setStatus("Carregando playlist inicial...");
  await renderizarPlaylist();
  setStatus("Painel pronto.", "ok");
}

iniciarPainel();
