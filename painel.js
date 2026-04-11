const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "COLE_AQUI_SUA_PUBLIC_KEY";
const BUCKET = "videos";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tituloPasta = document.getElementById("tituloPasta");
const subtituloPasta = document.getElementById("subtituloPasta");
const arquivoInput = document.getElementById("arquivoInput");
const arquivoNome = document.getElementById("arquivoNome");
const btnEnviar = document.getElementById("btnEnviar");
const btnVoltar = document.getElementById("btnVoltar");
const playlistLista = document.getElementById("playlistLista");
const contadorPlaylist = document.getElementById("contadorPlaylist");
const toast = document.getElementById("toast");

let codigoAtual = null;
let nomePontoAtual = "Sem nome";
let playlistAtual = [];
let draggedIndex = null;

function mostrarToast(texto, erro = false) {
  toast.textContent = texto;
  toast.className = erro ? "toast show error" : "toast show";

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 2600);
}

function getCodigoAtual() {
  const params = new URLSearchParams(window.location.search);
  const codigoUrl = params.get("codigo");

  return (
    codigoUrl ||
    localStorage.getItem("codigoPastaAtual") ||
    localStorage.getItem("codigoSelecionado") ||
    ""
  ).trim();
}

function getNomePontoLocal() {
  return (
    localStorage.getItem("nomePastaAtual") ||
    localStorage.getItem("nomePontoAtual") ||
    "Sem nome"
  ).trim();
}

function atualizarCabecalho() {
  tituloPasta.textContent = `Pasta do ponto ${codigoAtual || ""}`;
  subtituloPasta.textContent = nomePontoAtual || "Sem nome";
}

function nomeBonitoArquivo(nome) {
  if (!nome) return "Arquivo sem nome";
  return nome.trim();
}

function traduzirTipo(tipo) {
  if (tipo === "video") return "Vídeo";
  if (tipo === "imagem") return "Imagem";
  if (tipo === "site") return "Site";
  return "Arquivo";
}

function identificarTipo(file) {
  const nome = file.name.toLowerCase();

  if (nome.endsWith(".mp4")) return "video";
  if (
    nome.endsWith(".jpg") ||
    nome.endsWith(".jpeg") ||
    nome.endsWith(".png") ||
    nome.endsWith(".webp")
  ) {
    return "imagem";
  }
  if (nome.endsWith(".txt")) return "site";

  return null;
}

function slugArquivo(nome) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function baseSemExtensao(nome) {
  const i = nome.lastIndexOf(".");
  return i > 0 ? nome.slice(0, i) : nome;
}

function obterNumeroOrdemSeguinte() {
  if (!playlistAtual.length) return 1;
  const maior = Math.max(...playlistAtual.map(item => Number(item.ordem) || 0));
  return maior + 1;
}

function filtroItem(query, item) {
  query = query.eq("codigo", item.codigo).eq("created_at", item.created_at);

  if (item.storage_path) {
    query = query.eq("storage_path", item.storage_path);
  } else {
    query = query.is("storage_path", null).eq("video_url", item.video_url || "");
  }

  return query;
}

async function carregarNomeDoPonto() {
  nomePontoAtual = getNomePontoLocal();
  atualizarCabecalho();

  const { data, error } = await supabaseClient
    .from("pontos")
    .select("codigo, nome")
    .eq("codigo", codigoAtual)
    .maybeSingle();

  if (!error && data?.nome) {
    nomePontoAtual = data.nome;
    localStorage.setItem("nomePastaAtual", data.nome);
    atualizarCabecalho();
  }
}

async function carregarPlaylist() {
  const { data, error } = await supabaseClient
    .from("playlists")
    .select("codigo, nome, video_url, storage_path, ordem, tipo, created_at")
    .eq("codigo", codigoAtual)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar playlist:", error);
    mostrarToast("Erro ao carregar playlist.", true);
    return;
  }

  playlistAtual = Array.isArray(data) ? data : [];
  renderizarPlaylist();
}

