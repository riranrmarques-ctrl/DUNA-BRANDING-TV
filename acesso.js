const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";

const TABELA_CLIENTES = "dadosclientes";
const TABELA_CLIENTE_PONTOS = "playercliente";
const TABELA_PONTOS = "pontos";
const TABELA_PLAYLIST = "playlists";
const TABELA_HISTORICO = "statuspontos";
const TABELA_CONTRATOS_CLIENTES = "contratos_clientes";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginScreen = document.getElementById("loginScreen");
const areaCliente = document.getElementById("areaCliente");
const codigoLogin = document.getElementById("codigoLogin");
const btnEntrarCliente = document.getElementById("btnEntrarCliente");
const loginErro = document.getElementById("loginErro");
const loadingOverlay = document.getElementById("loadingOverlay");

const btnAtualizar = document.getElementById("btnAtualizar");
const btnSair = document.getElementById("btnSair");
const tituloBoasVindas = document.getElementById("tituloBoasVindas");
const subtituloCliente = document.getElementById("subtituloCliente");
const contratoBadge = document.getElementById("contratoBadge");
const contratoInfo = document.getElementById("contratoInfo");
const codigoClienteEl = document.getElementById("codigoCliente");
const contratoCard = document.querySelector(".contrato-card");
const btnAssinarContrato = document.getElementById("btnAssinarContrato");
const historicoContratoCliente = document.getElementById("historicoContratoCliente");
const mensagemCliente = document.getElementById("mensagemCliente");
const contadorPontos = document.getElementById("contadorPontos");
const listaPontosCliente = document.getElementById("listaPontosCliente");

const estadoVazio = document.getElementById("estadoVazio");
const detalhePonto = document.getElementById("detalhePonto");
const nomePontoDetalhe = document.getElementById("nomePontoDetalhe");
const localPontoDetalhe = document.getElementById("localPontoDetalhe");
const statusPontoDetalhe = document.getElementById("statusPontoDetalhe");
const statusDesdeDetalhe = document.getElementById("statusDesdeDetalhe");
const previewNome = document.getElementById("previewNome");
const previewMidia = document.getElementById("previewMidia");
const listaMateriais = document.getElementById("listaMateriais");
const historicoStatusPonto = document.getElementById("historicoStatusPonto");
const nomeClienteTopo = document.getElementById("nomeClienteTopo");

let codigoClienteAtual = "";
let clienteAtual = null;
let contratoAtualCliente = null;
let pontosContratados = [];
let historicosPorPonto = {};
let pontoSelecionado = "";

let timerMensagem = null;
let timerLimparMensagem = null;
let timerPreviewPlaylist = null;
let canalClienteRealtime = null;
let canalContratoRealtime = null;

function setMensagem(texto, tipo = "normal") {
  if (!mensagemCliente) return;

  if (timerMensagem) {
    clearTimeout(timerMensagem);
    timerMensagem = null;
  }

  if (timerLimparMensagem) {
    clearTimeout(timerLimparMensagem);
    timerLimparMensagem = null;
  }

  mensagemCliente.textContent = texto || "";
  mensagemCliente.classList.remove("ok", "erro", "saindo");

  if (tipo === "ok") mensagemCliente.classList.add("ok");
  if (tipo === "erro") mensagemCliente.classList.add("erro");

  if (!texto) return;

  timerMensagem = setTimeout(() => {
    mensagemCliente.classList.add("saindo");

    timerLimparMensagem = setTimeout(() => {
      mensagemCliente.textContent = "";
      mensagemCliente.classList.remove("saindo", "ok", "erro");
    }, 350);
  }, 4500);
}

function setLoginErro(texto) {
  if (loginErro) loginErro.textContent = texto || "";
}

function mostrarLoading() {
  document.body.classList.add("loading-page");

  if (btnEntrarCliente) {
    btnEntrarCliente.classList.add("carregando");
    btnEntrarCliente.disabled = true;
    btnEntrarCliente.textContent = "Entrando...";
  }

  if (loadingOverlay) {
    loadingOverlay.style.display = "flex";

    requestAnimationFrame(() => {
      loadingOverlay.classList.add("ativo");
    });
  }
}

function esconderLoading() {
  document.body.classList.remove("loading-page");

  if (btnEntrarCliente) {
    btnEntrarCliente.classList.remove("carregando");
    btnEntrarCliente.disabled = false;
    btnEntrarCliente.textContent = "Entrar";
  }

  if (loadingOverlay) {
    loadingOverlay.classList.remove("ativo");

    setTimeout(() => {
      if (!loadingOverlay.classList.contains("ativo")) {
        loadingOverlay.style.display = "none";
      }
    }, 280);
  }
}

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function formatarData(valor) {
  if (!valor) return "Sem data";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Sem data";

  return data.toLocaleDateString("pt-BR");
}

function formatarDataHora(valor) {
  if (!valor) return "Sem registro";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Sem registro";

  return data.toLocaleString("pt-BR");
}

function obterCodigoUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizarCodigo(params.get("codigo"));
}

function obterNomeCliente(cliente) {
  return (
    cliente?.nome_completo ||
    cliente?.nome ||
    cliente?.cliente ||
    cliente?.razao_social ||
    cliente?.responsavel ||
    "Cliente"
  );
}

