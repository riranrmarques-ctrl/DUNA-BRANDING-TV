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
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatarData(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function normalizarDataInput(valor) {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return data.toISOString();
}

function montarLinhaDatas(item) {
  const postado = formatarData(item.created_at);
  const encerrado = formatarData(item.data_fim);

  if (postado && encerrado) {
    return `Postado em: ${postado} • Encerrado em: ${encerrado}`;
  }

  if (postado) {
    return `Postado em: ${postado}`;
  }

  if (encerrado) {
    return `Encerrado em: ${encerrado}`;
  }

  return "Sem informações de data";
}

function itemEstaInativo(item) {
  if (!item.data_fim) return false;
  const agora = new Date();
  const dataFim = new Date(item.data_fim);
  if (Number.isNaN(dataFim.getTime())) return false;
  return dataFim < agora;
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
  lista.forEach(p => {
    pontosMap[p.codigo] = p;
  });

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

  const dataInicio = normalizarDataInput(dataInicioInput.value) || new Date().toISOString();
  const dataFim = normalizarDataInput(dataFimInput.value);

  if (dataFim && new Date(dataFim) < new Date(dataInicio)) {
    return setStatus("A data de encerramento não pode ser menor que a data de início", "erro");
  }

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
      storagePath = `url/${codigoLimpo}/${Date.now()}-${file.name}`;
    } else {
      tipo = ext === "mp4" ? "video" : "imagem";

      const path = `${codigoLimpo}/${Date.now()}-${file.name}`;
      storagePath = path;

      await supabaseClient.storage.from(BUCKET).upload(path, file);
      const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);
      urlFinal = data.publicUrl;
    }

    const { error } = await supabaseClient.from(TABELA).insert({
      codigo: codigoLimpo,
      nome: file.name,
      video_url: urlFinal,
      storage_path: storagePath,
      ordem: Date.now(),
      tipo: tipo,
      data_inicio: dataInicio,
      data_fim: dataFim
    });

    if (error) throw error;

    setStatus("Enviado com sucesso", "ok");
    videoInput.value = "";
    dataInicioInput.value = "";
    dataFimInput.value = "";
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

  const { data, error } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigoLimpo)
    .order("ordem", { ascending: true });

  if (error) {
    playlistAtiva.innerHTML = `<div class="playlist-vazia">Erro ao carregar playlist.</div>`;
    playlistInativa.innerHTML = `<div class="playlist-vazia">Erro ao carregar playlist.</div>`;
    console.error(error);
    return;
  }

  const lista = data || [];
  const ativos = lista.filter(item => !itemEstaInativo(item));
  const inativos = lista.filter(item => itemEstaInativo(item));

  renderizarPlaylistAtiva(ativos);
  renderizarPlaylistInativa(inativos);
}

function renderizarPlaylistAtiva(lista) {
  if (!lista.length) {
    playlistAtiva.innerHTML = `<div class="playlist-vazia">Nenhum item ativo.</div>`;
    return;
  }

  playlistAtiva.innerHTML = lista.map((item, index) => `
    <div class="playlist-item playlist-item-ativo" draggable="true" data-index="${index}" data-id="${item.id}">
      <div class="playlist-item-handle" title="Arrastar">⋮⋮</div>

      <div class="playlist-item-conteudo">
        <div class="playlist-item-nome">${escapeHtml(item.nome)}</div>
        <div class="playlist-item-info">${escapeHtml(montarLinhaDatas(item))}</div>
      </div>

      <div class="playlist-item-acoes-laterais">
        <button
          class="playlist-acao"
          type="button"
          title="Renomear"
          onclick="editarNomeItem(${item.id}, ${JSON.stringify(item.nome || "")})"
        >✎</button>

        <button
          class="playlist-acao playlist-acao-danger"
          type="button"
          title="Excluir"
          onclick="removerItem(${item.id}, ${JSON.stringify(item.storage_path || "")})"
        >🗑</button>
      </div>
    </div>
  `).join("");

  ativarDrag(lista);
}

function renderizarPlaylistInativa(lista) {
  if (!lista.length) {
    playlistInativa.innerHTML = `<div class="playlist-vazia">Nenhum item inativo.</div>`;
    return;
  }

  playlistInativa.innerHTML = lista.map(item => `
    <div class="playlist-item playlist-item-inativo" data-id="${item.id}">
      <div class="playlist-item-conteudo">
        <div class="playlist-item-nome">${escapeHtml(item.nome)}</div>
        <div class="playlist-item-info">${escapeHtml(montarLinhaDatas(item))}</div>
      </div>

      <div class="playlist-item-acoes-laterais">
        <button
          class="playlist-acao playlist-acao-return"
          type="button"
          title="Retornar para ativa"
          onclick="reativarItem(${item.id})"
        >↩</button>

        <button
          class="playlist-acao playlist-acao-danger"
          type="button"
          title="Excluir"
          onclick="removerItem(${item.id}, ${JSON.stringify(item.storage_path || "")})"
        >🗑</button>
      </div>
    </div>
  `).join("");
}

/* DRAG */
function ativarDrag(lista) {
  const items = playlistAtiva.querySelectorAll('.playlist-item[draggable="true"]');

  items.forEach(item => {
    item.addEventListener("dragstart", () => {
      dragIndex = Number(item.dataset.index);
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });

    item.addEventListener("dragover", e => {
      e.preventDefault();
    });

    item.addEventListener("drop", async () => {
      const targetIndex = Number(item.dataset.index);
      if (dragIndex === null || dragIndex === targetIndex) return;

      const novo = [...lista];
      const movido = novo.splice(dragIndex, 1)[0];
      novo.splice(targetIndex, 0, movido);

      for (let i = 0; i < novo.length; i++) {
        await supabaseClient
          .from(TABELA)
          .update({ ordem: i })
          .eq("id", novo[i].id);
      }

      dragIndex = null;
      carregarPlaylist();
    });
  });
}

/* REMOVER */
async function removerItem(id, path) {
  if (!confirm("Remover este item?")) return;

  if (path && !String(path).startsWith("url/")) {
    await supabaseClient.storage.from(BUCKET).remove([path]);
  }

  await supabaseClient.from(TABELA).delete().eq("id", id);
  carregarPlaylist();
}

/* RENOMEAR */
async function editarNomeItem(id, nomeAtualItem) {
  const novoNome = prompt("Novo nome do arquivo:", nomeAtualItem || "");
  if (!novoNome || !novoNome.trim()) return;

  await renomearItem(id, novoNome.trim());
}

async function renomearItem(id, nome) {
  await supabaseClient.from(TABELA).update({ nome }).eq("id", id);
  setStatus("Nome atualizado", "ok");
  carregarPlaylist();
}

/* RETORNAR PARA ATIVA */
async function reativarItem(id) {
  const agora = new Date().toISOString();

  await supabaseClient
    .from(TABELA)
    .update({
      data_inicio: agora,
      data_fim: null
    })
    .eq("id", id);

  setStatus("Item retornou para a playlist ativa", "ok");
  carregarPlaylist();
}

window.removerItem = removerItem;
window.renomearItem = renomearItem;
window.editarNomeItem = editarNomeItem;
window.reativarItem = reativarItem;

/* EVENTOS */
function configurarEventos() {
  document.querySelectorAll(".btn-abrir").forEach(btn =>
    btn.onclick = () => abrirPonto(btn.dataset.codigo)
  );

  document.querySelectorAll(".btn-editar-nome").forEach(btn =>
    btn.onclick = async () => {
      const novo = prompt("Novo nome:");
      if (novo) {
        await supabaseClient
          .from(TABELA_PONTOS)
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
