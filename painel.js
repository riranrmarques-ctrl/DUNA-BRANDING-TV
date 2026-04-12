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

function formatarDataHora(valor) {
  if (!valor) return "";
  return new Date(valor).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function normalizarDataInput(valor) {
  if (!valor) return null;
  return new Date(valor + "T00:00:00").toISOString();
}

function montarLinhaDatas(item) {
  const postado = formatarData(item.created_at);
  const encerrado = formatarData(item.data_fim);

  if (postado && encerrado) return `Postado: ${postado} • Encerra: ${encerrado}`;
  if (postado) return `Postado: ${postado}`;
  if (encerrado) return `Encerra: ${encerrado}`;
  return "";
}

function itemEstaInativo(item) {
  if (!item.data_fim) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fim = new Date(item.data_fim);
  fim.setHours(23, 59, 59, 999);

  return fim < hoje;
}

function preencherDataHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  const dataFormatada = `${ano}-${mes}-${dia}`;

  if (dataInicioInput && !dataInicioInput.value) {
    dataInicioInput.value = dataFormatada;
  }
}

function obterStatusDoPonto(itens) {
  if (!itens.length) {
    return {
      tipo: "nao_conectado",
      texto: "Não conectado ainda"
    };
  }

  const ativos = itens.filter(item => !itemEstaInativo(item));

  if (ativos.length) {
    const ativoMaisAntigo = ativos.reduce((anterior, atual) => {
      const dataAnterior = new Date(anterior.created_at || 0).getTime();
      const dataAtual = new Date(atual.created_at || 0).getTime();
      return dataAtual < dataAnterior ? atual : anterior;
    });

    return {
      tipo: "ativo",
      texto: `Ativo — desde ${formatarDataHora(ativoMaisAntigo.created_at)}`
    };
  }

  const itemMaisRecenteEncerrado = itens.reduce((anterior, atual) => {
    const dataAnterior = new Date(anterior.data_fim || anterior.created_at || 0).getTime();
    const dataAtual = new Date(atual.data_fim || atual.created_at || 0).getTime();
    return dataAtual > dataAnterior ? atual : anterior;
  });

  return {
    tipo: "inativo",
    texto: `Inativo — desde ${formatarDataHora(itemMaisRecenteEncerrado.data_fim || itemMaisRecenteEncerrado.created_at)}`
  };
}

async function buscarResumoStatusPontos() {
  const { data, error } = await supabaseClient
    .from(TABELA)
    .select("codigo, created_at, data_fim");

  if (error) {
    console.error(error);
    return {};
  }

  const agrupado = {};

  (data || []).forEach(item => {
    const codigo = String(item.codigo || "").trim();
    if (!codigo) return;
    if (!agrupado[codigo]) agrupado[codigo] = [];
    agrupado[codigo].push(item);
  });

  const resumo = {};

  document.querySelectorAll(".card-ponto").forEach(card => {
    const codigo = String(card.dataset.codigo || "").trim();
    resumo[codigo] = obterStatusDoPonto(agrupado[codigo] || []);
  });

  return resumo;
}

function garantirLinhaStatusNoCard(card) {
  let statusElCard = card.querySelector(".card-status-ponto");

  if (!statusElCard) {
    statusElCard = document.createElement("div");
    statusElCard.className = "card-status-ponto";
    statusElCard.style.marginTop = "10px";
    statusElCard.style.fontSize = "12px";
    statusElCard.style.lineHeight = "1.35";
    statusElCard.style.opacity = "0.86";
    statusElCard.style.fontWeight = "500";

    const areaAcoes = card.querySelector(".card-acoes");
    if (areaAcoes) {
      areaAcoes.appendChild(statusElCard);
    }
  }

  return statusElCard;
}

function aplicarStatusNosCards() {
  document.querySelectorAll(".card-ponto").forEach(card => {
    const codigo = String(card.dataset.codigo || "").trim();
    const info = statusPontosMap[codigo] || {
      tipo: "nao_conectado",
      texto: "Não conectado ainda"
    };

    const statusElCard = garantirLinhaStatusNoCard(card);
    statusElCard.textContent = info.texto;

    if (info.tipo === "ativo") {
      statusElCard.style.color = "rgba(167, 255, 194, 0.92)";
    } else if (info.tipo === "inativo") {
      statusElCard.style.color = "rgba(255, 214, 170, 0.9)";
    } else {
      statusElCard.style.color = "rgba(255, 255, 255, 0.62)";
    }
  });
}

async function atualizarStatusDosPontos() {
  statusPontosMap = await buscarResumoStatusPontos();
  aplicarStatusNosCards();
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
  const { data, error } = await supabaseClient.from(TABELA_PONTOS).select("*");

  if (error) {
    setStatus("Erro ao carregar pontos", "erro");
    return [];
  }

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

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(String(texto || ""));
    setStatus("Código copiado", "ok");
  } catch (error) {
    setStatus("Não foi possível copiar", "erro");
    console.error(error);
  }
}

