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
const contratoCard = document.querySelector(".contrato-card");
const btnAssinarContrato = document.getElementById("btnAssinarContrato");
const mensagemCliente = document.getElementById("mensagemCliente");
const contadorPontos = document.getElementById("contadorPontos");
const listaPontosCliente = document.getElementById("listaPontosCliente");

const estadoVazio = document.getElementById("estadoVazio");
const detalhePonto = document.getElementById("detalhePonto");
const nomePontoDetalhe = document.getElementById("nomePontoDetalhe");
const localPontoDetalhe = document.getElementById("localPontoDetalhe");
const statusPontoDetalhe = document.getElementById("statusPontoDetalhe");
const previewNome = document.getElementById("previewNome");
const previewMidia = document.getElementById("previewMidia");
const listaMateriais = document.getElementById("listaMateriais");
const historicoStatusPonto = document.getElementById("historicoStatusPonto");

let codigoClienteAtual = "";
let clienteAtual = null;
let pontosContratados = [];
let historicosPorPonto = {};
let pontoSelecionado = "";

let timerMensagem = null;
let timerLimparMensagem = null;

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

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

function contratoEstaDisponivel(cliente) {
  if (!cliente) return false;
  if (clienteEhSupervisor(cliente)) return false;
  if (cliente.contrato_ativo === false) return false;
  if (!cliente.contrato_html) return false;
  return true;
}

