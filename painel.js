const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "videos";

const SENHA = "@Helena";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* LOGIN */
const loginBox = document.getElementById("loginBox");
const conteudoPainel = document.getElementById("conteudoPainel");
const senhaInput = document.getElementById("senhaInput");
const btnLogin = document.getElementById("btnLogin");
const loginErro = document.getElementById("loginErro");

/* ELEMENTOS */
const listaPontos = document.getElementById("listaPontos");
const pontoDetalhe = document.getElementById("pontoDetalhe");
const codigoAtual = document.getElementById("codigoAtual");
const nomeAtual = document.getElementById("nomeAtual");

const videoInput = document.getElementById("videoInput");
const btnUpload = document.getElementById("btnUpload");
const btnVoltar = document.getElementById("btnVoltar");
const playlistLista = document.getElementById("playlistLista");

let codigoSelecionado = null;

/* ================= LOGIN ================= */
btnLogin.onclick = () => {
  if (senhaInput.value !== SENHA) {
    loginErro.textContent = "Código inválido";
    return;
  }

  loginBox.style.display = "none";
  conteudoPainel.style.display = "block";
};

/* ================= PONTOS ================= */
document.querySelectorAll(".btn-abrir").forEach(btn => {
  btn.onclick = () => {
    codigoSelecionado = btn.dataset.codigo;

    listaPontos.style.display = "none";
    pontoDetalhe.style.display = "block";

    codigoAtual.innerText = codigoSelecionado;

    carregarPlaylist();
  };
});

btnVoltar.onclick = () => {
  pontoDetalhe.style.display = "none";
  listaPontos.style.display = "grid";
};

/* ================= UPLOAD ================= */
btnUpload.onclick = async () => {
  const file = videoInput.files[0];
  if (!file) return;

  const ext = file.name.split(".").pop().toLowerCase();

  let tipo = "";
  if (ext === "mp4") tipo = "video";
  if (["jpg","jpeg","png","webp"].includes(ext)) tipo = "imagem";
  if (ext === "txt") tipo = "site";

  let urlFinal = "";
  let storagePath = "";

  if (tipo === "site") {
    urlFinal = (await file.text()).trim();
  } else {
    const path = `${codigoSelecionado}/${Date.now()}-${file.name}`;

    await supabase.storage.from(BUCKET).upload(path, file);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    urlFinal = data.publicUrl;
    storagePath = path;
  }

  await supabase.from("playlists").insert({
    codigo: codigoSelecionado,
    nome: file.name,
    video_url: urlFinal,
    storage_path: storagePath,
    ordem: Date.now(),
    tipo: tipo
  });

  videoInput.value = "";
  carregarPlaylist();
};

/* ================= PLAYLIST ================= */
async function carregarPlaylist() {
  const { data } = await supabase
    .from("playlists")
    .select("*")
    .eq("codigo", codigoSelecionado)
    .order("ordem");

  if (!data || !data.length) {
    playlistLista.innerHTML = "Sem itens";
    return;
  }

  playlistLista.innerHTML = data.map(item => `
    <div class="playlist-item">
      <span>${item.nome}</span>
      <div>
        <button onclick="renomear(${item.id}, '${item.nome}')">✎</button>
        <button onclick="deletar(${item.id}, '${item.storage_path}')">X</button>
      </div>
    </div>
  `).join("");
}

/* ================= RENOMEAR ================= */
async function renomear(id, nomeAtual) {
  const novo = prompt("Novo nome:", nomeAtual);
  if (!novo) return;

  await supabase.from("playlists").update({ nome: novo }).eq("id", id);

  carregarPlaylist();
}

/* ================= EXCLUIR ================= */
async function deletar(id, path) {
  if (!confirm("Excluir?")) return;

  if (path) {
    await supabase.storage.from(BUCKET).remove([path]);
  }

  await supabase.from("playlists").delete().eq("id", id);

  carregarPlaylist();
}
