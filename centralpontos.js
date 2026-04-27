const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";
const BUCKET = "midias";

const TABELA = "playlists";
const TABELA_PONTOS = "pontos";
const TABELA_STATUS_PONTOS = "statuspontos";

const CACHE_PONTOS_KEY = "painel_pontos_cache_v11";
const CACHE_PONTOS_TTL = 30 * 60 * 1000;
const CACHE_PLAYLIST_PREFIX = "painel_playlist_cache_v10_";
const CACHE_PLAYLIST_TTL = 60 * 60 * 1000;

function limparCachesAntigos() {
  try {
    [
      "painel_pontos_cache_v1",
      "painel_pontos_cache_v2",
      "painel_pontos_cache_v3",
      "painel_pontos_cache_v4",
      "painel_pontos_cache_v5",
      "painel_pontos_cache_v6",
      "painel_pontos_cache_v7",
      "painel_pontos_cache_v8",
      "painel_pontos_cache_v9",
      "painel_pontos_cache_v10"
    ].forEach((key) => sessionStorage.removeItem(key));

    Object.keys(sessionStorage).forEach((key) => {
      if (
        key.startsWith("painel_playlist_cache_v1_") ||
        key.startsWith("painel_playlist_cache_v2_") ||
        key.startsWith("painel_playlist_cache_v3_") ||
        key.startsWith("painel_playlist_cache_v4_") ||
        key.startsWith("painel_playlist_cache_v5_") ||
        key.startsWith("painel_playlist_cache_v6_") ||
        key.startsWith("painel_playlist_cache_v7_") ||
        key.startsWith("painel_playlist_cache_v8_") ||
        key.startsWith("painel_playlist_cache_v9_")
      ) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    return;
  }
}

limparCachesAntigos();

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

if (sessionStorage.getItem("painelLiberado") !== "1") {
  window.location.replace("centralpainel.html");
}

const statusEl = document.querySelector(".status-topo") || document.getElementById("status");
const listaPontos = document.getElementById("listaPontos");
const btnBaixarContrato = document.getElementById("btnBaixarContrato");
const pontoDetalhe = document.getElementById("pontoDetalhe");
const pontosBox = document.querySelector(".pontos-box");

const codigoAtual = document.getElementById("codigoAtual");
const tituloPasta = document.getElementById("tituloPasta");

const btnVoltar = document.getElementById("btnVoltar");
const btnCopiarCodigo = document.getElementById("btnCopiarCodigo");
const btnEditarInfo = document.getElementById("btnEditarInfo");
const btnToggleDisponibilidade = document.getElementById("btnToggleDisponibilidade");
const btnNovoPonto = document.getElementById("btnNovoPonto");
const btnUpgradePlaylist = document.getElementById("btnUpgradePlaylist");
const inputUpgradePlaylist = document.getElementById("inputUpgradePlaylist");
const btnDeletarPonto = document.getElementById("btnDeletarPonto");

const modalEditar = document.getElementById("modalEditar");
const editNome = document.getElementById("editNome");
const editCidade = document.getElementById("editCidade");
const editEndereco = document.getElementById("editEndereco");

const editContratoInicio = document.getElementById("editContratoInicio");
const editContratoFim = document.getElementById("editContratoFim");
const editContratoParceriaSim = document.getElementById("editContratoParceriaSim");
const editContratoParceriaNao = document.getElementById("editContratoParceriaNao");
const editValorContrato = document.getElementById("editValorContrato");

const editResponsavelNome = document.getElementById("editResponsavelNome");
const editResponsavelCpf = document.getElementById("editResponsavelCpf");
const editResponsavelTelefone = document.getElementById("editResponsavelTelefone");
const editResponsavelEmail = document.getElementById("editResponsavelEmail");

const previewImagem = document.getElementById("previewImagem");
const inputImagem = document.getElementById("inputImagem");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const btnFecharModal = document.getElementById("btnFecharModal");

let codigoSelecionado = null;
let pontosMap = {};
let dragIndex = null;
let arquivoImagemEdicao = null;
let painelIniciado = false;
let carregandoPontos = false;
let carregandoPlaylist = false;
let criandoNovoPonto = false;

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

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function obterImagemPonto(ponto) {
  return (
    ponto?.imagem_url ||
    ponto?.imagem ||
    ponto?.foto_url ||
    ponto?.imagem_ponto ||
    "https://placehold.co/600x320/png"
  );
}

function obterCodigoPonto(ponto) {
  return normalizarCodigo(
    ponto?.codigo ||
    ponto?.codigo_ponto ||
    ponto?.ponto_codigo ||
    ponto?.codigo_visual ||
    ponto?.id_ponto ||
    ponto?.id ||
    ""
  );
}

function obterNomePonto(ponto, codigo) {
  return (
    ponto?.nome ||
    ponto?.nome_local ||
    ponto?.nome_painel ||
    ponto?.titulo ||
    ponto?.ambiente ||
    codigo ||
    "Carregando..."
  );
}

function obterCidadePonto(ponto) {
  return ponto?.cidade || ponto?.cidade_regiao || ponto?.municipio || ponto?.localidade || "";
}

function obterEnderecoPonto(ponto) {
  return ponto?.endereco || ponto?.endereco_completo || ponto?.endereço || ponto?.local || "";
}

function obterUltimoPingPonto(ponto) {
  return (
    ponto?.ultimo_ping ||
    ponto?.last_ping ||
    ponto?.updated_at ||
    ponto?.data_ping ||
    ponto?.created_at ||
    null
  );
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
  const statusCliente = String(ponto?.status || ponto?.situacao || "").toLowerCase().trim();

  if (ponto?.disponivel === false) return false;
  if (statusCliente === "inativo") return false;
  return true;
}

function normalizarStatusHistorico(item) {
  return String(item?.status || item?.evento || "")
    .toLowerCase()
    .trim();
}

function obterDataHistorico(item) {
  return item?.ultimo_ping || item?.data_hora || item?.created_at || null;
}

function statusEhAtivo(status) {
  const valor = String(status || "").toLowerCase().trim();
  return valor === "ativo" || valor === "online" || valor === "conectou";
}

function statusEhInativo(status) {
  const valor = String(status || "").toLowerCase().trim();
  return valor === "inativo" || valor === "offline" || valor === "desconectou";
}

function calcularStatusInfo(ponto) {
  if (!pontoEstaDisponivel(ponto)) {
    return {
      texto: "Indisponível",
      detalhe: "Indisponível",
      ativo: false,
      classe: "indisponivel",
      desde: null
    };
  }

  const status = String(ponto?.status_evento || ponto?.status_final || ponto?.status || "")
    .toLowerCase()
    .trim();

  const ultimoPing = ponto?.ultimo_ping || obterUltimoPingPonto(ponto);
  const horario = ultimoPing ? formatarDataHora(ultimoPing) : "sem histórico";

  if (statusEhAtivo(status)) {
    return {
      texto: "Ativo",
      detalhe: `Ativo desde ${horario}`,
      ativo: true,
      classe: "ativo",
      desde: ultimoPing
    };
  }

  if (statusEhInativo(status)) {
    return {
      texto: "Inativo",
      detalhe: `Inativo desde ${horario}`,
      ativo: false,
      classe: "inativo",
      desde: ultimoPing
    };
  }

  return {
    texto: "Inativo",
    detalhe: "Inativo desde sem histórico",
    ativo: false,
    classe: "inativo",
    desde: null
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

function calcularStatusPorHistorico(historicoStatus = [], ponto = {}) {
  if (!pontoEstaDisponivel(ponto)) {
    return {
      texto: "Indisponível",
      detalhe: "Indisponível",
      ativo: false,
      classe: "indisponivel"
    };
  }

  const ultimoEvento = Array.isArray(historicoStatus) ? historicoStatus[0] : null;
  const status = normalizarStatusHistorico(ultimoEvento);
  const dataEventoRaw = obterDataHistorico(ultimoEvento);
  const horario = dataEventoRaw ? formatarDataHora(dataEventoRaw) : "sem histórico";

  if (statusEhAtivo(status)) {
    return {
      texto: "Ativo",
      detalhe: `Ativo desde ${horario}`,
      ativo: true,
      classe: "ativo"
    };
  }

  if (statusEhInativo(status)) {
    return {
      texto: "Inativo",
      detalhe: `Inativo desde ${horario}`,
      ativo: false,
      classe: "inativo"
    };
  }

  return calcularStatusInfo(ponto);
}

function obterStatusPontoParaPainel(codigo, ponto) {
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
  const dataFim = item?.data_fim || item?.fim_exibicao || null;
  if (!dataFim) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fim = new Date(dataFim);
  if (Number.isNaN(fim.getTime())) return false;

  fim.setHours(23, 59, 59, 999);
  return fim < hoje;
}

function obterTextoEventoConexao(item) {
  const status = normalizarStatusHistorico(item);

  if (statusEhAtivo(status)) return "Ativo";
  if (statusEhInativo(status)) return "Inativo";

  return status || "Sem status";
}

function lerCachePontos() {
  try {
    const bruto = sessionStorage.getItem(CACHE_PONTOS_KEY);
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
    sessionStorage.setItem(CACHE_PONTOS_KEY, JSON.stringify({
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
    const bruto = sessionStorage.getItem(obterChaveCachePlaylist(codigo));
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
    sessionStorage.setItem(obterChaveCachePlaylist(codigo), JSON.stringify({
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
    sessionStorage.removeItem(obterChaveCachePlaylist(codigo));
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

function aplicarPosicaoImagem(el, posicao) {
  if (!el || !posicao) return;
  el.style.objectPosition = `${posicao.x}% ${posicao.y}%`;
}

async function uploadArquivoEmBucket(file, path, opcoes = {}) {
  const { error } = await supabaseClient.storage
    .from(BUCKET)
    .upload(path, file, opcoes);

  if (error) throw error;

  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);

  return {
    bucket: BUCKET,
    publicUrl: data.publicUrl
  };
}

async function uploadImagemPonto(file, codigo) {
  const extensao = (file.name.split(".").pop() || "jpg").toLowerCase();
  const nomeArquivo = `${codigo}/${Date.now()}.${extensao}`;

  const resultado = await uploadArquivoEmBucket(file, nomeArquivo, {
    cacheControl: "86400",
    upsert: true
  });

  return resultado.publicUrl;
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

  if (nome.endsWith(".txt")) return "site";

  return "video";
}

function gerarCodigoPontoAleatorio() {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numeros = "0123456789";

  return (
    letras[Math.floor(Math.random() * letras.length)] +
    numeros[Math.floor(Math.random() * numeros.length)] +
    letras[Math.floor(Math.random() * letras.length)] +
    numeros[Math.floor(Math.random() * numeros.length)] +
    letras[Math.floor(Math.random() * letras.length)] +
    numeros[Math.floor(Math.random() * numeros.length)] +
    letras[Math.floor(Math.random() * letras.length)]
  );
}

async function obterCodigoPontoUnico() {
  const usadosLocais = new Set(Object.keys(pontosMap));

  for (let tentativa = 0; tentativa < 80; tentativa++) {
    const codigo = gerarCodigoPontoAleatorio();

    if (usadosLocais.has(codigo)) continue;

    const { data, error } = await supabaseClient
      .from(TABELA_PONTOS)
      .select("codigo")
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) throw error;
    if (!data) return codigo;
  }

  throw new Error("Não foi possível gerar um código de ponto único.");
}

async function criarNovoPonto() {
  if (criandoNovoPonto) return;

  criandoNovoPonto = true;

  if (btnNovoPonto) btnNovoPonto.disabled = true;

  try {
    setStatus("Criando novo ponto...", "normal");

    const codigoLivre = await obterCodigoPontoUnico();

    const payloads = [
      {
        codigo: codigoLivre,
        nome: codigoLivre,
        cidade: "",
        endereco: "",
        imagem_url: "https://placehold.co/600x320/png",
        status: "ativo",
        disponivel: true
      },
      {
        codigo: codigoLivre,
        nome_local: codigoLivre,
        cidade_regiao: "",
        endereco_completo: "",
        imagem_url: "https://placehold.co/600x320/png",
        status: "ativo",
        disponivel: true
      },
      {
        codigo: codigoLivre,
        nome: codigoLivre
      }
    ];

    let erroFinal = null;

    for (const payload of payloads) {
      const { error } = await supabaseClient
        .from(TABELA_PONTOS)
        .insert([payload]);

      if (!error) {
        erroFinal = null;
        break;
      }

      erroFinal = error;
      console.warn("Falha ao criar ponto com payload:", payload, error);
    }

    if (erroFinal) throw erroFinal;

    limparCachePlaylist(codigoLivre);
    sessionStorage.removeItem(CACHE_PONTOS_KEY);

    await carregarPontosRemoto();
    abrirPonto(codigoLivre);
    setStatus(`Novo ponto ${codigoLivre} criado com sucesso`, "ok");
  } catch (error) {
    console.error(error);
    setStatus("Erro ao criar novo ponto", "erro");
  } finally {
    criandoNovoPonto = false;
    if (btnNovoPonto) btnNovoPonto.disabled = false;
  }
}

async function obterProximaOrdemPlaylist() {
  const { data, error } = await supabaseClient
    .from(TABELA)
    .select("ordem")
    .eq("codigo", codigoSelecionado)
    .order("ordem", { ascending: false })
    .limit(1);

  if (error) {
    console.warn("Não foi possível buscar ordem da playlist:", error);
    return 1;
  }

  return Number(data?.[0]?.ordem || 0) + 1;
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

    const uploadResultado = await uploadArquivoEmBucket(file, path, {
      cacheControl: "86400",
      upsert: false
    });

    const ordem = await obterProximaOrdemPlaylist();

    const payload = {
      codigo: codigoSelecionado,
      nome: file.name,
      titulo_arquivo: file.name,
      video_url: uploadResultado.publicUrl,
      storage_path: path,
      codigo_cliente: null,
      tipo,
      ordem
    };

    const { data, error } = await supabaseClient
      .from(TABELA)
      .insert([payload])
      .select();

    if (error) {
      console.error("ERRO INSERT PLAYLIST:", error);
      await supabaseClient.storage.from(BUCKET).remove([path]);
      setStatus(`Erro ao gravar playlist: ${error.message || "falha no banco"}`, "erro");
      return;
    }

    console.log("ITEM INSERIDO:", data);

    limparCachePlaylist(codigoSelecionado);
    await carregarPlaylist({ forcarAtualizacao: true });

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
  sessionStorage.setItem(obterChavePosicaoImagem(codigo), JSON.stringify(posicao));
}

function lerPosicaoImagem(codigo) {
  if (!codigo) return { x: 50, y: 50 };

  try {
    const salva = sessionStorage.getItem(obterChavePosicaoImagem(codigo));
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
  atualizarCachePonto(codigoSelecionado, {
    disponivel: novoStatus,
    status: novoStatus ? "ativo" : "inativo"
  });

  try {
    setStatus(novoStatus ? "Marcando como disponível..." : "Marcando como indisponível...", "normal");

    const tentativas = [
      { disponivel: novoStatus },
      { status: novoStatus ? "ativo" : "inativo" },
      { disponivel: novoStatus, status: novoStatus ? "ativo" : "inativo" }
    ];

    let errorFinal = null;

    for (const payload of tentativas) {
      const { error } = await supabaseClient
        .from(TABELA_PONTOS)
        .update(payload)
        .eq("codigo", codigoSelecionado);

      if (!error) {
        errorFinal = null;
        break;
      }

      errorFinal = error;
      console.warn("Falha ao atualizar ponto com payload:", payload, error);
    }

    if (errorFinal) throw errorFinal;

    sessionStorage.removeItem(CACHE_PONTOS_KEY);
    renderizarCardsPontos(Object.values(pontosMap));

    const statusInfo = obterStatusPontoParaPainel(codigoSelecionado, pontosMap[codigoSelecionado]);
    atualizarStatusDetalhePonto(statusInfo);
    setStatus(novoStatus ? "Ponto disponível" : "Ponto indisponível", "ok");
  } catch (error) {
    console.error("Erro ao atualizar disponibilidade:", error);

    atualizarVisualDisponibilidade(disponivelAtual);
    atualizarCachePonto(codigoSelecionado, {
      disponivel: disponivelAtual,
      status: disponivelAtual ? "ativo" : "inativo"
    });

    renderizarCardsPontos(Object.values(pontosMap));

    const statusInfo = obterStatusPontoParaPainel(codigoSelecionado, pontosMap[codigoSelecionado]);
    atualizarStatusDetalhePonto(statusInfo);
    setStatus("Erro ao atualizar disponibilidade", "erro");
  }
}

async function buscarStatusPontosRemoto() {
  const consultas = [
    { filtro: "ponto_codigo", ordem: "ultimo_ping" },
    { filtro: "codigo", ordem: "data_hora" },
    { filtro: "ponto_codigo", ordem: "created_at" }
  ];

  for (const consulta of consultas) {
    const { data, error } = await supabaseClient
      .from(TABELA_STATUS_PONTOS)
      .select("*")
      .order(consulta.ordem, { ascending: false });

    if (!error) {
      const statusPorCodigo = {};

      (data || []).forEach((item) => {
        const codigo = normalizarCodigo(
          item.ponto_codigo ||
          item.codigo ||
          item.codigo_ponto ||
          ""
        );

        if (!codigo || statusPorCodigo[codigo]) return;

        statusPorCodigo[codigo] = item;
      });

      return statusPorCodigo;
    }

    console.warn("Status dos pontos não carregou:", error);
  }

  return {};
}

async function buscarPontosRemoto() {
  const { data: pontosData, error: pontosError } = await supabaseClient
    .from(TABELA_PONTOS)
    .select("*")
    .order("codigo", { ascending: true });

  if (pontosError) throw pontosError;

  const statusPorCodigo = await buscarStatusPontosRemoto();

  return (pontosData || []).map((ponto) => {
    const codigo = obterCodigoPonto(ponto);
    const statusMaisRecente = statusPorCodigo[codigo];
    const statusEvento = normalizarStatusHistorico(statusMaisRecente) || ponto.status || "";

    return {
      ...ponto,
      codigo,
      nome: obterNomePonto(ponto, codigo),
      cidade: obterCidadePonto(ponto),
      endereco: obterEnderecoPonto(ponto),
      imagem_url: obterImagemPonto(ponto),
      ultimo_ping: obterDataHistorico(statusMaisRecente) || obterUltimoPingPonto(ponto),
      status_evento: statusEvento,
      status_final: statusEvento,
      disponivel: pontoEstaDisponivel(ponto)
    };
  });
}

function montarCardPonto(ponto) {
  const codigo = obterCodigoPonto(ponto);
  const nome = obterNomePonto(ponto, codigo);
  const cidade = obterCidadePonto(ponto);
  const endereco = obterEnderecoPonto(ponto);
  const statusInfo = obterStatusPontoParaPainel(codigo, ponto);
  const imagem = obterImagemPonto(ponto);

  return `
    <div class="card-ponto ${statusInfo.classe === "indisponivel" ? "card-indisponivel" : ""}" data-codigo="${escapeHtml(codigo)}">
      <div class="card-status-topo">
        <span class="status-bolinha ${statusInfo.classe}"></span>
        <span class="card-status ${statusInfo.classe}">${escapeHtml(statusInfo.texto)}</span>
      </div>

      <div class="card-imagem-box">
        <img
          class="card-imagem"
          src="${escapeHtml(imagem)}"
          alt="${escapeHtml(nome)}"
          loading="lazy"
          decoding="async"
        >
      </div>

      <div class="card-conteudo">
        <div class="card-nome"><strong>${escapeHtml(nome)}</strong></div>

        <div class="card-info-linha">
          <div class="card-cidade">${obterLocalizacaoPonto(cidade, endereco)}</div>

          <div class="card-codigo-area">
            <div class="card-codigo" title="Clique para copiar">${escapeHtml(codigo)}</div>
          </div>
        </div>
      </div>

      <div class="card-acoes">
        <button class="btn-abrir" data-codigo="${escapeHtml(codigo)}" type="button">Abrir pasta</button>
      </div>
    </div>
  `;
}

function ativarEventosCardsRenderizados() {
  document.querySelectorAll(".btn-abrir").forEach((btn) => {
    btn.onclick = (event) => {
      event.stopPropagation();
      abrirPonto(btn.dataset.codigo);
    };
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
}

function renderizarCardsPontos(lista) {
  pontosMap = {};

  const ordenados = [...lista].sort((a, b) => {
    const ordemA = Number(a.ordem || 999999);
    const ordemB = Number(b.ordem || 999999);

    if (ordemA !== ordemB) return ordemA - ordemB;

    return obterCodigoPonto(a).localeCompare(obterCodigoPonto(b), "pt-BR");
  });

  ordenados.forEach((ponto) => {
    const codigo = obterCodigoPonto(ponto);
    if (codigo) pontosMap[codigo] = ponto;
  });

  if (pontosBox) {
    pontosBox.innerHTML = ordenados.map((ponto) => montarCardPonto(ponto)).join("");

    ativarEventosCardsRenderizados();

    document.querySelectorAll(".card-imagem").forEach((img) => {
      img.setAttribute("draggable", "false");
    });

    ativarDragPontos();

    document.querySelectorAll(".card-imagem").forEach((imagemEl) => {
      const card = imagemEl.closest(".card-ponto");
      const codigo = String(card?.dataset.codigo || "").trim();
      aplicarPosicaoImagem(imagemEl, lerPosicaoImagem(codigo));
    });
  }
}

function abrirPonto(codigo) {
  codigoSelecionado = normalizarCodigo(codigo);

  const ponto = pontosMap[codigoSelecionado] || {};
  const nome = obterNomePonto(ponto, codigoSelecionado);
  const cidade = obterCidadePonto(ponto);
  const endereco = obterEnderecoPonto(ponto);

  if (listaPontos) listaPontos.style.display = "none";
  if (pontoDetalhe) pontoDetalhe.style.display = "block";

  document.body.classList.add("modo-detalhe");

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

  const statusInfo = obterStatusPontoParaPainel(codigoSelecionado, ponto);
  const posicaoSalva = lerPosicaoImagem(codigoSelecionado);

  atualizarVisualDisponibilidade(pontoEstaDisponivel(ponto));

  if (cidadePonto) cidadePonto.innerHTML = obterLocalizacaoPonto(cidade, endereco);
  if (enderecoPonto) enderecoPonto.textContent = endereco || "";

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

  if (item.nome && String(item.nome).trim()) {
    return String(item.nome).trim();
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
          ${formatarDataHora(item.created_at || item.data_inicio)}
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
  const textoEvento = obterTextoEventoConexao(item);
  const eventoNormalizado = normalizarStatusHistorico(item);
  const classe = statusEhAtivo(eventoNormalizado)
    ? "ativo"
    : statusEhInativo(eventoNormalizado)
      ? "inativo"
      : "";

  const data = formatarDataHora(obterDataHistorico(item));

  return `
    <div class="historico-item">
      <span class="historico-item-ordem">${index + 1}.</span>
      <span class="historico-item-nome historico-status ${classe}">
        ${escapeHtml(textoEvento)} em ${escapeHtml(data)}
      </span>
      <span class="historico-item-valor">${escapeHtml(data)}</span>
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

function renderizarPlaylistDados(lista, historicoStatus) {
  const ponto = pontosMap[codigoSelecionado] || {};
  const statusInfo = calcularStatusPorHistorico(historicoStatus, ponto);
  atualizarStatusDetalhePonto(statusInfo);

  const ativos = lista.filter((item) => !itemEstaInativo(item));
  const inativos = lista.filter((item) => itemEstaInativo(item));

  const playlistAtiva = document.getElementById("playlistAtiva");
  const historicoEncerramento = obterContainerHistoricoEncerramento();
  const historicoStatusEl = obterContainerHistoricoStatus();

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

  if (historicoStatusEl) {
    historicoStatusEl.innerHTML = historicoStatus.length
      ? historicoStatus.map((item, index) => montarItemHistoricoStatus(item, index)).join("")
      : `<div class="playlist-vazia">Sem histórico</div>`;
  }

  ativarDrag(ativos);
  ativarRenomearItens();
  ativarExclusaoItens();
}

async function buscarHistoricoStatusPonto(codigo) {
  const consultasHistorico = [
    { filtro: "ponto_codigo", ordem: "ultimo_ping", colunas: "*" },
    { filtro: "codigo", ordem: "data_hora", colunas: "*" },
    { filtro: "ponto_codigo", ordem: "created_at", colunas: "*" }
  ];

  for (const consulta of consultasHistorico) {
    const { data, error } = await supabaseClient
      .from(TABELA_STATUS_PONTOS)
      .select(consulta.colunas)
      .eq(consulta.filtro, codigo)
      .order(consulta.ordem, { ascending: false })
      .limit(30);

    if (!error) return data || [];

    console.warn(`Erro ao buscar histórico usando ${consulta.ordem}:`, error);
  }

  return [];
}

async function buscarPlaylistRemota(codigo) {
  const { data: playlistData, error: playlistError } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigo)
    .order("ordem", { ascending: true });

  if (playlistError) throw playlistError;

  const historicoData = await buscarHistoricoStatusPonto(codigo);

  return {
    playlist: playlistData || [],
    historico: historicoData || []
  };
}

async function carregarPlaylist(opcoes = {}) {
  if (!codigoSelecionado || carregandoPlaylist) return;

  const forcarAtualizacao = opcoes.forcarAtualizacao === true;
  const codigo = codigoSelecionado;
  const cache = lerCachePlaylist(codigo);

  if (!forcarAtualizacao && cache) {
    renderizarPlaylistDados(cache.playlist, cache.historico);
    setStatus(cache.fresco ? "Painel Ativo" : "Playlist em cache. Atualização pendente.", cache.fresco ? "ok" : "normal");

    if (cache.fresco) return;
  } else if (!cache) {
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
      carregarPlaylist({ forcarAtualizacao: true });
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
      carregarPlaylist({ forcarAtualizacao: true });
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
        const { error } = await supabaseClient
          .from(TABELA)
          .update({ ordem: i + 1 })
          .eq("id", novo[i].id);

        if (error) {
          console.error(error);
          setStatus("Erro ao reordenar playlist", "erro");
          item.classList.remove("drop-animating");
          return;
        }
      }

      limparCachePlaylist(codigoSelecionado);

      setTimeout(() => {
        item.classList.remove("drop-animating");
      }, 220);

      carregarPlaylist({ forcarAtualizacao: true });
    });
  });
}
