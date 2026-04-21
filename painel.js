const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "pontos";
const TABELA = "playlists";
const TABELA_PONTOS = "pontos";
const TABELA_HISTORICO_CONEXAO = "historico_conexao";

const SENHA_PAINEL = "@Helena26";
const CACHE_PONTOS_KEY = "painel_pontos_cache_v7";
const CACHE_PONTOS_TTL = 15 * 60 * 1000;
const CACHE_PLAYLIST_PREFIX = "painel_playlist_cache_v6_";
const CACHE_PLAYLIST_TTL = 60 * 1000;
const LIMITE_STATUS_ATIVO_MS = 60 * 1000;

function limparCachesAntigos() {
  try {
    localStorage.removeItem("painel_pontos_cache_v1");
    localStorage.removeItem("painel_pontos_cache_v2");
    localStorage.removeItem("painel_pontos_cache_v3");
    localStorage.removeItem("painel_pontos_cache_v4");
    localStorage.removeItem("painel_pontos_cache_v5");
    localStorage.removeItem("painel_pontos_cache_v6");

    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith("painel_playlist_cache_v1_") ||
        key.startsWith("painel_playlist_cache_v2_") ||
        key.startsWith("painel_playlist_cache_v3_") ||
        key.startsWith("painel_playlist_cache_v4_") ||
        key.startsWith("painel_playlist_cache_v5_")
      ) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    return;
  }
}

limparCachesAntigos();

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginBox = document.getElementById("loginBox");
const conteudoPainel = document.getElementById("conteudoPainel");
const senhaInput = document.getElementById("senhaInput");
const btnLogin = document.getElementById("btnLogin");
const loginErro = document.getElementById("loginErro");

const statusEl = document.querySelector(".status-topo") || document.getElementById("status");
const listaPontos = document.getElementById("listaPontos");
const pontoDetalhe = document.getElementById("pontoDetalhe");

const codigoAtual = document.getElementById("codigoAtual");
const tituloPasta = document.getElementById("tituloPasta");

const btnVoltar = document.getElementById("btnVoltar");
const btnCopiarCodigo = document.getElementById("btnCopiarCodigo");
const btnEditarInfo = document.getElementById("btnEditarInfo");
const btnToggleDisponibilidade = document.getElementById("btnToggleDisponibilidade");
const btnNovoPonto = document.getElementById("btnNovoPonto");
const btnUpgradePlaylist = document.getElementById("btnUpgradePlaylist");
const inputUpgradePlaylist = document.getElementById("inputUpgradePlaylist");

const modalEditar = document.getElementById("modalEditar");
const editNome = document.getElementById("editNome");
const editCidade = document.getElementById("editCidade");
const editEndereco = document.getElementById("editEndereco");
const previewImagem = document.getElementById("previewImagem");
const inputImagem = document.getElementById("inputImagem");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const btnFecharModal = document.getElementById("btnFecharModal");

let codigoSelecionado = null;
let pontosMap = {};
let dragIndex = null;
let arquivoImagemEdicao = null;
let painelIniciado = false;
let botoesCardsAtivados = false;
let carregandoPontos = false;
let carregandoPlaylist = false;

let posicaoImagemAtual = { x: 50, y: 50 };
let arrastandoPreview = false;