function obterTelefoneCliente(cliente) {
  return cliente?.telefone || cliente?.celular || cliente?.whatsapp || "";
}

function clienteEhSupervisor(cliente) {
  return String(cliente?.tipo_acesso || "").trim().toLowerCase() === "supervisor";
}

function normalizarContratoClienteLegado(cliente) {
  const htmlOriginal = cliente?.contrato_texto || cliente?.contrato_html || "";
  const htmlAssinado = cliente?.contrato_assinado_html || "";
  const htmlFinal = htmlAssinado || htmlOriginal;

  if (!htmlFinal) return null;

  const assinadoEm = cliente?.contrato_assinado_em || null;
  const status = cliente?.contrato_status || (assinadoEm || htmlAssinado ? "concluido" : "pendente");

  return {
    id: cliente?.contrato_id || cliente?.id || "",
    codigo_cliente: normalizarCodigo(cliente?.codigo || codigoClienteAtual),
    titulo: cliente?.contrato_titulo || "Contrato",
    status,
    html_final: htmlFinal,
    assinado_em: assinadoEm,
    enviado_em: cliente?.contrato_enviado_em || cliente?.updated_at || cliente?.created_at || null,
    created_at: cliente?.created_at || null,
    origem: TABELA_CLIENTES
  };
}

function contratoEstaDisponivel() {
  if (!clienteAtual) return false;
  if (clienteEhSupervisor(clienteAtual)) return false;
  if (!contratoAtualCliente) return false;
  if (!contratoAtualCliente.html_final) return false;

  const status = String(contratoAtualCliente.status || "").trim().toLowerCase();
  return status !== "cancelado" && status !== "apagado";
}

function contratoEstaConcluido() {
  if (!contratoEstaDisponivel()) return false;

  const status = String(contratoAtualCliente.status || "").trim().toLowerCase();
  return Boolean(
    contratoAtualCliente.assinado_em ||
    status === "assinado" ||
    status === "concluido" ||
    status === "concluído"
  );
}

function obterImagemPonto(ponto) {
  return ponto?.imagem_url || ponto?.imagem || ponto?.foto_url || "https://placehold.co/600x320/png";
}

function obterNomePonto(ponto) {
  return ponto?.nome || ponto?.nome_painel || ponto?.titulo || ponto?.codigo || "Ponto";
}

function obterCidadePonto(ponto) {
  return ponto?.cidade || ponto?.cidade_regiao || ponto?.municipio || ponto?.localidade || "";
}

function obterEnderecoPonto(ponto) {
  return ponto?.endereco || ponto?.endereco_completo || ponto?.endereço || ponto?.local || "";
}

function obterLocalizacaoPonto(ponto) {
  const cidade = String(obterCidadePonto(ponto) || "").trim();
  const endereco = String(obterEnderecoPonto(ponto) || "").trim();

  if (cidade && endereco) return `${cidade} | ${endereco}`;
  if (cidade) return cidade;
  if (endereco) return endereco;
  return "Localização não definida";
}

function obterUltimoPingPonto(ponto) {
  return ponto?.ultimo_ping || ponto?.last_ping || ponto?.updated_at || ponto?.data_ping || ponto?.created_at || null;
}

function pontoEstaDisponivel(ponto) {
  const status = String(ponto?.status || ponto?.situacao || "").toLowerCase().trim();

  if (ponto?.disponivel === false) return false;
  if (status === "inativo") return false;

  return true;
}

function obterEventoHistorico(item) {
  return String(item?.evento || item?.status || "").toLowerCase().trim();
}

function obterDataHistorico(item) {
  return item?.ultimo_ping || item?.data_hora || item?.created_at || null;
}

function eventoEhAtivo(evento) {
  const valor = String(evento || "").toLowerCase();
  return valor === "ativo" || valor === "conectou" || valor === "online";
}

function eventoEhInativo(evento) {
  const valor = String(evento || "").toLowerCase();
  return valor === "inativo" || valor === "desconectou" || valor === "offline";
}

function calcularStatusPonto(ponto, historico = []) {
  if (!pontoEstaDisponivel(ponto)) {
    return {
      texto: "Indisponível",
      detalhe: "Ponto indisponível",
      classe: "indisponivel"
    };
  }

  const ultimoEvento = historico[0] || null;
  const evento = obterEventoHistorico(ultimoEvento);
  const ultimoPing = obterUltimoPingPonto(ponto);
  const dataReferencia = obterDataHistorico(ultimoEvento) || ultimoPing;

  if (!dataReferencia) {
    return {
      texto: "Inativo",
      detalhe: "Inativo desde sem histórico",
      classe: "inativo"
    };
  }

  const data = new Date(dataReferencia);

  if (Number.isNaN(data.getTime())) {
    return {
      texto: "Inativo",
      detalhe: "Inativo desde sem histórico",
      classe: "inativo"
    };
  }

  const diff = Date.now() - data.getTime();
  const registroRecente = diff < 60 * 1000;

  if (eventoEhAtivo(evento) && registroRecente) {
    return {
      texto: "Ativo",
      detalhe: `Ativo desde ${formatarDataHora(dataReferencia)}`,
      classe: "ativo"
    };
  }

  if (eventoEhInativo(evento)) {
    return {
      texto: "Inativo",
      detalhe: `Inativo desde ${formatarDataHora(dataReferencia)}`,
      classe: "inativo"
    };
  }

  if (eventoEhAtivo(evento) && !registroRecente) {
    return {
      texto: "Inativo",
      detalhe: "Inativo sem sinal recente do reprodutor",
      classe: "inativo"
    };
  }

  if (diff < 60 * 1000) {
    return {
      texto: "Ativo",
      detalhe: `Ativo desde ${formatarDataHora(dataReferencia)}`,
      classe: "ativo"
    };
  }

  return {
    texto: "Inativo",
    detalhe: `Inativo desde ${formatarDataHora(dataReferencia)}`,
    classe: "inativo"
  };
}

