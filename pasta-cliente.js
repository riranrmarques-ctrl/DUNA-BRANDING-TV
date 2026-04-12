const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "videos";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const inputCodigo = document.getElementById("codigo");
const inputNome = document.getElementById("nome");
const inputTelefone = document.getElementById("telefone");
const inputEmail = document.getElementById("email");
const inputCpfCnpj = document.getElementById("cpfCnpj");
const inputVencimento = document.getElementById("vencimentoExibicao");
const statusCliente = document.getElementById("statusCliente");

const listaPontos = document.getElementById("listaPontos");
const resumoCliente = document.getElementById("resumoCliente");
const mensagem = document.getElementById("mensagem");
const botaoSalvar = document.getElementById("botaoSalvar");
const botaoVoltar = document.getElementById("botaoVoltar");

const arquivoInput = document.getElementById("arquivoInput");
const btnUploadCliente = document.getElementById("btnUploadCliente");
const statusUpload = document.getElementById("statusUpload");

const historicoContratos = document.getElementById("historicoContratos");
const historicoArquivos = document.getElementById("historicoArquivos");

let pontosData = {};
let codigoClienteAtual = "";
let houveAlteracao = true;

function mostrarMensagem(texto, cor = "#9fd2ff") {
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

function obterCodigoDaUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("codigo") || "").trim().toUpperCase();
}

function formatarTelefone(valor) {
  const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);

  if (numeros.length === 0) return "";
  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function marcarErro(campo) {
  campo.style.border = "1px solid #ff6b6b";
}

function limparErro(campo) {
  campo.style.border = "1px solid #313847";
}

function ativarBotaoSalvar() {
  houveAlteracao = true;
  botaoSalvar.disabled = false;
  botaoSalvar.style.opacity = "1";
}

function desativarBotaoSalvar() {
  houveAlteracao = false;
  botaoSalvar.disabled = true;
  botaoSalvar.style.opacity = "0.5";
}

async function carregarPontos() {
  const response = await fetch("pontos.json?v=1");
  pontosData = await response.json();
}

function obterPontosMarcados() {
  return Array.from(document.querySelectorAll('input[name="pontos"]:checked')).map(i => i.value);
}

function obterNomeDoPonto(ponto, codigo) {
  return ponto?.nome || ponto?.ambiente || ponto?.titulo || `Ponto ${codigo}`;
}

function atualizarResumo() {
  const pontos = obterPontosMarcados();
  resumoCliente.innerHTML = `<div><strong>PONTOS:</strong> ${pontos.join(", ") || "nenhum"}</div>`;
}

/* 🔥 NOVA ORGANIZAÇÃO */
function renderizarPontosSelecionaveis(selecionados = []) {
  listaPontos.innerHTML = "";

  const codigos = Object.keys(pontosData);

  const selecionadosArr = [];
  const disponiveisArr = [];
  const inativosArr = [];

  codigos.forEach((codigo) => {
    const ponto = pontosData[codigo];
    const nome = obterNomeDoPonto(ponto, codigo);

    const isSelecionado = selecionados.includes(codigo);
    const isInativo = ponto?.status === "inativo";

    const html = `
      <label class="item-ponto ${isSelecionado ? "selecionado" : ""}">
        <input type="checkbox" name="pontos" value="${codigo}" 
          ${isSelecionado ? "checked" : ""} 
          ${isInativo ? "disabled" : ""}>
        <span>${codigo}</span>
        <span>${nome}</span>
      </label>
    `;

    if (isSelecionado) selecionadosArr.push(html);
    else if (isInativo) inativosArr.push(html);
    else disponiveisArr.push(html);
  });

  listaPontos.innerHTML = `
    <div><strong style="color:#7CFC9A">Selecionado</strong>${selecionadosArr.join("")}</div>
    <div><strong style="color:#6ea8ff">Disponível</strong>${disponiveisArr.join("")}</div>
    <div><strong style="color:#ff6b6b">Inativo</strong>${inativosArr.join("")}</div>
  `;

  atualizarResumo();
}

listaPontos.addEventListener("change", () => {
  renderizarPontosSelecionaveis(obterPontosMarcados());
  ativarBotaoSalvar();
});

async function carregarCliente() {
  const { data } = await supabaseClient
    .from("clientes_app")
    .select("*")
    .eq("codigo", codigoClienteAtual)
    .single();

  inputCodigo.value = data.codigo;
  inputNome.value = data.nome || "";
  inputTelefone.value = formatarTelefone(data.telefone || "");
  inputEmail.value = data.email || "";
  inputCpfCnpj.value = data.cpf_cnpj || "";
  inputVencimento.value = data.vencimento_exibicao || "";

  renderizarPontosSelecionaveis([]);
  desativarBotaoSalvar();
}

botaoSalvar.addEventListener("click", () => {
  mostrarMensagem("Salvo");
  desativarBotaoSalvar();
});

botaoVoltar.addEventListener("click", () => {
  window.location.href = "central-clientes.html";
});

async function iniciar() {
  codigoClienteAtual = obterCodigoDaUrl();
  await carregarPontos();
  await carregarCliente();
}

iniciar();
