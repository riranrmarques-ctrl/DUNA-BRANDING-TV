const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";
const BUCKET = "midias";

const TABELA = "playlists";
const TABELA_PONTOS = "pontos";
const TABELA_STATUS_PONTOS = "statuspontos";

const CACHE_PONTOS_KEY = "painel_pontos_cache_v10";
const CACHE_PONTOS_TTL = 15 * 60 * 1000;
const CACHE_PLAYLIST_PREFIX = "painel_playlist_cache_v9_";
const CACHE_PLAYLIST_TTL = 60 * 1000;
const LIMITE_STATUS_ATIVO_MS = 60 * 1000;

function limparCachesAntigos() {
  try {
    sessionStorage.removeItem("painel_pontos_cache_v1");
    sessionStorage.removeItem("painel_pontos_cache_v2");
    sessionStorage.removeItem("painel_pontos_cache_v3");
    sessionStorage.removeItem("painel_pontos_cache_v4");
    sessionStorage.removeItem("painel_pontos_cache_v5");
    sessionStorage.removeItem("painel_pontos_cache_v6");
    sessionStorage.removeItem("painel_pontos_cache_v7");
    sessionStorage.removeItem("painel_pontos_cache_v8");
    sessionStorage.removeItem("painel_pontos_cache_v9");

    Object.keys(sessionStorage).forEach((key) => {
      if (
        key.startsWith("painel_playlist_cache_v1_") ||
        key.startsWith("painel_playlist_cache_v2_") ||
        key.startsWith("painel_playlist_cache_v3_") ||
        key.startsWith("painel_playlist_cache_v4_") ||
        key.startsWith("painel_playlist_cache_v5_") ||
        key.startsWith("painel_playlist_cache_v6_") ||
        key.startsWith("painel_playlist_cache_v7_") ||
        key.startsWith("painel_playlist_cache_v8_")
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
  return String(
    ponto?.codigo ||
    ponto?.codigo_ponto ||
    ponto?.ponto_codigo ||
    ponto?.codigo_visual ||
    ponto?.id_ponto ||
    ponto?.id ||
    ""
  ).trim();
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

function calcularStatusPorHistorico(historicoStatus = [], ponto = {}) {
  const disponivel = pontoEstaDisponivel(ponto);

  if (!disponivel) {
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

  if (dataEventoRaw) {
    const dataEvento = new Date(dataEventoRaw);

    if (!Number.isNaN(dataEvento.getTime())) {
      const diff = Date.now() - dataEvento.getTime();
      const eventoRecente = diff < LIMITE_STATUS_ATIVO_MS;
      const horario = formatarDataHora(dataEventoRaw);

      if ((status === "ativo" || status === "conectou") && eventoRecente) {
        return {
          texto: "Ativo",
          detalhe: `Ativo desde ${horario}`,
          ativo: true,
          classe: "ativo"
        };
      }

      if (status === "inativo" || status === "desconectou") {
        return {
          texto: "Inativo",
          detalhe: `Inativo desde ${horario}`,
          ativo: false,
          classe: "inativo"
        };
      }

      if ((status === "ativo" || status === "conectou") && !eventoRecente) {
        return {
          texto: "Inativo",
          detalhe: "Inativo sem sinal recente do reprodutor",
          ativo: false,
          classe: "inativo"
        };
      }
    }
  }

  return calcularStatusInfo(ponto);
}

function obterStatusPontoParaPainel(codigo, ponto) {
  const disponivel = pontoEstaDisponivel(ponto);

  if (!disponivel) {
    return {
      texto: "Indisponível",
      detalhe: "Indisponível",
      ativo: false,
      classe: "indisponivel"
    };
  }

  const cachePlaylist = lerCachePlaylist(codigo);

  if (cachePlaylist?.historico?.length) {
    return calcularStatusPorHistorico(cachePlaylist.historico, ponto);
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

  if (status === "conectou") return "Conectou";
  if (status === "desconectou") return "Desconectou";
  if (status === "ativo") return "Ativo";
  if (status === "inativo") return "Inativo";

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

  if (error) {
    throw error;
  }

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

  if (nome.endsWith(".txt")) {
    return "site";
  }

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

    if (usadosLocais.has(codigo)) {
      continue;
    }

    const { data, error } = await supabaseClient
      .from(TABELA_PONTOS)
      .select("codigo")
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return codigo;
    }
  }

  throw new Error("Não foi possível gerar um código de ponto único.");
}

async function criarNovoPonto() {
  if (criandoNovoPonto) return;

  criandoNovoPonto = true;

  if (btnNovoPonto) {
    btnNovoPonto.disabled = true;
  }

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

    if (erroFinal) {
      throw erroFinal;
    }

    limparCachePlaylist(codigoLivre);
    await carregarPontosRemoto();
    abrirPonto(codigoLivre);
    setStatus(`Novo ponto ${codigoLivre} criado com sucesso`, "ok");
  } catch (error) {
    console.error(error);
    setStatus("Erro ao criar novo ponto", "erro");
  } finally {
    criandoNovoPonto = false;

    if (btnNovoPonto) {
      btnNovoPonto.disabled = false;
    }
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

    if (errorFinal) {
      throw errorFinal;
    }

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

async function buscarPontosRemoto() {
  const { data, error } = await supabaseClient
    .from(TABELA_PONTOS)
    .select("*")
    .order("codigo", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((ponto) => ({
    ...ponto,
    codigo: obterCodigoPonto(ponto),
    nome: obterNomePonto(ponto, obterCodigoPonto(ponto)),
    cidade: obterCidadePonto(ponto),
    endereco: obterEnderecoPonto(ponto),
    imagem_url: obterImagemPonto(ponto),
    ultimo_ping: obterUltimoPingPonto(ponto),
    disponivel: pontoEstaDisponivel(ponto)
  }));
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

  const ordenados = [...lista].sort((a, b) =>
    obterCodigoPonto(a).localeCompare(obterCodigoPonto(b), "pt-BR")
  );

  ordenados.forEach((ponto) => {
    const codigo = obterCodigoPonto(ponto);
    if (codigo) {
      pontosMap[codigo] = ponto;
    }
  });

  if (pontosBox) {
    pontosBox.innerHTML = ordenados.map((ponto) => montarCardPonto(ponto)).join("");
    ativarEventosCardsRenderizados();

    document.querySelectorAll(".card-imagem").forEach((imagemEl) => {
      const card = imagemEl.closest(".card-ponto");
      const codigo = String(card?.dataset.codigo || "").trim();
      aplicarPosicaoImagem(imagemEl, lerPosicaoImagem(codigo));
    });
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

  const statusInfo = obterStatusPontoParaPainel(codigoSelecionado, ponto);
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

if (btnNovoPonto) {
  btnNovoPonto.onclick = () => {
    criarNovoPonto();
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

      const payloadsInfo = [
        {
          nome,
          cidade,
          endereco
        },
        {
          nome_local: nome,
          cidade_regiao: cidade,
          endereco_completo: endereco
        }
      ];

      let erroInfoFinal = null;

      for (const payload of payloadsInfo) {
        const { error } = await supabaseClient
          .from(TABELA_PONTOS)
          .update(payload)
          .eq("codigo", codigoSelecionado);

        if (!error) {
          erroInfoFinal = null;
          break;
        }

        erroInfoFinal = error;
        console.warn("Erro ao salvar textos com payload:", payload, error);
      }

      if (erroInfoFinal) {
        console.error("Erro ao salvar textos:", erroInfoFinal);
        setStatus("Erro ao atualizar informações", "erro");
        return;
      }

      ponto.nome = nome;
      ponto.nome_local = nome;
      ponto.cidade = cidade;
      ponto.cidade_regiao = cidade;
      ponto.endereco = endereco;
      ponto.endereco_completo = endereco;

      if (arquivoImagemEdicao) {
        setStatus("Enviando imagem...", "normal");

        const imagemUrlFinal = await uploadImagemPonto(arquivoImagemEdicao, codigoSelecionado);

        const payloadsImagem = [
          { imagem_url: imagemUrlFinal },
          { imagem: imagemUrlFinal }
        ];

        let erroImagemFinal = null;

        for (const payload of payloadsImagem) {
          const { error } = await supabaseClient
            .from(TABELA_PONTOS)
            .update(payload)
            .eq("codigo", codigoSelecionado);

          if (!error) {
            erroImagemFinal = null;
            break;
          }

          erroImagemFinal = error;
          console.warn("Erro ao salvar imagem com payload:", payload, error);
        }

        if (erroImagemFinal) {
          console.error("Erro ao salvar imagem:", erroImagemFinal);
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
  const classe =
    eventoNormalizado === "conectou" || eventoNormalizado === "ativo"
      ? "ativo"
      : eventoNormalizado === "desconectou" || eventoNormalizado === "inativo"
        ? "inativo"
        : "";

  const data = formatarDataHora(obterDataHistorico(item));

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

async function buscarPlaylistRemota(codigo) {
  const { data: playlistData, error: playlistError } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigo)
    .order("ordem", { ascending: true });

  if (playlistError) {
    throw playlistError;
  }

  let historicoData = [];

  const consultasHistorico = [
    { ordem: "ultimo_ping", colunas: "*" },
    { ordem: "created_at", colunas: "*" }
  ];

  for (const consulta of consultasHistorico) {
    const { data, error } = await supabaseClient
      .from(TABELA_STATUS_PONTOS)
      .select(consulta.colunas)
      .eq("ponto_codigo", codigo)
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

      carregarPlaylist();
    });
  });
}

async function deletarPontoAtual() {
  if (!codigoSelecionado) return;

  const confirmar = window.confirm(`Deseja deletar o ponto ${codigoSelecionado}?`);
  if (!confirmar) return;

  try {
    setStatus("Deletando ponto...", "normal");

    await supabaseClient
      .from(TABELA)
      .delete()
      .eq("codigo", codigoSelecionado);

    await supabaseClient
      .from(TABELA_STATUS_PONTOS)
      .delete()
      .eq("ponto_codigo", codigoSelecionado);

    const { error } = await supabaseClient
      .from(TABELA_PONTOS)
      .delete()
      .eq("codigo", codigoSelecionado);

    if (error) throw error;

    limparCachePlaylist(codigoSelecionado);

    codigoSelecionado = null;

    if (modalEditar) modalEditar.style.display = "none";
    if (pontoDetalhe) pontoDetalhe.style.display = "none";
    if (listaPontos) listaPontos.style.display = "block";

    await carregarPontosRemoto();

    setStatus("Ponto deletado", "ok");
  } catch (error) {
    console.error("Erro ao deletar ponto:", error);
    setStatus("Erro ao deletar ponto", "erro");
  }
}

if (btnDeletarPonto) {
  btnDeletarPonto.onclick = deletarPontoAtual;
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

  setStatus("Painel Ativo", "ok");
  iniciarPainel();
