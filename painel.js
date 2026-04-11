const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "videos";
const TABELA = "playlists";
const TABELA_PONTOS = "pontos";

const SENHA_PAINEL = "@Helena";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginBox = document.getElementById("loginBox");
const conteudoPainel = document.getElementById("conteudoPainel");
const senhaInput = document.getElementById("senhaInput");
const btnLogin = document.getElementById("btnLogin");
const loginErro = document.getElementById("loginErro");

const statusEl = document.getElementById("status");
const listaPontos = document.getElementById("listaPontos");
const pontoDetalhe = document.getElementById("pontoDetalhe");
const codigoAtual = document.getElementById("codigoAtual");
const nomeAtual = document.getElementById("nomeAtual");
const videoInput = document.getElementById("videoInput");
const btnUpload = document.getElementById("btnUpload");
const btnVoltar = document.getElementById("btnVoltar");
const playlistLista = document.getElementById("playlistLista");

let codigoSelecionado = null;
let pontosMap = {};

function setStatus(texto, tipo = "normal") {
  if (!statusEl) return;

  statusEl.textContent = texto;
  statusEl.className = "status-box";

  if (tipo === "erro") statusEl.classList.add("erro");
  if (tipo === "ok") statusEl.classList.add("ok");
}

function validarLogin() {
  const senha = (senhaInput?.value || "").trim();

  if (senha !== SENHA_PAINEL) {
    if (loginErro) loginErro.textContent = "Código inválido.";
    return;
  }

  loginBox.style.display = "none";
  conteudoPainel.style.display = "block";

  setStatus("Painel Ativo", "ok");
  iniciarPainel();
}

function configurarLogin() {
  btnLogin.addEventListener("click", validarLogin);

  senhaInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") validarLogin();
  });
}

/* ===== RESTO DO SEU SISTEMA ORIGINAL ===== */

async function buscarPontos() {
  const { data } = await supabaseClient.from(TABELA_PONTOS).select("*");
  return data || [];
}

function renderizarCardsPontos(lista) {
  pontosMap = {};
  lista.forEach(p => pontosMap[p.codigo] = p);

  document.querySelectorAll(".card-ponto").forEach(card => {
    const codigo = card.dataset.codigo;
    const nomeEl = card.querySelector(".card-nome");

    nomeEl.textContent = pontosMap[codigo]?.nome || `Ponto ${codigo}`;
  });
}

function configurarEventos() {
  document.querySelectorAll(".btn-copiar").forEach(btn => {
    btn.onclick = () => {
      navigator.clipboard.writeText(btn.dataset.codigo);
      setStatus("Código copiado", "ok");
    };
  });

  document.querySelectorAll(".btn-editar-nome").forEach(btn => {
    btn.onclick = () => {
      const codigo = btn.dataset.codigo;
      const novo = prompt("Novo nome:");
      if (!novo) return;

      supabaseClient.from(TABELA_PONTOS)
        .update({ nome: novo })
        .eq("codigo", codigo);

      setStatus("Nome atualizado", "ok");
      iniciarPainel();
    };
  });

  document.querySelectorAll(".btn-abrir").forEach(btn => {
    btn.onclick = () => {
      abrirPonto(btn.dataset.codigo);
    };
  });
}

async function iniciarPainel() {
  configurarEventos();
  const pontos = await buscarPontos();
  renderizarCardsPontos(pontos);
}

/* ===== PLAYLIST ===== */

function abrirPonto(codigo) {
  codigoSelecionado = codigo;
  listaPontos.style.display = "none";
  pontoDetalhe.style.display = "block";
  codigoAtual.textContent = codigo;
}

btnVoltar.onclick = () => {
  listaPontos.style.display = "grid";
  pontoDetalhe.style.display = "none";
  setStatus("Painel Ativo", "ok");
};

configurarLogin();
