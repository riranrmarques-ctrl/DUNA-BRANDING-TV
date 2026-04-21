const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const listaClientes = document.getElementById("listaClientes");
const mensagem = document.getElementById("mensagem");
const botaoNovoCliente = document.getElementById("botaoNovoCliente");
const botaoAtualizar = document.getElementById("botaoAtualizar");
const buscaCliente = document.getElementById("buscaCliente");
 
let clientesCarregados = [];

function mostrarMensagem(texto, cor = "#9fd2ff") {
  if (!mensagem) return;
  mensagem.textContent = texto || "";
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

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function obterNomeCliente(cliente) {
  return String(
    cliente?.nome_completo ||
    cliente?.nome ||
    "Sem nome"
  ).trim();
}

function obterTelefoneCliente(cliente) {
  return String(cliente?.telefone || "").trim();
}

function obterStatusCliente(cliente) {
  const status = String(cliente?.status || "").trim().toLowerCase();

  if (status === "ativo") return "Ativo";
  if (status === "inativo") return "Inativo";
  return cliente?.status ? String(cliente.status).trim() : "Inativo";
}

function obterTipoCliente(cliente) {
  return String(cliente?.tipo_acesso || "cliente").trim();
}

function obterPontosTexto(cliente) {
  return Array.isArray(cliente?.pontos) && cliente.pontos.length
    ? cliente.pontos.join(", ")
    : "nenhum";
}

async function buscarClientesTabela() {
  const consultas = [
    "codigo,nome_completo,telefone,email,cpf_cnpj,status,tipo_acesso,created_at",
    "codigo,nome_completo,telefone,email,cpf_cnpj,status,tipo_acesso,data_postagem,created_at",
    "*"
  ];

  let ultimoErro = null;

  for (const colunas of consultas) {
    const { data, error } = await supabaseClient
      .from("dadosclientes")
      .select(colunas)
      .order("codigo", { ascending: true });

    if (!error) {
      return data || [];
    }

    ultimoErro = error;
    console.warn(`Falha ao buscar clientes com colunas: ${colunas}`, error);
  }

  throw ultimoErro;
}

async function buscarVinculosTabela() {
  const tentativas = [
    { colunas: "cliente_codigo,ponto_codigo", ordem: "cliente_codigo" },
    { colunas: "codigo_cliente,ponto_codigo", ordem: "codigo_cliente" },
    { colunas: "cliente_codigo,codigo_ponto", ordem: "cliente_codigo" },
    { colunas: "*", ordem: "created_at" }
  ];

  for (const tentativa of tentativas) {
    const query = supabaseClient
      .from("playercliente")
      .select(tentativa.colunas);

    const { data, error } = await query.order(tentativa.ordem, { ascending: true });

    if (!error) {
      return data || [];
    }

    console.warn(
      `Falha ao buscar vínculos com colunas ${tentativa.colunas} e ordem ${tentativa.ordem}:`,
      error
    );
  }

  return [];
}

function extrairCodigoClienteVinculo(item) {
  return normalizarCodigo(
    item?.cliente_codigo ||
    item?.codigo_cliente ||
    item?.codigo ||
    ""
  );
}

function extrairCodigoPontoVinculo(item) {
  return String(
    item?.ponto_codigo ||
    item?.codigo_ponto ||
    item?.codigo ||
    ""
  ).trim();
}

async function excluirVinculosCliente(codigo) {
  const codigoNormalizado = normalizarCodigo(codigo);

  const tentativas = [
    ["cliente_codigo", codigoNormalizado],
    ["codigo_cliente", codigoNormalizado]
  ];

  let conseguiuAlguma = false;
  let ultimoErroRelevante = null;

  for (const [campo, valor] of tentativas) {
    const { error } = await supabaseClient
      .from("playercliente")
      .delete()
      .eq(campo, valor);

    if (!error) {
      conseguiuAlguma = true;
      continue;
    }

    const mensagemErro = String(error.message || "").toLowerCase();
    const erroDeColuna =
      mensagemErro.includes("column") ||
      mensagemErro.includes("schema cache") ||
      mensagemErro.includes("does not exist");

    if (!erroDeColuna) {
      ultimoErroRelevante = error;
    }
  }

  if (ultimoErroRelevante) {
    throw ultimoErroRelevante;
  }

  return conseguiuAlguma;
}

async function excluirCliente(codigo) {
  const confirmar = window.confirm(`Deseja excluir o cliente ${codigo}?`);
  if (!confirmar) return;

  try {
    mostrarMensagem("Excluindo cliente...");

    await excluirVinculosCliente(codigo);

    const { error: errorCliente } = await supabaseClient
      .from("dadosclientes")
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
  if (!listaClientes) return;

  const termo = (buscaCliente?.value || "").trim().toLowerCase();

  const filtrados = clientesCarregados.filter((cliente) => {
    const textoBusca = [
      cliente.codigo,
      cliente.nome_completo,
      cliente.telefone,
      cliente.email,
      cliente.cpf_cnpj,
      cliente.status,
      cliente.tipo_acesso
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

    const pontosTexto = obterPontosTexto(cliente);
    const statusTexto = obterStatusCliente(cliente);
    const tipoTexto = obterTipoCliente(cliente);

    card.innerHTML = `
      <h3>${escaparHtml(cliente.codigo)} - ${escaparHtml(obterNomeCliente(cliente))}</h3>
      <p><strong>Tipo:</strong> ${escaparHtml(tipoTexto || "-")}</p>
      <p><strong>Telefone:</strong> ${escaparHtml(obterTelefoneCliente(cliente) || "-")}</p>
      <p><strong>Status:</strong> ${escaparHtml(statusTexto || "-")}</p>
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

    const clientes = await buscarClientesTabela();
    const vinculos = await buscarVinculosTabela();

    const mapaPontos = {};

    vinculos.forEach((item) => {
      const codigoCliente = extrairCodigoClienteVinculo(item);
      const codigoPonto = extrairCodigoPontoVinculo(item);

      if (!codigoCliente) return;

      if (!mapaPontos[codigoCliente]) {
        mapaPontos[codigoCliente] = [];
      }

      if (codigoPonto && !mapaPontos[codigoCliente].includes(codigoPonto)) {
        mapaPontos[codigoCliente].push(codigoPonto);
      }
    });

    clientesCarregados = (clientes || []).map((cliente) => {
      const codigo = normalizarCodigo(cliente.codigo);

      return {
        ...cliente,
        codigo,
        nome_completo: obterNomeCliente(cliente),
        telefone: obterTelefoneCliente(cliente),
        pontos: mapaPontos[codigo] || []
      };
    });

    renderizarClientes();
    mostrarMensagem("Clientes carregados com sucesso.", "#7CFC9A");
  } catch (error) {
    console.error(error);

    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Erro ao carregar clientes.</div>`;
    }

    mostrarMensagem("Erro ao carregar clientes do Supabase.", "#ff6b6b");
  }
}

function gerarCodigoAleatorio() {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numeros = "0123456789";

  return (
    letras[Math.floor(Math.random() * letras.length)] +
    numeros[Math.floor(Math.random() * numeros.length)] +
    letras[Math.floor(Math.random() * letras.length)] +
    numeros[Math.floor(Math.random() * numeros.length)]
  );
}

async function obterCodigoUnico() {
  const usadosLocais = new Set(clientesCarregados.map((cliente) => normalizarCodigo(cliente.codigo)));

  for (let tentativa = 0; tentativa < 80; tentativa++) {
    const codigo = gerarCodigoAleatorio();

    if (usadosLocais.has(codigo)) {
      continue;
    }

    const { data, error } = await supabaseClient
      .from("dadosclientes")
      .select("codigo")
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return codigo;
    }
  }

  throw new Error("Não foi possível gerar um código único.");
}

async function criarNovoCliente() {
  try {
    if (botaoNovoCliente) {
      botaoNovoCliente.disabled = true;
    }

    mostrarMensagem("Criando novo cliente...");

    const codigoLivre = await obterCodigoUnico();

    const tentativasPayload = [
      {
        codigo: codigoLivre,
        nome_completo: "Novo Cliente",
        telefone: "",
        email: "",
        cpf_cnpj: "",
        status: "inativo",
        tipo_acesso: "cliente"
      },
      {
        codigo: codigoLivre,
        nome_completo: "Novo Cliente",
        telefone: "",
        email: "",
        cpf_cnpj: "",
        status: "inativo",
        tipo_acesso: "cliente",
        contrato: ""
      },
      {
        codigo: codigoLivre,
        nome_completo: "Novo Cliente",
        telefone: "",
        email: "",
        cpf_cnpj: "",
        status: "inativo",
        data_postagem: new Date().toISOString(),
        tipo_acesso: "cliente",
        contrato: ""
      }
    ];

    let errorFinal = null;

    for (const payload of tentativasPayload) {
      const { error } = await supabaseClient
        .from("dadosclientes")
        .insert(payload);

      if (!error) {
        errorFinal = null;
        break;
      }

      errorFinal = error;
      console.warn("Falha ao criar cliente com payload:", payload, error);
    }

    if (errorFinal) {
      throw errorFinal;
    }

    mostrarMensagem(`Cliente ${codigoLivre} criado com sucesso.`, "#7CFC9A");
    window.location.href = `cliente-admin.html?codigo=${encodeURIComponent(codigoLivre)}`;
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao criar novo cliente.", "#ff6b6b");
  } finally {
    if (botaoNovoCliente) {
      botaoNovoCliente.disabled = false;
    }
  }
}

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
