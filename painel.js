const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "videos";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const videoInput = document.getElementById("videoInput");
const btnUpload = document.getElementById("btnUpload");
const playlistLista = document.getElementById("playlistLista");

let codigoSelecionado = null;

/* =========================
   UPLOAD
========================= */
async function uploadMidia() {
  const file = videoInput.files[0];
  if (!file) return;

  const ext = file.name.split(".").pop().toLowerCase();

  let tipo = "";
  if (ext === "mp4") tipo = "video";
  if (ext === "jpg" || ext === "jpeg") tipo = "imagem";
  if (ext === "txt") tipo = "site";

  let urlFinal = "";
  let storagePath = "";

  if (tipo === "site") {
    const texto = await file.text();
    urlFinal = texto.trim();
  } else {
    const path = `${codigoSelecionado}/${Date.now()}-${file.name}`;

    await supabaseClient.storage.from(BUCKET).upload(path, file);

    const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);

    urlFinal = data.publicUrl;
    storagePath = path;
  }

  await supabaseClient.from("playlists").insert({
    codigo: codigoSelecionado,
    nome: file.name,
    video_url: urlFinal,
    storage_path: storagePath,
    ordem: Date.now(),
    tipo: tipo
  });

  carregarPlaylist();
}

/* =========================
   PLAYLIST
========================= */
async function carregarPlaylist() {
  const { data } = await supabaseClient
    .from("playlists")
    .select("*")
    .eq("codigo", codigoSelecionado)
    .order("ordem");

  playlistLista.innerHTML = data.map(item => `
    <div>
      ${item.nome}
      <button onclick="deletar(${item.id})">X</button>
    </div>
  `).join("");
}

async function deletar(id) {
  await supabaseClient.from("playlists").delete().eq("id", id);
  carregarPlaylist();
}

btnUpload.onclick = uploadMidia;