async function editarNomePonto(codigo) {
  const codigoLimpo = String(codigo || "").trim();
  const nomeAtual = pontosMap[codigoLimpo]?.nome || codigoLimpo;
  const novoNome = prompt("Novo nome do ponto:", nomeAtual);

  if (novoNome === null) return;

  const nomeLimpo = novoNome.trim();
  if (!nomeLimpo) {
    setStatus("Nome inválido", "erro");
    return;
  }

  const { error } = await supabaseClient
    .from(TABELA_PONTOS)
    .update({ nome: nomeLimpo })
    .eq("codigo", codigoLimpo);

  if (error) {
    setStatus("Erro ao renomear ponto", "erro");
    console.error(error);
    return;
  }

  if (!pontosMap[codigoLimpo]) {
    pontosMap[codigoLimpo] = { codigo: codigoLimpo };
  }

  pontosMap[codigoLimpo].nome = nomeLimpo;

  document.querySelectorAll(`.card-ponto[data-codigo="${codigoLimpo}"] .card-nome`).forEach(el => {
    el.textContent = nomeLimpo;
  });

  if (codigoSelecionado === codigoLimpo) {
    tituloPasta.textContent = "Pasta do " + nomeLimpo;
  }

  setStatus("Ponto renomeado", "ok");
}

function abrirPonto(codigo) {
  codigoSelecionado = String(codigo).trim();

  listaPontos.style.display = "none";
  pontoDetalhe.style.display = "block";

  codigoAtual.textContent = codigoSelecionado;
  tituloPasta.textContent =
    "Pasta do " + (pontosMap[codigoSelecionado]?.nome || codigoSelecionado);

  preencherDataHoje();
  carregarPlaylist();
}

btnVoltar.onclick = async () => {
  listaPontos.style.display = "grid";
  pontoDetalhe.style.display = "none";
  await atualizarStatusDosPontos();
};

if (btnCopiarCodigo) {
  btnCopiarCodigo.onclick = () => {
    if (!codigoSelecionado) {
      setStatus("Nenhum código selecionado", "erro");
      return;
    }
    copiarTexto(codigoSelecionado);
  };
}

async function uploadMidia() {
  const file = videoInput.files[0];
  if (!file) return setStatus("Selecione um arquivo", "erro");
  if (!codigoSelecionado) return setStatus("Nenhum ponto selecionado", "erro");

  const codigo = codigoSelecionado;
  const dataInicio = normalizarDataInput(dataInicioInput.value) || new Date().toISOString();
  const dataFim = normalizarDataInput(dataFimInput.value);
  const path = `${codigo}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabaseClient.storage.from(BUCKET).upload(path, file);
  if (uploadError) {
    setStatus("Erro no upload", "erro");
    console.error(uploadError);
    return;
  }

  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);

  const { error: insertError } = await supabaseClient.from(TABELA).insert({
    codigo,
    nome: file.name,
    video_url: data.publicUrl,
    storage_path: path,
    ordem: Date.now(),
    tipo: "video",
    data_inicio: dataInicio,
    data_fim: dataFim
  });

  if (insertError) {
    setStatus("Erro ao salvar mídia", "erro");
    console.error(insertError);
    return;
  }

  setStatus("Enviado", "ok");

  videoInput.value = "";
  dataInicioInput.value = "";
  dataFimInput.value = "";

  await carregarPlaylist();
  await atualizarStatusDosPontos();
}

btnUpload.onclick = uploadMidia;

async function carregarPlaylist() {
  const { data, error } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigoSelecionado)
    .order("ordem");

  if (error) {
    setStatus("Erro ao carregar playlist", "erro");
    console.error(error);
    return;
  }

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
        <div class="playlist-item-info">${montarLinhaDatas(item)}</div>
      </div>

      <div class="playlist-item-acoes-laterais">
        <button onclick="editarNomeItem(${item.id}, ${JSON.stringify(item.nome)})">✎</button>
        <button onclick="removerItem(${item.id}, ${JSON.stringify(item.storage_path)})">🗑</button>
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
      ${escapeHtml(item.nome)} — ${formatarData(item.data_fim)}
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

async function removerItem(id, path) {
  if (!confirm("Remover?")) return;

  await supabaseClient.storage.from(BUCKET).remove([path]);
  await supabaseClient.from(TABELA).delete().eq("id", id);

  await carregarPlaylist();
  await atualizarStatusDosPontos();
}

async function editarNomeItem(id, nomeAtual) {
  const novo = prompt("Novo nome:", nomeAtual);
  if (!novo) return;

  await supabaseClient.from(TABELA).update({ nome: novo }).eq("id", id);
  await carregarPlaylist();
  await atualizarStatusDosPontos();
}

window.removerItem = removerItem;
window.editarNomeItem = editarNomeItem;

document.addEventListener("click", function (e) {
  const btnAbrir = e.target.closest(".btn-abrir");
  if (btnAbrir) {
    e.preventDefault();
    e.stopPropagation();
    abrirPonto(btnAbrir.dataset.codigo);
    return;
  }

  const btnCopiar = e.target.closest(".btn-copiar");
  if (btnCopiar) {
    e.preventDefault();
    e.stopPropagation();
    copiarTexto(btnCopiar.dataset.codigo);
    return;
  }

  const btnEditarNome = e.target.closest(".btn-editar-nome");
  if (btnEditarNome) {
    e.preventDefault();
    e.stopPropagation();
    editarNomePonto(btnEditarNome.dataset.codigo);
  }
});

async function iniciarPainel() {
  const pontos = await buscarPontos();
  renderizarCardsPontos(pontos);
  await atualizarStatusDosPontos();
}
