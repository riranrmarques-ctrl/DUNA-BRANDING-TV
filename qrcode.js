const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";
const DUNATV_WORKER_URL = String(window.DUNATV_WORKER_URL || "https://SEU_WORKER.workers.dev").replace(/\/$/, "");

const CACHE_QRCODE_RELATORIO_KEY = "qrcode_relatorio_cache_v2";
const CACHE_QRCODE_RELATORIO_TTL = 10 * 60 * 1000;

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function carregarQrCodeR2(inicio, fim) {
  const headers = {};
  const token = String(window.DUNATV_ADMIN_TOKEN || sessionStorage.getItem("dunatv_worker_token") || "");
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = `${DUNATV_WORKER_URL}/api/qrcode?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`;
  const resposta = await fetch(url, { headers, cache: "no-store" });
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new Error(dados?.error || `QR Code R2 ${resposta.status}`);
  return dados || [];
}

let todosOsPontos = [];
let todosOsClientes = [];
let todasAsPlaylists = [];
let todosOsEscaneamentos = [];

const el = {
  qrCodeFilter: document.getElementById("qrCodeFilter"),
  periodFilter: document.getElementById("periodFilter"),
  generateReportButton: document.getElementById("generateReportButton"),
  totalScans: document.getElementById("totalScans"),
  uniqueScans: document.getElementById("uniqueScans"),
  dailyAverage: document.getElementById("dailyAverage"),
  activeLocations: document.getElementById("activeLocations"),
  totalVariation: document.getElementById("totalVariation"),
  uniqueVariation: document.getElementById("uniqueVariation"),
  averageVariation: document.getElementById("averageVariation"),
  chartArea: document.getElementById("chartArea"),
  chartDots: document.getElementById("chartDots"),
  chartLabels: document.getElementById("chartLabels"),
  scanHistoryList: document.getElementById("scanHistoryList"),
  scanMap: document.getElementById("scanMap"),
  rankLines: document.getElementById("rankLines"),
  heatmap: document.getElementById("heatmap"),
  peakTime: document.getElementById("peakTime")
};

document.addEventListener("DOMContentLoaded", () => {
  if (el.generateReportButton) el.generateReportButton.onclick = () => carregarRelatorio({ forcarAtualizacao: true });
  if (el.periodFilter) el.periodFilter.onchange = () => carregarRelatorio({ forcarAtualizacao: true });
  if (el.qrCodeFilter) el.qrCodeFilter.onchange = aplicarRelatorio;

  carregarRelatorio();
});

function lerCacheRelatorio() {
  try {
    const bruto = sessionStorage.getItem(CACHE_QRCODE_RELATORIO_KEY);
    if (!bruto) return null;

    const cache = JSON.parse(bruto);
    return {
      fresco: Date.now() - Number(cache.criadoEm || 0) < CACHE_QRCODE_RELATORIO_TTL,
      dados: cache.dados || null
    };
  } catch {
    return null;
  }
}

function salvarCacheRelatorio(dados) {
  try {
    sessionStorage.setItem(CACHE_QRCODE_RELATORIO_KEY, JSON.stringify({
      criadoEm: Date.now(),
      dados
    }));
  } catch {
    return;
  }
}

async function carregarRelatorio(opcoes = {}) {
  try {
    const cache = lerCacheRelatorio();

    if (!opcoes.forcarAtualizacao && cache?.dados) {
      aplicarDadosRelatorio(cache.dados);
      if (cache.fresco) return;
    }

    const { previousStart, end } = periodoSelecionado();

    const [pontosResposta, clientesResposta, vinculosResposta, escaneamentos] = await Promise.all([
      supabaseClient
        .from("pontos")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseClient
        .from("dadosclientes")
        .select("id,codigo,nome,nome_completo,status,statuscliente,created_at")
        .order("created_at", { ascending: false }),
      supabaseClient
        .from("playercliente")
        .select("cliente_codigo,ponto_codigo,codigo_cliente,codigo_ponto,tipo_vinculo,created_at"),
      carregarQrCodeR2(formatarDataBanco(previousStart), formatarDataBanco(end))
    ]);

    if (pontosResposta.error) throw pontosResposta.error;
    if (clientesResposta.error) console.warn("Clientes não carregaram:", clientesResposta.error);
    if (vinculosResposta.error) console.warn("Vinculos não carregaram:", vinculosResposta.error);

    const dados = {
      pontos: pontosResposta.data || [],
      clientes: clientesResposta.data || [],
      playlists: vinculosResposta.data || [],
      escaneamentos: escaneamentos || []
    };

    salvarCacheRelatorio(dados);
    aplicarDadosRelatorio(dados);
  } catch (erro) {
    console.error("Erro ao carregar relatório de QR Code:", erro);
    aplicarDadosRelatorio({ pontos: [], escaneamentos: [] });
  }
}