function itemEstaInativo(item) {
  if (!item?.data_fim) return false;

  const fim = new Date(item.data_fim);
  if (Number.isNaN(fim.getTime())) return false;

  fim.setHours(23, 59, 59, 999);
  return fim < new Date();
}

function detectarTipo(url, tipoOriginal = "") {
  const tipo = String(tipoOriginal || "").toLowerCase();
  const limpa = String(url || "").toLowerCase().split("?")[0];

  if (tipo === "imagem" || tipo === "image") return "imagem";
  if (tipo === "video") return "video";
  if (tipo === "site" || tipo === "url" || tipo === "texto" || tipo === "text") return "site";

  if (
    limpa.endsWith(".jpg") ||
    limpa.endsWith(".jpeg") ||
    limpa.endsWith(".png") ||
    limpa.endsWith(".webp")
  ) {
    return "imagem";
  }

  if (limpa.endsWith(".txt")) return "site";

  if (limpa.match(/\.(mp4|mov|webm)$/)) {
    return "video";
  }

  if (limpa.includes("youtube.com") || limpa.includes("youtu.be") || limpa.includes("http")) {
    return "site";
  }

  return "video";
}

function normalizarUrl(url) {
  const texto = String(url || "").trim();
  if (!texto) return "";
  if (/^https?:\/\//i.test(texto)) return texto;
  return `https://${texto.replace(/^\/+/, "")}`;
}

function obterUrlPlaylist(item) {
  return item?.video_url || item?.arquivo_url || item?.url || "";
}

function obterNomeArquivo(item) {
  const tituloRenomeado = String(item?.titulo_arquivo || "").trim();
  if (tituloRenomeado) return tituloRenomeado;

  const nomeArquivo = String(item?.nome_arquivo || "").trim();
  if (nomeArquivo) return nomeArquivo;

  const nomeDado = String(item?.nome || "").trim();
  if (nomeDado) return nomeDado;

  return "Sem nome";
}

function filtrarMateriaisDoCliente(lista = []) {
  return (lista || [])
    .map((item, index) => ({
      ...item,
      posicao_playlist: index + 1
    }))
    .filter((item) => normalizarCodigo(item.codigo_cliente) === codigoClienteAtual);
}

function limitarHistorico72Horas(historico = []) {
  const limite = Date.now() - (72 * 60 * 60 * 1000);

  return (historico || []).filter((item) => {
    const dataHistorico = new Date(obterDataHistorico(item));
    if (Number.isNaN(dataHistorico.getTime())) return false;
    return dataHistorico.getTime() >= limite;
  });
}

function limparTimerPreview() {
  if (timerPreviewPlaylist) {
    clearTimeout(timerPreviewPlaylist);
    timerPreviewPlaylist = null;
  }
}

function obterListaPreviewAtiva(lista = []) {
  const ativos = (lista || []).filter((item) => !itemEstaInativo(item));
  return ativos.length ? ativos : lista || [];
}

function limparTelaDetalhe() {
  pontoSelecionado = "";
  limparTimerPreview();

  if (estadoVazio) estadoVazio.style.display = "flex";
  if (detalhePonto) detalhePonto.style.display = "none";
}

function pararAtualizacaoEmTempoReal() {
  if (canalClienteRealtime) {
    supabaseClient.removeChannel(canalClienteRealtime);
    canalClienteRealtime = null;
  }

  if (canalContratoRealtime) {
    supabaseClient.removeChannel(canalContratoRealtime);
    canalContratoRealtime = null;
  }
}

function iniciarAtualizacaoEmTempoReal() {
  if (!codigoClienteAtual) return;

  pararAtualizacaoEmTempoReal();

  canalClienteRealtime = supabaseClient
    .channel(`cliente-dados-${codigoClienteAtual}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: TABELA_CLIENTES,
        filter: `codigo=eq.${codigoClienteAtual}`
      },
      async (payload) => {
        if (!payload.new) return;

        clienteAtual = payload.new;
        contratoAtualCliente = await buscarContratoCliente(codigoClienteAtual);
        renderizarContrato();
        setMensagem("Área do cliente atualizada.", "ok");
      }
    )
    .subscribe();

  canalContratoRealtime = supabaseClient
    .channel(`cliente-contrato-${codigoClienteAtual}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABELA_CONTRATOS_CLIENTES,
        filter: `codigo_cliente=eq.${codigoClienteAtual}`
      },
      async () => {
        contratoAtualCliente = await buscarContratoCliente(codigoClienteAtual);
        renderizarContrato();
        renderizarHistoricoContratoCliente();
        setMensagem("Contrato atualizado.", "ok");
      }
    )
    .subscribe();
}

