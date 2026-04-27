const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";
const SENHA_PAINEL = "@helena";

const CACHE_CENTRAL_KEY = "central_painel_cache_v2";
const CACHE_CENTRAL_TTL = 30 * 60 * 1000;

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let todosOsPontos = [];

document.addEventListener("DOMContentLoaded", () => {
  iniciarLoginCentral();
});

function iniciarLoginCentral() {
  const loginBox = document.getElementById("loginBox");
  const conteudoPainel = document.getElementById("conteudoPainel");
  const senhaInput = document.getElementById("senhaInput");
  const btnLogin = document.getElementById("btnLogin");
  const loginErro = document.getElementById("loginErro");

  function liberarPainel() {
    if (loginBox) loginBox.style.display = "none";
    if (conteudoPainel) conteudoPainel.style.display = "flex";
    carregarcentralpainel();
  }

  function bloquearPainel() {
    if (loginBox) loginBox.style.display = "flex";
    if (conteudoPainel) conteudoPainel.style.display = "none";
  }

  function validarLogin() {
    const senha = senhaInput ? senhaInput.value.trim() : "";

    if (senha !== SENHA_PAINEL) {
      if (loginErro) loginErro.textContent = "Código inválido";
      return;
    }

    sessionStorage.setItem("painelLiberado", "1");

    if (loginErro) loginErro.textContent = "";
    liberarPainel();
  }

  if (sessionStorage.getItem("painelLiberado") === "1") {
    liberarPainel();
  } else {
    bloquearPainel();
  }

  if (btnLogin) {
    btnLogin.onclick = validarLogin;
  }

  if (senhaInput) {
    senhaInput.addEventListener("keydown", event => {
      if (event.key === "Enter") validarLogin();
    });
  }
}

function lerCacheCentral() {
  try {
    const bruto = sessionStorage.getItem(CACHE_CENTRAL_KEY);
    if (!bruto) return null;

    const cache = JSON.parse(bruto);
    const fresco = Date.now() - Number(cache.criadoEm || 0) < CACHE_CENTRAL_TTL;

    return {
      fresco,
      dados: cache.dados || null
    };
  } catch {
    return null;
  }
}

function salvarCacheCentral(dados) {
  try {
    sessionStorage.setItem(CACHE_CENTRAL_KEY, JSON.stringify({
      criadoEm: Date.now(),
      dados
    }));
  } catch {
    return;
  }
}

async function carregarcentralpainel(opcoes = {}) {
  try {
    const cache = lerCacheCentral();

    if (!opcoes.forcarAtualizacao && cache?.dados) {
      aplicarDadosCentral(cache.dados);

      if (cache.fresco) {
        return;
      }
    }

    const { data: pontos, error: erroPontos } = await supabaseClient
      .from("pontos")
      .select("*")
      .order("created_at", { ascending: false });

    if (erroPontos) throw erroPontos;

    const status = await buscarStatusPontos();

    let clientes = [];
    let playlists = [];

    const respostaClientes = await supabaseClient
      .from("dadosclientes")
      .select("*");

    if (respostaClientes.error) {
      console.warn("Clientes não carregaram:", respostaClientes.error);
    } else {
      clientes = respostaClientes.data || [];
    }

    const respostaPlaylists = await supabaseClient
      .from("playlists")
      .select("codigo_cliente,data_fim,status,created_at");

    if (respostaPlaylists.error) {
      console.warn("Playlists não carregaram:", respostaPlaylists.error);
    } else {
      playlists = respostaPlaylists.data || [];
    }

    const dados = {
      pontos: pontos || [],
      status: status || [],
      clientes,
      playlists
    };

    salvarCacheCentral(dados);
    aplicarDadosCentral(dados);
  } catch (erro) {
    console.error("Erro ao carregar central painel:", erro);
  }
}

function aplicarDadosCentral(dados) {
  const pontos = dados?.pontos || [];
  const status = dados?.status || [];
  const clientes = dados?.clientes || [];
  const playlists = dados?.playlists || [];

  const clientesComStatusReal = calcularStatusRealClientes(clientes, playlists);
  const contratos = clientesComStatusReal.filter(cliente => clienteTemContrato(cliente));

  todosOsPontos = combinarPontosComStatus(pontos, status);
  atualizarPainel(todosOsPontos);
  atualizarGraficoComercial(clientesComStatusReal, contratos);
}

async function buscarStatusPontos() {
  const consultas = [
    { filtro: "ponto_codigo", ordem: "ultimo_ping" },
    { filtro: "codigo", ordem: "data_hora" },
    { filtro: "ponto_codigo", ordem: "created_at" }
  ];

  for (const consulta of consultas) {
    const { data, error } = await supabaseClient
      .from("statuspontos")
      .select("*")
      .order(consulta.ordem, { ascending: false });

    if (!error) return data || [];

    console.warn("Status não carregou:", error);
  }

  return [];
}

