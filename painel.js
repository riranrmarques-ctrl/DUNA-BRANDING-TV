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

const btnVoltar = document.getElementById("btnVoltar");

const playlistAtiva = document.getElementById("playlistAtiva");
const playlistInativa = document.getElementById("playlistInativa");

const btnCopiarCodigo = document.getElementById("btnCopiarCodigo");

const arquivoInput = document.getElementById("arquivoInput");
const btnUploadCliente = document.getElementById("btnUploadCliente");
const statusUpload = document.getElementById("statusUpload");

let codigoSelecionado = null;
let pontosMap = {};
let dragIndex = null;

function setStatus(texto, tipo = "normal") {
  if (!statusEl) return;
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

function obterCodigoDoElemento(el) {
  if (!el) return "";

  if (el.dataset && el.dataset.codigo) {
    return String(el.dataset.codigo).trim();
  }

  const card = el.closest(".card-ponto");
  if (card && card.dataset && card.dataset.codigo) {
    return String(card.dataset.codigo).trim();
  }

  return "";
}

function validarLogin() {
  if (!senhaInput || senhaInput.value.trim() !== SENHA_PAINEL) {
    if (loginErro) loginErro.textContent = "Código inválido";
    return;
  }

  if (loginBox) loginBox.style.display = "none";
  if (conteudoPainel) conteudoPainel.style.display = "block";
  setStatus("Painel Ativo", "ok");
  iniciarPainel();
}

if (btnLogin) {
  btnLogin.onclick = validarLogin;
}

if (senhaInput) {
  senhaInput.addEventListener("keydown", e => {
    if (e.key === "Enter") validarLogin();
  });
}

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
    pontosMap[p.codigo] = p;
  });

  document.querySelectorAll(".card-ponto").forEach(card => {
    const codigo = String(card.dataset.codigo || "").trim();
    const nomeEl = card.querySelector(".card-nome");

    if (nomeEl) {
      nomeEl.textContent = pontosMap[codigo]?.nome || codigo;
    }
  });
}

async function editarNomePonto(codigo) {
  const codigoFinal = String(codigo || "").trim();

  if (!codigoFinal) {
    setStatus("Código do ponto não encontrado", "erro");
    return;
  }

  const nomeAtual = pontosMap[codigoFinal]?.nome || "";
  const novoNome = prompt("Editar nome do ponto:", nomeAtual);

  if (novoNome === null) return;

  const nomeFinal = novoNome.trim();

  if (!nomeFinal) {
    setStatus("Nome inválido", "erro");
    return;
  }

  if (nomeFinal === nomeAtual) return;

  const { error } = await supabaseClient
    .from(TABELA_PONTOS)
    .update({ nome: nomeFinal })
    .eq("codigo", codigoFinal);

  if (error) {
    setStatus("Erro ao atualizar nome", "erro");
    return;
  }

  if (pontosMap[codigoFinal]) {
    pontosMap[codigoFinal].nome = nomeFinal;
  }

  document.querySelectorAll(`.card-ponto[data-codigo="${codigoFinal}"]`).forEach(card => {
    const nomeEl = card.querySelector(".card-nome");
    if (nomeEl) nomeEl.textContent = nomeFinal;
  });

  if (codigoSelecionado === codigoFinal && tituloPasta) {
    tituloPasta.textContent = "Pasta do " + nomeFinal;
  }

  setStatus("Nome atualizado", "ok");
}

function abrirPonto(codigo) {
  const codigoFinal = String(codigo || "").trim();

  if (!codigoFinal) {
    setStatus("Código do ponto não encontrado", "erro");
    return;
  }

  codigoSelecionado = codigoFinal;

  if (listaPontos) listaPontos.style.display = "none";
  if (pontoDetalhe) pontoDetalhe.style.display = "block";

  if (codigoAtual) codigoAtual.textContent = codigoSelecionado;

  if (tituloPasta) {
    tituloPasta.textContent =
      "Pasta do " + (pontosMap[codigoSelecionado]?.nome || codigoSelecionado);
  }

  carregarPlaylist();
}

if (btnVoltar) {
  btnVoltar.onclick = () => {
    if (listaPontos) listaPontos.style.display = "grid";
    if (pontoDetalhe) pontoDetalhe.style.display = "none";
  };
}

if (btnCopiarCodigo) {
  btnCopiarCodigo.onclick = async () => {
    const texto = String(codigoSelecionado || codigoAtual?.textContent || "").trim();

    if (!texto) {
      setStatus("Nenhum código disponível para copiar", "erro");
      return;
    }

    try {
      await navigator.clipboard.writeText(texto);
      setStatus("Código copiado", "ok");
    } catch (error) {
      setStatus("Erro ao copiar código", "erro");
    }
  };
}