function abrirAreaCliente() {
  if (loginScreen) loginScreen.style.display = "none";
  if (areaCliente) areaCliente.style.display = "block";
}

function abrirLogin() {
  codigoClienteAtual = "";
  clienteAtual = null;
  contratoAtualCliente = null;
  pontosContratados = [];
  historicosPorPonto = {};
  pontoSelecionado = "";

  limparTimerPreview();
  pararAtualizacaoEmTempoReal();

  if (areaCliente) areaCliente.style.display = "none";
  if (loginScreen) loginScreen.style.display = "flex";
  if (contratoCard) contratoCard.style.display = "";

  if (codigoLogin) {
    codigoLogin.value = "";
    setTimeout(() => codigoLogin.focus(), 100);
  }

  setLoginErro("");
  setMensagem("");
  esconderLoading();
  limparTelaDetalhe();
}

function baixarContratoCliente() {
  if (!contratoAtualCliente?.html_final) {
    setMensagem("Contrato indisponível para download.", "erro");
    return;
  }

  const concluido = contratoEstaConcluido();
  const nomeArquivo = `contrato-${codigoClienteAtual}${concluido ? "-assinado" : ""}.html`;

  const blob = new Blob([contratoAtualCliente.html_final], {
    type: "text/html;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderizarHistoricoContratoCliente() {
  if (!historicoContratoCliente) return;

  if (!contratoAtualCliente) {
    historicoContratoCliente.innerHTML = "";
    return;
  }

  const assinado = contratoEstaConcluido();

  if (!assinado) {
    historicoContratoCliente.innerHTML = "";
    return;
  }

  const dataAssinatura = contratoAtualCliente.assinado_em || contratoAtualCliente.updated_at || contratoAtualCliente.enviado_em || contratoAtualCliente.created_at;

  historicoContratoCliente.innerHTML = `
    <div class="historico-contratos-concluidos">
      <h3>Histórico de contratos concluídos</h3>

      <div class="historico-contrato-concluido">
        <div>
          <strong>${escapeHtml(contratoAtualCliente.titulo || "Contrato")}</strong>
          <span>Concluído em ${escapeHtml(formatarDataHora(dataAssinatura))}</span>
        </div>

        <button id="btnBaixarHistoricoContrato" class="btn-historico-contrato" type="button">
          Baixar
        </button>
      </div>
    </div>
  `;

  const btnBaixarHistoricoContrato = document.getElementById("btnBaixarHistoricoContrato");
  if (btnBaixarHistoricoContrato) {
    btnBaixarHistoricoContrato.onclick = baixarContratoCliente;
  }
}

function renderizarContrato() {
  if (!clienteAtual) return;

  const nome = obterNomeCliente(clienteAtual);
  const supervisor = clienteEhSupervisor(clienteAtual);
  const disponivel = contratoEstaDisponivel();
  const concluido = contratoEstaConcluido();

  if (nomeClienteTopo) {
    nomeClienteTopo.textContent = nome;
  }

  if (contratoCard) {
    contratoCard.style.display = supervisor ? "none" : "";
  }

  if (tituloBoasVindas) {
    tituloBoasVindas.classList.add("hero-titulo-classico");
    tituloBoasVindas.innerHTML = `
      <span class="hero-linha">Seja bem-vindo(a),</span>
      <span class="hero-linha nome">${escapeHtml(nome)}</span>
    `;
  }

  if (subtituloCliente) {
    subtituloCliente.textContent = "";
    subtituloCliente.innerHTML = "";
    subtituloCliente.style.display = "none";
  }

  if (codigoClienteEl) {
    codigoClienteEl.style.display = "none";
    codigoClienteEl.textContent = "";
  }

  if (supervisor) return;

  if (contratoBadge) {
    contratoBadge.textContent = concluido
      ? "Contrato assinado"
      : disponivel
        ? "Contrato pendente"
        : "Contrato indisponível";

    contratoBadge.classList.toggle("inativo", !disponivel && !concluido);
    contratoBadge.classList.toggle("pendente", disponivel && !concluido);
    contratoBadge.classList.toggle("concluido", concluido);
  }

  if (contratoInfo) {
    if (!disponivel) {
      contratoInfo.textContent = "Seu contrato ainda não está pronto. Caso necessário, solicite à equipe Duna.";
    } else if (concluido) {
      contratoInfo.textContent = "Seu contrato foi assinado e está disponível para download.";
    } else {
      contratoInfo.textContent = "Seu contrato já está disponível. Para finalizá-lo, leia e conclua a assinatura.";
    }
  }

  if (btnAssinarContrato) {
    if (!disponivel) {
      btnAssinarContrato.style.display = "none";
      btnAssinarContrato.disabled = true;
      btnAssinarContrato.onclick = null;
      renderizarHistoricoContratoCliente();
      return;
    }

    btnAssinarContrato.style.display = "";
    btnAssinarContrato.textContent = concluido ? "Baixar contrato" : "Assinar contrato";
    btnAssinarContrato.disabled = false;
    btnAssinarContrato.classList.toggle("concluido", concluido);
    btnAssinarContrato.classList.toggle("pendente", !concluido);

    btnAssinarContrato.onclick = () => {
      if (concluido) {
        baixarContratoCliente();
        return;
      }

      mostrarLoading();

      const params = new URLSearchParams({
        codigo: codigoClienteAtual,
        contrato: String(contratoAtualCliente.id || "")
      });

      setTimeout(() => {
        window.location.href = `/assinatura.html?${params.toString()}`;
      }, 220);
    };
  }

  renderizarHistoricoContratoCliente();
}

function montarCardPonto(ponto) {
  const codigo = normalizarCodigo(ponto.codigo);
  const historico = historicosPorPonto[codigo] || [];
  const status = calcularStatusPonto(ponto, historico);
  const ativo = pontoSelecionado === codigo;

  return `
    <button class="ponto-card ${ativo ? "ativo" : ""}" type="button" data-codigo="${escapeHtml(codigo)}">
      <img src="${escapeHtml(obterImagemPonto(ponto))}" alt="${escapeHtml(obterNomePonto(ponto))}">
      <div>
        <h3>${escapeHtml(obterNomePonto(ponto))}</h3>
        <p>${escapeHtml(obterLocalizacaoPonto(ponto))}</p>
        <span class="status-mini ${status.classe}">${escapeHtml(status.detalhe)}</span>
      </div>
    </button>
  `;
}

function renderizarListaPontos() {
  if (contadorPontos) {
    const total = pontosContratados.length;
    contadorPontos.textContent = total === 1 ? "1 ponto" : `${total} pontos`;
  }

  if (!listaPontosCliente) return;

  if (!pontosContratados.length) {
    listaPontosCliente.innerHTML = `<div class="vazio">Nenhum ponto contratado encontrado para este cliente.</div>`;
    return;
  }

  const pontosOrdenados = [...pontosContratados].sort((a, b) => {
    const codigoA = normalizarCodigo(a.codigo);
    const codigoB = normalizarCodigo(b.codigo);
    const statusA = calcularStatusPonto(a, historicosPorPonto[codigoA] || []);
    const statusB = calcularStatusPonto(b, historicosPorPonto[codigoB] || []);

    const ativoA = statusA.classe === "ativo" ? 0 : 1;
    const ativoB = statusB.classe === "ativo" ? 0 : 1;

    if (ativoA !== ativoB) return ativoA - ativoB;
    return obterNomePonto(a).localeCompare(obterNomePonto(b), "pt-BR");
  });

  listaPontosCliente.innerHTML = pontosOrdenados.map(montarCardPonto).join("");

  document.querySelectorAll(".ponto-card").forEach((card) => {
    card.onclick = () => abrirPonto(card.dataset.codigo);
  });
}

function obterDuracaoPreviewMs(item) {
  const url = normalizarUrl(obterUrlPlaylist(item));
  const tipo = detectarTipo(url, item?.tipo);

  if (!url) return 5000;
  if (tipo === "imagem") return 8000;
  if (tipo === "site") return 12000;

  return 20000;
}

function calcularPosicaoPreviewAoVivo(lista = []) {
  const playlist = obterListaPreviewAtiva(lista);

  if (!playlist.length) {
    return {
      indice: 0,
      offsetMs: 0
    };
  }

  const duracoes = playlist.map(obterDuracaoPreviewMs);
  const duracaoTotal = duracoes.reduce((total, duracao) => total + duracao, 0);

  if (!duracaoTotal) {
    return {
      indice: 0,
      offsetMs: 0
    };
  }

  let cursor = Date.now() % duracaoTotal;

  for (let indice = 0; indice < duracoes.length; indice += 1) {
    const duracao = duracoes[indice];

    if (cursor < duracao) {
      return {
        indice,
        offsetMs: cursor
      };
    }

    cursor -= duracao;
  }

  return {
    indice: 0,
    offsetMs: 0
  };
}

function renderizarPreview(lista, indice = 0, statusPonto = null, offsetMs = 0) {
  limparTimerPreview();

  if (!previewMidia) return;

  const playlist = obterListaPreviewAtiva(lista);
  const offline = statusPonto?.classe !== "ativo";
  const tituloPreview = document.getElementById("tituloPreview");

  if (tituloPreview) {
    tituloPreview.textContent = offline ? "Playlist offline |" : "Exibição em tempo real |";
  }

  if (!playlist.length) {
    if (previewNome) previewNome.textContent = "";

    previewMidia.classList.toggle("offline", offline);
    previewMidia.innerHTML = `
      <div class="preview-vazio">Nenhum material para preview neste ponto.</div>
      ${offline ? `<div class="preview-aviso-offline">Você está assistindo a playlist da TV offline.</div>` : ""}
    `;
    return;
  }

  const indexSeguro = indice >= playlist.length || indice < 0 ? 0 : indice;
  const offsetSeguro = Math.max(0, Number(offsetMs) || 0);
  const item = playlist[indexSeguro];
  const proximoIndex = indexSeguro + 1 >= playlist.length ? 0 : indexSeguro + 1;

  const url = normalizarUrl(obterUrlPlaylist(item));
  const tipo = detectarTipo(url, item.tipo);
  const arquivo = obterNomeArquivo(item);

  if (previewNome) previewNome.textContent = arquivo;

  previewMidia.classList.toggle("offline", offline);

  const avisoOffline = offline
    ? `<div class="preview-aviso-offline">Você está assistindo a playlist da TV offline.</div>`
    : "";

  if (!url) {
    const tempoRestante = Math.max(1000, obterDuracaoPreviewMs(item) - offsetSeguro);

    previewMidia.innerHTML = `
      <div class="preview-vazio">Material sem URL disponível.</div>
      ${avisoOffline}
    `;

    timerPreviewPlaylist = setTimeout(() => {
      renderizarPreview(playlist, proximoIndex, statusPonto);
    }, tempoRestante);

    return;
  }

  if (tipo === "imagem") {
    const tempoRestante = Math.max(1000, obterDuracaoPreviewMs(item) - offsetSeguro);

    previewMidia.innerHTML = `
      <img src="${escapeHtml(url)}" alt="${escapeHtml(arquivo)}">
      ${avisoOffline}
    `;

    timerPreviewPlaylist = setTimeout(() => {
      renderizarPreview(playlist, proximoIndex, statusPonto);
    }, tempoRestante);

    return;
  }

  if (tipo === "site") {
    const tempoRestante = Math.max(1000, obterDuracaoPreviewMs(item) - offsetSeguro);

    previewMidia.innerHTML = `
      <iframe src="${escapeHtml(url)}" allow="autoplay; fullscreen"></iframe>
      ${avisoOffline}
    `;

    timerPreviewPlaylist = setTimeout(() => {
      renderizarPreview(playlist, proximoIndex, statusPonto);
    }, tempoRestante);

    return;
  }

  previewMidia.innerHTML = `
    <video src="${escapeHtml(url)}" autoplay muted playsinline></video>
    ${avisoOffline}
  `;

  const video = previewMidia.querySelector("video");

  if (video) {
    const segundosIniciais = offsetSeguro / 1000;

    if (segundosIniciais > 0) {
      video.addEventListener("loadedmetadata", () => {
        if (Number.isFinite(video.duration) && video.duration > segundosIniciais + 1) {
          video.currentTime = segundosIniciais;
        }
      }, { once: true });
    }

    video.onended = () => {
      renderizarPreview(playlist, proximoIndex, statusPonto);
    };

    video.onerror = () => {
      timerPreviewPlaylist = setTimeout(() => {
        renderizarPreview(playlist, proximoIndex, statusPonto);
      }, 3000);
    };

    timerPreviewPlaylist = setTimeout(() => {
      renderizarPreview(playlist, proximoIndex, statusPonto);
    }, Math.max(3000, 45000 - offsetSeguro));
  }
}

function renderizarMateriais(lista) {
  if (!listaMateriais) return;

  if (!lista.length) {
    listaMateriais.innerHTML = `<div class="vazio">Nenhum material deste cliente encontrado neste ponto.</div>`;
    return;
  }

  listaMateriais.innerHTML = lista.map((item, index) => {
    const arquivo = obterNomeArquivo(item);
    const posicao = Number(item.posicao_playlist || index + 1);

    return `
      <div class="linha-material">
        <span>${escapeHtml(`${posicao}ª posição`)}</span>
        <div>
          <strong>${escapeHtml(arquivo)}</strong>
        </div>
        <span>${formatarDataHora(item.created_at)}</span>
        <span>${formatarData(item.data_fim)}</span>
      </div>
    `;
  }).join("");
}

function obterTextoEvento(evento) {
  if (eventoEhAtivo(evento)) return "Ativo";
  if (eventoEhInativo(evento)) return "Inativo";
  return evento || "Registro";
}

function renderizarHistorico(historico) {
  if (!historicoStatusPonto) return;

  const historico72h = limitarHistorico72Horas(historico);

  if (!historico72h.length) {
    historicoStatusPonto.innerHTML = `<div class="vazio historico-vazio-pequeno">Sem histórico nas últimas 72 horas.</div>`;
    return;
  }

  historicoStatusPonto.innerHTML = historico72h.map((item, index) => {
    const evento = obterEventoHistorico(item);
    const texto = obterTextoEvento(evento);
    const classe = index === 0 && eventoEhAtivo(evento) ? "ativo-primeiro" : "neutro";

    return `
      <div class="historico-item ${classe}">
        <span>${index + 1}.</span>
        <span class="historico-evento ${classe}">${escapeHtml(texto)}</span>
        <span>${formatarDataHora(obterDataHistorico(item))}</span>
      </div>
    `;
  }).join("");
}

function renderizarDetalheBase(ponto, historico) {
  const status = calcularStatusPonto(ponto, historico);

  if (estadoVazio) estadoVazio.style.display = "none";
  if (detalhePonto) detalhePonto.style.display = "block";
  if (nomePontoDetalhe) nomePontoDetalhe.textContent = obterNomePonto(ponto);
  if (localPontoDetalhe) localPontoDetalhe.textContent = obterLocalizacaoPonto(ponto);

  if (statusPontoDetalhe) {
    statusPontoDetalhe.textContent = status.texto;
    statusPontoDetalhe.className = `status-grande ${status.classe}`;
  }

  if (statusDesdeDetalhe) {
    const ultimoRegistro = historico[0] || null;
    const dataUltimoRegistro = obterDataHistorico(ultimoRegistro) || obterUltimoPingPonto(ponto);
    statusDesdeDetalhe.textContent = dataUltimoRegistro ? `último registro: ${formatarDataHora(dataUltimoRegistro)}` : "ainda sem registro";
  }
}

async function buscarCliente(codigo) {
  const { data, error } = await supabaseClient
    .from(TABELA_CLIENTES)
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function buscarContratoCliente(codigo) {
  const consultas = [
    { ordenarPor: "enviado_em" },
    { ordenarPor: "created_at" }
  ];

  for (const consulta of consultas) {
    const { data, error } = await supabaseClient
      .from(TABELA_CONTRATOS_CLIENTES)
      .select("*")
      .eq("codigo_cliente", codigo)
      .order(consulta.ordenarPor, { ascending: false })
      .limit(1);

    if (!error) {
      if (data?.[0]) return data[0];
      continue;
    }

    console.warn("Falha ao buscar contrato do cliente:", error);
  }

  const { data: clienteContrato, error: erroClienteContrato } = await supabaseClient
    .from(TABELA_CLIENTES)
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();

  if (erroClienteContrato) {
    console.warn("Falha ao buscar contrato em dados do cliente:", erroClienteContrato);
    return null;
  }

  return normalizarContratoClienteLegado(clienteContrato);
}

function extrairCodigoClienteVinculo(item) {
  return normalizarCodigo(item?.cliente_codigo || item?.codigo_cliente || item?.codigo || "");
}

function extrairCodigoPontoVinculo(item) {
  return normalizarCodigo(item?.ponto_codigo || item?.codigo_ponto || item?.codigo || "");
}

async function buscarVinculosCliente(codigo) {
  const { data, error } = await supabaseClient
    .from(TABELA_CLIENTE_PONTOS)
    .select("*");

  if (error) throw error;

  return (data || [])
    .filter((item) => extrairCodigoClienteVinculo(item) === codigo)
    .map(extrairCodigoPontoVinculo)
    .filter(Boolean);
}

async function buscarPontos(codigos) {
  if (!codigos.length) return [];

  const { data, error } = await supabaseClient
    .from(TABELA_PONTOS)
    .select("*")
    .in("codigo", codigos);

  if (error) throw error;

  const ordem = new Map(codigos.map((codigo, index) => [codigo, index]));

  return (data || [])
    .map((ponto) => ({
      ...ponto,
      codigo: normalizarCodigo(ponto.codigo)
    }))
    .sort((a, b) => {
      const posA = ordem.has(a.codigo) ? ordem.get(a.codigo) : 9999;
      const posB = ordem.has(b.codigo) ? ordem.get(b.codigo) : 9999;
      return posA - posB;
    });
}

async function buscarPlaylistPonto(codigo) {
  const { data, error } = await supabaseClient
    .from(TABELA_PLAYLIST)
    .select("id,codigo,nome,codigo_cliente,titulo_arquivo,video_url,storage_path,tipo,created_at,data_inicio,data_fim,ordem")
    .eq("codigo", codigo)
    .order("ordem", { ascending: true });

  if (error) {
    console.error("Erro ao buscar playlist:", error);
    throw error;
  }

  return data || [];
}


async function buscarHistoricoPonto(codigo) {
  const consultas = [
    {
      filtro: "ponto_codigo",
      colunas: "*",
      ordenarPor: "ultimo_ping"
    },
    {
      filtro: "ponto_codigo",
      colunas: "*",
      ordenarPor: "created_at"
    },
    {
      filtro: "codigo",
      colunas: "*",
      ordenarPor: "created_at"
    }
  ];

  for (const consulta of consultas) {
    const { data, error } = await supabaseClient
      .from(TABELA_HISTORICO)
      .select(consulta.colunas)
      .eq(consulta.filtro, codigo)
      .order(consulta.ordenarPor, { ascending: false })
      .limit(120);

    if (!error) return data || [];

    console.warn("Falha ao buscar histórico:", error);
  }

  return [];
}

async function carregarHistoricosIniciais(pontos) {
  const pares = await Promise.all(
    pontos.map(async (ponto) => {
      const codigo = normalizarCodigo(ponto.codigo);

      try {
        const historico = await buscarHistoricoPonto(codigo);
        return [codigo, limitarHistorico72Horas(historico)];
      } catch {
        return [codigo, []];
      }
    })
  );

  historicosPorPonto = Object.fromEntries(pares);
}

async function abrirPonto(codigo) {
  const codigoNormalizado = normalizarCodigo(codigo);
  const ponto = pontosContratados.find((item) => normalizarCodigo(item.codigo) === codigoNormalizado);

  if (!ponto) return;

  pontoSelecionado = codigoNormalizado;
  renderizarListaPontos();

  const historicoAtual = historicosPorPonto[codigoNormalizado] || [];
  const statusAtual = calcularStatusPonto(ponto, historicoAtual);

  renderizarDetalheBase(ponto, historicoAtual);

  if (previewMidia) previewMidia.innerHTML = `<div class="preview-vazio">Carregando preview...</div>`;
  if (listaMateriais) listaMateriais.innerHTML = `<div class="vazio">Carregando materiais...</div>`;
  if (historicoStatusPonto) historicoStatusPonto.innerHTML = `<div class="vazio">Carregando histórico...</div>`;

  try {
    const [playlist, historico] = await Promise.all([
      buscarPlaylistPonto(codigoNormalizado),
      buscarHistoricoPonto(codigoNormalizado)
    ]);

    const historico72h = limitarHistorico72Horas(historico);
    historicosPorPonto[codigoNormalizado] = historico72h;

    const materiaisCliente = filtrarMateriaisDoCliente(playlist);

    renderizarDetalheBase(ponto, historico72h);

    const statusFinal = calcularStatusPonto(ponto, historico72h);

    const posicaoPreview = calcularPosicaoPreviewAoVivo(playlist);

    renderizarPreview(playlist, posicaoPreview.indice, statusFinal, posicaoPreview.offsetMs);
    renderizarMateriais(materiaisCliente);
    renderizarHistorico(historico72h);
    renderizarListaPontos();

    setMensagem("Área do cliente atualizada.", "ok");
  } catch (error) {
    console.error("Erro ao abrir ponto:", error);

    renderizarPreview([], 0, statusAtual);
    renderizarMateriais([]);
    renderizarHistorico(historicoAtual);

    setMensagem("Erro ao carregar dados deste ponto.", "erro");
  }
}

async function carregarAreaCliente(codigo) {
  codigoClienteAtual = normalizarCodigo(codigo);

  if (!codigoClienteAtual) {
    setLoginErro("Digite o código do cliente.");
    return;
  }

  setLoginErro("");
  mostrarLoading();
  setMensagem("Carregando área do cliente...");

  if (codigoClienteEl) {
    codigoClienteEl.textContent = codigoClienteAtual;
  }

  try {
    const [cliente, contrato] = await Promise.all([
      buscarCliente(codigoClienteAtual),
      buscarContratoCliente(codigoClienteAtual)
    ]);

    clienteAtual = cliente;
    contratoAtualCliente = contrato;

    if (!clienteAtual) {
      abrirLogin();
      setLoginErro("Cliente não encontrado para este código.");
      return;
    }

    renderizarContrato();
    iniciarAtualizacaoEmTempoReal();

    const codigosPontos = await buscarVinculosCliente(codigoClienteAtual);

    pontosContratados = await buscarPontos(codigosPontos);

    await carregarHistoricosIniciais(pontosContratados);

    renderizarListaPontos();
    abrirAreaCliente();

    if (pontosContratados.length) {
      await abrirPonto(pontosContratados[0].codigo);
    } else {
      if (estadoVazio) {
        estadoVazio.style.display = "flex";
        estadoVazio.textContent = "Este cliente ainda não possui pontos contratados vinculados.";
      }

      if (detalhePonto) {
        detalhePonto.style.display = "none";
      }
    }

    setMensagem("Área do cliente carregada.", "ok");
  } catch (error) {
    console.error("Erro ao carregar área do cliente:", error);

    abrirLogin();
    setMensagem(error.message || "Erro ao carregar área do cliente.", "erro");
  } finally {
    esconderLoading();
  }
}

function entrarComCodigoDigitado() {
  const codigo = normalizarCodigo(codigoLogin?.value);

  if (!codigo) {
    setLoginErro("Digite o código do cliente.");
    return;
  }

  carregarAreaCliente(codigo);
}

if (btnEntrarCliente) {
  btnEntrarCliente.onclick = entrarComCodigoDigitado;
}

if (codigoLogin) {
  codigoLogin.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      entrarComCodigoDigitado();
    }
  });
}