function combinarPontosComStatus(pontos, status) {
  const statusPorCodigo = {};

  (status || []).forEach(item => {
    const codigoStatus = normalizarCodigo(
      item.codigo ||
      item.codigo_ponto ||
      item.ponto_codigo ||
      ""
    );

    if (!codigoStatus || statusPorCodigo[codigoStatus]) return;

    statusPorCodigo[codigoStatus] = item;
  });

  return pontos.map(ponto => {
    const codigoPonto = normalizarCodigo(ponto.codigo || ponto.codigo_ponto || ponto.ponto_codigo || "");
    const statusEncontrado = statusPorCodigo[codigoPonto];

    const pontoIndisponivel =
      ponto.disponivel === false ||
      ponto.indisponivel === true ||
      String(ponto.disponivel || "").toLowerCase().trim() === "false" ||
      String(ponto.status_disponibilidade || "").toLowerCase().includes("indispon");

    const statusCadastro = normalizarStatus(ponto.status || "");
    const statusAtual = normalizarStatus(statusEncontrado?.status || statusEncontrado?.evento || "");

    return {
      ...ponto,
      codigo_final: codigoPonto,
      status_final: pontoIndisponivel || statusCadastro === "desativado" ? "desativado" : statusAtual,
      ultimo_ping_final: statusEncontrado?.ultimo_ping || statusEncontrado?.data_hora || ponto.ultimo_ping || ponto.updated_at || null
    };
  });
}

function atualizarMetricas(pontos) {
  const total = pontos.length;
  const ativos = pontos.filter(p => p.status_final === "ativo").length;
  const uptime = calcularUptimeMedio(pontos);

  setTexto("totalReproducoes", "0");
  setTexto("totalQrCode", "0");
  setHtml("pontosAtivos", `${ativos} <small>+0</small>`);
  setTexto("totalPontosTexto", `De um total de ${total} pontos`);
  setTexto("uptimeMedio", `${uptime}%`);
}

function atualizarPainel(pontos) {
  atualizarMetricas(pontos);
  atualizarDonut(pontos);

  const ordem = {
    "ativo": 1,
    "inativo": 2,
    "desativado": 3
  };

  const pontosOrdenados = [...pontos].sort((a, b) => {
    const ordemA = ordem[a.status_final] || 99;
    const ordemB = ordem[b.status_final] || 99;

    if (ordemA !== ordemB) return ordemA - ordemB;

    return new Date(b.ultimo_ping_final || 0) - new Date(a.ultimo_ping_final || 0);
  });

  renderizarPontos(pontosOrdenados);
}

function atualizarDonut(pontos) {
  const total = pontos.length;
  const ativos = pontos.filter(p => p.status_final === "ativo").length;
  const inativos = pontos.filter(p => p.status_final === "inativo").length;
  const desativados = pontos.filter(p => p.status_final === "desativado").length;

  setTexto("donutTotal", total);
  setHtml("legendaAtivos", `${ativos} (${percentual(ativos, total)})`);
  setHtml("legendaInativos", `${inativos} (${percentual(inativos, total)})`);
  setHtml("legendaDesativados", `${desativados} (${percentual(desativados, total)})`);

  const donut = document.querySelector(".donut");
  if (!donut) return;

  if (!total) {
    donut.style.background = "#1e293b";
    return;
  }

  const pAtivos = (ativos / total) * 100;
  const pInativos = pAtivos + (inativos / total) * 100;

  donut.style.background = `conic-gradient(
    #22c55e 0% ${pAtivos}%,
    #ef4444 ${pAtivos}% ${pInativos}%,
    #6b7280 ${pInativos}% 100%
  )`;
}

function renderizarPontos(pontos) {
  const lista = document.getElementById("listaPontos");
  if (!lista) return;

  lista.innerHTML = "";

  if (!pontos.length) {
    lista.innerHTML = `<div class="empty-state">Nenhum ponto encontrado.</div>`;
    return;
  }

  pontos.forEach(ponto => {
    const nome = ponto.nome || ponto.nome_ponto || ponto.nome_local || ponto.titulo || ponto.codigo_final || "Ponto sem nome";
    const status = ponto.status_final;
    const imagem = ponto.imagem_url || ponto.foto_url || ponto.imagem || ponto.banner_url || "https://placehold.co/600x300/020617/ffffff?text=Indoor+Midia";

    lista.innerHTML += `
      <article class="point-card ${classeStatus(status)}" data-codigo="${escaparHtml(ponto.codigo_final)}" title="${escaparHtml(nome)}">
        <img src="${escaparHtml(imagem)}" alt="${escaparHtml(nome)}" loading="lazy">

        <div class="point-overlay">
          <strong>${escaparHtml(nome)}</strong>
          <span class="${classeStatus(status)}">● ${textoStatus(status)}</span>
        </div>
      </article>
    `;
  });
}

