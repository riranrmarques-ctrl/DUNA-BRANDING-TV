const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";
const SENHA_PAINEL = "@helena";

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

async function carregarcentralpainel() {
  try {
    const { data: pontos, error: erroPontos } = await supabaseClient
      .from("pontos")
      .select("*")
      .order("created_at", { ascending: false });

    if (erroPontos) throw erroPontos;

    const { data: status, error: erroStatus } = await supabaseClient
      .from("statuspontos")
      .select("*");

    if (erroStatus) {
      console.warn("Status não carregou, usando pontos sem status:", erroStatus);
    }

    todosOsPontos = combinarPontosComStatus(pontos || [], status || []);
    atualizarPainel(todosOsPontos);
  } catch (erro) {
    console.error("Erro ao carregar central painel:", erro);
  }
}

function combinarPontosComStatus(pontos, status) {
  return pontos.map(ponto => {
    const codigoPonto = String(ponto.codigo || ponto.codigo_ponto || ponto.ponto_codigo || "").trim();

    const statusEncontrado = status.find(item => {
      const codigoStatus = String(item.codigo || item.codigo_ponto || item.ponto_codigo || "").trim();
      return codigoStatus === codigoPonto;
    });

    return {
      ...ponto,
      codigo_final: codigoPonto,
      status_final: normalizarStatus(statusEncontrado?.status || ponto.status || "offline"),
      ultimo_ping_final: statusEncontrado?.ultimo_ping || ponto.ultimo_ping || ponto.updated_at || null
    };
  });
}

function atualizarPainel(pontos) {
  atualizarMetricas(pontos);
  atualizarDonut(pontos);

  const ordem = {
    "ativo": 1,
    "sem material": 2,
    "inativo": 3,
    "offline": 4
  };

  const pontosOrdenados = [...pontos].sort((a, b) => {
    const ordemA = ordem[a.status_final] || 99;
    const ordemB = ordem[b.status_final] || 99;

    if (ordemA !== ordemB) return ordemA - ordemB;

    return new Date(b.ultimo_ping_final || 0) - new Date(a.ultimo_ping_final || 0);
  });

  renderizarPontos(pontosOrdenados.slice(0, 4));
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
  setTexto("novosContratos", "0");
}

function atualizarDonut(pontos) {
  const total = pontos.length;
  const ativos = pontos.filter(p => p.status_final === "ativo").length;
  const semMaterial = pontos.filter(p => p.status_final === "sem material").length;
  const inativos = pontos.filter(p => p.status_final === "inativo").length;
  const offline = pontos.filter(p => p.status_final === "offline").length;

  setTexto("donutTotal", total);
  setHtml("legendaAtivos", `${ativos} (${percentual(ativos, total)})`);
  setHtml("legendaSemMaterial", `${semMaterial} (${percentual(semMaterial, total)})`);
  setHtml("legendaInativos", `${inativos} (${percentual(inativos, total)})`);
  setHtml("legendaOffline", `${offline} (${percentual(offline, total)})`);

  const donut = document.querySelector(".donut");
  if (!donut) return;

  if (!total) {
    donut.style.background = "#1e293b";
    return;
  }

  const pAtivos = (ativos / total) * 100;
  const pSemMaterial = pAtivos + (semMaterial / total) * 100;
  const pInativos = pSemMaterial + (inativos / total) * 100;

  donut.style.background = `conic-gradient(
    #22c55e 0% ${pAtivos}%,
    #f59e0b ${pAtivos}% ${pSemMaterial}%,
    #ef4444 ${pSemMaterial}% ${pInativos}%,
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
    const endereco = ponto.endereco || ponto.endereco_completo || ponto.localizacao || ponto.rua || "Endereço não informado";
    const status = ponto.status_final;
    const ultimoPing = ponto.ultimo_ping_final;
    const uptime = calcularUptimeIndividual(ultimoPing, status);
    const imagem = ponto.imagem_url || ponto.foto_url || ponto.imagem || ponto.banner_url || "https://placehold.co/600x300/020617/ffffff?text=Indoor+Midia";

    lista.innerHTML += `
      <article class="point-card" data-codigo="${escaparHtml(ponto.codigo_final)}">
        <img src="${escaparHtml(imagem)}" alt="${escaparHtml(nome)}">
        <div class="point-body">
          <h4>${escaparHtml(nome)}</h4>
          <p>${escaparHtml(endereco)}</p>
          <span class="status ${classeStatus(status)}">● ${textoStatus(status)}</span>
          <p>Último ping: ${formatarPing(ultimoPing)}</p>
          <strong>${uptime}% uptime</strong>
          <div class="progress ${barraStatus(status)}">
            <i style="width:${uptime}%"></i>
          </div>
        </div>
      </article>
    `;
  });
}

function calcularUptimeMedio(pontos) {
  if (!pontos.length) return "0,0";

  const soma = pontos.reduce((total, ponto) => {
    return total + calcularUptimeIndividual(ponto.ultimo_ping_final, ponto.status_final);
  }, 0);

  return (soma / pontos.length).toFixed(1).replace(".", ",");
}

function calcularUptimeIndividual(ultimoPing, status) {
  if (status === "inativo" || status === "offline") return 0;
  if (!ultimoPing) return status === "ativo" ? 80 : 0;

  const agora = new Date();
  const ultimo = new Date(ultimoPing);

  if (Number.isNaN(ultimo.getTime())) return 0;

  const segundos = (agora - ultimo) / 1000;

  if (segundos <= 90) return 100;
  if (segundos <= 300) return 95;
  if (segundos <= 600) return 80;
  if (segundos <= 1200) return 50;

  return 0;
}

function normalizarStatus(status) {
  const s = String(status || "").toLowerCase().trim();

  if (s === "ativo" || s === "online" || s === "rodando" || s === "reproduzindo") return "ativo";
  if (s === "inativo" || s === "parado") return "inativo";
  if (s === "sem material" || s === "sem_material" || s === "sem-material") return "sem material";
  if (s === "offline" || s === "desconectado") return "offline";

  return "offline";
}

function textoStatus(status) {
  if (status === "ativo") return "ATIVO";
  if (status === "sem material") return "SEM MATERIAL";
  if (status === "inativo") return "INATIVO";
  return "OFFLINE";
}

function classeStatus(status) {
  if (status === "ativo") return "active";
  if (status === "sem material") return "warning";
  if (status === "inativo") return "inactive";
  return "offline";
}

function barraStatus(status) {
  if (status === "sem material") return "warning-bar";
  if (status === "inativo" || status === "offline") return "inactive-bar";
  return "";
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
