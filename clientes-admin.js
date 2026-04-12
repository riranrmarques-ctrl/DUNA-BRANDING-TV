const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const inputCodigo = document.getElementById("codigo");
const inputNome = document.getElementById("nome");
const inputTelefone = document.getElementById("telefone");
const inputEmpresa = document.getElementById("empresa");
const inputObservacao = document.getElementById("observacao");
const listaPontos = document.getElementById("listaPontos");
const listaClientes = document.getElementById("listaClientes");
const mensagem = document.getElementById("mensagem");
const botaoSalvar = document.getElementById("botaoSalvar");
const botaoLimpar = document.getElementById("botaoLimpar");
const botaoRecarregar = document.getElementById("botaoRecarregar");

let pontosData = {};
let clienteAtualCodigo = null;

function mostrarMensagem(texto, cor = "#9fd2ff") {
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

async function carregarPontos() {
  const response = await fetch("pontos.json?v=1");
  if (!response.ok) {
    throw new Error("Não foi possível carregar pontos.json");
  }
  pontosData = await response.json();
}

function renderizarPontosSelecionaveis(selecionados = []) {
  listaPontos.innerHTML = "";

  const codigos = Object.keys(pontosData);

  if (!codigos.length) {
    listaPontos.innerHTML = "<p>Nenhum ponto encontrado.</p>";
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
}

function obterPontosMarcados() {
  return Array.from(document.querySelectorAll('input[name="pontos"]:checked')).map((item) => item.value);
}

function limparFormulario() {
  clienteAtualCodigo = null;
  inputCodigo.value = "";
  inputNome.value = "";
  inputTelefone.value = "";
  inputEmpresa.value = "";
  inputObservacao.value = "";
  renderizarPontosSelecionaveis([]);
  mostrarMensagem("");
}

async function carregarClientes() {
  const { data: clientes, error } = await supabaseClient
    .from("clientes_app")
    .select("*")
    .order("codigo", { ascending: true });

  if (error) {
    throw error;
  }

  const { data: vinculos, error: errorVinculos } = await supabaseClient
    .from("cliente_pontos")
    .select("*")
    .order("cliente_codigo", { ascending: true });

  if (errorVinculos) {
    throw errorVinculos;
  }

  const mapaPontos = {};
  vinculos.forEach((item) => {
    if (!mapaPontos[item.cliente_codigo]) {
      mapaPontos[item.cliente_codigo] = [];
    }
    mapaPontos[item.cliente_codigo].push(item.ponto_codigo);
  });

  listaClientes.innerHTML = "";

  if (!clientes.length) {
    listaClientes.innerHTML = "<p>Nenhum cliente cadastrado ainda.</p>";
    return;
  }

  clientes.forEach((cliente) => {
    const card = document.createElement("div");
    card.className = "cliente-card";

    const titulo = document.createElement("h3");
    titulo.textContent = `${cliente.codigo} - ${cliente.nome}`;

    const detalhes = document.createElement("p");
    detalhes.innerHTML = `
      Empresa: ${cliente.empresa || "-"}<br>
      Telefone: ${cliente.telefone || "-"}<br>
      Pontos: ${(mapaPontos[cliente.codigo] || []).join(", ") || "nenhum"}
    `;

    const botaoEditar = document.createElement("button");
    botaoEditar.type = "button";
    botaoEditar.textContent = "Editar";
    botaoEditar.addEventListener("click", () => preencherFormulario(cliente, mapaPontos[cliente.codigo] || []));

    card.appendChild(titulo);
    card.appendChild(detalhes);
    card.appendChild(botaoEditar);
    listaClientes.appendChild(card);
  });
}

function preencherFormulario(cliente, pontos) {
  clienteAtualCodigo = cliente.codigo;
  inputCodigo.value = cliente.codigo || "";
  inputNome.value = cliente.nome || "";
  inputTelefone.value = cliente.telefone || "";
  inputEmpresa.value = cliente.empresa || "";
  inputObservacao.value = cliente.observacao || "";
  renderizarPontosSelecionaveis(pontos);
  mostrarMensagem(`Cliente ${cliente.codigo} carregado para edição.`, "#7CFC9A");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function salvarCliente() {
  const codigo = inputCodigo.value.trim().toUpperCase();
  const nome = inputNome.value.trim();
  const telefone = inputTelefone.value.trim();
  const empresa = inputEmpresa.value.trim();
  const observacao = inputObservacao.value.trim();
  const pontosMarcados = obterPontosMarcados();

  if (!codigo) {
    mostrarMensagem("Digite o código do cliente.", "#ff6b6b");
    return;
  }

  if (!nome) {
    mostrarMensagem("Digite o nome do cliente.", "#ff6b6b");
    return;
  }

  botaoSalvar.disabled = true;

  try {
    const payloadCliente = {
      codigo,
      nome,
      telefone: telefone || null,
      empresa: empresa || null,
      observacao: observacao || null
    };

    const { error: errorCliente } = await supabaseClient
      .from("clientes_app")
      .upsert(payloadCliente, { onConflict: "codigo" });

    if (errorCliente) {
      throw errorCliente;
    }

    const { error: errorDelete } = await supabaseClient
      .from("cliente_pontos")
      .delete()
      .eq("cliente_codigo", codigo);

    if (errorDelete) {
      throw errorDelete;
    }

    if (pontosMarcados.length) {
      const vinculos = pontosMarcados.map((pontoCodigo) => ({
        cliente_codigo: codigo,
        ponto_codigo: pontoCodigo
      }));

      const { error: errorInsert } = await supabaseClient
        .from("cliente_pontos")
        .insert(vinculos);

      if (errorInsert) {
        throw errorInsert;
      }
    }

    clienteAtualCodigo = codigo;
    mostrarMensagem(`Cliente ${codigo} salvo com sucesso.`, "#7CFC9A");
    await carregarClientes();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao salvar cliente no Supabase.", "#ff6b6b");
  } finally {
    botaoSalvar.disabled = false;
  }
}

async function iniciar() {
  try {
    mostrarMensagem("Carregando dados...");
    await carregarPontos();
    renderizarPontosSelecionaveis([]);
    await carregarClientes();
    mostrarMensagem("Central pronta para uso.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao iniciar a central.", "#ff6b6b");
  }
}

botaoSalvar.addEventListener("click", salvarCliente);
botaoLimpar.addEventListener("click", limparFormulario);
botaoRecarregar.addEventListener("click", iniciar);

iniciar();