function atualizarGraficoComercial(clientes, contratos) {
  const clientesAtivos = clientes.filter(cliente => {
    return normalizarStatusCliente(cliente) === "ativo";
  }).length;

  const clientesInativos = clientes.filter(cliente => {
    return normalizarStatusCliente(cliente) !== "ativo";
  }).length;

  const contratosTotal = contratos.length;
  const ganhos = clientesAtivos + contratosTotal;
  const quedas = clientesInativos;
  const saldo = ganhos - quedas;

  setTexto("novosContratos", saldo);
  atualizarTextoComercial(saldo, ganhos, quedas);

  const dados = [
    { label: "Clientes ativos", valor: clientesAtivos },
    { label: "Contratos", valor: contratosTotal },
    { label: "Quedas", valor: -quedas },
    { label: "Saldo", valor: saldo }
  ];

  desenharGraficoResumoComercial(dados);
}

function atualizarTextoComercial(saldo, ganhos, quedas) {
  const texto = document.querySelector(".contract-number p");
  const comparativo = document.querySelector(".contract-number strong");

  if (texto) texto.textContent = "saldo comercial";
  if (comparativo) comparativo.textContent = `Ganhos ${ganhos} | Quedas ${quedas}`;
}

function desenharGraficoResumoComercial(dados) {
  const svg = document.querySelector(".contracts .chart svg");
  const linha = document.querySelector(".contracts .chart svg .line");
  const area = document.querySelector(".contracts .chart svg .area");
  const labels = document.querySelectorAll(".contracts .chart-labels span");

  if (!svg || !linha || !area || !dados.length) return;

  const largura = 545;
  const inicioX = 30;
  const baseY = 210;
  const topoY = 70;

  const valores = dados.map(item => item.valor);
  const max = Math.max(...valores, 1);
  const min = Math.min(...valores, 0);
  const faixa = Math.max(max - min, 1);

  const pontos = dados.map((item, index) => {
    const x = inicioX + (index * largura) / (dados.length - 1);
    const y = baseY - ((item.valor - min) / faixa) * (baseY - topoY);
    return { x, y };
  });

  const pathLinha = pontos.map((ponto, index) => {
    return `${index === 0 ? "M" : "L"}${ponto.x.toFixed(1)} ${ponto.y.toFixed(1)}`;
  }).join(" ");

  const pathArea = `${pathLinha} L${pontos[pontos.length - 1].x.toFixed(1)} 240 L${pontos[0].x.toFixed(1)} 240 Z`;

  linha.setAttribute("d", pathLinha);
  area.setAttribute("d", pathArea);

  svg.querySelectorAll("circle").forEach(circle => circle.remove());

  pontos.forEach(ponto => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", ponto.x);
    circle.setAttribute("cy", ponto.y);
    circle.setAttribute("r", "7");
    svg.appendChild(circle);
  });

  labels.forEach((label, index) => {
    label.textContent = dados[index] ? dados[index].label : "";
  });
}

function calcularStatusRealClientes(clientes, playlists) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const clientesAtivosPorPlaylist = new Set();

  playlists.forEach(item => {
    const codigo = String(item.codigo_cliente || "").trim().toUpperCase();
    if (!codigo) return;

    const dataFimValor = item.data_fim;

    if (!dataFimValor) {
      clientesAtivosPorPlaylist.add(codigo);
      return;
    }

    const dataFim = new Date(dataFimValor);
    if (!Number.isNaN(dataFim.getTime()) && dataFim >= hoje) {
      clientesAtivosPorPlaylist.add(codigo);
    }
  });

  return clientes.map(cliente => {
    const codigo = String(cliente.codigo || "").trim().toUpperCase();
    const statusBanco = String(cliente.statuscliente || cliente.status || "").toLowerCase().trim();
    const supervisor = String(cliente.tipo_acesso || "").toLowerCase().trim() === "supervisor";

    return {
      ...cliente,
      status_real: supervisor || clientesAtivosPorPlaylist.has(codigo) || statusBanco === "ativo" ? "ativo" : "inativo"
    };
  });
}