async function carregarPlaylist() {
  if (!codigoSelecionado) {
    setStatus("Nenhum ponto selecionado", "erro");
    return;
  }

  const { data, error } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigoSelecionado)
    .order("ordem");

  if (error) {
    setStatus("Erro ao carregar playlist", "erro");
    return;
  }

  const lista = data || [];
  const ativos = lista.filter(i => !itemEstaInativo(i));
  const inativos = lista.filter(i => itemEstaInativo(i));

  renderizarPlaylistAtiva(ativos);
  renderizarHistorico(inativos);
}

function renderizarPlaylistAtiva(lista) {
  if (!playlistAtiva) return;

  if (!lista.length) {
    playlistAtiva.innerHTML = `<div class="playlist-vazia">Nenhum item ativo</div>`;
    return;
  }

  playlistAtiva.innerHTML = lista
    .map(
      (item, i) => `
    <div class="playlist-item" draggable="true" data-index="${i}">
      <div class="playlist-item-handle">⋮⋮</div>
      <div class="playlist-item-conteudo">
        <div class="playlist-item-nome">${escapeHtml(item.nome)}</div>
        <div class="playlist-item-info">${montarLinhaDatas(item)}</div>
      </div>
    </div>
  `
    )
    .join("");

  ativarDrag(lista);
}

function renderizarHistorico(lista) {
  if (!playlistInativa) return;

  if (!lista.length) {
    playlistInativa.innerHTML = `<div class="playlist-vazia">Sem histórico</div>`;
    return;
  }

  playlistInativa.innerHTML = lista
    .map(
      item => `
    <div>
      ${escapeHtml(item.nome)} — ${formatarData(item.data_fim)}
    </div>
  `
    )
    .join("");
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
        await supabaseClient
          .from(TABELA)
          .update({ ordem: i })
          .eq("id", novo[i].id);
      }

      carregarPlaylist();
    });
  });
}

function conectarEventosDosCards() {
  document.querySelectorAll(".btn-abrir").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const codigo = obterCodigoDoElemento(btn);
      abrirPonto(codigo);
    };
  });

  document.querySelectorAll(".btn-editar").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const codigo = obterCodigoDoElemento(btn);
      editarNomePonto(codigo);
    };
  });

  document.querySelectorAll(".card-ponto").forEach(card => {
    card.onclick = e => {
      if (e.target.closest(".btn-editar") || e.target.closest(".btn-abrir")) return;
      const codigo = obterCodigoDoElemento(card);
      abrirPonto(codigo);
    };
  });
}

async function iniciarPainel() {
  const pontos = await buscarPontos();
  renderizarCardsPontos(pontos);
  conectarEventosDosCards();
}

if (btnUploadCliente) {
  btnUploadCliente.onclick = async () => {
    const file = arquivoInput?.files?.[0];

    if (!file) {
      if (statusUpload) statusUpload.textContent = "Selecione um arquivo";
      return;
    }

    if (!codigoSelecionado) {
      if (statusUpload) statusUpload.textContent = "Selecione um ponto primeiro";
      return;
    }

    if (statusUpload) statusUpload.textContent = "Enviando...";

    try {
      if (file.name.endsWith(".txt")) {
        const texto = await file.text();
        const url = texto.trim();

        await supabaseClient.from("playlists").insert({
          codigo: codigoSelecionado,
          nome: typeof inputNome !== "undefined" ? inputNome.value : file.name,
          video_url: url,
          tipo: "url",
          data_inicio: new Date().toISOString(),
          data_fim: typeof inputVencimento !== "undefined" ? inputVencimento.value : null
        });
      } else {
        const path = `clientes/${codigoSelecionado}/${Date.now()}-${file.name}`;

        await supabaseClient.storage.from("videos").upload(path, file);

        const { data } = supabaseClient.storage.from("videos").getPublicUrl(path);

        await supabaseClient.from("playlists").insert({
          codigo: codigoSelecionado,
          nome: typeof inputNome !== "undefined" ? inputNome.value : file.name,
          video_url: data.publicUrl,
          tipo: "arquivo",
          data_inicio: new Date().toISOString(),
          data_fim: typeof inputVencimento !== "undefined" ? inputVencimento.value : null
        });
      }

      if (statusUpload) statusUpload.textContent = "Enviado com sucesso";
      carregarPlaylist();
    } catch (err) {
      if (statusUpload) statusUpload.textContent = "Erro ao enviar";
    }
  };
}
