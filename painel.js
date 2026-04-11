const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const BUCKET = "videos";
const TABELA_PLAYLISTS = "playlists";
const TABELA_PONTOS = "pontos";
const SENHA_PAINEL = "@Helena";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ELEMENTOS */
const loginBox = document.getElementById("loginBox");
const conteudoPainel = document.getElementById("conteudoPainel");
const senhaInput = document.getElementById("senhaInput");
const btnLogin = document.getElementById("btnLogin");
const loginErro = document.getElementById("loginErro");

const listaPontos = document.getElementById("listaPontos");
const pontoDetalhe = document.getElementById("pontoDetalhe");
const codigoAtual = document.getElementById("codigoAtual");
const nomeAtual = document.getElementById("nomeAtual");

const videoInput = document.getElementById("videoInput");
const btnUpload = document.getElementById("btnUpload");
const btnVoltar = document.getElementById("btnVoltar");
const playlistLista = document.getElementById("playlistLista");

let codigoSelecionado = null;
let playlistAtual = [];
let dragItemId = null;

/* LOGIN */
btnLogin.onclick = () => {
  if (senhaInput.value !== SENHA_PAINEL) {
    loginErro.textContent = "Código inválido";
    return;
  }
  loginBox.style.display = "none";
  conteudoPainel.style.display = "block";
  carregarPontos();
};

/* PONTOS */
async function carregarPontos() {
  const { data } = await supabaseClient.from(TABELA_PONTOS).select("*");

  document.querySelectorAll(".card-ponto").forEach(card => {
    const codigo = card.dataset.codigo;
    const ponto = data.find(p => p.codigo === codigo);

    if (ponto) {
      card.querySelector(".card-nome").textContent = ponto.nome;
    }
  });
}

/* ABRIR */
document.querySelectorAll(".btn-abrir").forEach(btn => {
  btn.onclick = () => {
    codigoSelecionado = btn.dataset.codigo;
    codigoAtual.textContent = codigoSelecionado;
    listaPontos.style.display = "none";
    pontoDetalhe.style.display = "block";
    carregarPlaylist();
  };
});

btnVoltar.onclick = () => {
  pontoDetalhe.style.display = "none";
  listaPontos.style.display = "grid";
};

/* PLAYLIST */
async function carregarPlaylist() {
  const { data } = await supabaseClient
    .from(TABELA_PLAYLISTS)
    .select("*")
    .eq("codigo", codigoSelecionado)
    .order("ordem");

  playlistAtual = data;
  renderPlaylist();
}

function renderPlaylist() {
  if (!playlistAtual.length) {
    playlistLista.innerHTML = `<div class="playlist-item vazio">Sem itens</div>`;
    return;
  }

  playlistLista.innerHTML = playlistAtual.map(item => `
    <div class="playlist-item" draggable="true" data-id="${item.id}">
      <div class="playlist-item-main">
        <div class="playlist-handle">⋮⋮</div>
        <div class="playlist-textos">
          <div class="playlist-nome">${item.nome}</div>
        </div>
      </div>

      <div class="playlist-acoes">
        <button onclick="renomearItem(${item.id}, '${item.nome}')">✎</button>
        <button onclick="excluirItem(${item.id}, '${item.storage_path}')">🗑</button>
      </div>
    </div>
  `).join("");

  ativarDrag();
}

/* DRAG */
function ativarDrag() {
  const itens = document.querySelectorAll(".playlist-item");

  itens.forEach(el => {
    el.ondragstart = () => dragItemId = el.dataset.id;

    el.ondragover = e => e.preventDefault();

    el.ondrop = async () => {
      const origem = playlistAtual.findIndex(i => i.id == dragItemId);
      const destino = playlistAtual.findIndex(i => i.id == el.dataset.id);

      const item = playlistAtual.splice(origem, 1)[0];
      playlistAtual.splice(destino, 0, item);

      renderPlaylist();

      for (let i = 0; i < playlistAtual.length; i++) {
        await supabaseClient
          .from(TABELA_PLAYLISTS)
          .update({ ordem: i })
          .eq("id", playlistAtual[i].id);
      }

      carregarPlaylist();
    };
  });
}

/* UPLOAD */
btnUpload.onclick = async () => {
  const file = videoInput.files[0];
  if (!file) return;

  const nome = Date.now() + "-" + file.name;
  const path = `${codigoSelecionado}/${nome}`;

  await supabaseClient.storage.from(BUCKET).upload(path, file);

  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);

  await supabaseClient.from(TABELA_PLAYLISTS).insert({
    codigo: codigoSelecionado,
    nome: file.name,
    video_url: data.publicUrl,
    storage_path: path,
    ordem: playlistAtual.length
  });

  videoInput.value = "";
  carregarPlaylist();
};

/* RENOMEAR */
window.renomearItem = async (id, nome) => {
  const novo = prompt("Novo nome:", nome);
  if (!novo) return;

  await supabaseClient
    .from(TABELA_PLAYLISTS)
    .update({ nome: novo })
    .eq("id", id);

  carregarPlaylist();
};

/* EXCLUIR */
window.excluirItem = async (id, path) => {
  if (!confirm("Excluir?")) return;

  if (path) {
    await supabaseClient.storage.from(BUCKET).remove([path]);
  }

  await supabaseClient.from(TABELA_PLAYLISTS).delete().eq("id", id);

  carregarPlaylist();
};
