const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const inputCodigo = document.getElementById("codigo");
const inputNome = document.getElementById("nome");
const inputTelefone = document.getElementById("telefone");
const inputEmpresa = document.getElementById("empresa");
const inputObservacao = document.getElementById("observacao");
const listaPontos = document.getElementById("listaPontos");
const resumoCliente = document.getElementById("resumoCliente");
const mensagem = document.getElementById("mensagem");
const botaoSalvar = document.getElementById("botaoSalvar");
const botaoVoltar = document.getElementById("botaoVoltar");

let pontosData = {};
let codigoClienteAtual = "";

function mostrarMensagem(texto, cor = "#9fd2ff") {
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

function obterCodigoDaUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("codigo") || "").trim().toUpperCase();
}

async function carregarPontos() {
  const response = await fetch("pontos.json?v=1");

  if (!response.ok) {
    throw new Error("Não foi possível carregar pontos.json");
  }

  pontosData = await response.json();
}

function obterPontosMarcados() {
  return Array.from(document.querySelectorAll('input[name="pontos"]:checked')).map((item) => item.value);
}

function atualizarResumo() {
  const nome = inputNome.value.trim() || "-";
  const telefone = inputTelefone.value.trim() || "-";
  const empresa = inputEmpresa.value.trim() || "-";
  const observacao = inputObservacao.value.trim() || "-";
  const pontos = obterPontosMarcados();

  resumoCliente.innerHTML = `
    <div class="linha"><strong>Código:</strong> ${codigoClienteAtual || "-"}</div>
    <div class="linha"><strong>Nome:</strong> ${nome}</div>
    <div class="linha"><strong>Telefone:</strong> ${telefone}</div>
    <div class="linha"><strong>Empresa:</strong> ${empresa}</div>
    <div class="linha"><strong>Observação:</strong> ${observacao}</div>
    <div class="linha"><strong>Pontos liberados:</strong> ${pontos.length ? pontos.join(", ") : "nenhum"}</div>
  `;
}

function renderizarPontosSelecionaveis(selecionados = []) {
  listaPontos.innerHTML = "";

  const codigos = Object.keys(pontosData);

  if (!codigos.length) {
    listaPontos.innerHTML = `<div class="vazio">Nenhum ponto encontrado.</div>`;
    return;
  }

  codigos.forEach((codigoPonto) => {
    const ponto = pontosData[codigoPonto];

    const item = document.createElement("label");
    item.className = "item-ponto";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "pontos";
    checkbox.value = codigoPonto;
    checkbox.checked = selecionados.includes(codigoPonto);

    const info = document.createElement("div");
    info.className = "item-ponto-info";

    const titulo = document.createElement("strong");
    titulo.textContent = `${codigoPonto} - ${ponto.nome || "Sem nome"}`;

    const detalhe = document.createElement("span");
    const totalPlaylist = Array.isArray(ponto.playlist) ? ponto.playlist.length : 0;
    detalhe.textContent = `Playlist: ${totalPlaylist} item(ns)`;

    info.appendChild(titulo);
    info.appendChild(detalhe);

    item.appendChild(checkbox);
    item.appendChild(info);
    listaPontos.appendChild(item);
  });

  atualizarResumo();
}

async function carregarCliente() {
  const { data: cliente, error } = await supabaseClient
    .from("clientes_app")
    .select("*")
    .eq("codigo", codigoClienteAtual)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!cliente) {
    throw new Error("Cliente não encontrado.");
  }

  const { data: vinculos, error: errorVinculos } = await supabaseClient
    .from("cliente_pontos")
    .select("*")
    .eq("cliente_codigo", codigoClienteAtual);

  if (errorVinculos) {
    throw errorVinculos;
  }

  const pontosSelecionados = Array.isArray(vinculos)
    ? vinculos.map((item) => item.ponto_codigo)
    : [];

  inputCodigo.value = cliente.codigo || "";
  inputNome.value = cliente.nome || "";
  inputTelefone.value = cliente.telefone || "";
  inputEmpresa.value = cliente.empresa || "";
  inputObservacao.value = cliente.observacao || "";

  renderizarPontosSelecionaveis(pontosSelecionados);
  atualizarResumo();
}

async function salvarCliente() {
  const nome = inputNome.value.trim();
  const telefone = inputTelefone.value.trim();
  const empresa = inputEmpresa.value.trim();
  const observacao = inputObservacao.value.trim();
  const pontosMarcados = obterPontosMarcados();

  if (!codigoClienteAtual) {
    mostrarMensagem("Código do cliente não encontrado.", "#ff6b6b");
    return;
  }

  if (!nome) {
    mostrarMensagem("Digite o nome do cliente.", "#ff6b6b");
    return;
  }

  botaoSalvar.disabled = true;

  try {
    const { error: errorCliente } = await supabaseClient
      .from("clientes_app")
      .upsert({
        codigo: codigoClienteAtual,
        nome,
        telefone: telefone || null,
        empresa: empresa || null,
        observacao: observacao || null
      }, { onConflict: "codigo" });

    if (errorCliente) {
      throw errorCliente;
    }

    const { error: errorDelete } = await supabaseClient
      .from("cliente_pontos")
      .delete()
      .eq("cliente_codigo", codigoClienteAtual);

    if (errorDelete) {
      throw errorDelete;
    }

    if (pontosMarcados.length) {
      const vinculos = pontosMarcados.map((pontoCodigo) => ({
        cliente_codigo: codigoClienteAtual,
        ponto_codigo: pontoCodigo
      }));

      const { error: errorInsert } = await supabaseClient
        .from("cliente_pontos")
        .insert(vinculos);

      if (errorInsert) {
        throw errorInsert;
      }
    }

    atualizarResumo();
    mostrarMensagem(`Cliente ${codigoClienteAtual} salvo com sucesso.`, "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao salvar cliente.", "#ff6b6b");
  } finally {
    botaoSalvar.disabled = false;
  }
}

async function iniciar() {
  try {
    codigoClienteAtual = obterCodigoDaUrl();

    if (!codigoClienteAtual) {
      mostrarMensagem("Código do cliente não informado na URL.", "#ff6b6b");
      return;
    }

    mostrarMensagem("Carregando cliente...");
    await carregarPontos();
    await carregarCliente();
    mostrarMensagem("Cliente carregado com sucesso.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao carregar os dados do cliente.", "#ff6b6b");
  }
}

inputNome.addEventListener("input", atualizarResumo);
inputTelefone.addEventListener("input", atualizarResumo);
inputEmpresa.addEventListener("input", atualizarResumo);
inputObservacao.addEventListener("input", atualizarResumo);
listaPontos.addEventListener("change", atualizarResumo);

botaoSalvar.addEventListener("click", salvarCliente);
botaoVoltar.addEventListener("click", () => {
  window.location.href = "central-clientes.html";
});

iniciar();
