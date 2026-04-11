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
const tituloPasta = document.getElementById("tituloPasta");

const videoInput = document.getElementById("videoInput");
const btnUpload = document.getElementById("btnUpload");
const btnVoltar = document.getElementById("btnVoltar");

const dataInicioInput = document.getElementById("dataInicio");
const dataFimInput = document.getElementById("dataFim");

const playlistAtiva = document.getElementById("playlistAtiva");
const playlistInativa = document.getElementById("playlistInativa");

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

/* HELPERS */
function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* DATA SEM HORA */
function formatarData(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  return data.toLocaleDateString("pt-BR");
}

function normalizarDataInput(valor) {
  if (!valor) return null;
  return new Date(valor).toISOString();
}

function montarLinhaDatas(item) {
  const postado = formatarData(item.created_at);
  const encerrado = formatarData(item.data_fim);

  if (postado && encerrado) {
    return `Postado: ${postado} • Encerra: ${encerrado}`;
  }

  if (postado) return `Postado: ${postado}`;
  if (encerrado) return `Encerra: ${encerrado}`;

  return "";
}

function itemEstaInativo(item) {
  if (!item.data_fim) return false;

  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  const fim = new Date(item.data_fim);
  fim.setHours(23,59,59,999);

  return fim < hoje;
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
    card.querySelector(".card-nome").textContent =
      pontosMap[codigo]?.nome || codigo;
  });
}

/* ABRIR */
function abrirPonto(codigo) {
  codigoSelecionado = String(codigo).trim();

  listaPontos.style.display = "none";
  pontoDetalhe.style.display = "block";

  codigoAtual.textContent = codigoSelecionado;

  tituloPasta.textContent =
    "Pasta do " + (pontosMap[codigoSelecionado]?.nome || codigoSelecionado);

  carregarPlaylist();
}

/* VOLTAR */
btnVoltar.onclick = () => {
  listaPontos.style.display = "grid";
  pontoDetalhe.style.display = "none";
};

/* COPIAR */
document.getElementById("btnCopiarCodigo").onclick = () => {
  navigator.clipboard.writeText(codigoSelecionado);
  setStatus("Código copiado", "ok");
};

/* UPLOAD */
async function uploadMidia() {
  const file = videoInput.files[0];
  if (!file) return setStatus("Selecione um arquivo", "erro");

  const codigo = codigoSelecionado;

  const dataInicio = normalizarDataInput(dataInicioInput.value) || new Date().toISOString();
  const dataFim = normalizarDataInput(dataFimInput.value);

  const path = `${codigo}/${Date.now()}-${file.name}`;

  await supabaseClient.storage.from(BUCKET).upload(path, file);
  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);

  await supabaseClient.from(TABELA).insert({
    codigo,
    nome: file.name,
    video_url: data.publicUrl,
    storage_path: path,
    ordem: Date.now(),
    tipo: "video",
    data_inicio: dataInicio,
    data_fim: dataFim
  });

  setStatus("Enviado", "ok");

  videoInput.value = "";
  dataInicioInput.value = "";
  dataFimInput.value = "";

  carregarPlaylist();
}

btnUpload.onclick = uploadMidia;

/* PLAYLIST */
async function carregarPlaylist() {
  const { data } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigoSelecionado)
    .order("ordem");

  const ativos = data.filter(i => !itemEstaInativo(i));
  const inativos = data.filter(i => itemEstaInativo(i));

  renderizarPlaylistAtiva(ativos);
  renderizarHistorico(inativos);
}

/* ATIVOS */
function renderizarPlaylistAtiva(lista) {
  if (!lista.length) {
    playlistAtiva.innerHTML = "Nenhum item ativo";
    return;
  }

  playlistAtiva.innerHTML = lista.map((item, i) => `
    <div class="playlist-item" draggable="true" data-index="${i}">
      <div class="playlist-item-handle">⋮⋮</div>

      <div class="playlist-item-conteudo">
        <div>${item.nome}</div>
        <div>${montarLinhaDatas(item)}</div>
      </div>

      <div class="playlist-item-acoes-laterais">
        <button onclick="editarNomeItem(${item.id}, '${item.nome}')">✎</button>
        <button onclick="removerItem(${item.id}, '${item.storage_path}')">🗑</button>
      </div>
    </div>
  `).join("");

  ativarDrag(lista);
}

/* HISTÓRICO */
function renderizarHistorico(lista) {
  if (!lista.length) {
    playlistInativa.innerHTML = "Sem histórico";
    return;
  }

  playlistInativa.innerHTML = lista.map(item => `
    <div>
      ${item.nome} — ${formatarData(item.data_fim)}
    </div>
  `).join("");
}

/* DRAG */
function ativarDrag(lista) {
  const items = document.querySelectorAll(".playlist-item");

  items.forEach(item => {
    item.addEventListener("dragstart", () => {
      dragIndex = item.dataset.index;
    });

    item.addEventListener("drop", async () => {
      const target = item.dataset.index;

      const novo = [...lista];
      const movido = novo.splice(dragIndex, 1)[0];
      novo.splice(target, 0, movido);

      for (let i = 0; i < novo.length; i++) {
        await supabaseClient.from(TABELA)
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

  await supabaseClient.storage.from(BUCKET).remove([path]);
  await supabaseClient.from(TABELA).delete().eq("id", id);

  carregarPlaylist();
}

/* RENOMEAR */
async function editarNomeItem(id, nomeAtual) {
  const novo = prompt("Novo nome:", nomeAtual);
  if (!novo) return;

  await supabaseClient.from(TABELA)
    .update({ nome: novo })
    .eq("id", id);

  carregarPlaylist();
}

window.removerItem = removerItem;
window.editarNomeItem = editarNomeItem;

/* INIT */
async function iniciarPainel() {
  const pontos = await buscarPontos();
  renderizarCardsPontos(pontos);

  document.querySelectorAll(".btn-abrir").forEach(btn =>
    btn.onclick = () => abrirPonto(btn.dataset.codigo)
  );
}