function clienteTemContrato(cliente) {
  return Boolean(
    String(cliente.contrato || "").trim() ||
    String(cliente.contrato_texto || "").trim() ||
    String(cliente.contrato_modelo_nome || "").trim() ||
    String(cliente.contrato_status || "").trim() ||
    String(cliente.contrato_enviado_em || "").trim()
  );
}

function calcularUptimeMedio(pontos) {
  if (!pontos.length) return "0,0";

  const ativos = pontos.filter(ponto => ponto.status_final === "ativo").length;
  return ((ativos / pontos.length) * 100).toFixed(1).replace(".", ",");
}

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function normalizarStatus(status) {
  const s = String(status || "").toLowerCase().trim();

  if (s === "ativo" || s === "online" || s === "rodando" || s === "reproduzindo" || s === "conectou") return "ativo";
  if (s.includes("desativ") || s.includes("indispon")) return "desativado";

  if (
    s === "inativo" ||
    s === "parado" ||
    s === "offline" ||
    s === "desconectado" ||
    s === "desconectou" ||
    s === "sem material" ||
    s === "sem_material" ||
    s === "sem-material"
  ) {
    return "inativo";
  }

  return "inativo";
}

function normalizarStatusCliente(cliente) {
  const status = String(cliente?.status_real || cliente?.statuscliente || cliente?.status || "")
    .toLowerCase()
    .trim();

  return status === "ativo" ? "ativo" : "inativo";
}

function textoStatus(status) {
  if (status === "ativo") return "ATIVO";
  if (status === "inativo") return "INATIVO";
  return "DESATIVADO";
}

function classeStatus(status) {
  if (status === "ativo") return "active";
  if (status === "inativo") return "inactive";
  return "offline";
}

function percentual(valor, total) {
  if (!total) return "0%";
  return ((valor / total) * 100).toFixed(1).replace(".", ",") + "%";
}

