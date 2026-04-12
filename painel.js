const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "videos";
const TABELA = "playlists";
const TABELA_PONTOS = "pontos";

const SENHA_PAINEL = "@Helena26";

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

const btnCopiarCodigo = document.getElementById("btnCopiarCodigo");

let codigoSelecionado = null;
let pontosMap = {};
let statusPontosMap = {};
let dragIndex = null;

function setStatus(texto, tipo = "normal") {
  statusEl.textContent = texto;
  statusEl.className = "status-box";
  if (tipo === "ok") statusEl.classList.add("ok");
  if (tipo === "erro") statusEl.classList.add("erro");
}

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatarData(valor) {
  if (!valor) return "";
  return new Date(valor).toLocaleDateString("pt-BR");
}

function normalizarDataInput(valor) {
  if (!valor) return null;
  return new Date(valor + "T00:00:00").toISOString();
}

function itemEstaInativo(item) {
  if (!item.data_fim) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fim = new Date(item.data_fim);
  fim.setHours(23, 59, 59, 999);

  return fim < hoje;
}

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

async function buscarPontos() {
  const { data } = await supabaseClient.from(TABELA_PONTOS).select("*");
  return data || [];
}

function renderizarCardsPontos(lista) {
  pontosMap = {};
  lista.forEach(p => {
    pontosMap[String(p.codigo).trim()] = p;
  });

  document.querySelectorAll(".card-ponto").forEach(card => {
    const codigo = String(card.dataset.codigo || "").trim();
    const nomeEl = card.querySelector(".card-nome");
    if (nomeEl) {
      nomeEl.textContent = pontosMap[codigo]?.nome || codigo;
    }
  });
}

function abrirPonto(codigo) {
  codigoSelecionado = String(codigo).trim();

  listaPontos.style.display = "none";
  pontoDetalhe.style.display = "block";

  codigoAtual.textContent = codigoSelecionado;
  tituloPasta.textContent = "Pasta do " + (pontosMap[codigoSelecionado]?.nome || codigoSelecionado);

  carregarPlaylist();
}

btnVoltar.onclick = () => {
  listaPontos.style.display = "grid";
  pontoDetalhe.style.display = "none";
};

async function uploadMidia() {
  const file = videoInput.files[0];
  const clienteSelect = document.getElementById("clienteSelect");

  if (!file) return setStatus("Selecione um arquivo", "erro");
  if (!codigoSelecionado) return setStatus("Nenhum ponto selecionado", "erro");
  if (!clienteSelect.value) return setStatus("Selecione um cliente", "erro");

  const clienteCodigo = clienteSelect.value;
  const clienteNome = clienteSelect.options[clienteSelect.selectedIndex].text;

  const dataInicio = normalizarDataInput(dataInicioInput.value) || new Date().toISOString();
  const dataFim = normalizarDataInput(dataFimInput.value);
  const path = `${codigoSelecionado}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabaseClient.storage.from(BUCKET).upload(path, file);
  if (uploadError) return setStatus("Erro no upload", "erro");

  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);

  await supabaseClient.from(TABELA).insert({
    codigo: codigoSelecionado,
    nome: clienteNome,
    cliente_codigo: clienteCodigo,
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
  clienteSelect.value = "";

  await carregarPlaylist();
}

btnUpload.onclick = uploadMidia;

async function carregarPlaylist() {
  const { data } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigoSelecionado)
    .order("ordem");

  const lista = data || [];

  const ativos = lista.filter(i => !itemEstaInativo(i));
  const inativos = lista.filter(i => itemEstaInativo(i));

  renderizarPlaylistAtiva(ativos);
  renderizarHistorico(inativos);
}

function renderizarPlaylistAtiva(lista) {
  if (!lista.length) {
    playlistAtiva.innerHTML = `<div class="playlist-vazia">Nenhum item ativo</div>`;
    return;
  }

  playlistAtiva.innerHTML = lista.map((item, i) => `
    <div class="playlist-item" draggable="true" data-index="${i}">
      <div class="playlist-item-handle">⋮⋮</div>

      <div class="playlist-item-conteudo">
        <div class="playlist-item-nome">${escapeHtml(item.nome)}</div>
        <div class="playlist-item-info">
          Código: ${item.cliente_codigo || "-"} • Postado: ${formatarData(item.created_at)} • Encerra: ${formatarData(item.data_fim)}
        </div>
      </div>
    </div>
  `).join("");

  ativarDrag(lista);
}

function renderizarHistorico(lista) {
  if (!lista.length) {
    playlistInativa.innerHTML = `<div class="playlist-vazia">Sem histórico</div>`;
    return;
  }

  playlistInativa.innerHTML = lista.map(item => `
    <div>
      ${escapeHtml(item.nome)} • ${formatarData(item.data_fim)}
    </div>
  `).join("");
}

function ativarDrag(lista) {
  const items = document.querySelectorAll(".playlist-item");

  items.forEach(item => {
    item.addEventListener("dragstart", () => {
      dragIndex = Number(item.dataset.index);
    });

    item.addEventListener("dragover", e => e.preventDefault());

    item.addEventListener("drop", async () => {
      const target = Number(item.dataset.index);

      const novo = [...lista];
      const movido = novo.splice(dragIndex, 1)[0];
      novo.splice(target, 0, movido);

      for (let i = 0; i < novo.length; i++) {
        await supabaseClient.from(TABELA).update({ ordem: i }).eq("id", novo[i].id);
      }

      carregarPlaylist();
    });
  });
}

document.addEventListener("click", function (e) {
  const btnAbrir = e.target.closest(".btn-abrir");
  if (btnAbrir) {
    abrirPonto(btnAbrir.dataset.codigo);
  }
});

async function iniciarPainel() {
  const pontos = await buscarPontos();
  renderizarCardsPontos(pontos);
}
