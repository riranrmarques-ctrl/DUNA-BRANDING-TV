const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "videos";
const TABELA = "playlists";
const TABELA_PONTOS = "pontos";

const SENHA_PAINEL = "@Helena";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginBox = document.getElementById("loginBox");
const conteudoPainel = document.getElementById("conteudoPainel");
const senhaInput = document.getElementById("senhaInput");
const btnLogin = document.getElementById("btnLogin");
const loginErro = document.getElementById("loginErro");

const statusEl = document.getElementById("status");
const listaPontos = document.getElementById("listaPontos");
const pontoDetalhe = document.getElementById("pontoDetalhe");
const codigoAtual = document.getElementById("codigoAtual");
const nomeAtual = document.getElementById("nomeAtual");
const videoInput = document.getElementById("videoInput");
const btnUpload = document.getElementById("btnUpload");
const btnVoltar = document.getElementById("btnVoltar");
const playlistLista = document.getElementById("playlistLista");

let codigoSelecionado = null;
let pontosMap = {};
let dragIndex = null;

/* STATUS */
function setStatus(texto, tipo = "normal") {
  statusEl.textContent = texto;
  statusEl.className = "status-box";
  if (tipo === "ok") statusEl.classList.add("ok");
  if (tipo === "erro") statusEl.classList.add("erro");
}

/* LOGIN */
function validarLogin() {
  if (senhaInput.value.trim() !== SENHA_PAINEL) {
    loginErro.textContent = "Código inválido";
    return;
  }

  loginBox.style.display = "none";
  conteudoPainel.style.display = "block";
  setStatus("Painel Ativo", "ok");
  iniciarPainel();
}

btnLogin.onclick = validarLogin;

/* PONTOS */
async function buscarPontos() {
  const { data } = await supabaseClient.from(TABELA_PONTOS).select("*");
  return data || [];
}

function renderizarCardsPontos(lista) {
  pontosMap = {};
  lista.forEach(p => pontosMap[p.codigo] = p);

  document.querySelectorAll(".card-ponto").forEach(card => {
    const codigo = card.dataset.codigo;
    const nomeEl = card.querySelector(".card-nome");
    nomeEl.textContent = pontosMap[codigo]?.nome || `Ponto ${codigo}`;
  });
}

/* ABRIR PASTA */
function abrirPonto(codigo) {
  codigoSelecionado = String(codigo).trim();
  listaPontos.style.display = "none";
  pontoDetalhe.style.display = "block";
  codigoAtual.textContent = codigoSelecionado;
  nomeAtual.textContent = pontosMap[codigoSelecionado]?.nome || codigoSelecionado;
  carregarPlaylist();
}

/* VOLTAR */
btnVoltar.onclick = () => {
  listaPontos.style.display = "grid";
  pontoDetalhe.style.display = "none";
};

/* UPLOAD */
async function uploadMidia() {
  const file = videoInput.files[0];
  if (!file) return setStatus("Selecione um arquivo", "erro");

  const codigoLimpo = String(codigoSelecionado || "").trim();
  if (!codigoLimpo) return setStatus("Erro: ponto não selecionado", "erro");

  const ext = file.name.split(".").pop().toLowerCase();
  let tipo = "";
  let urlFinal = "";
  let storagePath = "";

  try {
    if (ext === "txt") {
      const text = await file.text();
      const match = text.match(/URL=(.*)/i);
      urlFinal = match ? match[1].trim() : text.trim();
      tipo = "site";
    } else {
      tipo = ext === "mp4" ? "video" : "imagem";

      const path = `${codigoLimpo}/${Date.now()}-${file.name}`;
      storagePath = path;

      await supabaseClient.storage.from(BUCKET).upload(path, file);
      const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);
      urlFinal = data.publicUrl;
    }

    await supabaseClient.from(TABELA).insert({
      codigo: codigoLimpo,
      nome: file.name,
      video_url: urlFinal,
      storage_path: storagePath,
      ordem: Date.now(),
      tipo: tipo
    });

    setStatus("Enviado com sucesso", "ok");
    videoInput.value = "";
    carregarPlaylist();

  } catch (e) {
    setStatus("Erro upload", "erro");
    console.error(e);
  }
}

btnUpload.onclick = uploadMidia;

/* PLAYLIST */
async function carregarPlaylist() {
  const codigoLimpo = String(codigoSelecionado || "").trim();

  const { data } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigoLimpo)
    .order("ordem", { ascending: true });

  if (!data || !data.length) {
    playlistLista.innerHTML = "<p>Nenhum item</p>";
    return;
  }

  playlistLista.innerHTML = data.map((item, index) => `
    <div class="playlist-item" draggable="true" data-index="${index}" data-id="${item.id}">
      <div class="playlist-item-topo">
        <strong contenteditable="true" onblur="renomearItem(${item.id}, this.innerText)">
          ${item.nome}
        </strong>
      </div>

      <div class="playlist-item-acoes">
        <button onclick="removerItem(${item.id}, '${item.storage_path || ""}')">Remover</button>
      </div>
    </div>
  `).join("");

  ativarDrag(data);
}

/* DRAG */
function ativarDrag(lista) {
  const items = document.querySelectorAll(".playlist-item");

  items.forEach(item => {
    item.addEventListener("dragstart", () => {
      dragIndex = item.dataset.index;
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });

    item.addEventListener("dragover", e => e.preventDefault());

    item.addEventListener("drop", async () => {
      const targetIndex = item.dataset.index;

      const novo = [...lista];
      const movido = novo.splice(dragIndex, 1)[0];
      novo.splice(targetIndex, 0, movido);

      for (let i = 0; i < novo.length; i++) {
        await supabaseClient
          .from(TABELA)
          .update({ ordem: i })
          .eq("id", novo[i].id);
      }

      carregarPlaylist();
    });
  });
}

/* REMOVER */
async function removerItem(id, path) {
  if (!confirm("Remover?")) return;

  if (path) {
    await supabaseClient.storage.from(BUCKET).remove([path]);
  }

  await supabaseClient.from(TABELA).delete().eq("id", id);
  carregarPlaylist();
}

/* RENOMEAR */
async function renomearItem(id, nome) {
  await supabaseClient.from(TABELA).update({ nome }).eq("id", id);
  setStatus("Nome atualizado", "ok");
}

window.removerItem = removerItem;
window.renomearItem = renomearItem;

/* EVENTOS */
function configurarEventos() {
  document.querySelectorAll(".btn-abrir").forEach(btn =>
    btn.onclick = () => abrirPonto(btn.dataset.codigo)
  );

  document.querySelectorAll(".btn-editar-nome").forEach(btn =>
    btn.onclick = () => {
      const novo = prompt("Novo nome:");
      if (novo) {
        supabaseClient.from(TABELA_PONTOS)
          .update({ nome: novo })
          .eq("codigo", btn.dataset.codigo);
        iniciarPainel();
      }
    }
  );
}

/* INIT */
async function iniciarPainel() {
  configurarEventos();
  const pontos = await buscarPontos();
  renderizarCardsPontos(pontos);
}