function aplicarDadosRelatorio(dados) {
  todosOsPontos = dados?.pontos || [];
  todosOsClientes = dados?.clientes || [];
  todasAsPlaylists = dados?.playlists || [];
  todosOsEscaneamentos = dados?.escaneamentos || [];

  renderizarFiltroPontos();
  aplicarRelatorio();
}

function aplicarRelatorio() {
  const escaneamentosPeriodo = filtrarEscaneamentosPeriodo(false);
  const escaneamentosPeriodoAnterior = filtrarEscaneamentosPeriodo(true);

  atualizarCards(escaneamentosPeriodo, escaneamentosPeriodoAnterior);
  desenharGraficoTempo(escaneamentosPeriodo);
  renderizarHistorico(escaneamentosPeriodo);
  renderizarRankings(escaneamentosPeriodo);
  renderizarMapa(escaneamentosPeriodo);
  renderizarHorariosPico(escaneamentosPeriodo);
}

function renderizarFiltroPontos() {
  if (!el.qrCodeFilter) return;

  const valorAtual = el.qrCodeFilter.value || "all";
  el.qrCodeFilter.innerHTML = '<option value="all">Todos os QR Codes</option>';

  todosOsPontos.forEach(ponto => {
    const option = document.createElement("option");
    option.value = chavePonto(ponto);
    option.textContent = nomePonto(ponto);
    el.qrCodeFilter.appendChild(option);
  });

  if ([...el.qrCodeFilter.options].some(option => option.value === valorAtual)) {
    el.qrCodeFilter.value = valorAtual;
  }
}

function filtrarEscaneamentosPeriodo(anterior) {
  const filtro = el.qrCodeFilter?.value || "all";
  const { start, end, previousStart } = periodoSelecionado();

  return todosOsEscaneamentos.filter(item => {
    const data = dataEscaneamento(item);
    if (Number.isNaN(data.getTime())) return false;

    const pertenceAoFiltro = filtro === "all" || escaneamentoPertenceAoPonto(item, filtro);
    const pertenceAoPeriodo = anterior ? data >= previousStart && data < start : data >= start && data <= end;

    return pertenceAoFiltro && pertenceAoPeriodo;
  });
}

function atualizarCards(atuais, anteriores) {
  const { days } = periodoSelecionado();
  const total = somaTotal(atuais);
  const totalAnterior = somaTotal(anteriores);
  const unicos = somaUnicos(atuais);
  const unicosAnterior = somaUnicos(anteriores);
  const media = total / days;
  const mediaAnterior = totalAnterior / days;
  const locais = new Set(atuais.flatMap(item => pontosDoEscaneamento(item).map(chavePonto)).filter(Boolean)).size;

  setTexto("totalScans", formatarNumero(total));
  setTexto("uniqueScans", formatarNumero(unicos));
  setTexto("dailyAverage", formatarNumero(media));
  setTexto("activeLocations", formatarNumero(locais));

  setVariacao(el.totalVariation, total, totalAnterior);
  setVariacao(el.uniqueVariation, unicos, unicosAnterior);
  setVariacao(el.averageVariation, media, mediaAnterior);
}

function desenharGraficoTempo(escaneamentos) {
  const { days, start } = periodoSelecionado();
  const buckets = Array.from({ length: days }, (_, index) => ({
    data: somarDias(start, index),
    total: 0
  }));

  escaneamentos.forEach(item => {
    const indice = Math.floor((inicioDoDia(dataEscaneamento(item)) - start) / 86400000);
    if (buckets[indice]) buckets[indice].total += totalEscaneamento(item);
  });

  const max = Math.max(...buckets.map(item => item.total), 1);
  const pontos = buckets.map((item, index) => {
    const x = days === 1 ? 50 : (index / (days - 1)) * 100;
    const y = 100 - (item.total / max) * 82 - 8;
    return `${x.toFixed(2)}% ${y.toFixed(2)}%`;
  });

  if (el.chartArea) el.chartArea.style.clipPath = `polygon(${pontos.join(", ")}, 100% 100%, 0 100%)`;
  if (el.chartDots) {
    el.chartDots.innerHTML = "";

    buckets.forEach((item, index) => {
      if (!item.total) return;

      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.left = days === 1 ? "50%" : `${(index / (days - 1)) * 100}%`;
      dot.style.bottom = `${(item.total / max) * 82 + 8}%`;
      el.chartDots.appendChild(dot);
    });
  }

  if (el.chartLabels) {
    const intervalo = days > 14 ? Math.ceil(days / 8) : 1;
    el.chartLabels.innerHTML = buckets
      .filter((_, index) => index % intervalo === 0 || index === days - 1)
      .map(item => `<span>${formatarDataCurta(item.data)}</span>`)
      .join("");
  }
}

