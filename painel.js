const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const listaPontos = document.getElementById("listaPontos");
const pontoDetalhe = document.getElementById("pontoDetalhe");
const codigoAtual = document.getElementById("codigoAtual");
const inputNomePonto = document.getElementById("inputNomePonto");
const btnSalvarNome = document.getElementById("btnSalvarNome");
const btnVoltar = document.getElementById("btnVoltar");

let codigoSelecionado = null;
let pontosMap = {};

async function carregarPontos() {
  const { data } = await supabaseClient.from("pontos").select("*");

  data.forEach(p => pontosMap[p.codigo] = p);

  document.querySelectorAll(".card-ponto").forEach(card => {
    const cod = card.dataset.codigo;
    card.querySelector(".card-nome").textContent = pontosMap[cod]?.nome || cod;
  });
}

function abrirPonto(codigo) {
  codigoSelecionado = codigo;
  listaPontos.style.display = "none";
  pontoDetalhe.style.display = "block";

  codigoAtual.textContent = codigo;
  inputNomePonto.value = pontosMap[codigo]?.nome || "";
}

function voltar() {
  pontoDetalhe.style.display = "none";
  listaPontos.style.display = "grid";
}

async function salvarNome() {
  const nome = inputNomePonto.value.trim();

  await supabaseClient
    .from("pontos")
    .update({ nome })
    .eq("codigo", codigoSelecionado);

  pontosMap[codigoSelecionado].nome = nome;

  document.querySelectorAll(".card-ponto").forEach(card => {
    if (card.dataset.codigo === codigoSelecionado) {
      card.querySelector(".card-nome").textContent = nome;
    }
  });

  alert("Nome salvo!");
}

function copiarCodigo(codigo) {
  navigator.clipboard.writeText(codigo);
  alert("Código copiado!");
}

function iniciarEventos() {
  document.querySelectorAll(".btn-abrir").forEach(btn => {
    btn.onclick = () => abrirPonto(btn.dataset.codigo);
  });

  document.querySelectorAll(".btn-copiar").forEach(btn => {
    btn.onclick = () => copiarCodigo(btn.dataset.codigo);
  });

  btnSalvarNome.onclick = salvarNome;
  btnVoltar.onclick = voltar;
}

async function iniciar() {
  await carregarPontos();
  iniciarEventos();
}

iniciar();