function formatarPing(data) {
  if (!data) return "--:--:--";

  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "--:--:--";

  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function setTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function escaparHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";

const CACHE_CLIENTES_KEY = "central_clientes_cache_v4";
const CACHE_CLIENTES_TTL = 30 * 60 * 1000;
const ORDEM_PERSONALIZADA_KEY = "central_clientes_ordem_personalizada_v2";
const FILTRO_CLIENTES_KEY = "central_clientes_filtro_v2";

let supabaseClient = null;
let clientesCarregados = [];
let carregandoClientes = false;
let timerBusca = null;
let timerMensagem = null;
let timerLimparMensagem = null;
let dragCodigo = null;
let filtroAtual = sessionStorage.getItem(FILTRO_CLIENTES_KEY) || "status";

const listaClientes = document.getElementById("listaClientes");
const mensagem = document.getElementById("mensagem");
const botaoNovoCliente = document.getElementById("botaoNovoCliente");
const botaoAtualizar = document.getElementById("botaoAtualizar");
const buscaCliente = document.getElementById("buscaCliente");
const botoesFiltro = document.querySelectorAll("[data-filtro]");
const botaoVoltarPainel = document.getElementById("botaoVoltarPainel");

function verificarAcesso() {
  const liberado = sessionStorage.getItem("painelLiberado");

  if (liberado !== "1") {
    window.location.href = "/centralpainel.html";
    return false;
  }

  return true;
}

function mostrarMensagem(texto, cor = "#9fd2ff") {
  if (!mensagem) return;

  if (timerMensagem) {
    clearTimeout(timerMensagem);
    timerMensagem = null;
  }

  if (timerLimparMensagem) {
    clearTimeout(timerLimparMensagem);
    timerLimparMensagem = null;
  }

  mensagem.classList.remove("saindo");
  mensagem.textContent = texto || "";
  mensagem.style.color = cor;

  if (!texto) return;

  timerMensagem = setTimeout(() => {
    mensagem.classList.add("saindo");

    timerLimparMensagem = setTimeout(() => {
      mensagem.textContent = "";
      mensagem.classList.remove("saindo");
    }, 300);
  }, 5000);
}

function escaparHtml(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function abrirCliente(codigo) {
  window.location.href = `/pasta-cliente.html?codigo=${encodeURIComponent(codigo)}`;
}

function obterDataHojeISO() {
  return new Date().toISOString().split("T")[0];
}

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function clienteEhSupervisor(cliente) {
  return String(cliente?.tipo_acesso || "").trim().toLowerCase() === "supervisor";
}

function normalizarStatusTexto(status) {
  const valor = String(status || "").trim().toLowerCase();

  if (valor === "ativo") return "Ativo";
  if (valor === "inativo") return "Não ativo";
  return status ? String(status).trim() : "Não ativo";
}

function obterNomeCliente(cliente) {
  return String(cliente.nome_completo || "Novo Cliente").trim();
}

function obterTelefoneCliente(cliente) {
  return String(cliente.telefone || "").trim();
}

function lerCacheClientes() {
  try {
    const cache = JSON.parse(sessionStorage.getItem(CACHE_CLIENTES_KEY) || "null");
    if (!cache || !Array.isArray(cache.clientes)) return null;

    return {
      clientes: cache.clientes,
      fresco: Date.now() - Number(cache.criadoEm || 0) < CACHE_CLIENTES_TTL
    };
  } catch {
    return null;
  }
}

function salvarCacheClientes(clientes) {
  try {
    sessionStorage.setItem(CACHE_CLIENTES_KEY, JSON.stringify({
      criadoEm: Date.now(),
      clientes
    }));
  } catch {
    return;
  }
}

function lerOrdemPersonalizada() {
  try {
    const lista = JSON.parse(sessionStorage.getItem(ORDEM_PERSONALIZADA_KEY) || "[]");
    return Array.isArray(lista) ? lista.map(normalizarCodigo) : [];
  } catch {
    return [];
  }
}

function salvarOrdemPersonalizada(lista) {
  sessionStorage.setItem(
    ORDEM_PERSONALIZADA_KEY,
    JSON.stringify((lista || []).map(normalizarCodigo).filter(Boolean))
  );
}

async function copiarCodigoCliente(codigo) {
  const codigoFinal = String(codigo || "").trim();
  if (!codigoFinal) return;

  try {
    await navigator.clipboard.writeText(codigoFinal);
    mostrarMensagem(`Código ${codigoFinal} copiado.`, "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Não foi possível copiar o código.", "#ff6b6b");
  }
}

function atualizarBotoesFiltro() {
  botoesFiltro.forEach((botao) => {
    botao.classList.toggle("ativo", botao.dataset.filtro === filtroAtual);
  });
}

function obterListaFiltrada() {
  const termo = (buscaCliente?.value || "").trim().toLowerCase();

  if (!termo) {
    return clientesCarregados;
  }

  return clientesCarregados.filter((cliente) => {
    const textoBusca = [
      cliente.codigo,
      cliente.nome_completo,
      cliente.telefone,
      cliente.email,
      cliente.cpf_cnpj,
      cliente.status_real,
      cliente.tipo_acesso
    ].join(" ").toLowerCase();

    return textoBusca.includes(termo);
  });
}

function ordenarClientes(lista) {
  const copia = [...lista];

  if (filtroAtual === "personalizado") {
    const ordem = lerOrdemPersonalizada();
    const posicoes = new Map(ordem.map((codigo, index) => [normalizarCodigo(codigo), index]));

    return copia.sort((a, b) => {
      const codigoA = normalizarCodigo(a.codigo);
      const codigoB = normalizarCodigo(b.codigo);
      const posA = posicoes.has(codigoA) ? posicoes.get(codigoA) : 9999;
      const posB = posicoes.has(codigoB) ? posicoes.get(codigoB) : 9999;

      if (posA !== posB) return posA - posB;
      return obterNomeCliente(a).localeCompare(obterNomeCliente(b), "pt-BR");
    });
  }

  if (filtroAtual === "nome") {
    return copia.sort((a, b) => obterNomeCliente(a).localeCompare(obterNomeCliente(b), "pt-BR"));
  }

  if (filtroAtual === "data") {
    return copia.sort((a, b) => {
      const dataA = new Date(a.data_postagem || a.created_at || 0).getTime();
      const dataB = new Date(b.data_postagem || b.created_at || 0).getTime();

      if (dataA !== dataB) return dataB - dataA;
      return obterNomeCliente(a).localeCompare(obterNomeCliente(b), "pt-BR");
    });
  }

  return copia.sort((a, b) => {
    const supervisorA = clienteEhSupervisor(a) ? 0 : 1;
    const supervisorB = clienteEhSupervisor(b) ? 0 : 1;

    if (supervisorA !== supervisorB) return supervisorA - supervisorB;

    const ativoA = a.status_real === "Ativo" ? 0 : 1;
    const ativoB = b.status_real === "Ativo" ? 0 : 1;

    if (ativoA !== ativoB) return ativoA - ativoB;
    return obterNomeCliente(a).localeCompare(obterNomeCliente(b), "pt-BR");
  });
}

function atualizarOrdemAposArrastar(codigoOrigem, codigoDestino) {
  const visiveis = ordenarClientes(obterListaFiltrada()).map((cliente) => normalizarCodigo(cliente.codigo));
  const todos = clientesCarregados.map((cliente) => normalizarCodigo(cliente.codigo));
  const ordemAtual = lerOrdemPersonalizada().filter((codigo) => todos.includes(normalizarCodigo(codigo)));

  todos.forEach((codigo) => {
    if (!ordemAtual.includes(codigo)) {
      ordemAtual.push(codigo);
    }
  });

  const origem = normalizarCodigo(codigoOrigem);
  const destino = normalizarCodigo(codigoDestino);

  if (!origem || !destino || origem === destino) return;

  const ordemVisivel = visiveis.filter((codigo) => ordemAtual.includes(codigo));
  const indexOrigem = ordemVisivel.indexOf(origem);
  const indexDestino = ordemVisivel.indexOf(destino);

  if (indexOrigem < 0 || indexDestino < 0) return;

  ordemVisivel.splice(indexOrigem, 1);
  ordemVisivel.splice(indexDestino, 0, origem);

  const novaOrdem = ordemAtual.filter((codigo) => !visiveis.includes(codigo));
  ordemVisivel.forEach((codigo) => novaOrdem.push(codigo));

  salvarOrdemPersonalizada(novaOrdem);
}

function limparAlvosDrop() {
  document.querySelectorAll(".cliente-card.alvo-drop").forEach((card) => {
    card.classList.remove("alvo-drop");
  });
}

function ativarArrasteCards() {
  if (filtroAtual !== "personalizado") return;

  document.querySelectorAll(".cliente-card").forEach((card) => {
    card.addEventListener("dragstart", () => {
      dragCodigo = card.dataset.codigo;
      card.classList.add("arrastando");
    });

    card.addEventListener("dragend", () => {
      dragCodigo = null;
      card.classList.remove("arrastando");
      limparAlvosDrop();
    });

    card.addEventListener("dragenter", (event) => {
      event.preventDefault();
      if (!dragCodigo || card.dataset.codigo === dragCodigo) return;
      limparAlvosDrop();
      card.classList.add("alvo-drop");
    });

    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!dragCodigo || card.dataset.codigo === dragCodigo) return;

      if (!card.classList.contains("alvo-drop")) {
        limparAlvosDrop();
        card.classList.add("alvo-drop");
      }
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("alvo-drop");
    });

    card.addEventListener("drop", (event) => {
      event.preventDefault();

      const destino = card.dataset.codigo;
      if (!dragCodigo || !destino || dragCodigo === destino) return;

      atualizarOrdemAposArrastar(dragCodigo, destino);
      limparAlvosDrop();
      renderizarClientes();
    });
  });
}

