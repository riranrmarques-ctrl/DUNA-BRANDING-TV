const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const TABELA_CLIENTES = "clientes_app";
const TABELA_CLIENTE_PONTOS = "cliente_pontos";
const TABELA_PONTOS = "pontos";
const TABELA_PLAYLIST = "playlists";
const TABELA_HISTORICO = "historico_conexao";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginScreen = document.getElementById("loginScreen");
const areaCliente = document.getElementById("areaCliente");
const codigoLogin = document.getElementById("codigoLogin");
const btnEntrarCliente = document.getElementById("btnEntrarCliente");
const loginErro = document.getElementById("loginErro");

const btnAtualizar = document.getElementById("btnAtualizar");
const btnSair = document.getElementById("btnSair");
const tituloBoasVindas = document.getElementById("tituloBoasVindas");
const subtituloCliente = document.getElementById("subtituloCliente");
const contratoBadge = document.getElementById("contratoBadge");
const contratoInfo = document.getElementById("contratoInfo");
const codigoClienteEl = document.getElementById("codigoCliente");
const mensagemCliente = document.getElementById("mensagemCliente");
const contadorPontos = document.getElementById("contadorPontos");
const listaPontosCliente = document.getElementById("listaPontosCliente");

const estadoVazio = document.getElementById("estadoVazio");
const detalhePonto = document.getElementById("detalhePonto");
const nomePontoDetalhe = document.getElementById("nomePontoDetalhe");
const localPontoDetalhe = document.getElementById("localPontoDetalhe");
const statusPontoDetalhe = document.getElementById("statusPontoDetalhe");
const tituloPreview = document.getElementById("tituloPreview");
const previewNome = document.getElementById("previewNome");
const previewMidia = document.getElementById("previewMidia");
const listaMateriais = document.getElementById("listaMateriais");
const historicoStatusPonto = document.getElementById("historicoStatusPonto");

let codigoClienteAtual = "";
let clienteAtual = null;
let pontosContratados = [];
let historicosPorPonto = {};
let pontoSelecionado = "";

let playlistAtual = [];
let playlistIndexAtual = 0;
let rotacaoPreviewTimer = null;

function setMensagem(texto, tipo = "normal") {
  if (!mensagemCliente) return;

  mensagemCliente.textContent = texto || "";
  mensagemCliente.classList.remove("ok", "erro");

  if (tipo === "ok") mensagemCliente.classList.add("ok");
  if (tipo === "erro") mensagemCliente.classList.add("erro");
}

function setLoginErro(texto) {
  if (loginErro) loginErro.textContent = texto || "";
}

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
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

function contratoEstaDisponivel(cliente) {
  if (!cliente) return false;
  if (cliente.contrato_ativo === false) return false;
  if (cliente.status === "Não ativo") return false;
  if (cliente.status === "Nao ativo") return false;
  if (cliente.status === "Inativo") return false;
  return true;
}

function obterImagemPonto(ponto) {
  return ponto?.imagem_url || ponto?.imagem || ponto?.foto_url || "https://placehold.co/600x320/png";
}

function obterNomePonto(ponto) {
  return ponto?.nome || ponto?.nome_painel || ponto?.titulo || ponto?.codigo || "Ponto";
}

function obterCidadePonto(ponto) {
  return ponto?.cidade || ponto?.municipio || ponto?.localidade || "";
}

function obterEnderecoPonto(ponto) {
  return ponto?.endereco || ponto?.endereço || ponto?.local || "";
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
  return ponto?.ultimo_ping || ponto?.last_ping || ponto?.updated_at || ponto?.data_ping || null;
}

function pontoEstaDisponivel(ponto) {
  return ponto?.disponivel !== false;
}

function obterDataHistorico(item) {
  return item?.data_hora || item?.created_at || null;
}

function eventoEhAtivo(evento) {
  const valor = String(evento || "").toLowerCase();
  return valor === "ativo" || valor === "conectou" || valor === "online";
}

function eventoEhInativo(evento) {
  const valor = String(evento || "").toLowerCase();
  return valor === "inativo" || valor === "desconectou" || valor === "offline";
}