if (btnAtualizar) {
  btnAtualizar.onclick = () => {
    if (!codigoClienteAtual) return;
    carregarAreaCliente(codigoClienteAtual);
  };
}

if (btnSair) {
  btnSair.onclick = () => abrirLogin();
}

if (codigoClienteEl) {
  codigoClienteEl.onclick = async () => {
    if (!codigoClienteAtual) return;

    try {
      await navigator.clipboard.writeText(codigoClienteAtual);
      setMensagem("Código copiado.", "ok");
    } catch {
      setMensagem("Erro ao copiar código.", "erro");
    }
  };
}

window.addEventListener("scroll", () => {
  document.body.classList.toggle("rolando", window.scrollY > 12);
});

window.addEventListener("load", () => {
  const params = new URLSearchParams(window.location.search);
  const codigoUrl = normalizarCodigo(params.get("codigo"));
  const voltouDaAssinatura = params.get("voltar") === "1";

  abrirLogin();

  if (tituloBoasVindas) {
    tituloBoasVindas.classList.add("hero-titulo-classico");
    tituloBoasVindas.innerHTML = `<span class="hero-linha">Seja bem-vindo(a)</span>`;
  }

  if (subtituloCliente) {
    subtituloCliente.textContent = "";
    subtituloCliente.innerHTML = "";
    subtituloCliente.style.display = "none";
  }

  if (codigoUrl && codigoLogin) {
    codigoLogin.value = codigoUrl;
  }

  if (codigoUrl && voltouDaAssinatura) {
    carregarAreaCliente(codigoUrl);

    const urlLimpa = `${window.location.pathname}?codigo=${encodeURIComponent(codigoUrl)}`;
    window.history.replaceState({}, "", urlLimpa);
  }
});