function setStatus(texto, tipo = "normal") {
  if (!statusEl) return;

  statusEl.textContent = texto;
  statusEl.classList.remove("ok", "erro", "normal");
  statusEl.classList.add(tipo);

  if (!statusEl.classList.contains("status-box")) {
    statusEl.classList.add("status-box");
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

function obterImagemPonto(ponto) {
  return ponto?.imagem_url || ponto?.imagem || ponto?.foto_url || "https://placehold.co/600x320/png";
}

function obterCodigoPonto(ponto) {
  return String(
    ponto?.codigo ||
    ponto?.codigo_ponto ||
    ponto?.codigo_visual ||
    ponto?.id_ponto ||
    ponto?.id ||
    ""
  ).trim();
}

function obterNomePonto(ponto, codigo) {
  return ponto?.nome || ponto?.nome_painel || ponto?.titulo || ponto?.ambiente || codigo || "Carregando...";
}

function obterCidadePonto(ponto) {
  return ponto?.cidade || ponto?.municipio || ponto?.localidade || "";
}

function obterEnderecoPonto(ponto) {
  return ponto?.endereco || ponto?.endereço || ponto?.local || "";
}

function obterUltimoPingPonto(ponto) {
  return ponto?.ultimo_ping || ponto?.last_ping || ponto?.updated_at || ponto?.data_ping || null;
}

function obterLocalizacaoPonto(cidade, endereco = "") {
  const cidadeFinal = String(cidade || "").trim();
  const enderecoFinal = String(endereco || "").trim();

  if (cidadeFinal && enderecoFinal) {
    return `<strong>${escapeHtml(cidadeFinal)}</strong> | ${escapeHtml(enderecoFinal)}`;
  }

  if (cidadeFinal) {
    return `<strong>${escapeHtml(cidadeFinal)}</strong>`;
  }

  if (enderecoFinal) {
    return escapeHtml(enderecoFinal);
  }

  return "Localização não definida";
}

function pontoEstaDisponivel(ponto) {
  return ponto?.disponivel !== false;
}

function calcularStatusInfo(ponto) {
  const ultimoPing = obterUltimoPingPonto(ponto);

  if (!ultimoPing) {
    return {
      texto: "Inativo",
      detalhe: "Inativo desde sem histórico",
      ativo: false,
      classe: "inativo",
      desde: null
    };
  }

  const dataPing = new Date(ultimoPing);

  if (Number.isNaN(dataPing.getTime())) {
    return {
      texto: "Inativo",
      detalhe: "Inativo desde sem histórico",
      ativo: false,
      classe: "inativo",
      desde: null
    };
  }

  const diff = Date.now() - dataPing.getTime();
  const ativo = diff < LIMITE_STATUS_ATIVO_MS;
  const horario = dataPing.toLocaleString("pt-BR");

  return {
    texto: ativo ? "Ativo" : "Inativo",
    detalhe: `${ativo ? "Ativo" : "Inativo"} desde ${horario}`,
    ativo,
    classe: ativo ? "ativo" : "inativo",
    desde: dataPing.toISOString()
  };
}

function formatarData(valor) {
  if (!valor) return "Sem data";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Sem data";

  return data.toLocaleDateString("pt-BR");
}

function formatarDataHora(valor) {
  if (!valor) return "Sem data";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Sem data";

  return data.toLocaleString("pt-BR");
}

function calcularStatusPorHistorico(historicoConexao = [], ponto = {}) {
  const disponivel = pontoEstaDisponivel(ponto);

  if (!disponivel) {
    return {
      texto: "Indisponível",
      detalhe: "Indisponível",
      ativo: false,
      classe: "indisponivel"
    };
  }

  const ultimoEvento = Array.isArray(historicoConexao) ? historicoConexao[0] : null;
  const evento = String(ultimoEvento?.evento || "").toLowerCase();
  const dataEvento = ultimoEvento?.data_hora || ultimoEvento?.created_at || null;

  if (evento === "conectou") {
    return {
      texto: "Ativo",
      detalhe: dataEvento ? `Ativo desde ${formatarDataHora(dataEvento)}` : "Ativo",
      ativo: true,
      classe: "ativo"
    };
  }

  if (evento === "desconectou") {
    return {
      texto: "Inativo",
      detalhe: dataEvento ? `Inativo desde ${formatarDataHora(dataEvento)}` : "Inativo",
      ativo: false,
      classe: "inativo"
    };
  }

  return calcularStatusInfo(ponto);
}

function atualizarStatusDetalhePonto(statusInfo) {
  const statusPonto = document.getElementById("statusPonto");
  if (!statusPonto || !statusInfo) return;

  statusPonto.textContent = statusInfo.detalhe || statusInfo.texto;
  statusPonto.classList.remove("ativo", "inativo", "indisponivel");
  statusPonto.classList.add(statusInfo.classe);
  statusPonto.dataset.status = String(statusInfo.texto || "").toLowerCase();
}

function itemEstaInativo(item) {
  if (!item?.data_fim) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fim = new Date(item.data_fim);
  if (Number.isNaN(fim.getTime())) return false;

  fim.setHours(23, 59, 59, 999);
  return fim < hoje;
}

function obterTextoEventoConexao(evento) {
  if (evento === "conectou") return "Conectou";
  if (evento === "desconectou") return "Desconectou";
  return evento || "Sem status";
}

function lerCachePontos() {
  try {
    const bruto = localStorage.getItem(CACHE_PONTOS_KEY);
    if (!bruto) return null;

    const cache = JSON.parse(bruto);
    const criadoEm = Number(cache.criadoEm || 0);
    const pontos = Array.isArray(cache.pontos) ? cache.pontos : [];

    if (!pontos.length) return null;

    return {
      pontos,
      fresco: Date.now() - criadoEm < CACHE_PONTOS_TTL
    };
  } catch {
    return null;
  }
}

function salvarCachePontos(pontos) {
  try {
    localStorage.setItem(CACHE_PONTOS_KEY, JSON.stringify({
      criadoEm: Date.now(),
      pontos
    }));
  } catch {
    return;
  }
}

function obterChaveCachePlaylist(codigo) {
  return `${CACHE_PLAYLIST_PREFIX}${codigo}`;
}

function lerCachePlaylist(codigo) {
  try {
    const bruto = localStorage.getItem(obterChaveCachePlaylist(codigo));
    if (!bruto) return null;

    const cache = JSON.parse(bruto);
    const criadoEm = Number(cache.criadoEm || 0);

    return {
      playlist: Array.isArray(cache.playlist) ? cache.playlist : [],
      historico: Array.isArray(cache.historico) ? cache.historico : [],
      fresco: Date.now() - criadoEm < CACHE_PLAYLIST_TTL
    };
  } catch {
    return null;
  }
}

function salvarCachePlaylist(codigo, playlist, historico) {
  try {
    localStorage.setItem(obterChaveCachePlaylist(codigo), JSON.stringify({
      criadoEm: Date.now(),
      playlist,
      historico
    }));
  } catch {
    return;
  }
}

function limparCachePlaylist(codigo) {
  try {
    localStorage.removeItem(obterChaveCachePlaylist(codigo));
  } catch {
    return;
  }
}

function atualizarCachePonto(codigo, alteracoes) {
  if (!codigo || !pontosMap[codigo]) return;

  pontosMap[codigo] = {
    ...pontosMap[codigo],
    ...alteracoes
  };

  salvarCachePontos(Object.values(pontosMap));
}

function ativarLazyImages() {
  document.querySelectorAll(".card-imagem").forEach((imagem) => {
    imagem.loading = "lazy";
    imagem.decoding = "async";
  });
}

async function uploadImagemPonto(file, codigo) {
  const extensao = (file.name.split(".").pop() || "jpg").toLowerCase();
  const nomeArquivo = `${codigo}/${Date.now()}.${extensao}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(BUCKET)
    .upload(nomeArquivo, file, {
      cacheControl: "86400",
      upsert: true
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(nomeArquivo);
  return data.publicUrl;
}

function limparNomeArquivo(nome) {
  return String(nome || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function detectarTipoArquivoPlaylist(file) {
  const nome = String(file?.name || "").toLowerCase();

  if (
    nome.endsWith(".jpg") ||
    nome.endsWith(".jpeg") ||
    nome.endsWith(".png") ||
    nome.endsWith(".webp")
  ) {
    return "imagem";
  }

  if (nome.endsWith(".txt")) {
    return "site";
  }

  return "video";
}

async function obterProximaOrdemPlaylist() {
  const consultas = [
    { colunas: "ordem", ordenarPor: "ordem" },
    { colunas: "created_at", ordenarPor: "created_at" }
  ];

  for (const consultaAtual of consultas) {
    const query = supabaseClient
      .from(TABELA)
      .select(consultaAtual.colunas)
      .eq("codigo", codigoSelecionado)
      .order(consultaAtual.ordenarPor, { ascending: false })
      .limit(1);

    const { data, error } = await query;

    if (!error) {
      if (consultaAtual.colunas === "ordem") {
        const maiorOrdem = Number(data?.[0]?.ordem || 0);
        return maiorOrdem + 1;
      }

      return 1;
    }

    console.warn(`Não foi possível buscar ordem usando ${consultaAtual.colunas}:`, error);
  }

  return 1;
}

async function enviarMaterialDiretoPlaylist(file) {
  if (!codigoSelecionado) {
    setStatus("Selecione um ponto primeiro", "erro");
    return;
  }

  if (!file) {
    setStatus("Selecione um arquivo", "erro");
    return;
  }

  let path = "";

  try {
    setStatus("Enviando material...", "normal");

    const nomeLimpo = limparNomeArquivo(file.name);
    path = `playlists/${codigoSelecionado}/${Date.now()}-${nomeLimpo}`;
    const tipo = detectarTipoArquivoPlaylist(file);

    const { error: uploadError } = await supabaseClient.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "86400",
        upsert: false
      });

    if (uploadError) {
      console.error("ERRO UPLOAD STORAGE:", uploadError);
      setStatus(`Erro no upload: ${uploadError.message || "falha no storage"}`, "erro");
      return;
    }

    const { data: publicData } = supabaseClient.storage
      .from(BUCKET)
      .getPublicUrl(path);

    const ordem = await obterProximaOrdemPlaylist();

    const payload = {
      codigo: codigoSelecionado,
      nome: file.name,
      titulo_arquivo: file.name,
      video_url: publicData.publicUrl,
      storage_path: path,
      tipo,
      ordem
    };

    const { data, error: insertError } = await supabaseClient
      .from(TABELA)
      .insert([payload])
      .select();

    if (insertError) {
      console.error("ERRO INSERT PLAYLIST:", insertError);
      await supabaseClient.storage.from(BUCKET).remove([path]);
      setStatus(`Erro ao gravar playlist: ${insertError.message || "falha no banco"}`, "erro");
      return;
    }

    console.log("ITEM INSERIDO:", data);

    limparCachePlaylist(codigoSelecionado);
    await carregarPlaylist();

    setStatus("Material enviado para a playlist", "ok");
  } catch (error) {
    console.error("Erro ao enviar material:", error);

    if (path) {
      await supabaseClient.storage.from(BUCKET).remove([path]);
    }

    setStatus(`Erro ao enviar material: ${error.message || "falha desconhecida"}`, "erro");
  }
}

function obterChavePosicaoImagem(codigo) {
  return `ponto_imagem_posicao_${codigo}`;
}

function salvarPosicaoImagem(codigo, posicao) {
  if (!codigo) return;
  localStorage.setItem(obterChavePosicaoImagem(codigo), JSON.stringify(posicao));
}

function lerPosicaoImagem(codigo) {
  if (!codigo) return { x: 50, y: 50 };

  try {
    const salva = localStorage.getItem(obterChavePosicaoImagem(codigo));
    if (!salva) return { x: 50, y: 50 };

    const obj = JSON.parse(salva);
    const x = Number(obj.x);
    const y = Number(obj.y);

    return {
      x: Number.isFinite(x) ? x : 50,
      y: Number.isFinite(y) ? y : 50
    };
  } catch {
    return { x: 50, y: 50 };
  }
}

function aplicarPosicaoImagem(el, posicao) {
  if (!el || !posicao) return;
  el.style.objectPosition = `${posicao.x}% ${posicao.y}%`;
}

function atualizarVisualDisponibilidade(disponivel) {
  if (!btnToggleDisponibilidade) return;

  const texto = btnToggleDisponibilidade.querySelector(".toggle-texto");

  btnToggleDisponibilidade.classList.toggle("ativo", disponivel);
  btnToggleDisponibilidade.setAttribute("aria-pressed", disponivel ? "true" : "false");

  if (texto) {
    texto.textContent = disponivel ? "Disponível" : "Indisponível";
  }
}

async function alternarDisponibilidadePonto() {
  if (!codigoSelecionado) return;

  const ponto = pontosMap[codigoSelecionado] || {};
  const disponivelAtual = pontoEstaDisponivel(ponto);
  const novoStatus = !disponivelAtual;

  atualizarVisualDisponibilidade(novoStatus);
  atualizarCachePonto(codigoSelecionado, { disponivel: novoStatus });

  try {
    setStatus(novoStatus ? "Marcando como disponível..." : "Marcando como indisponível...", "normal");

    const { error } = await supabaseClient
      .from(TABELA_PONTOS)
      .update({ disponivel: novoStatus })
      .eq("codigo", codigoSelecionado);

    if (error) throw error;

    renderizarCardsPontos(Object.values(pontosMap));

    const cachePlaylist = lerCachePlaylist(codigoSelecionado);
    const statusInfo = cachePlaylist
      ? calcularStatusPorHistorico(cachePlaylist.historico, pontosMap[codigoSelecionado])
      : calcularStatusInfo(pontosMap[codigoSelecionado]);

    atualizarStatusDetalhePonto(statusInfo);
    setStatus(novoStatus ? "Ponto disponível" : "Ponto indisponível", "ok");
  } catch (error) {
    console.error("Erro ao atualizar disponibilidade:", error);

    atualizarVisualDisponibilidade(disponivelAtual);
    atualizarCachePonto(codigoSelecionado, { disponivel: disponivelAtual });
    renderizarCardsPontos(Object.values(pontosMap));

    const cachePlaylist = lerCachePlaylist(codigoSelecionado);
    const statusInfo = cachePlaylist
      ? calcularStatusPorHistorico(cachePlaylist.historico, pontosMap[codigoSelecionado])
      : calcularStatusInfo(pontosMap[codigoSelecionado]);

    atualizarStatusDetalhePonto(statusInfo);
    setStatus("Erro ao atualizar disponibilidade", "erro");
  }
}

function validarLogin() {
  if (!senhaInput || senhaInput.value.trim() !== SENHA_PAINEL) {
    if (loginErro) loginErro.textContent = "Código inválido";
    return;
  }

  localStorage.setItem("painelLiberado", "1");

  if (loginErro) loginErro.textContent = "";
  if (loginBox) loginBox.style.display = "none";
  if (conteudoPainel) conteudoPainel.style.display = "block";

  setStatus("Painel Ativo", "ok");
  iniciarPainel();
}

if (btnLogin) {
  btnLogin.onclick = validarLogin;
}

if (senhaInput) {
  senhaInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") validarLogin();
  });
}

async function buscarPontosRemoto() {
  const consultas = [
    "codigo,nome,cidade,endereco,imagem_url,ultimo_ping,disponivel",
    "codigo,nome,cidade,endereco,imagem_url,ultimo_ping",
    "codigo,nome,cidade,endereco,imagem_url",
    "codigo,nome,cidade,endereco",
    "*"
  ];

  let ultimoErro = null;

  for (const colunas of consultas) {
    const { data, error } = await supabaseClient
      .from(TABELA_PONTOS)
      .select(colunas)
      .order("codigo", { ascending: true });

    if (!error) {
      return (data || []).map((ponto) => ({
        ...ponto,
        codigo: obterCodigoPonto(ponto),
        nome: obterNomePonto(ponto, obterCodigoPonto(ponto)),
        cidade: obterCidadePonto(ponto),
        endereco: obterEnderecoPonto(ponto),
        imagem_url: obterImagemPonto(ponto),
        ultimo_ping: obterUltimoPingPonto(ponto),
        disponivel: ponto.disponivel !== false
      }));
    }

    ultimoErro = error;
    console.warn(`Falha ao buscar pontos com colunas: ${colunas}`, error);
  }

  throw ultimoErro;
}

function renderizarCardsPontos(lista) {
  pontosMap = {};

  lista.forEach((ponto) => {
    const codigo = obterCodigoPonto(ponto);
    if (codigo) {
      pontosMap[codigo] = ponto;
    }
  });

  document.querySelectorAll(".card-ponto").forEach((card) => {
    const codigo = String(card.dataset.codigo || "").trim();
    const ponto = pontosMap[codigo] || {};

    const nomeEl = card.querySelector(".card-nome");
    const cidadeEl = card.querySelector(".card-cidade");
    const statusElCard = card.querySelector(".card-status");
    const bolinhaEl = card.querySelector(".status-bolinha");
    const imagemEl = card.querySelector(".card-imagem");
    const codigoEl = card.querySelector(".card-codigo");

    const nome = obterNomePonto(ponto, codigo);
    const cidade = obterCidadePonto(ponto);
    const endereco = obterEnderecoPonto(ponto);
    const imagem = obterImagemPonto(ponto);
    const disponivel = pontoEstaDisponivel(ponto);

    const statusInfo = disponivel
      ? calcularStatusInfo(ponto)
      : {
          texto: "Indisponível",
          detalhe: "Indisponível",
          ativo: false,
          classe: "indisponivel"
        };

    card.classList.toggle("card-indisponivel", !disponivel);

    if (nomeEl) {
      nomeEl.innerHTML = `<strong>${escapeHtml(nome)}</strong>`;
    }

    if (cidadeEl) {
      cidadeEl.innerHTML = obterLocalizacaoPonto(cidade, endereco);
    }

    if (codigoEl) {
      codigoEl.textContent = codigo;
      codigoEl.title = "Clique para copiar";
    }

    if (statusElCard) {
      statusElCard.textContent = statusInfo.texto;
      statusElCard.classList.toggle("ativo", disponivel && statusInfo.ativo);
      statusElCard.classList.toggle("inativo", disponivel && !statusInfo.ativo);
      statusElCard.classList.toggle("indisponivel", !disponivel);
    }

    if (bolinhaEl) {
      bolinhaEl.classList.toggle("ativo", disponivel && statusInfo.ativo);
      bolinhaEl.classList.toggle("inativo", disponivel && !statusInfo.ativo);
      bolinhaEl.classList.toggle("indisponivel", !disponivel);
    }

    if (imagemEl) {
      imagemEl.loading = "lazy";
      imagemEl.decoding = "async";

      if (imagemEl.src !== imagem) {
        imagemEl.src = imagem;
      }

      imagemEl.alt = nome;
      aplicarPosicaoImagem(imagemEl, lerPosicaoImagem(codigo));
    }
  });
}

function ativarBotoesCards() {
  if (botoesCardsAtivados) return;
  botoesCardsAtivados = true;

  document.querySelectorAll(".btn-abrir").forEach((btn) => {
    btn.onclick = (event) => {
      event.stopPropagation();
      abrirPonto(btn.dataset.codigo);
    };
  });

  document.querySelectorAll(".btn-copiar").forEach((btn) => {
    btn.style.display = "none";
  });

  document.querySelectorAll(".card-codigo").forEach((codigoEl) => {
    codigoEl.onclick = async (event) => {
      event.stopPropagation();

      const card = codigoEl.closest(".card-ponto");
      const codigo = String(card?.dataset.codigo || codigoEl.textContent || "").trim();

      if (!codigo) return;

      try {
        await navigator.clipboard.writeText(codigo);
        setStatus("Código copiado", "ok");
      } catch {
        setStatus("Erro ao copiar código", "erro");
      }
    };
  });

  if (btnNovoPonto) {
    btnNovoPonto.onclick = () => {
      setStatus("Novo ponto ainda sem função", "normal");
    };
  }
}

function abrirPonto(codigo) {
  codigoSelecionado = String(codigo || "").trim();
  const ponto = pontosMap[codigoSelecionado] || {};
  const nome = obterNomePonto(ponto, codigoSelecionado);
  const cidade = obterCidadePonto(ponto);
  const endereco = obterEnderecoPonto(ponto);

  if (listaPontos) listaPontos.style.display = "none";
  if (pontoDetalhe) pontoDetalhe.style.display = "block";

  if (codigoAtual) {
    codigoAtual.textContent = codigoSelecionado;
    codigoAtual.title = "Clique para copiar";
  }

  if (tituloPasta) {
    tituloPasta.innerHTML = `<strong>${escapeHtml(nome)}</strong>`;
  }

  const cidadePonto = document.getElementById("cidadePonto");
  const enderecoPonto = document.getElementById("enderecoPonto");
  const imagemPonto = document.getElementById("imagemPonto");

  const cachePlaylist = lerCachePlaylist(codigoSelecionado);
  const statusInfo = cachePlaylist
    ? calcularStatusPorHistorico(cachePlaylist.historico, ponto)
    : calcularStatusInfo(ponto);

  const posicaoSalva = lerPosicaoImagem(codigoSelecionado);

  atualizarVisualDisponibilidade(pontoEstaDisponivel(ponto));

  if (cidadePonto) {
    cidadePonto.innerHTML = obterLocalizacaoPonto(cidade, endereco);
  }

  if (enderecoPonto) {
    enderecoPonto.textContent = endereco || "";
  }

  atualizarStatusDetalhePonto(statusInfo);

  if (imagemPonto) {
    imagemPonto.loading = "lazy";
    imagemPonto.decoding = "async";
    imagemPonto.src = obterImagemPonto(ponto);
    imagemPonto.alt = nome;
    aplicarPosicaoImagem(imagemPonto, posicaoSalva);
  }

  carregarPlaylist();
}

function abrirModalEdicao() {
  if (!codigoSelecionado || !modalEditar) return;

  const ponto = pontosMap[codigoSelecionado] || {};
  posicaoImagemAtual = lerPosicaoImagem(codigoSelecionado);

  if (editNome) editNome.value = obterNomePonto(ponto, codigoSelecionado) || "";
  if (editCidade) editCidade.value = obterCidadePonto(ponto) || "";
  if (editEndereco) editEndereco.value = obterEnderecoPonto(ponto) || "";

  if (previewImagem) {
    previewImagem.src = obterImagemPonto(ponto);
    aplicarPosicaoImagem(previewImagem, posicaoImagemAtual);
  }

  if (inputImagem) inputImagem.value = "";

  arquivoImagemEdicao = null;
  modalEditar.style.display = "flex";
}

function fecharModalEdicao() {
  if (!modalEditar) return;

  modalEditar.style.display = "none";
  arquivoImagemEdicao = null;
  arrastandoPreview = false;

  if (inputImagem) inputImagem.value = "";
}

if (btnVoltar) {
  btnVoltar.onclick = () => {
    if (listaPontos) listaPontos.style.display = "block";
    if (pontoDetalhe) pontoDetalhe.style.display = "none";
    codigoSelecionado = null;
  };
}

if (btnCopiarCodigo) {
  btnCopiarCodigo.style.display = "none";

  btnCopiarCodigo.onclick = async () => {
    if (!codigoSelecionado) return;

    try {
      await navigator.clipboard.writeText(codigoSelecionado);
      setStatus("Código copiado", "ok");
    } catch {
      setStatus("Erro ao copiar código", "erro");
    }
  };
}

if (codigoAtual) {
  codigoAtual.onclick = async () => {
    if (!codigoSelecionado) return;

    try {
      await navigator.clipboard.writeText(codigoSelecionado);
      setStatus("Código copiado", "ok");
    } catch {
      setStatus("Erro ao copiar código", "erro");
    }
  };
}

if (btnEditarInfo) {
  btnEditarInfo.onclick = () => {
    abrirModalEdicao();
  };
}

if (btnToggleDisponibilidade) {
  btnToggleDisponibilidade.onclick = () => {
    alternarDisponibilidadePonto();
  };
}

if (btnUpgradePlaylist && inputUpgradePlaylist) {
  btnUpgradePlaylist.onclick = () => {
    inputUpgradePlaylist.click();
  };

  inputUpgradePlaylist.onchange = async (event) => {
    const file = event.target.files?.[0];
    await enviarMaterialDiretoPlaylist(file);
    inputUpgradePlaylist.value = "";
  };
}

if (btnFecharModal) {
  btnFecharModal.onclick = () => {
    fecharModalEdicao();
  };
}

if (modalEditar) {
  modalEditar.addEventListener("click", (event) => {
    if (event.target === modalEditar) {
      fecharModalEdicao();
    }
  });
}

if (inputImagem) {
  inputImagem.addEventListener("change", (event) => {
    const arquivo = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    if (!arquivo) return;

    arquivoImagemEdicao = arquivo;
    posicaoImagemAtual = { x: 50, y: 50 };

    const reader = new FileReader();

    reader.onload = (evento) => {
      if (previewImagem) {
        previewImagem.src = evento.target.result;
        aplicarPosicaoImagem(previewImagem, posicaoImagemAtual);
      }
    };

    reader.readAsDataURL(arquivo);
  });
}

if (previewImagem) {
  previewImagem.style.cursor = "grab";

  previewImagem.addEventListener("mousedown", (event) => {
    event.preventDefault();
    arrastandoPreview = true;
    previewImagem.style.cursor = "grabbing";
  });

  window.addEventListener("mouseup", () => {
    arrastandoPreview = false;

    if (previewImagem) {
      previewImagem.style.cursor = "grab";
    }
  });

  previewImagem.addEventListener("mousemove", (event) => {
    if (!arrastandoPreview) return;

    const rect = previewImagem.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    let x = ((event.clientX - rect.left) / rect.width) * 100;
    let y = ((event.clientY - rect.top) / rect.height) * 100;

    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    posicaoImagemAtual = { x, y };
    aplicarPosicaoImagem(previewImagem, posicaoImagemAtual);
  });

  previewImagem.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });
}

if (btnSalvarEdicao) {
  btnSalvarEdicao.onclick = async () => {
    if (!codigoSelecionado) return;

    const ponto = pontosMap[codigoSelecionado] || {};
    const nome = editNome ? editNome.value.trim() : "";
    const cidade = editCidade ? editCidade.value.trim() : "";
    const endereco = editEndereco ? editEndereco.value.trim() : "";

    try {
      setStatus("Salvando informações...", "normal");

      const { error: erroInfo } = await supabaseClient
        .from(TABELA_PONTOS)
        .update({
          nome,
          cidade,
          endereco
        })
        .eq("codigo", codigoSelecionado);

      if (erroInfo) {
        console.error("Erro ao salvar textos:", erroInfo);
        setStatus("Erro ao atualizar informações", "erro");
        return;
      }

      ponto.nome = nome;
      ponto.cidade = cidade;
      ponto.endereco = endereco;

      if (arquivoImagemEdicao) {
        setStatus("Enviando imagem...", "normal");

        const imagemUrlFinal = await uploadImagemPonto(arquivoImagemEdicao, codigoSelecionado);

        const { error: erroImagem } = await supabaseClient
          .from(TABELA_PONTOS)
          .update({
            imagem_url: imagemUrlFinal
          })
          .eq("codigo", codigoSelecionado);

        if (erroImagem) {
          console.error("Erro ao salvar imagem:", erroImagem);
          setStatus("Erro ao salvar imagem", "erro");
          return;
        }

        ponto.imagem_url = imagemUrlFinal;
      }

      pontosMap[codigoSelecionado] = ponto;
      salvarPosicaoImagem(codigoSelecionado, posicaoImagemAtual);
      salvarCachePontos(Object.values(pontosMap));

      fecharModalEdicao();
      abrirPonto(codigoSelecionado);
      renderizarCardsPontos(Object.values(pontosMap));
      setStatus("Atualizado com sucesso", "ok");
    } catch (error) {
      console.error("Erro geral ao salvar edição:", error);
      setStatus("Erro ao salvar edição", "erro");
    }
  };
}

function obterNomeArquivoPlaylist(item) {
  if (item.titulo_arquivo && String(item.titulo_arquivo).trim()) {
    return String(item.titulo_arquivo).trim();
  }

  if (item.storage_path) {
    const partes = String(item.storage_path).split("/");
    return partes[partes.length - 1] || "Arquivo";
  }

  if (item.video_url) {
    const partes = String(item.video_url).split("/");
    return partes[partes.length - 1]?.split("?")[0] || "Arquivo";
  }

  return "Arquivo";
}

function obterNomeClientePlaylist(item) {
  if (item.nome_cliente && String(item.nome_cliente).trim()) {
    return String(item.nome_cliente).trim();
  }

  if (item.nome && String(item.nome).trim()) {
    return String(item.nome).trim();
  }

  if (item.codigo_cliente && String(item.codigo_cliente).trim()) {
    return `Cliente ${String(item.codigo_cliente).trim()}`;
  }

  return "Cliente não informado";
}

function obterUrlDownloadPlaylist(item) {
  return item.video_url || item.arquivo_url || item.url || "";
}

function montarItemPlaylist(item, index) {
  const nomeArquivo = obterNomeArquivoPlaylist(item);
  const nomeCliente = obterNomeClientePlaylist(item);
  const urlDownload = obterUrlDownloadPlaylist(item);

  return `
    <div class="playlist-item" draggable="true" data-index="${index}" data-id="${item.id}">
      <div class="playlist-item-linha">
        <div class="playlist-item-handle" title="Arrastar">⋮⋮</div>

        <div class="playlist-item-ordem">${index + 1}.</div>

        <div class="playlist-item-nome" title="${escapeHtml(nomeCliente)} - ${escapeHtml(nomeArquivo)}">
          <strong>${escapeHtml(nomeCliente)}</strong>
          <small>${escapeHtml(nomeArquivo)}</small>
        </div>

        <div class="playlist-item-data playlist-item-postado">
          ${formatarDataHora(item.created_at)}
        </div>

        <div class="playlist-item-data playlist-item-encerramento">
          ${formatarData(item.data_fim)}
        </div>

        <div class="playlist-item-acoes-laterais">
          <button class="playlist-acao btn-renomear-item" type="button" data-id="${item.id}" data-nome="${escapeHtml(nomeArquivo)}" title="Renomear">✎</button>
          <a class="playlist-acao btn-baixar-item" href="${escapeHtml(urlDownload || "#")}" download target="_blank" rel="noopener" title="Baixar">↓</a>
          <button class="playlist-acao btn-excluir-item" type="button" data-id="${item.id}" title="Excluir">×</button>
        </div>
      </div>
    </div>
  `;
}

function montarItemHistoricoEncerramento(item, index) {
  const nomeArquivo = obterNomeArquivoPlaylist(item);
  const nomeCliente = obterNomeClientePlaylist(item);

  return `
    <div class="historico-item">
      <span class="historico-item-ordem">${index + 1}.</span>
      <span class="historico-item-nome">${escapeHtml(nomeCliente)} | ${escapeHtml(nomeArquivo)}</span>
      <span class="historico-item-valor">${formatarData(item.data_fim)}</span>
    </div>
  `;
}

function montarItemHistoricoStatus(item, index) {
  const textoEvento = obterTextoEventoConexao(item.evento);
  const eventoNormalizado = String(item.evento || "").toLowerCase();
  const classe =
    eventoNormalizado === "conectou"
      ? "ativo"
      : eventoNormalizado === "desconectou"
        ? "inativo"
        : "";

  const data = formatarDataHora(item.data_hora || item.created_at);

  return `
    <div class="historico-item">
      <span class="historico-item-ordem">${index + 1}.</span>
      <span class="historico-item-nome historico-status ${classe}">
        ${textoEvento} em ${data}
      </span>
      <span class="historico-item-valor">${data}</span>
    </div>
  `;
}

function obterContainerHistoricoEncerramento() {
  return (
    document.getElementById("historicoEncerramento") ||
    document.getElementById("playlistInativaEncerramento") ||
    document.getElementById("playlistInativa")
  );
}

function obterContainerHistoricoStatus() {
  return (
    document.getElementById("historicoStatus") ||
    document.getElementById("playlistInativaStatus")
  );
}

function renderizarPlaylistDados(lista, historicoConexao) {
  const ponto = pontosMap[codigoSelecionado] || {};
  const statusInfo = calcularStatusPorHistorico(historicoConexao, ponto);
  atualizarStatusDetalhePonto(statusInfo);

  const ativos = lista.filter((item) => !itemEstaInativo(item));
  const inativos = lista.filter((item) => itemEstaInativo(item));

  const playlistAtiva = document.getElementById("playlistAtiva");
  const historicoEncerramento = obterContainerHistoricoEncerramento();
  const historicoStatus = obterContainerHistoricoStatus();

  if (playlistAtiva) {
    playlistAtiva.innerHTML = ativos.length
      ? ativos.map((item, index) => montarItemPlaylist(item, index)).join("")
      : `<div class="playlist-vazia">Nenhum item ativo</div>`;
  }

  if (historicoEncerramento) {
    historicoEncerramento.innerHTML = inativos.length
      ? inativos.map((item, index) => montarItemHistoricoEncerramento(item, index)).join("")
      : `<div class="playlist-vazia">Sem histórico</div>`;
  }

  if (historicoStatus) {
    historicoStatus.innerHTML = historicoConexao.length
      ? historicoConexao.map((item, index) => montarItemHistoricoStatus(item, index)).join("")
      : `<div class="playlist-vazia">Sem histórico</div>`;
  }

  ativarDrag(ativos);
  ativarRenomearItens();
  ativarExclusaoItens();
}

async function buscarPlaylistRemota(codigo) {
  const consultasPlaylist = [
    "id,nome,codigo_cliente,titulo_arquivo,video_url,storage_path,created_at,data_fim,ordem",
    "id,nome,titulo_arquivo,video_url,storage_path,created_at,data_fim,ordem",
    "id,nome,video_url,storage_path,created_at"
  ];

  let playlistData = [];
  let playlistError = null;

  for (const colunas of consultasPlaylist) {
    const query = supabaseClient
      .from(TABELA)
      .select(colunas)
      .eq("codigo", codigo);

    if (colunas.includes("ordem")) {
      query.order("ordem", { ascending: true });
    } else {
      query.order("created_at", { ascending: true });
    }

    const { data, error } = await query;

    if (!error) {
      playlistData = data || [];
      playlistError = null;
      break;
    }

    playlistError = error;
    console.warn(`Falha ao buscar playlist com colunas: ${colunas}`, error);
  }

  if (playlistError) throw playlistError;

  let historicoData = [];

  const consultasHistorico = [
    { ordem: "data_hora", colunas: "evento,data_hora,created_at" },
    { ordem: "created_at", colunas: "evento,created_at" }
  ];

  for (const consulta of consultasHistorico) {
    const { data, error } = await supabaseClient
      .from(TABELA_HISTORICO_CONEXAO)
      .select(consulta.colunas)
      .eq("codigo", codigo)
      .order(consulta.ordem, { ascending: false })
      .limit(30);

    if (!error) {
      historicoData = data || [];
      break;
    }

    console.warn(`Erro ao buscar histórico usando ${consulta.ordem}:`, error);
  }

  return {
    playlist: playlistData || [],
    historico: historicoData || []
  };
}

async function carregarPlaylist() {
  if (!codigoSelecionado || carregandoPlaylist) return;

  const codigo = codigoSelecionado;
  const cache = lerCachePlaylist(codigo);

  if (cache) {
    renderizarPlaylistDados(cache.playlist, cache.historico);
    setStatus(cache.fresco ? "Painel Ativo" : "Atualizando playlist...", cache.fresco ? "ok" : "normal");

    if (cache.fresco) {
      return;
    }
  } else {
    setStatus("Carregando playlist...", "normal");
  }

  carregandoPlaylist = true;

  try {
    const dados = await buscarPlaylistRemota(codigo);

    if (codigoSelecionado !== codigo) return;

    salvarCachePlaylist(codigo, dados.playlist, dados.historico);
    renderizarPlaylistDados(dados.playlist, dados.historico);
    setStatus("Painel Ativo", "ok");
  } catch (error) {
    console.error(error);

    if (cache) {
      setStatus("Painel Ativo", "ok");
      return;
    }

    setStatus("Erro ao carregar playlist", "erro");
  } finally {
    carregandoPlaylist = false;
  }
}

function ativarRenomearItens() {
  document.querySelectorAll(".btn-renomear-item").forEach((btn) => {
    btn.onclick = async (event) => {
      event.stopPropagation();

      const id = btn.dataset.id;
      const nomeAtual = btn.dataset.nome || "";

      if (!id) return;

      const novoNome = window.prompt("Digite o novo nome do arquivo:", nomeAtual);

      if (novoNome === null) return;

      const nomeFinal = novoNome.trim();

      if (!nomeFinal) {
        setStatus("Digite um nome válido", "erro");
        return;
      }

      const tentativasUpdate = [
        { titulo_arquivo: nomeFinal },
        { nome: nomeFinal }
      ];

      let updateError = null;

      for (const payload of tentativasUpdate) {
        const { error } = await supabaseClient
          .from(TABELA)
          .update(payload)
          .eq("id", id);

        if (!error) {
          updateError = null;
          break;
        }

        updateError = error;
        console.warn("Falha ao renomear com payload:", payload, error);
      }

      if (updateError) {
        console.error(updateError);
        setStatus("Erro ao renomear arquivo", "erro");
        return;
      }

      limparCachePlaylist(codigoSelecionado);
      setStatus("Arquivo renomeado", "ok");
      carregarPlaylist();
    };
  });
}

async function ativarExclusaoItens() {
  document.querySelectorAll(".btn-excluir-item").forEach((btn) => {
    btn.onclick = async (event) => {
      event.stopPropagation();

      const id = btn.dataset.id;
      if (!id) return;

      const confirmar = window.confirm("Deseja excluir este item da playlist?");
      if (!confirmar) return;

      const { error } = await supabaseClient
        .from(TABELA)
        .delete()
        .eq("id", id);

      if (error) {
        console.error(error);
        setStatus("Erro ao excluir item", "erro");
        return;
      }

      limparCachePlaylist(codigoSelecionado);
      setStatus("Item excluído", "ok");
      carregarPlaylist();
    };
  });
}

function limparEstadosDrag() {
  document.querySelectorAll("#playlistAtiva .playlist-item").forEach((el) => {
    el.classList.remove("drag-over", "drop-animating");
  });
}

function ativarDrag(lista) {
  const items = document.querySelectorAll("#playlistAtiva .playlist-item");

  items.forEach((item) => {
    item.addEventListener("dragstart", () => {
      dragIndex = Number(item.dataset.index);
      item.classList.add("dragging");
      document.body.classList.add("playlist-drag-ativa");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      document.body.classList.remove("playlist-drag-ativa");
      limparEstadosDrag();
      dragIndex = null;
    });

    item.addEventListener("dragover", (event) => {
      event.preventDefault();

      if (!item.classList.contains("drag-over")) {
        limparEstadosDrag();
        item.classList.add("drag-over");
      }
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over");
    });

    item.addEventListener("drop", async () => {
      item.classList.remove("drag-over");
      item.classList.add("drop-animating");

      const target = Number(item.dataset.index);

      if (Number.isNaN(dragIndex) || Number.isNaN(target) || dragIndex === target) {
        item.classList.remove("drop-animating");
        return;
      }

      const novo = [...lista];
      const movido = novo.splice(dragIndex, 1)[0];
      novo.splice(target, 0, movido);

      for (let i = 0; i < novo.length; i++) {
        const payloads = [
          { ordem: i },
          {}
        ];

        let updateError = null;

        for (const payload of payloads) {
          if (!Object.keys(payload).length) {
            updateError = null;
            break;
          }

          const { error } = await supabaseClient
            .from(TABELA)
            .update(payload)
            .eq("id", novo[i].id);

          if (!error) {
            updateError = null;
            break;
          }

          updateError = error;
        }

        if (updateError) {
          console.error(updateError);
          setStatus("Erro ao reordenar playlist", "erro");
          item.classList.remove("drop-animating");
          return;
        }
      }

      limparCachePlaylist(codigoSelecionado);

      setTimeout(() => {
        item.classList.remove("drop-animating");
      }, 220);

      carregarPlaylist();
    });
  });
}

async function carregarPontosRemoto() {
  if (carregandoPontos) return;
  carregandoPontos = true;

  try {
    const pontos = await buscarPontosRemoto();

    salvarCachePontos(pontos);
    renderizarCardsPontos(pontos);
    setStatus("Painel Ativo", "ok");
  } catch (error) {
    console.error(error);
    setStatus("Erro ao carregar pontos", "erro");
  } finally {
    carregandoPontos = false;
  }
}

async function iniciarPainel() {
  if (painelIniciado) return;
  painelIniciado = true;

  ativarLazyImages();
  ativarBotoesCards();

  const cache = lerCachePontos();

  if (cache?.pontos?.length) {
    renderizarCardsPontos(cache.pontos);
    setStatus(cache.fresco ? "Painel Ativo" : "Atualizando painel...", cache.fresco ? "ok" : "normal");

    if (cache.fresco) {
      return;
    }

    carregarPontosRemoto();
    return;
  }

  setStatus("Carregando pontos...", "normal");
  await carregarPontosRemoto();
}

if (localStorage.getItem("painelLiberado") === "1") {
  if (loginBox) loginBox.style.display = "none";
  if (conteudoPainel) conteudoPainel.style.display = "block";
  setStatus("Painel Ativo", "ok");
  iniciarPainel();
}