function renderizarClientes() {
  if (!listaClientes) return;

  atualizarBotoesFiltro();

  const filtrados = ordenarClientes(obterListaFiltrada());
  const personalizado = filtroAtual === "personalizado";

  listaClientes.innerHTML = "";

  if (!filtrados.length) {
    listaClientes.innerHTML = `<div class="vazio">Nenhum cliente encontrado.</div>`;
    return;
  }

  const fragmento = document.createDocumentFragment();

  filtrados.forEach((cliente) => {
    const card = document.createElement("div");
    const statusReal = cliente.status_real || "Não ativo";
    const ativo = statusReal === "Ativo";
    const supervisor = clienteEhSupervisor(cliente);

    card.className = `cliente-card ${supervisor ? "supervisor" : ativo ? "ativo" : "nao-ativo"} ${personalizado ? "personalizado" : ""} ${!supervisor && cliente.contrato_ativo === false ? "contrato-off" : ""}`;
    card.dataset.codigo = cliente.codigo;
    card.draggable = personalizado;

    card.innerHTML = `
      <div class="cliente-topo">
        <button
          class="cliente-codigo"
          type="button"
          data-codigo="${escaparHtml(cliente.codigo)}"
          title="Clique para copiar o código"
        >${escaparHtml(cliente.codigo)}</button>

        <div class="cliente-selos">
          ${
            supervisor
              ? `<span class="cliente-tipo supervisor">Supervisor</span>`
              : `<span class="cliente-status ${ativo ? "ativo" : "nao-ativo"}">
                  ${escaparHtml(statusReal)}
                </span>`
          }
        </div>
      </div>

      <h3>${escaparHtml(cliente.nome_completo || "Novo Cliente")}</h3>
      <p><strong>Telefone:</strong> ${escaparHtml(cliente.telefone || "-")}</p>
    `;

    card.addEventListener("click", () => abrirCliente(cliente.codigo));

    const botaoCodigo = card.querySelector(".cliente-codigo");

    if (botaoCodigo) {
      botaoCodigo.addEventListener("click", (event) => {
        event.stopPropagation();
        copiarCodigoCliente(cliente.codigo);
      });
    }

    fragmento.appendChild(card);
  });

  listaClientes.appendChild(fragmento);
  ativarArrasteCards();
}

