const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CODIGOS_FIXOS = [
  "H3L1","E7N4","H8E2","L3A9","N1H6","E4L7","A9H2","H5N8","L2E6","N7A3",
  "E1H9","A4L8","H6A1","L9N5","E3A7","N8H4","A2E6","H7L3","L1H8","E9N2"
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
  window.location.href = `pasta-cliente.html?codigo=${encodeURIComponent(codigo)}`;
}

async function excluirCliente(codigo) {
  const confirmar = window.confirm(`Deseja excluir o cliente ${codigo}?`);
  if (!confirmar) return;

  try {
    mostrarMensagem("Excluindo cliente...");

    await supabaseClient.from("cliente_pontos").delete().eq("cliente_codigo", codigo);
    await supabaseClient.from("clientes_app").delete().eq("codigo", codigo);

    mostrarMensagem(`Cliente ${codigo} excluído.`, "#7CFC9A");
    await carregarClientes();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao excluir cliente.", "#ff6b6b");
  }
}

function obterListaFiltrada() {
  const termo = (buscaCliente.value || "").toLowerCase();

  return clientesCarregados.filter((cliente) => {
    return [
      cliente.codigo,
      cliente.nome,
      cliente.telefone
    ].join(" ").toLowerCase().includes(termo);
  });
}

function renderizarClientes() {
  const filtrados = obterListaFiltrada();

  listaClientes.innerHTML = "";

  if (!filtrados.length) {
    listaClientes.innerHTML = `<div class="vazio">Nenhum cliente encontrado.</div>`;
    return;
  }

  filtrados.forEach((cliente) => {
    const card = document.createElement("div");
    card.className = "cliente-card";

    const pontosTexto = cliente.pontos?.length
      ? cliente.pontos.join(", ")
      : "nenhum";

    card.innerHTML = `
      <div class="cliente-codigo">${escaparHtml(cliente.codigo)}</div>
      <h3>${escaparHtml(cliente.nome || "Novo Cliente")}</h3>
      <p><strong>Telefone:</strong> ${escaparHtml(cliente.telefone || "-")}</p>
      <p><strong>Pontos:</strong> ${escaparHtml(pontosTexto)}</p>
      <div class="cliente-acoes">
        <button class="botao-abrir">Abrir</button>
        <button class="botao-excluir">Excluir</button>
      </div>
    `;

    card.addEventListener("click", () => abrirCliente(cliente.codigo));

    card.querySelector(".botao-abrir").onclick = (e) => {
      e.stopPropagation();
      abrirCliente(cliente.codigo);
    };

    card.querySelector(".botao-excluir").onclick = (e) => {
      e.stopPropagation();
      excluirCliente(cliente.codigo);
    };

    listaClientes.appendChild(card);
  });
}

async function carregarClientes() {
  try {
    mostrarMensagem("Carregando...");

    const { data: clientes } = await supabaseClient
      .from("clientes_app")
      .select("*")
      .order("codigo");

    const { data: vinculos } = await supabaseClient
      .from("cliente_pontos")
      .select("*");

    const mapa = {};
    vinculos?.forEach(v => {
      if (!mapa[v.cliente_codigo]) mapa[v.cliente_codigo] = [];
      mapa[v.cliente_codigo].push(v.ponto_codigo);
    });

    clientesCarregados = (clientes || []).map(c => ({
      ...c,
      pontos: mapa[c.codigo] || []
    }));

    renderizarClientes();
    mostrarMensagem("Carregado.", "#7CFC9A");

  } catch (error) {
    console.error(error);
    listaClientes.innerHTML = `<div class="vazio">Erro ao carregar</div>`;
    mostrarMensagem("Erro no Supabase.", "#ff6b6b");
  }
}

function obterCodigoLivre() {
  const usados = new Set(clientesCarregados.map(c => c.codigo));
  return CODIGOS_FIXOS.find(c => !usados.has(c));
}

async function criarNovoCliente() {
  const codigo = obterCodigoLivre();

  if (!codigo) {
    mostrarMensagem("Todos os códigos já usados.", "#ffb86b");
    return;
  }

  try {
    botaoNovoCliente.disabled = true;
    mostrarMensagem("Criando...");

    await supabaseClient.from("clientes_app").insert({
      codigo: codigo,
      nome: "Novo Cliente"
    });

    mostrarMensagem(`Criado: ${codigo}`, "#7CFC9A");
    await carregarClientes();

  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao criar cliente.", "#ff6b6b");
  } finally {
    botaoNovoCliente.disabled = false;
  }
}

botaoNovoCliente.onclick = criarNovoCliente;
botaoAtualizar.onclick = carregarClientes;
buscaCliente.oninput = renderizarClientes;

carregarClientes();
