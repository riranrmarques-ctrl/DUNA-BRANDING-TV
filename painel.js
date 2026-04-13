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
const btnCopiarCodigo = document.getElementById("btnCopiarCodigo");
const btnEditarInfo = document.getElementById("btnEditarInfo");

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

function obterImagemPonto(ponto) {
  return ponto.imagem_url || "https://placehold.co/600x320/png";
}

function obterCidadeFormatada(cidade) {
  const nome = String(cidade || "").trim();
  return nome ? `Cidade de ${nome}` : "Cidade não definida";
}

function calcularStatusInfo(ponto) {
  if (!ponto?.ultimo_ping) {
    return {
      texto: "Inativo",
      detalhe: "sem histórico",
      ativo: false
    };
  }

  const dataPing = new Date(ponto.ultimo_ping);
  const valido = !Number.isNaN(dataPing.getTime());

  if (!valido) {
    return {
      texto: "Inativo",
      detalhe: "sem histórico",
      ativo: false
    };
  }

  const diff = Date.now() - dataPing.getTime();
  const horario = dataPing.toLocaleString("pt-BR");

  if (diff < 5 * 60 * 1000) {
    return {
      texto: "Ativo",
      detalhe: horario,
      ativo: true
    };
  }

  return {
    texto: "Inativo",
    detalhe: horario,
    ativo: false
  };
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

async function buscarPontos() {
  const { data } = await supabaseClient.from(TABELA_PONTOS).select("*");
  return data || [];
}

function renderizarCardsPontos(lista) {
  pontosMap = {};
  lista.forEach(p => (pontosMap[p.codigo] = p));

  document.querySelectorAll(".card-ponto").forEach(card => {
    const codigo = card.dataset.codigo;
    const ponto = pontosMap[codigo] || {};

    const nomeEl = card.querySelector(".card-nome");
    const cidadeEl = card.querySelector(".card-cidade");
    const statusElCard = card.querySelector(".card-status");
    const bolinhaEl = card.querySelector(".status-bolinha");
    const imagemEl = card.querySelector(".card-imagem");

    const statusInfo = calcularStatusInfo(ponto);

    if (nomeEl) {
      nomeEl.textContent = ponto.nome || codigo;
    }

    if (cidadeEl) {
      cidadeEl.textContent = obterCidadeFormatada(ponto.cidade);
    }

    if (statusElCard) {
      statusElCard.textContent = `${statusInfo.texto}  ${statusInfo.detalhe}`;
    }

    if (bolinhaEl) {
      bolinhaEl.classList.toggle("ativo", statusInfo.ativo);
      bolinhaEl.classList.toggle("inativo", !statusInfo.ativo);
    }

    if (imagemEl) {
      imagemEl.src = obterImagemPonto(ponto);
      imagemEl.alt = ponto.nome || codigo;
    }
  });
}

function abrirPonto(codigo) {
  codigoSelecionado = String(codigo).trim();
  const ponto = pontosMap[codigoSelecionado] || {};

  if (listaPontos) listaPontos.style.display = "none";
  if (pontoDetalhe) pontoDetalhe.style.display = "block";

  if (codigoAtual) {
    codigoAtual.textContent = codigoSelecionado;
  }

  if (tituloPasta) {
    tituloPasta.textContent = ponto.nome || codigoSelecionado;
  }

  const cidadePonto = document.getElementById("cidadePonto");
  const enderecoPonto = document.getElementById("enderecoPonto");
  const statusPonto = document.getElementById("statusPonto");

  const statusInfo = calcularStatusInfo(ponto);

  if (cidadePonto) {
    cidadePonto.textContent = obterCidadeFormatada(ponto.cidade);
  }

  if (enderecoPonto) {
    enderecoPonto.textContent = ponto.endereco || "Endereço não definido";
  }

  if (statusPonto) {
    statusPonto.textContent = `${statusInfo.texto} • ${statusInfo.detalhe}`;
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
    if (!codigoSelecionado) return;
    await navigator.clipboard.writeText(codigoSelecionado);
    setStatus("Código copiado", "ok");
  };
}

if (btnEditarInfo) {
  btnEditarInfo.onclick = async () => {
    const ponto = pontosMap[codigoSelecionado] || {};

    const nome = prompt("Nome:", ponto.nome || "");
    if (nome === null) return;

    const cidade = prompt("Cidade:", ponto.cidade || "");
    if (cidade === null) return;

    const endereco = prompt("Endereço:", ponto.endereco || "");
    if (endereco === null) return;

    const { error } = await supabaseClient
      .from(TABELA_PONTOS)
      .update({ nome, cidade, endereco })
      .eq("codigo", codigoSelecionado);

    if (error) {
      setStatus("Erro ao atualizar informações", "erro");
      return;
    }

    ponto.nome = nome;
    ponto.cidade = cidade;
    ponto.endereco = endereco;

    abrirPonto(codigoSelecionado);
    renderizarCardsPontos(Object.values(pontosMap));
    setStatus("Atualizado com sucesso", "ok");
  };
}

async function carregarPlaylist() {
  const { data } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigoSelecionado)
    .order("ordem");

  const lista = data || [];
  const ativos = lista.filter(item => !item.data_fim || new Date(item.data_fim).setHours(23, 59, 59, 999) >= Date.now());
  const inativos = lista.filter(item => item.data_fim && new Date(item.data_fim).setHours(23, 59, 59, 999) < Date.now());

  const playlistAtiva = document.getElementById("playlistAtiva");
  const playlistInativa = document.getElementById("playlistInativa");

  if (playlistAtiva) {
    playlistAtiva.innerHTML = ativos.length
      ? ativos.map(item => `
          <div class="playlist-item" draggable="true" data-index="${ativos.indexOf(item)}">
            <div class="playlist-item-conteudo">${escapeHtml(item.nome)}</div>
          </div>
        `).join("")
      : `<div class="playlist-vazia">Nenhum item ativo</div>`;
  }

  if (playlistInativa) {
    playlistInativa.innerHTML = inativos.length
      ? inativos.map(item => `
          <div class="playlist-item-historico">${escapeHtml(item.nome)}</div>
        `).join("")
      : `<div class="playlist-vazia">Sem histórico</div>`;
  }

  ativarDrag(ativos);
}

function ativarDrag(lista) {
  const items = document.querySelectorAll("#playlistAtiva .playlist-item");

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

async function iniciarPainel() {
  const pontos = await buscarPontos();
  renderizarCardsPontos(pontos);

  document.querySelectorAll(".btn-abrir").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      abrirPonto(btn.dataset.codigo);
    };
  });

  document.querySelectorAll(".btn-copiar").forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      const codigo = btn.dataset.codigo;
      if (!codigo) return;

      await navigator.clipboard.writeText(codigo);
      setStatus("Código copiado", "ok");
    };
  });
}
