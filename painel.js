const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
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
  return params.get("codigo") || "";
}

function atualizarCabecalho() {
  tituloPasta.textContent = `Ponto ${codigoAtual}`;
}

async function carregarPlaylist() {
  const { data, error } = await supabaseClient
    .from("playlists")
    .select("*")
    .eq("codigo", codigoAtual)
    .order("ordem", { ascending: true });

  if (error) {
    console.error(error);
    mostrarToast("Erro ao carregar playlist", true);
    return;
  }

  playlistAtual = data || [];
  renderizarPlaylist();
}

function renderizarPlaylist() {
  contadorPlaylist.textContent = `${playlistAtual.length} itens`;

  if (!playlistAtual.length) {
    playlistLista.innerHTML = `<div class="playlist-vazia">Sem itens</div>`;
    return;
  }

  playlistLista.innerHTML = playlistAtual.map((item, index) => `
    <div class="playlist-item">
      <div class="item-main">
        <div class="item-title">${item.nome}</div>
      </div>

      <div class="item-actions">
        <button onclick="renomearItem(${index})">Renomear</button>
        <button onclick="excluirItem(${index})">Excluir</button>
      </div>
    </div>
  `).join("");
}

async function enviarMidia() {
  const file = arquivoInput.files[0];
  if (!file) return;

  const nome = file.name;
  const path = `${codigoAtual}/${Date.now()}-${nome}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(BUCKET)
    .upload(path, file);

  if (uploadError) {
    mostrarToast("Erro upload", true);
    return;
  }

  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);

  await supabaseClient.from("playlists").insert({
    codigo: codigoAtual,
    nome: nome,
    video_url: data.publicUrl,
    storage_path: path,
    ordem: playlistAtual.length + 1,
    tipo: "video"
  });

  mostrarToast("Enviado");
  carregarPlaylist();
}

async function renomearItem(index) {
  const item = playlistAtual[index];
  const novo = prompt("Novo nome:", item.nome);
  if (!novo) return;

  await supabaseClient
    .from("playlists")
    .update({ nome: novo })
    .eq("id", item.id);

  carregarPlaylist();
}

async function excluirItem(index) {
  const item = playlistAtual[index];

  await supabaseClient.storage
    .from(BUCKET)
    .remove([item.storage_path]);

  await supabaseClient
    .from("playlists")
    .delete()
    .eq("id", item.id);

  carregarPlaylist();
}

btnEnviar.onclick = enviarMidia;

function iniciar() {
  codigoAtual = getCodigoAtual();

  if (!codigoAtual) {
    alert("Sem código");
    return;
  }

  atualizarCabecalho();
  carregarPlaylist();
}

iniciar();
