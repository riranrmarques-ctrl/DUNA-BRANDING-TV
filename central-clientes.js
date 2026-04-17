const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

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

let supabaseClient = null;
let clientesCarregados = [];

const listaClientes = document.getElementById("listaClientes");
const mensagem = document.getElementById("mensagem");
const botaoNovoCliente = document.getElementById("botaoNovoCliente");
const botaoAtualizar = document.getElementById("botaoAtualizar");
const buscaCliente = document.getElementById("buscaCliente");
const botaoVoltarPainel = document.getElementById("botaoVoltarPainel");

function verificarAcesso() {
  const liberado = sessionStorage.getItem("painelLiberado");

  if (liberado !== "1") {
    window.location.href = "/painel.html";
    return false;
  }

  return true;
}

function mostrarMensagem(texto, cor = "#9fd2ff") {
  if (!mensagem) return;

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
  window.location.href = `/pasta-cliente.html?codigo=${encodeURIComponent(codigo)}`;
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

    if (errorVinculos) throw errorVinculos;

    const { error: errorCliente } = await supabaseClient
      .from("clientes_app")
      .delete()
      .eq("codigo", codigo);

    if (errorCliente) throw errorCliente;

    mostrarMensagem(`Cliente ${codigo} excluído.`, "#7CFC9A");
    await carregarClientes();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao excluir cliente.", "#ff6b6b");
  }
}

function obterListaFiltrada() {
  const termo = (buscaCliente?.value || "").trim().toLowerCase();

  if (!termo) {
    return clientesCarregados;
  }

  return clientesCarregados.filter((cliente) => {
    const textoBusca = [
      cliente.codigo,
      cliente.nome_completo,
      cliente.telefone,
      cliente.email,
      cliente.cpf_cnpj,
      cliente.status,
      Array.isArray(cliente.pontos) ? cliente.pontos.join(" ") : ""
    ]
      .join(" ")
      .toLowerCase();

    return textoBusca.includes(termo);
  });
}

function renderizarClientes() {
  if (!listaClientes) return;

  const filtrados = obterListaFiltrada();

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
      <div class="cliente-codigo">${escaparHtml(cliente.codigo)}</div>
      <h3>${escaparHtml(cliente.nome_completo || "Novo Cliente")}</h3>
      <p><strong>Telefone:</strong> ${escaparHtml(cliente.telefone || "-")}</p>
      <p><strong>Email:</strong> ${escaparHtml(cliente.email || "-")}</p>
      <p><strong>Pontos:</strong> ${escaparHtml(pontosTexto)}</p>
      <div class="cliente-acoes">
        <button class="botao-abrir" type="button">Abrir</button>
        <button class="botao-excluir" type="button">Excluir</button>
      </div>
    `;

    card.addEventListener("click", () => abrirCliente(cliente.codigo));

    const botaoAbrir = card.querySelector(".botao-abrir");
    const botaoExcluir = card.querySelector(".botao-excluir");

    if (botaoAbrir) {
      botaoAbrir.addEventListener("click", (event) => {
        event.stopPropagation();
        abrirCliente(cliente.codigo);
      });
    }

    if (botaoExcluir) {
      botaoExcluir.addEventListener("click", (event) => {
        event.stopPropagation();
        excluirCliente(cliente.codigo);
      });
    }

    listaClientes.appendChild(card);
  });
}

async function carregarClientes() {
  if (!supabaseClient) {
    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Erro ao conectar com o Supabase.</div>`;
    }

    mostrarMensagem("Supabase não carregou. Verifique o script CDN no HTML.", "#ff6b6b");
    return;
  }

  try {
    mostrarMensagem("Carregando clientes...");

    const { data: clientes, error } = await supabaseClient
      .from("clientes_app")
      .select("*")
      .order("codigo", { ascending: true });

    if (error) throw error;

    const { data: vinculos, error: errorVinculos } = await supabaseClient
      .from("cliente_pontos")
      .select("*")
      .order("cliente_codigo", { ascending: true });

    if (errorVinculos) throw errorVinculos;

    const mapaPontos = {};

    (vinculos || []).forEach((item) => {
      if (!mapaPontos[item.cliente_codigo]) {
        mapaPontos[item.cliente_codigo] = [];
      }

      mapaPontos[item.cliente_codigo].push(item.ponto_codigo);
    });

    clientesCarregados = (clientes || []).map((cliente) => ({
      ...cliente,
      pontos: mapaPontos[cliente.codigo] || []
    }));

    renderizarClientes();
    mostrarMensagem("Carregado.", "#7CFC9A");
  } catch (error) {
    console.error(error);

    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Erro ao carregar clientes.</div>`;
    }

    mostrarMensagem("Erro ao carregar clientes do Supabase.", "#ff6b6b");
  }
}

function obterCodigoLivre() {
  const usados = new Set(clientesCarregados.map((cliente) => cliente.codigo));
  return CODIGOS_FIXOS.find((codigo) => !usados.has(codigo)) || null;
}

async function criarNovoCliente() {
  const codigoLivre = obterCodigoLivre();

  if (!codigoLivre) {
    mostrarMensagem("Todos os códigos fixos já foram usados.", "#ffb86b");
    return;
  }

  try {
    if (botaoNovoCliente) {
      botaoNovoCliente.disabled = true;
    }

    mostrarMensagem("Criando novo cliente...");

    const payload = {
      codigo: codigoLivre,
      nome_completo: "Novo Cliente",
      telefone: "",
      email: "",
      cpf_cnpj: "",
      status: "Não ativo",
      vencimento_exibicao: null
    };

    const { error } = await supabaseClient
      .from("clientes_app")
      .insert(payload);

    if (error) throw error;

    mostrarMensagem(`Cliente ${codigoLivre} criado com sucesso.`, "#7CFC9A");
    await carregarClientes();
    abrirCliente(codigoLivre);
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao criar novo cliente.", "#ff6b6b");
  } finally {
    if (botaoNovoCliente) {
      botaoNovoCliente.disabled = false;
    }
  }
}

function iniciarPagina() {
  if (botaoVoltarPainel) {
    botaoVoltarPainel.addEventListener("click", () => {
      window.location.href = "/painel.html";
    });
  }

  if (!verificarAcesso()) {
    return;
  }

  if (!window.supabase) {
    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Supabase não carregou.</div>`;
    }

    mostrarMensagem("Supabase não carregou. Verifique o script no HTML.", "#ff6b6b");
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  if (botaoNovoCliente) {
    botaoNovoCliente.addEventListener("click", criarNovoCliente);
  }

  if (botaoAtualizar) {
    botaoAtualizar.addEventListener("click", carregarClientes);
  }

  if (buscaCliente) {
    buscaCliente.addEventListener("input", renderizarClientes);
  }

  carregarClientes();
}

iniciarPagina();