function obterTextoEvento(evento) {
  if (eventoEhAtivo(evento)) return "Ativado";
  if (eventoEhInativo(evento)) return "Inativo";
  if (evento === "conectou") return "Ativado";
  if (evento === "desconectou") return "Inativo";
  return evento || "Registro";
}

function calcularStatusPonto(ponto, historico = []) {
  if (!pontoEstaDisponivel(ponto)) {
    return {
      texto: "Indisponível",
      detalhe: "desde sem histórico",
      classe: "indisponivel"
    };
  }

  const ultimoEvento = historico[0] || null;
  const ultimoPing = obterUltimoPingPonto(ponto);
  const dataReferencia = ultimoPing || obterDataHistorico(ultimoEvento);

  if (!dataReferencia) {
    return {
      texto: "Inativo",
      detalhe: "desde sem histórico",
      classe: "inativo"
    };
  }

  const data = new Date(dataReferencia);

  if (Number.isNaN(data.getTime())) {
    return {
      texto: "Inativo",
      detalhe: "desde sem histórico",
      classe: "inativo"
    };
  }

  if (ultimoEvento && eventoEhAtivo(ultimoEvento.evento)) {
    return {
      texto: "Ativo",
      detalhe: `desde ${formatarDataHora(dataReferencia)}`,
      classe: "ativo"
    };
  }

  if (ultimoEvento && eventoEhInativo(ultimoEvento.evento)) {
    return {
      texto: "Inativo",
      detalhe: `desde ${formatarDataHora(dataReferencia)}`,
      classe: "inativo"
    };
  }

  const diff = Date.now() - data.getTime();

  if (diff < 5 * 60 * 1000) {
    return {
      texto: "Ativo",
      detalhe: `desde ${formatarDataHora(dataReferencia)}`,
      classe: "ativo"
    };
  }

  return {
    texto: "Inativo",
    detalhe: `desde ${formatarDataHora(dataReferencia)}`,
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
  if (tipo === "site" || tipo === "texto" || tipo === "text") return "site";

  if (
    limpa.endsWith(".jpg") ||
    limpa.endsWith(".jpeg") ||
    limpa.endsWith(".png") ||
    limpa.endsWith(".webp")
  ) {
    return "imagem";
  }

  if (limpa.endsWith(".txt")) return "site";

  if (limpa.includes("youtube.com") || limpa.includes("youtu.be")) {
    return "site";
  }

  if (limpa.match(/\.(mp4|mov|webm|m4v)$/)) {
    return "video";
  }

  if (limpa.startsWith("http")) return "site";

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
  const candidatos = [
    item?.titulo_arquivo,
    item?.nome_arquivo,
    item?.nome_exibicao,
    item?.nome_material,
    item?.titulo,
    item?.display_name,
    item?.title,
    item?.nome
  ]
    .map((valor) => String(valor || "").trim())
    .filter(Boolean);

  if (candidatos.length) return candidatos[0];

  const storagePath = String(item?.storage_path || "").trim();
  if (storagePath) {
    const partes = storagePath.split("/");
    return decodeURIComponent(partes[partes.length - 1] || storagePath);
  }

  const url = String(obterUrlPlaylist(item) || "").split("?")[0];
  if (url) {
    const partes = url.split("/");
    return decodeURIComponent(partes[partes.length - 1] || "Arquivo");
  }

  return "Arquivo";
}

function obterChaveMaterial(item) {
  return [
    item?.id,
    item?.storage_path,
    item?.video_url,
    item?.arquivo_url,
    item?.url,
    item?.nome_arquivo,
    item?.titulo_arquivo,
    item?.nome
  ]
    .map((valor) => String(valor || "").trim())
    .find(Boolean) || "";
}

function obterMapaOrdemPlaylist(lista) {
  const mapa = new Map();

  (lista || []).forEach((item, index) => {
    const chave = obterChaveMaterial(item);
    if (!chave) return;

    const ordemBanco = Number(item?.ordem);
    const ordemReal = Number.isFinite(ordemBanco) && ordemBanco > 0 ? ordemBanco : index + 1;

    if (!mapa.has(chave)) {
      mapa.set(chave, ordemReal);
    }
  });

  return mapa;
}

function pertenceAoClienteAtual(item) {
  const codigoItem = normalizarCodigo(item?.codigo_cliente || item?.cliente_codigo);
  const codigoAtual = normalizarCodigo(codigoClienteAtual);

  if (codigoItem && codigoAtual && codigoItem === codigoAtual) return true;

  const nomeAtual = normalizarTexto(obterNomeCliente(clienteAtual));
  const nomesItem = [
    item?.nome_cliente,
    item?.cliente_nome,
    item?.cliente,
    item?.nome
  ]
    .map(normalizarTexto)
    .filter(Boolean);

  if (nomeAtual && nomesItem.includes(nomeAtual)) return true;

  return !codigoItem && !nomesItem.length;
}

function filtrarMateriaisDoCliente(lista) {
  const filtrados = (lista || []).filter(pertenceAoClienteAtual);
  return filtrados.length ? filtrados : lista || [];
}

function limparTelaDetalhe() {
  pontoSelecionado = "";
  playlistAtual = [];
  playlistIndexAtual = 0;
  pararRotacaoPreview();

  if (estadoVazio) estadoVazio.style.display = "flex";
  if (detalhePonto) detalhePonto.style.display = "none";
}

function abrirAreaCliente() {
  if (loginScreen) loginScreen.style.display = "none";
  if (areaCliente) areaCliente.style.display = "block";
}

function abrirLogin() {
  codigoClienteAtual = "";
  clienteAtual = null;
  pontosContratados = [];
  historicosPorPonto = {};
  pontoSelecionado = "";
  pararRotacaoPreview();

  if (areaCliente) areaCliente.style.display = "none";
  if (loginScreen) loginScreen.style.display = "flex";

  if (codigoLogin) {
    codigoLogin.value = "";
    setTimeout(() => codigoLogin.focus(), 100);
  }

  setLoginErro("");
  setMensagem("");
  limparTelaDetalhe();
}

function renderizarContrato() {
  if (!clienteAtual) return;

  const disponivel = contratoEstaDisponivel(clienteAtual);
  const nome = obterNomeCliente(clienteAtual);
  const telefone = obterTelefoneCliente(clienteAtual);
  const vencimento = clienteAtual.vencimento_exibicao || clienteAtual.vencimento || clienteAtual.data_fim;
  const valor = clienteAtual.valor_contratado || clienteAtual.valor || "";

  if (tituloBoasVindas) {
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
    codigoClienteEl.textContent = codigoClienteAtual;
  }

  if (contratoBadge) {
    contratoBadge.textContent = disponivel ? "Contrato disponível" : "Contrato indisponível";
    contratoBadge.classList.toggle("inativo", !disponivel);
  }

  const partes = [];

  if (disponivel) {
    partes.push("Seu contrato está disponível para acompanhamento.");
  } else {
    partes.push("Seu contrato não está marcado como ativo no painel.");
  }

  if (telefone) partes.push(`Contato: ${telefone}.`);
  if (valor) partes.push(`Valor contratado: ${valor}.`);
  if (vencimento) partes.push(`Vencimento: ${formatarData(vencimento)}.`);

  if (contratoInfo) {
    contratoInfo.textContent = partes.join(" ");
  }
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
        <span class="status-mini ${status.classe}">${escapeHtml(status.texto)} ${escapeHtml(status.detalhe)}</span>
      </div>
    </button>
  `;
}

function ordenarPontosPorStatus(pontos) {
  return [...pontos]
    .map((ponto, index) => {
      const codigo = normalizarCodigo(ponto.codigo);
      const historico = historicosPorPonto[codigo] || [];
      const status = calcularStatusPonto(ponto, historico);

      return {
        ponto,
        index,
        prioridade: status.classe === "ativo" ? 0 : 1
      };
    })
    .sort((a, b) => {
      if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
      return a.index - b.index;
    })
    .map((item) => item.ponto);
}

function renderizarListaPontos() {
  if (contadorPontos) {
    contadorPontos.textContent = "";
    contadorPontos.style.display = "none";
  }

  if (!listaPontosCliente) return;

  if (!pontosContratados.length) {
    listaPontosCliente.innerHTML = `<div class="vazio">Nenhum ponto contratado encontrado para este cliente.</div>`;
    return;
  }

  const pontosOrdenados = ordenarPontosPorStatus(pontosContratados);
  listaPontosCliente.innerHTML = pontosOrdenados.map(montarCardPonto).join("");

  document.querySelectorAll(".ponto-card").forEach((card) => {
    card.onclick = () => {
      abrirPonto(card.dataset.codigo);
    };
  });
}

function obterDuracaoItem(item) {
  const valor = Number(item?.duracao_segundos || item?.duracao || item?.tempo_exibicao);
  if (Number.isFinite(valor) && valor > 0) return valor;
  return 12;
}

function pararRotacaoPreview() {
  if (rotacaoPreviewTimer) {
    clearTimeout(rotacaoPreviewTimer);
    rotacaoPreviewTimer = null;
  }
}

function avancarPreview() {
  if (!playlistAtual.length) return;
  playlistIndexAtual = (playlistIndexAtual + 1) % playlistAtual.length;
  iniciarRotacaoPreview();
}

function obterStatusAtualDoPonto() {
  const pontoAtual = pontosContratados.find(
    (ponto) => normalizarCodigo(ponto.codigo) === pontoSelecionado
  );
  const historicoAtual = historicosPorPonto[pontoSelecionado] || [];
  return pontoAtual ? calcularStatusPonto(pontoAtual, historicoAtual) : null;
}

function exibirItemPreview(item, pontoInativo) {
  if (!previewMidia) return;

  const nomeArquivoAtual = item ? obterNomeArquivo(item) : "";

  if (tituloPreview) {
    tituloPreview.textContent = pontoInativo ? "Exibição offline |" : "Exibição em tempo real |";
  }

  if (previewNome) {
    previewNome.textContent = nomeArquivoAtual;
  }

  if (!item) {
    previewMidia.innerHTML = `<div class="preview-vazio">Nenhum material disponível para este ponto.</div>`;
    return;
  }

  if (pontoInativo) {
    const imagemOffice = normalizarUrl(obterUrlPlaylist(item)) || "https://placehold.co/1280x720/png";
    previewMidia.innerHTML = `
      <div class="preview-office">
        <img src="${escapeHtml(imagemOffice)}" alt="${escapeHtml(nomeArquivoAtual || "Exibição offline")}">
        <div class="preview-office-legenda">
          <span>Você está assistindo a playlist da TV offline.</span>
        </div>
      </div>
    `;
    return;
  }

  const url = normalizarUrl(obterUrlPlaylist(item));
  const tipo = detectarTipo(url, item.tipo);

  if (!url) {
    previewMidia.innerHTML = `<div class="preview-vazio">Material sem URL disponível.</div>`;
    rotacaoPreviewTimer = setTimeout(avancarPreview, 4000);
    return;
  }

  if (tipo === "imagem") {
    previewMidia.innerHTML = `<img src="${escapeHtml(url)}" alt="${escapeHtml(nomeArquivoAtual || "Exibição em tempo real")}">`;
    rotacaoPreviewTimer = setTimeout(avancarPreview, obterDuracaoItem(item) * 1000);
    return;
  }

  if (tipo === "site") {
    previewMidia.innerHTML = `<iframe src="${escapeHtml(url)}" allow="autoplay; fullscreen"></iframe>`;
    rotacaoPreviewTimer = setTimeout(avancarPreview, obterDuracaoItem(item) * 1000);
    return;
  }

  previewMidia.innerHTML = `<video id="videoPreviewAtual" src="${escapeHtml(url)}" autoplay muted playsinline></video>`;

  const video = document.getElementById("videoPreviewAtual");
  if (video) {
    video.onended = () => {
      avancarPreview();
    };

    video.onerror = () => {
      rotacaoPreviewTimer = setTimeout(avancarPreview, 3000);
    };
  }
}

function iniciarRotacaoPreview() {
  pararRotacaoPreview();

  const statusAtual = obterStatusAtualDoPonto();
  const pontoInativo = statusAtual?.classe === "inativo" || statusAtual?.classe === "indisponivel";

  if (!playlistAtual.length) {
    exibirItemPreview(null, pontoInativo);
    return;
  }

  const itemAtual = playlistAtual[playlistIndexAtual] || playlistAtual[0];
  exibirItemPreview(itemAtual, pontoInativo);

  if (pontoInativo || playlistAtual.length <= 1) return;
}

function renderizarPreview(lista) {
  const playlistDoPonto = (lista || []).filter((item) => !itemEstaInativo(item));
  playlistAtual = playlistDoPonto.length ? playlistDoPonto : (lista || []);
  playlistIndexAtual = 0;
  iniciarRotacaoPreview();
}

function renderizarMateriais(lista) {
  if (!listaMateriais) return;

  const materiaisCliente = filtrarMateriaisDoCliente(lista);
  const mapaOrdem = obterMapaOrdemPlaylist(lista);

  if (!materiaisCliente.length) {
    listaMateriais.innerHTML = `<div class="vazio">Nenhum material encontrado para este cliente.</div>`;
    return;
  }

  listaMateriais.innerHTML = materiaisCliente.map((item) => {
    const arquivo = obterNomeArquivo(item);
    const chave = obterChaveMaterial(item);
    const ordemPlaylist = mapaOrdem.get(chave) || Number(item?.ordem) || "-";

    return `
      <div class="linha-material">
        <span>${escapeHtml(String(ordemPlaylist))}ª posição</span>
        <div>
          <strong>${escapeHtml(arquivo)}</strong>
        </div>
        <span>${formatarDataHora(item.created_at)}</span>
        <span>${formatarData(item.data_fim)}</span>
      </div>
    `;
  }).join("");
}

function renderizarHistorico(historico) {
  if (!historicoStatusPonto) return;

  const limite72Horas = Date.now() - 72 * 60 * 60 * 1000;

  const historico72h = (historico || []).filter((item) => {
    const dataValor = obterDataHistorico(item);
    const data = new Date(dataValor);

    if (Number.isNaN(data.getTime())) return false;

    return data.getTime() >= limite72Horas;
  });

  if (!historico72h.length) {
    historicoStatusPonto.innerHTML = `<div class="vazio">Sem histórico de status nas últimas 72 horas.</div>`;
    return;
  }

  historicoStatusPonto.innerHTML = historico72h.map((item, index) => {
    const evento = obterTextoEvento(item.evento);
    const data = formatarDataHora(obterDataHistorico(item));
    const texto = evento === "Ativado" ? `Ativado desde ${data}` : `Inativo desde ${data}`;
    const classeMaisRecente = index === 0 ? "mais-recente" : "";

    return `
      <div class="historico-item ${classeMaisRecente}">
        <span class="historico-evento">${escapeHtml(texto)}</span>
      </div>
    `;
  }).join("");
}

function renderizarDetalheBase(ponto, historico) {
  const status = calcularStatusPonto(ponto, historico);

  if (estadoVazio) estadoVazio.style.display = "none";
  if (detalhePonto) detalhePonto.style.display = "block";

  if (nomePontoDetalhe) {
    nomePontoDetalhe.textContent = obterNomePonto(ponto);
  }

  if (localPontoDetalhe) {
    localPontoDetalhe.textContent = obterLocalizacaoPonto(ponto);
  }

  if (statusPontoDetalhe) {
    statusPontoDetalhe.className = `status-grande ${status.classe}`;
    statusPontoDetalhe.innerHTML = `
      <strong>${escapeHtml(status.texto)}</strong>
      <small>${escapeHtml(status.detalhe)}</small>
    `;
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

async function buscarVinculosCliente(codigo) {
  const { data, error } = await supabaseClient
    .from(TABELA_CLIENTE_PONTOS)
    .select("ponto_codigo,created_at")
    .eq("cliente_codigo", codigo)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || [])
    .map((item) => normalizarCodigo(item.ponto_codigo))
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
  const tentativas = ["ordem", "created_at", "id"];
  let ultimoErro = null;

  for (const ordenarPor of tentativas) {
    const { data, error } = await supabaseClient
      .from(TABELA_PLAYLIST)
      .select("*")
      .eq("codigo", codigo)
      .order(ordenarPor, { ascending: true });

    if (!error) {
      return data || [];
    }

    ultimoErro = error;
    console.warn("Falha ao buscar playlist ordenando por:", ordenarPor, error);
  }

  throw ultimoErro;
}

async function buscarHistoricoPonto(codigo) {
  const consultas = [
    {
      colunas: "evento,data_hora,created_at",
      ordenarPor: "data_hora"
    },
    {
      colunas: "evento,created_at",
      ordenarPor: "created_at"
    }
  ];

  for (const consulta of consultas) {
    const { data, error } = await supabaseClient
      .from(TABELA_HISTORICO)
      .select(consulta.colunas)
      .eq("codigo", codigo)
      .order(consulta.ordenarPor, { ascending: false })
      .limit(80);

    if (!error) {
      return data || [];
    }

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
        return [codigo, historico];
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
  renderizarDetalheBase(ponto, historicoAtual);

  if (previewMidia) {
    previewMidia.innerHTML = `<div class="preview-vazio">Carregando exibição...</div>`;
  }

  if (listaMateriais) {
    listaMateriais.innerHTML = `<div class="vazio">Carregando materiais...</div>`;
  }

  if (historicoStatusPonto) {
    historicoStatusPonto.innerHTML = `<div class="vazio">Carregando histórico...</div>`;
  }

  try {
    const [playlist, historico] = await Promise.all([
      buscarPlaylistPonto(codigoNormalizado),
      buscarHistoricoPonto(codigoNormalizado)
    ]);

    historicosPorPonto[codigoNormalizado] = historico;

    renderizarDetalheBase(ponto, historico);
    renderizarPreview(playlist);
    renderizarMateriais(playlist);
    renderizarHistorico(historico);
    renderizarListaPontos();

    setMensagem("Área do cliente atualizada.", "ok");
  } catch (error) {
    console.error("Erro ao abrir ponto:", error);

    pararRotacaoPreview();
    renderizarPreview([]);
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
  abrirAreaCliente();
  setMensagem("Carregando área do cliente...");

  if (codigoClienteEl) {
    codigoClienteEl.textContent = codigoClienteAtual;
  }

  try {
    clienteAtual = await buscarCliente(codigoClienteAtual);

    if (!clienteAtual) {
      abrirLogin();
      setLoginErro("Cliente não encontrado para este código.");
      return;
    }

    renderizarContrato();

    const codigosPontos = await buscarVinculosCliente(codigoClienteAtual);
    pontosContratados = await buscarPontos(codigosPontos);

    await carregarHistoricosIniciais(pontosContratados);
    renderizarListaPontos();

    if (pontosContratados.length) {
      const primeiroAtivo = ordenarPontosPorStatus(pontosContratados)[0];
      await abrirPonto(primeiroAtivo.codigo);
    } else {
      if (estadoVazio) {
        estadoVazio.style.display = "flex";
        estadoVazio.textContent = "Este cliente ainda não possui pontos contratados vinculados.";
      }

      if (detalhePonto) detalhePonto.style.display = "none";
    }

    setMensagem("Área do cliente carregada.", "ok");
  } catch (error) {
    console.error("Erro ao carregar área do cliente:", error);
    setMensagem(error.message || "Erro ao carregar área do cliente.", "erro");
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
    carregarAreaCliente(codigoClienteAtual);
  };
}

if (btnSair) {
  btnSair.onclick = () => {
    abrirLogin();
  };
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

window.addEventListener("load", () => {
  const codigoUrl = obterCodigoUrl();

  abrirLogin();

  if (tituloBoasVindas) {
    tituloBoasVindas.innerHTML = `<span class="hero-linha">Seja bem-vindo(a)</span>`;
  }

  if (subtituloCliente) {
    subtituloCliente.textContent = "";
    subtituloCliente.innerHTML = "";
    subtituloCliente.style.display = "none";
  }

  if (tituloPreview) {
    tituloPreview.textContent = "Exibição em tempo real |";
  }

  if (previewNome) {
    previewNome.textContent = "";
  }

  if (codigoUrl && codigoLogin) {
    codigoLogin.value = codigoUrl;
  }
});