function renderizarHistorico(escaneamentos) {
  if (!el.scanHistoryList) return;

  const historico = escaneamentos
    .flatMap(item => {
      const pontos = pontosDoEscaneamento(item);
      const anunciante = anuncianteDoEscaneamento(item);
      const data = dataEscaneamento(item);

      if (!pontos.length) {
        return [{
          anunciante,
          ponto: { nome: "Ponto não encontrado" },
          data,
          total: totalEscaneamento(item)
        }];
      }

      return pontos.map(ponto => ({
        anunciante,
        ponto,
        data,
        total: totalEscaneamento(item)
      }));
    })
    .sort((a, b) => b.data - a.data);

  if (!historico.length) {
    el.scanHistoryList.innerHTML = '<div class="empty-state">Nenhuma leitura encontrada neste período.</div>';
    return;
  }

  el.scanHistoryList.innerHTML = historico.slice(0, 40).map(item => `
    <div class="history-row">
      <div>
        <strong>${escaparHtml(nomeCliente(item.anunciante))}</strong>
        <span>${escaparHtml(nomePonto(item.ponto))}</span>
      </div>
      <div>
        <time>${escaparHtml(formatarDataHora(item.data))}</time>
        <span class="history-count">${formatarNumero(item.total)}</span>
      </div>
    </div>
  `).join("");
}

function renderizarRankings(escaneamentos) {
  const ranking = rankingPorPonto(escaneamentos);
  const max = Math.max(...ranking.map(item => item.total), 1);
  const total = Math.max(somaTotal(escaneamentos), 1);

  if (!ranking.length) {
    if (el.rankLines) el.rankLines.innerHTML = '<div class="empty-state">Nenhum ponto de mídia ativo.</div>';
    return;
  }

  if (el.rankLines) {
    el.rankLines.innerHTML = ranking.slice(0, 5).map((item, index) => `
      <div class="rank-line">
        <span>${index + 1}</span>
        <p>${escaparHtml(nomeEntidade(item.entidade))}</p>
        <strong>${formatarNumero(item.total)}</strong>
        <div class="bar"><i style="width:${(item.total / max) * 100}%"></i></div>
      </div>
    `).join("");
  }
}

function renderizarMapa(escaneamentos) {
  if (!el.scanMap) return;

  const ranking = rankingPorPonto(escaneamentos).slice(0, 5);
  const posicoes = [
    { left: 22, top: 36 },
    { left: 56, top: 18 },
    { left: 70, top: 42 },
    { left: 42, top: 64 },
    { left: 82, top: 68 }
  ];

  el.scanMap.querySelectorAll(".pin").forEach(pin => pin.remove());

  ranking.forEach((item, index) => {
    const posicao = posicoes[index];
    const pin = document.createElement("div");

    pin.className = "pin";
    pin.style.left = `${Number(item.entidade.map_x || item.entidade.posicao_x || posicao.left)}%`;
    pin.style.top = `${Number(item.entidade.map_y || item.entidade.posicao_y || posicao.top)}%`;
    pin.title = nomeEntidade(item.entidade);
    pin.innerHTML = `<span>${formatarNumero(item.total)}</span>`;

    el.scanMap.appendChild(pin);
  });
}