function aplicarClientes(clientes, mensagemTexto = "Carregado.") {
  clientesCarregados = clientes || [];

  if (!lerOrdemPersonalizada().length) {
    salvarOrdemPersonalizada(clientesCarregados.map((cliente) => cliente.codigo));
  }

  renderizarClientes();
  mostrarMensagem(mensagemTexto, "#7CFC9A");
}

async function buscarClientesRemoto() {
  const consultasClientes = [
    "codigo,nome_completo,telefone,email,cpf_cnpj,status,data_postagem,tipo_acesso,created_at,contrato",
    "codigo,nome_completo,telefone,email,cpf_cnpj,status,data_postagem,tipo_acesso,created_at",
    "*"
  ];

  let clientes = null;
  let errorClientesFinal = null;

  for (const colunas of consultasClientes) {
    const { data, error } = await supabaseClient
      .from("dadosclientes")
      .select(colunas)
      .order("codigo", { ascending: true });

    if (!error) {
      clientes = data || [];
      errorClientesFinal = null;
      break;
    }

    errorClientesFinal = error;
    console.warn(`Falha ao buscar clientes com colunas: ${colunas}`, error);
  }

  if (errorClientesFinal) {
    throw errorClientesFinal;
  }

  const hoje = obterDataHojeISO();

  const consultasPlaylists = [
    {
      colunas: "codigo_cliente,data_fim",
      filtro: `data_fim.is.null,data_fim.gte.${hoje}`
    },
    {
      colunas: "codigo_cliente,fim_exibicao",
      filtro: `fim_exibicao.is.null,fim_exibicao.gte.${hoje}`
    },
    {
      colunas: "codigo_cliente",
      filtro: null
    }
  ];

  let playlists = [];
  let encontrouPlaylist = false;

  for (const consulta of consultasPlaylists) {
    let query = supabaseClient
      .from("playlists")
      .select(consulta.colunas);

    if (consulta.filtro) {
      query = query.or(consulta.filtro);
    }

    const { data, error } = await query;

    if (!error) {
      playlists = data || [];
      encontrouPlaylist = true;
      break;
    }

    console.warn(`Falha ao buscar playlists com colunas: ${consulta.colunas}`, error);
  }

  if (!encontrouPlaylist) {
    playlists = [];
  }

  const mapaAtivos = new Map();

  playlists.forEach((item) => {
    const codigo = normalizarCodigo(item?.codigo_cliente);
    if (!codigo) return;
    mapaAtivos.set(codigo, true);
  });

  return (clientes || []).map((cliente) => {
    const codigoOriginal = String(cliente.codigo || "").trim();
    const codigoNormalizado = normalizarCodigo(codigoOriginal);
    const statusBanco = normalizarStatusTexto(cliente.status);
    const supervisor = clienteEhSupervisor(cliente);
    const statusReal = supervisor || mapaAtivos.has(codigoNormalizado) ? "Ativo" : statusBanco;
    const contratoAtivo = cliente.contrato_ativo !== undefined
      ? cliente.contrato_ativo !== false
      : Boolean(String(cliente.contrato || "").trim());

    return {
      ...cliente,
      codigo: codigoOriginal,
      nome_completo: String(cliente.nome_completo || "Novo Cliente").trim(),
      telefone: obterTelefoneCliente(cliente),
      status_real: statusReal,
      contrato_ativo: contratoAtivo
    };
  });
}

async function carregarClientes(opcoes = {}) {
  const forcarAtualizacao = opcoes.forcarAtualizacao === true;

  if (carregandoClientes) return;

  const cache = lerCacheClientes();

  if (!forcarAtualizacao && cache?.clientes?.length) {
    aplicarClientes(cache.clientes, cache.fresco ? "Carregado." : "Atualizando...");
    if (cache.fresco) return;
  }

  if (!supabaseClient) {
    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Erro ao conectar com o Supabase.</div>`;
    }

    mostrarMensagem("Supabase não carregou. Verifique o script CDN no HTML.", "#ff6b6b");
    return;
  }

  carregandoClientes = true;

  if (botaoAtualizar) {
    botaoAtualizar.disabled = true;
    botaoAtualizar.style.opacity = "0.6";
    botaoAtualizar.style.cursor = "not-allowed";
  }

  try {
    mostrarMensagem(cache?.clientes?.length ? "Atualizando..." : "Carregando clientes...");

    const final = await buscarClientesRemoto();

    salvarCacheClientes(final);
    aplicarClientes(final, "Carregado.");
  } catch (error) {
    console.error(error);

    if (cache?.clientes?.length) {
      aplicarClientes(cache.clientes, "Carregado pelo cache.");
      return;
    }

    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Erro ao carregar clientes.</div>`;
    }

    mostrarMensagem("Erro ao carregar clientes do Supabase.", "#ff6b6b");
  } finally {
    carregandoClientes = false;

    if (botaoAtualizar) {
      botaoAtualizar.disabled = false;
      botaoAtualizar.style.opacity = "1";
      botaoAtualizar.style.cursor = "pointer";
    }
  }
}

