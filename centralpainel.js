alert("JS NOVO CARREGOU");
const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";

const CACHE_CENTRAL_KEY = "central_painel_cache_v3";
const CACHE_CENTRAL_TTL = 30 * 60 * 1000;

const TABELA_REPRODUCOES = "reproducoes_diarias";
const TABELA_QRCODE_CONTADORES = "qrcode_contadores";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let todosOsPontos = [];

document.addEventListener("DOMContentLoaded", () => {
  configurarLinksCentral();
  iniciarLoginCentral();
});

function configurarLinksCentral() {
  const botoes = Array.from(document.querySelectorAll("a, button"));

  botoes.forEach((botao) => {
    const texto = String(botao.textContent || "").toLowerCase().trim();

    if (texto.includes("qr code") || texto.includes("qrcode")) {
      botao.onclick = (event) => {
        event.preventDefault();
        window.location.href = "/qrcode";
      };
    }
  });
}

function iniciarLoginCentral() {
  const loginBox = document.getElementById("loginBox");
  const conteudoPainel = document.getElementById("conteudoPainel");
  const senhaInput = document.getElementById("senhaInput");
  const btnLogin = document.getElementById("btnLogin");
  const loginErro = document.getElementById("loginErro");

  async function verificarSessao() {
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
      liberarPainel();
    } else {
      bloquearPainel();
    }
  }

  function liberarPainel() {
    if (loginBox) loginBox.style.display = "none";
    if (conteudoPainel) conteudoPainel.style.display = "flex";
    carregarcentralpainel();
  }

  function bloquearPainel() {
    if (loginBox) loginBox.style.display = "flex";
    if (conteudoPainel) conteudoPainel.style.display = "none";
  }

  async function fazerLogin() {
    const senha = senhaInput?.value || "";

    if (loginErro) loginErro.textContent = "Verificando...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: "adm@dunabranding.com.br",
      password: senha
    });

    if (error) {
      console.error("ERRO LOGIN SUPABASE:", error);
      alert("Erro: " + error.message);
      if (loginErro) loginErro.textContent = error.message;
      return;
    }

    console.log("LOGIN OK:", data);
    alert("Login aprovado");

    if (loginErro) loginErro.textContent = "";
    liberarPainel();
  }

  verificarSessao();

  if (btnLogin) {
    btnLogin.addEventListener("click", () => {
      console.log("BOTÃO CLICADO");
      fazerLogin();
    });
  }

  if (senhaInput) {
    senhaInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") fazerLogin();
    });
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

function obterPeriodoSelecionado() {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(fim.getDate() - 29);

  return {
    inicio: inicio.toISOString().split("T")[0],
    fim: fim.toISOString().split("T")[0]
  };
}

async function buscarMetricasGeraisPeriodo() {
  const periodo = obterPeriodoSelecionado();

  const [respostaReproducoes, respostaQrCode] = await Promise.all([
    supabaseClient
      .from(TABELA_REPRODUCOES)
      .select("data,total_reproducoes")
      .gte("data", periodo.inicio)
      .lte("data", periodo.fim),

    supabaseClient
      .from(TABELA_QRCODE_CONTADORES)
      .select("data,total")
      .gte("data", periodo.inicio)
      .lte("data", periodo.fim)
  ]);

  const totalReproducoes = (respostaReproducoes.data || []).reduce((soma, item) => {
    return soma + Number(item.total_reproducoes || 0);
  }, 0);

  const totalQrCode = (respostaQrCode.data || []).reduce((soma, item) => {
    return soma + Number(item.total || 0);
  }, 0);

  return { totalReproducoes, totalQrCode };
}

async function carregarcentralpainel() {
  try {
    const cache = await lerCacheCentral();

    if (cache?.dados && cache.fresco) {
      aplicarDadosCentral(cache.dados);
      return;
    }

    const { data: pontos } = await supabaseClient
      .from("pontos")
      .select("*");

    const metricasGerais = await buscarMetricasGeraisPeriodo();

    const dados = {
      pontos: pontos || [],
      metricasGerais
    };

    salvarCacheCentral(dados);
    aplicarDadosCentral(dados);

  } catch (erro) {
    console.error("Erro:", erro);
  }
}

function aplicarDadosCentral(dados) {
  const pontos = dados?.pontos || [];
  const metricasGerais = dados?.metricasGerais || {};

  atualizarPainel(pontos, metricasGerais);
}

function atualizarPainel(pontos, metricasGerais = {}) {
  const total = pontos.length;
  const totalReproducoes = metricasGerais.totalReproducoes || 0;
  const totalQrCode = metricasGerais.totalQrCode || 0;

  setTexto("totalReproducoes", totalReproducoes);
  setTexto("totalQrCode", totalQrCode);
  setTexto("pontosAtivos", total);
  setTexto("totalPontosTexto", `De um total de ${total}`);
}

function setTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}