function renderizarPlaylist() {
  contadorPlaylist.textContent = `${playlistAtual.length} ${playlistAtual.length === 1 ? "item" : "itens"}`;

  if (!playlistAtual.length) {
    playlistLista.innerHTML = `
      <div class="playlist-vazia">
        Nenhuma mídia enviada ainda.<br />
        Envie um arquivo para começar a playlist.
      </div>
    `;
    return;
  }

  playlistLista.innerHTML = playlistAtual
    .map((item, index) => {
      const tipoTexto = traduzirTipo(item.tipo);
      const duracaoTexto =
        item.tipo === "imagem" || item.tipo === "site" ? "20 segundos" : "Normal";

      return `
        <div class="playlist-item" draggable="true" data-index="${index}">
          <div class="drag-handle" title="Arrastar para reordenar">⋮⋮</div>

          <div class="item-main">
            <div class="item-title">${escapeHtml(nomeBonitoArquivo(item.nome))}</div>
            <div class="item-meta">
              <span class="meta-chip">Item ${index + 1}</span>
              <span class="meta-chip">Tipo: ${tipoTexto}</span>
              <span class="meta-chip">Exibição: ${duracaoTexto}</span>
            </div>
          </div>

          <div class="item-actions">
            <button class="btn btn-light" onclick="renomearItem(${index})">Renomear</button>
            <button class="btn btn-danger" onclick="excluirItem(${index})">Excluir</button>
          </div>
        </div>
      `;
    })
    .join("");

  aplicarEventosDrag();
}

function escapeHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function aplicarEventosDrag() {
  const itens = document.querySelectorAll(".playlist-item");

  itens.forEach(item => {
    item.addEventListener("dragstart", () => {
      draggedIndex = Number(item.dataset.index);
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    item.addEventListener("drop", async () => {
      const targetIndex = Number(item.dataset.index);

      if (draggedIndex === null || draggedIndex === targetIndex) return;

      const copia = [...playlistAtual];
      const [movido] = copia.splice(draggedIndex, 1);
      copia.splice(targetIndex, 0, movido);

      playlistAtual = copia.map((itemAtual, idx) => ({
        ...itemAtual,
        ordem: idx + 1
      }));

      renderizarPlaylist();
      await salvarOrdemPlaylist();
      draggedIndex = null;
    });
  });
}

async function salvarOrdemPlaylist() {
  try {
    for (const item of playlistAtual) {
      let query = supabaseClient.from("playlists").update({ ordem: item.ordem });
      query = filtroItem(query, item);

      const { error } = await query;
      if (error) throw error;
    }

    mostrarToast("Ordem da playlist salva.");
  } catch (error) {
    console.error("Erro ao salvar ordem:", error);
    mostrarToast("Erro ao salvar nova ordem.", true);
  }
}

async function uploadArquivoStorage(file, path) {
  const { error } = await supabaseClient.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) throw error;

  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function lerTxtComoUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const texto = String(reader.result || "").trim();
      resolve(texto);
    };

    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function validarUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function enviarMidia() {
  const file = arquivoInput.files?.[0];

  if (!file) {
    mostrarToast("Escolha um arquivo primeiro.", true);
    return;
  }

  const tipo = identificarTipo(file);

  if (!tipo) {
    mostrarToast("Formato não suportado.", true);
    return;
  }

  btnEnviar.disabled = true;
  btnEnviar.textContent = "Enviando...";

  try {
    const ordem = obterNumeroOrdemSeguinte();
    const nomeBase = baseSemExtensao(file.name);
    let videoUrl = "";
    let storagePath = null;

    if (tipo === "site") {
      const urlLida = await lerTxtComoUrl(file);

      if (!urlLida || !validarUrl(urlLida)) {
        throw new Error("O arquivo TXT precisa conter uma URL válida começando com http:// ou https://");
      }

      videoUrl = urlLida;
    } else {
      const extensaoSegura = slugArquivo(file.name);
      const path = `${codigoAtual}/${Date.now()}-${extensaoSegura}`;
      videoUrl = await uploadArquivoStorage(file, path);
      storagePath = path;
    }

    const payload = {
      codigo: codigoAtual,
      nome: nomeBase,
      video_url: videoUrl,
      storage_path: storagePath,
      ordem,
      tipo
    };

    const { error } = await supabaseClient.from("playlists").insert(payload);

    if (error) throw error;

    arquivoInput.value = "";
    arquivoNome.textContent = "Nenhum arquivo escolhido";

    mostrarToast("Mídia enviada com sucesso.");
    await carregarPlaylist();
  } catch (error) {
    console.error("Erro no upload:", error);
    mostrarToast(error.message || "Erro ao enviar mídia.", true);
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = "Enviar mídia";
  }
}

async function renomearItem(index) {
  const item = playlistAtual[index];
  if (!item) return;

  const novoNome = prompt("Digite o novo nome do arquivo:", item.nome);

  if (novoNome === null) return;

  const nomeFinal = novoNome.trim();

  if (!nomeFinal) {
    mostrarToast("O nome não pode ficar vazio.", true);
    return;
  }

  try {
    let query = supabaseClient.from("playlists").update({ nome: nomeFinal });
    query = filtroItem(query, item);

    const { error } = await query;
    if (error) throw error;

    playlistAtual[index].nome = nomeFinal;
    renderizarPlaylist();
    mostrarToast("Arquivo renomeado.");
  } catch (error) {
    console.error("Erro ao renomear:", error);
    mostrarToast("Erro ao renomear arquivo.", true);
  }
}

async function excluirItem(index) {
  const item = playlistAtual[index];
  if (!item) return;

  const confirmou = confirm(`Deseja excluir "${item.nome}"?`);
  if (!confirmou) return;

  try {
    if (item.storage_path) {
      const { error: storageError } = await supabaseClient.storage
        .from(BUCKET)
        .remove([item.storage_path]);

      if (storageError) {
        console.warn("Arquivo removido do banco, mas houve erro no storage:", storageError);
      }
    }

    let query = supabaseClient.from("playlists").delete();
    query = filtroItem(query, item);

    const { error } = await query;
    if (error) throw error;

    mostrarToast("Arquivo excluído.");
    await carregarPlaylist();
    await normalizarOrdens();
  } catch (error) {
    console.error("Erro ao excluir:", error);
    mostrarToast("Erro ao excluir arquivo.", true);
  }
}

async function normalizarOrdens() {
  try {
    const { data, error } = await supabaseClient
      .from("playlists")
      .select("codigo, nome, video_url, storage_path, ordem, tipo, created_at")
      .eq("codigo", codigoAtual)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    const lista = (data || []).map((item, idx) => ({
      ...item,
      ordem: idx + 1
    }));

    for (const item of lista) {
      let query = supabaseClient.from("playlists").update({ ordem: item.ordem });
      query = filtroItem(query, item);

      const { error: updateError } = await query;
      if (updateError) throw updateError;
    }

    await carregarPlaylist();
  } catch (error) {
    console.error("Erro ao normalizar ordens:", error);
  }
}

function voltarPainel() {
  window.location.href = "painel.html";
}

arquivoInput.addEventListener("change", () => {
  const file = arquivoInput.files?.[0];
  arquivoNome.textContent = file ? file.name : "Nenhum arquivo escolhido";
});

btnEnviar.addEventListener("click", enviarMidia);
btnVoltar.addEventListener("click", voltarPainel);

window.renomearItem = renomearItem;
window.excluirItem = excluirItem;

async function iniciar() {
  codigoAtual = getCodigoAtual();

  if (!codigoAtual) {
    tituloPasta.textContent = "Nenhum ponto selecionado";
    subtituloPasta.textContent = "Abra esta pasta a partir da tela principal.";
    playlistLista.innerHTML = `
      <div class="playlist-vazia">
        Nenhum código encontrado.<br />
        Volte e abra um ponto primeiro.
      </div>
    `;
    contadorPlaylist.textContent = "0 itens";
    return;
  }

  await carregarNomeDoPonto();
  await carregarPlaylist();
}

iniciar();