function gerarCodigoAleatorio() {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numeros = "0123456789";

  return (
    letras[Math.floor(Math.random() * letras.length)] +
    numeros[Math.floor(Math.random() * numeros.length)] +
    letras[Math.floor(Math.random() * letras.length)] +
    numeros[Math.floor(Math.random() * numeros.length)]
  );
}

async function obterCodigoUnico() {
  const usadosLocais = new Set(clientesCarregados.map((cliente) => normalizarCodigo(cliente.codigo)));

  for (let tentativa = 0; tentativa < 50; tentativa++) {
    const codigo = gerarCodigoAleatorio();

    if (usadosLocais.has(codigo)) {
      continue;
    }

    const { data, error } = await supabaseClient
      .from("dadosclientes")
      .select("codigo")
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) throw error;
    if (!data) return codigo;
  }

  throw new Error("Não foi possível gerar um código único.");
}

async function criarNovoCliente() {
  try {
    if (botaoNovoCliente) {
      botaoNovoCliente.disabled = true;
      botaoNovoCliente.style.opacity = "0.6";
      botaoNovoCliente.style.cursor = "not-allowed";
    }

    mostrarMensagem("Criando novo cliente...");

    const codigoLivre = await obterCodigoUnico();

    const tentativasPayload = [
      {
        codigo: codigoLivre,
        nome_completo: "Novo Cliente",
        telefone: "",
        email: "",
        cpf_cnpj: "",
        status: "inativo",
        tipo_acesso: "cliente"
      },
      {
        codigo: codigoLivre,
        nome_completo: "Novo Cliente",
        telefone: "",
        email: "",
        cpf_cnpj: "",
        status: "inativo",
        tipo_acesso: "cliente",
        contrato: ""
      },
      {
        codigo: codigoLivre,
        nome_completo: "Novo Cliente",
        telefone: "",
        email: "",
        cpf_cnpj: "",
        status: "inativo",
        data_postagem: new Date().toISOString(),
        tipo_acesso: "cliente",
        contrato: ""
      }
    ];

    let errorFinal = null;

    for (const payload of tentativasPayload) {
      const { error } = await supabaseClient
        .from("dadosclientes")
        .insert(payload);

      if (!error) {
        errorFinal = null;
        break;
      }

      errorFinal = error;
      console.warn("Falha ao criar cliente com payload:", payload, error);
    }

    if (errorFinal) throw errorFinal;

    sessionStorage.removeItem(CACHE_CLIENTES_KEY);

    mostrarMensagem(`Cliente ${codigoLivre} criado com sucesso.`, "#7CFC9A");
    await carregarClientes({ forcarAtualizacao: true });
    abrirCliente(codigoLivre);
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao criar novo cliente.", "#ff6b6b");
  } finally {
    if (botaoNovoCliente) {
      botaoNovoCliente.disabled = false;
      botaoNovoCliente.style.opacity = "1";
      botaoNovoCliente.style.cursor = "pointer";
    }
  }
}

function iniciarPagina() {
  if (botaoVoltarPainel) {
    botaoVoltarPainel.addEventListener("click", () => {
      window.location.href = "/centralpainel.html";
    });
  }

  if (!verificarAcesso()) {
    return;
  }

  if (!window.supabase) {
    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Supabase não carregou.</div>`;
    }

    mostrarMensagem("Supabase não carregou. Verifique o script no HTML.", "#ff6b6b");
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  if (botaoNovoCliente) {
    botaoNovoCliente.addEventListener("click", criarNovoCliente);
  }

  if (botaoAtualizar) {
    botaoAtualizar.addEventListener("click", () => carregarClientes({ forcarAtualizacao: true }));
  }

  if (buscaCliente) {
    buscaCliente.addEventListener("input", () => {
      clearTimeout(timerBusca);
      timerBusca = setTimeout(renderizarClientes, 180);
    });
  }

  botoesFiltro.forEach((botao) => {
    botao.addEventListener("click", () => {
      filtroAtual = botao.dataset.filtro || "status";
      sessionStorage.setItem(FILTRO_CLIENTES_KEY, filtroAtual);
      renderizarClientes();
    });
  });

  atualizarBotoesFiltro();
  carregarClientes();
}

iniciarPagina();