function contratoEstaConcluido(cliente) {
  return Boolean(cliente?.contrato_assinado_em || cliente?.contrato_assinado_html);
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

function calcularStatusPonto(ponto, historico = []) {
  if (!pontoEstaDisponivel(ponto)) {
    return { texto: "Indisponível", detalhe: "Ponto indisponível", classe: "indisponivel" };
  }

  const ultimoEvento = historico[0] || null;
  const ultimoPing = obterUltimoPingPonto(ponto);
  const dataReferencia = ultimoPing || obterDataHistorico(ultimoEvento);

  if (!dataReferencia) {
    return { texto: "Inativo", detalhe: "Inativo desde sem histórico", classe: "inativo" };
  }

  const data = new Date(dataReferencia);
  if (Number.isNaN(data.getTime())) {
    return { texto: "Inativo", detalhe: "Inativo desde sem histórico", classe: "inativo" };
  }

  if (ultimoEvento && eventoEhAtivo(ultimoEvento.evento)) {
    return { texto: "Ativo", detalhe: `Ativo desde ${formatarDataHora(dataReferencia)}`, classe: "ativo" };
  }

  if (ultimoEvento && eventoEhInativo(ultimoEvento.evento)) {
    return { texto: "Inativo", detalhe: `Inativo desde ${formatarDataHora(dataReferencia)}`, classe: "inativo" };
  }

  const diff = Date.now() - data.getTime();

  if (diff < 5 * 60 * 1000) {
    return { texto: "Ativo", detalhe: `Ativo desde ${formatarDataHora(dataReferencia)}`, classe: "ativo" };
  }

  return { texto: "Inativo", detalhe: `Inativo desde ${formatarDataHora(dataReferencia)}`, classe: "inativo" };
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

  if (limpa.endsWith(".jpg") || limpa.endsWith(".jpeg") || limpa.endsWith(".png") || limpa.endsWith(".webp")) {
    return "imagem";
  }

  if (limpa.endsWith(".txt")) return "site";

  if (limpa.includes("youtube.com") || limpa.includes("youtu.be") || limpa.includes("http")) {
    return limpa.match(/\.(mp4|mov|webm)$/) ? "video" : "site";
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

  if (tituloRenomeado) {
    return tituloRenomeado;
  }

  const nomeArquivo = String(item?.nome_arquivo || "").trim();

  if (nomeArquivo) {
    return nomeArquivo;
  }

  const nomeDado = String(item?.nome || "").trim();

  if (nomeDado) {
    return nomeDado;
  }

  return "Sem nome";
}

function filtrarMateriaisDoCliente(lista = []) {
  return (lista || [])
    .map((item, index) => ({
      ...item,
      posicao_playlist: index + 1
    }))
    .filter((item) => {
      const codigoItem = normalizarCodigo(item.codigo_cliente);
      return codigoItem === codigoClienteAtual;
    });
}

function limitarHistorico72Horas(historico = []) {
  const limite = Date.now() - (72 * 60 * 60 * 1000);

  return (historico || []).filter((item) => {
    const dataHistorico = new Date(obterDataHistorico(item));
    if (Number.isNaN(dataHistorico.getTime())) return false;
    return dataHistorico.getTime() >= limite;
  });
}

function limparTelaDetalhe() {
  pontoSelecionado = "";
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

  if (areaCliente) areaCliente.style.display = "none";
  if (loginScreen) loginScreen.style.display = "flex";
  if (contratoCard) contratoCard.style.display = "";

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

  const nome = obterNomeCliente(clienteAtual);
  const supervisor = clienteEhSupervisor(clienteAtual);
  const disponivel = contratoEstaDisponivel(clienteAtual);
  const concluido = contratoEstaConcluido(clienteAtual);
  const telefone = obterTelefoneCliente(clienteAtual);
  const vencimento = clienteAtual.vencimento_exibicao || clienteAtual.vencimento || clienteAtual.data_fim;

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
    codigoClienteEl.textContent = codigoClienteAtual;
  }

  if (supervisor) return;

  if (contratoBadge) {
    contratoBadge.textContent = concluido
      ? "Contrato concluído"
      : disponivel
        ? "Contrato disponível"
        : "Contrato indisponível";

    contratoBadge.classList.toggle("inativo", !disponivel && !concluido);
    contratoBadge.classList.toggle("concluido", concluido);
  }

  const partes = [];

  if (concluido) {
    partes.push("Contrato assinado e concluído. Você já pode baixar uma cópia.");
  } else if (disponivel) {
    partes.push("Assine agora seu contrato. Você tem uma assinatura pendente.");
  } else {
    partes.push("Seu contrato ainda não está disponível para assinatura.");
  }

  if (telefone) partes.push(`Contato: ${telefone}.`);
  if (vencimento) partes.push(`Vencimento: ${formatarData(vencimento)}.`);

  if (contratoInfo) {
    contratoInfo.textContent = partes.join(" ");
  }

  if (btnAssinarContrato) {
    btnAssinarContrato.textContent = concluido ? "Baixar contrato" : "Assinar contrato";
    btnAssinarContrato.disabled = !disponivel && !concluido;
    btnAssinarContrato.onclick = () => {
      window.location.href = `/assinatura.html?codigo=${encodeURIComponent(codigoClienteAtual)}`;
    };
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

  listaPontosCliente.innerHTML = pontosContratados.map(montarCardPonto).join("");

  document.querySelectorAll(".ponto-card").forEach((card) => {
    card.onclick = () => abrirPonto(card.dataset.codigo);
  });
}

function renderizarPreview(lista) {
  const ativos = lista.filter((item) => !itemEstaInativo(item));
  const item = ativos[0] || lista[0] || null;

  if (!previewMidia) return;

  if (!item) {
    if (previewNome) previewNome.textContent = "";
    previewMidia.innerHTML = `<div class="preview-vazio">Nenhum material deste cliente para preview neste ponto.</div>`;
    return;
  }

  const url = normalizarUrl(obterUrlPlaylist(item));
  const tipo = detectarTipo(url, item.tipo);
  const arquivo = obterNomeArquivo(item);

  if (previewNome) previewNome.textContent = arquivo;

  if (!url) {
    previewMidia.innerHTML = `<div class="preview-vazio">Material sem URL disponível.</div>`;
    return;
  }

  if (tipo === "imagem") {
    previewMidia.innerHTML = `<img src="${escapeHtml(url)}" alt="${escapeHtml(arquivo)}">`;
    return;
  }

  if (tipo === "site") {
    previewMidia.innerHTML = `<iframe src="${escapeHtml(url)}" allow="autoplay; fullscreen"></iframe>`;
    return;
  }

  previewMidia.innerHTML = `<video src="${escapeHtml(url)}" autoplay muted loop playsinline></video>`;
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
  if (evento === "conectou") return "Ativo";
  if (evento === "desconectou") return "Inativo";
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
    const texto = obterTextoEvento(item.evento);
    const classe = index === 0 && eventoEhAtivo(item.evento) ? "ativo-primeiro" : "neutro";

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
    const historicoMaisRecente = historico[0] || null;
    const dataDesde = obterDataHistorico(historicoMaisRecente) || obterUltimoPingPonto(ponto);
    const textoDesde = dataDesde ? `desde ${formatarDataHora(dataDesde)}` : "";

    statusPontoDetalhe.textContent = status.texto;
    statusPontoDetalhe.dataset.desde = textoDesde;
    statusPontoDetalhe.className = `status-grande ${status.classe}`;
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
  return (data || []).map((item) => normalizarCodigo(item.ponto_codigo)).filter(Boolean);
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
    .map((ponto) => ({ ...ponto, codigo: normalizarCodigo(ponto.codigo) }))
    .sort((a, b) => {
      const posA = ordem.has(a.codigo) ? ordem.get(a.codigo) : 9999;
      const posB = ordem.has(b.codigo) ? ordem.get(b.codigo) : 9999;
      return posA - posB;
    });
}

async function buscarPlaylistPonto(codigo) {
  const consultas = [
    {
      colunas: "id,nome,nome_cliente,cliente_nome,codigo_cliente,titulo_arquivo,nome_arquivo,video_url,arquivo_url,url,storage_path,tipo,created_at,data_fim,ordem,codigo",
      ordenarPor: "ordem"
    },
    {
      colunas: "id,nome,codigo_cliente,titulo_arquivo,nome_arquivo,video_url,storage_path,tipo,created_at,data_fim,ordem,codigo",
      ordenarPor: "ordem"
    },
    {
      colunas: "id,nome,codigo_cliente,video_url,storage_path,created_at,data_fim,ordem,codigo",
      ordenarPor: "ordem"
    },
    {
      colunas: "id,nome,codigo_cliente,video_url,storage_path,created_at,codigo",
      ordenarPor: "created_at"
    }
  ];

  let ultimoErro = null;

  for (const consulta of consultas) {
    let query = supabaseClient
      .from(TABELA_PLAYLIST)
      .select(consulta.colunas)
      .eq("codigo", codigo);

    query = query.order(consulta.ordenarPor, { ascending: true });

    const { data, error } = await query;

    if (!error) return data || [];

    ultimoErro = error;
    console.warn("Falha ao buscar playlist com colunas:", consulta.colunas, error);
  }

  throw ultimoErro;
}

async function buscarHistoricoPonto(codigo) {
  const consultas = [
    { colunas: "evento,data_hora,created_at", ordenarPor: "data_hora" },
    { colunas: "evento,created_at", ordenarPor: "created_at" }
  ];

  for (const consulta of consultas) {
    const { data, error } = await supabaseClient
      .from(TABELA_HISTORICO)
      .select(consulta.colunas)
      .eq("codigo", codigo)
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
    renderizarPreview(materiaisCliente);
    renderizarMateriais(materiaisCliente);
    renderizarHistorico(historico72h);
    renderizarListaPontos();
    setMensagem("Área do cliente atualizada.", "ok");
  } catch (error) {
    console.error("Erro ao abrir ponto:", error);
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

  if (codigoClienteEl) codigoClienteEl.textContent = codigoClienteAtual;

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
      await abrirPonto(pontosContratados[0].codigo);
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

if (btnEntrarCliente) btnEntrarCliente.onclick = entrarComCodigoDigitado;

if (codigoLogin) {
  codigoLogin.addEventListener("keydown", (event) => {
    if (event.key === "Enter") entrarComCodigoDigitado();
  });
}

if (btnAtualizar) {
  btnAtualizar.onclick = () => carregarAreaCliente(codigoClienteAtual);
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
  const codigoUrl = obterCodigoUrl();

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
});
