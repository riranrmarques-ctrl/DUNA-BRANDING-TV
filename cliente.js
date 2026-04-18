const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CODIGOS_FIXOS = [
  "H3L1",
  "E7N4",
  "H8E2",
  "L3A9",
  "N1H6",
  "E4L7",
  "A9H2",
  "H5N8",
  "L2E6",
  "N7A3",
  "E1H9",
  "A4L8",
  "H6A1",
  "L9N5",
  "E3A7",
  "N8H4",
  "A2E6",
  "H7L3",
  "L1H8",
  "E9N2"
];

const listaClientes = document.getElementById("listaClientes");
const mensagem = document.getElementById("mensagem");
const botaoNovoCliente = document.getElementById("botaoNovoCliente");
const botaoAtualizar = document.getElementById("botaoAtualizar");
const buscaCliente = document.getElementById("buscaCliente");

let clientesCarregados = [];

function mostrarMensagem(texto, cor = "#9fd2ff") {
  mensagem.textContent = texto;
  mensagem.style.color = cor;
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
  window.location.href = `cliente-admin.html?codigo=${encodeURIComponent(codigo)}`;
}

async function excluirCliente(codigo) {
  const confirmar = window.confirm(`Deseja excluir o cliente ${codigo}?`);
  if (!confirmar) return;

  try {
    mostrarMensagem("Excluindo cliente...");

    const { error: errorVinculos } = await supabaseClient
      .from("cliente_pontos")
      .delete()
      .eq("cliente_codigo", codigo);

    if (errorVinculos) {
      throw errorVinculos;
    }

    const { error: errorCliente } = await supabaseClient
      .from("clientes_app")
      .delete()
      .eq("codigo", codigo);

    if (errorCliente) {
      throw errorCliente;
    }

    mostrarMensagem(`Cliente ${codigo} excluído com sucesso.`, "#7CFC9A");
    await carregarClientes();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao excluir cliente.", "#ff6b6b");
  }
}

function renderizarClientes() {
  const termo = (buscaCliente.value || "").trim().toLowerCase();

  const filtrados = clientesCarregados.filter((cliente) => {
    const textoBusca = [
      cliente.codigo,
      cliente.nome,
      cliente.empresa,
      cliente.telefone
    ]
      .join(" ")
      .toLowerCase();

    return textoBusca.includes(termo);
  });

  listaClientes.innerHTML = "";

  if (!filtrados.length) {
    listaClientes.innerHTML = `<div class="vazio">Nenhum cliente encontrado.</div>`;
    return;
  }

  filtrados.forEach((cliente) => {
    const card = document.createElement("div");
    card.className = "cliente-card";

    const pontosTexto = Array.isArray(cliente.pontos) && cliente.pontos.length
      ? cliente.pontos.join(", ")
      : "nenhum";

    card.innerHTML = `
      <h3>${escaparHtml(cliente.codigo)} - ${escaparHtml(cliente.nome || "Sem nome")}</h3>
      <p><strong>Empresa:</strong> ${escaparHtml(cliente.empresa || "-")}</p>
      <p><strong>Telefone:</strong> ${escaparHtml(cliente.telefone || "-")}</p>
      <p><strong>Pontos:</strong> ${escaparHtml(pontosTexto)}</p>
      <div class="acoes-card">
        <button class="botao-abrir" type="button">Abrir</button>
        <button class="botao-excluir" type="button">Excluir</button>
      </div>
    `;

    const botaoAbrir = card.querySelector(".botao-abrir");
    const botaoExcluir = card.querySelector(".botao-excluir");

    botaoAbrir.addEventListener("click", () => abrirCliente(cliente.codigo));
    botaoExcluir.addEventListener("click", () => excluirCliente(cliente.codigo));

    listaClientes.appendChild(card);
  });
}

async function carregarClientes() {
  try {
    mostrarMensagem("Carregando clientes...");

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

    clientesCarregados = clientes.map((cliente) => ({
      ...cliente,
      pontos: mapaPontos[cliente.codigo] || []
    }));

    renderizarClientes();
    mostrarMensagem("Clientes carregados com sucesso.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    listaClientes.innerHTML = `<div class="vazio">Erro ao carregar clientes.</div>`;
    mostrarMensagem("Erro ao carregar clientes do Supabase.", "#ff6b6b");
  }
}

function obterProximoCodigoLivre() {
  const usados = new Set(clientesCarregados.map((cliente) => cliente.codigo));
  return CODIGOS_FIXOS.find((codigo) => !usados.has(codigo)) || null;
}

async function criarNovoCliente() {
  const codigoLivre = obterProximoCodigoLivre();

  if (!codigoLivre) {
    mostrarMensagem("Todos os códigos fixos já foram usados.", "#ffb86b");
    return;
  }

  try {
    botaoNovoCliente.disabled = true;
    mostrarMensagem("Criando novo cliente...");

    const { error } = await supabaseClient
      .from("clientes_app")
      .insert({
        codigo: codigoLivre,
        nome: "Novo Cliente",
        telefone: null,
        empresa: null,
        observacao: null
      });

    if (error) {
      throw error;
    }

    mostrarMensagem(`Cliente ${codigoLivre} criado com sucesso.`, "#7CFC9A");
    window.location.href = `cliente-admin.html?codigo=${encodeURIComponent(codigoLivre)}`;
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao criar novo cliente.", "#ff6b6b");
  } finally {
    botaoNovoCliente.disabled = false;
  }
}

botaoNovoCliente.addEventListener("click", criarNovoCliente);
botaoAtualizar.addEventListener("click", carregarClientes);
buscaCliente.addEventListener("input", renderizarClientes);

carregarClientes();