function renderizarHorariosPico(escaneamentos) {
  const matriz = Array.from({ length: 35 }, () => 0);
  const horarios = new Map();

  escaneamentos.forEach(item => {
    const data = dataEscaneamento(item);
    const total = totalEscaneamento(item);
    const diaSemana = (data.getDay() + 6) % 7;
    const faixaDia = Math.min(Math.floor(data.getHours() / 5), 4);
    matriz[faixaDia * 7 + diaSemana] += total;

    const horaInicial = Math.floor(data.getHours() / 2) * 2;
    const label = `${String(horaInicial).padStart(2, "0")}h - ${String(horaInicial + 2).padStart(2, "0")}h`;
    horarios.set(label, (horarios.get(label) || 0) + total);
  });

  const max = Math.max(...matriz, 1);
  if (el.heatmap) {
    el.heatmap.innerHTML = matriz.map(valor => {
      const classe = valor >= max * 0.66 ? "h" : valor > 0 ? "m" : "";
      return `<div class="${classe}"></div>`;
    }).join("");
  }

  const pico = [...horarios.entries()].sort((a, b) => b[1] - a[1])[0];
  if (el.peakTime) el.peakTime.textContent = pico ? pico[0] : "--";
}

function rankingPorPonto(escaneamentos) {
  const mapa = new Map();

  escaneamentos.forEach(item => {
    const entidade = encontrarEntidadeDoEscaneamento(item);
    if (!entidade) return;

    const chave = chaveEntidade(entidade);
    if (!mapa.has(chave)) mapa.set(chave, { entidade, total: 0 });
    mapa.get(chave).total += totalEscaneamento(item);
  });

  return [...mapa.values()].sort((a, b) => b.total - a.total);
}

function encontrarEntidadeDoEscaneamento(item) {
  const pontos = pontosDoEscaneamento(item);

  if (pontos.length) {
    return {
      codigo: pontos.map(chavePonto).join("__"),
      nome: pontos.map(nomePonto).join(" + "),
      map_x: pontos[0]?.map_x || pontos[0]?.posicao_x,
      map_y: pontos[0]?.map_y || pontos[0]?.posicao_y,
      __tipo: "ponto"
    };
  }

  const chavesEscaneamento = [
    item.codigo_cliente,
    item.codigo_ponto,
    item.ponto_codigo,
    item.codigo,
    item.qr_codigo,
    item.codigo_qr,
    item.codigo_cliente,
    item.ponto_id,
    item.qr_code_id,
    item.qrcode_id
  ].map(normalizarCodigo).filter(Boolean);

  const cliente = todosOsClientes.find(itemCliente => {
    const chavesCliente = [
      itemCliente.codigo,
      itemCliente.id
    ].map(normalizarCodigo).filter(Boolean);

    return chavesEscaneamento.some(chave => chavesCliente.includes(chave));
  });

  const ponto = todosOsPontos.find(itemPonto => {
    const chavesPonto = [
      itemPonto.codigo,
      itemPonto.codigo_ponto,
      itemPonto.ponto_codigo,
      itemPonto.codigo_final,
      itemPonto.codigo_cliente,
      itemPonto.id
    ].map(normalizarCodigo).filter(Boolean);

    return chavesEscaneamento.some(chave => chavesPonto.includes(chave));
  });

  if (ponto) return { ...ponto, __tipo: "ponto" };

  if (cliente) {
    return {
      codigo: cliente.codigo,
      nome: `QR ${cliente.codigo}`,
      __tipo: "contador"
    };
  }

  return {
    codigo: item.codigo_cliente || item.codigo_ponto || item.codigo || "SEM-CODIGO",
    nome: item.codigo_cliente || item.codigo_ponto || item.codigo || "QR Code sem nome",
    __tipo: "contador"
  };
}

function anuncianteDoEscaneamento(item) {
  const codigoCliente = normalizarCodigo(item.codigo_cliente || item.codigo_anunciante || item.cliente_codigo);

  const cliente = todosOsClientes.find(itemCliente => {
    return [itemCliente.codigo, itemCliente.id].map(normalizarCodigo).includes(codigoCliente);
  });

  if (cliente) return cliente;

  return {
    codigo: codigoCliente || "SEM-CODIGO",
    nome: codigoCliente ? `Anunciante ${codigoCliente}` : "Anunciante não encontrado"
  };
}

function pontosDoEscaneamento(item) {
  const codigoCliente = normalizarCodigo(item.codigo_cliente);
  const codigosDiretos = [
    item.codigo_ponto,
    item.ponto_codigo,
    item.codigo,
    item.ponto_id
  ].map(normalizarCodigo).filter(Boolean);

  const pontosDiretos = todosOsPontos.filter(ponto => codigosDiretos.includes(chavePonto(ponto)));
  if (pontosDiretos.length) return removerPontosDuplicados(pontosDiretos);

  const codigosPlaylist = todasAsPlaylists
    .filter(playlist => normalizarCodigo(playlist.codigo_cliente || playlist.cliente_codigo) === codigoCliente)
    .map(playlist => normalizarCodigo(playlist.codigo || playlist.ponto_codigo || playlist.codigo_ponto))
    .filter(Boolean);

  const pontosDaPlaylist = todosOsPontos.filter(ponto => codigosPlaylist.includes(chavePonto(ponto)));
  return removerPontosDuplicados(pontosDaPlaylist);
}

function escaneamentoPertenceAoPonto(item, codigoPonto) {
  return pontosDoEscaneamento(item).some(ponto => chavePonto(ponto) === normalizarCodigo(codigoPonto));
}

function removerPontosDuplicados(pontos) {
  const vistos = new Set();

  return pontos.filter(ponto => {
    const chave = chavePonto(ponto);
    if (!chave || vistos.has(chave)) return false;

    vistos.add(chave);
    return true;
  });
}

function chavePonto(ponto) {
  if (!ponto) return "";
  return normalizarCodigo(ponto.codigo || ponto.codigo_ponto || ponto.ponto_codigo || ponto.codigo_final || ponto.id);
}

function chaveCliente(cliente) {
  if (!cliente) return "";
  return normalizarCodigo(cliente.codigo || cliente.id);
}

function chaveEntidade(entidade) {
  if (!entidade) return "";
  if (entidade.__tipo === "cliente") return chaveCliente(entidade);
  return chavePonto(entidade);
}

function nomePonto(ponto) {
  return ponto?.nome || ponto?.nome_ponto || ponto?.nome_local || ponto?.titulo || ponto?.codigo || ponto?.id || "Ponto sem nome";
}

function nomeCliente(cliente) {
  return cliente?.nome || cliente?.nome_completo || cliente?.codigo || cliente?.id || "QR Code sem nome";
}

function nomeEntidade(entidade) {
  if (entidade?.__tipo === "cliente") return nomeCliente(entidade);
  return nomePonto(entidade);
}

function dataEscaneamento(item) {
  return new Date(
    item.__data_escaneamento ||
    item.lido_em ||
    item.data ||
    item.created_at ||
    item.data_hora ||
    item.scanned_at ||
    item.escaneado_em ||
    item.data_escaneamento
  );
}

function totalEscaneamento(item) {
  return Math.max(Number(item.total || item.quantidade || item.contador || 1), 0);
}

function totalUnicoEscaneamento(item) {
  return Math.max(Number(item.unicos || item.total_unicos || item.visitantes_unicos || item.total || 1), 0);
}

function somaTotal(lista) {
  return lista.reduce((total, item) => total + totalEscaneamento(item), 0);
}

function somaUnicos(lista) {
  return lista.reduce((total, item) => total + totalUnicoEscaneamento(item), 0);
}

function periodoSelecionado() {
  const days = Number(el.periodFilter?.value || 30);
  const end = new Date();
  const start = somarDias(inicioDoDia(end), -(days - 1));
  const previousStart = somarDias(start, -days);

  return { days, start, end, previousStart };
}

function inicioDoDia(data) {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function somarDias(data, dias) {
  const copia = new Date(data);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

function setVariacao(elemento, atual, anterior) {
  if (!elemento) return;

  const variacao = calcularVariacao(atual, anterior);
  elemento.textContent = variacao.texto;
  elemento.classList.toggle("down", variacao.negativa);
}

function calcularVariacao(atual, anterior) {
  if (!anterior && atual) return { texto: "↑ 100%", negativa: false };
  if (!anterior && !atual) return { texto: "↑ 0%", negativa: false };

  const percentual = ((atual - anterior) / anterior) * 100;
  return {
    texto: `${percentual < 0 ? "↓" : "↑"} ${Math.abs(percentual).toFixed(1).replace(".", ",")}%`,
    negativa: percentual < 0
  };
}

function formatarNumero(valor) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(Number(valor) || 0));
}

function formatarDataCurta(data) {
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short"
  }).replace(".", "");
}

function formatarDataHora(data) {
  if (Number.isNaN(data.getTime())) return "--";

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).replace(".", "");
}

function formatarDataBanco(data) {
  return data.toISOString().slice(0, 10);
}

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function setTexto(id, texto) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = texto;
}

function escaparHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
