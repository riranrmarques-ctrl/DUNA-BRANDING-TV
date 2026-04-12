const form = document.getElementById("codeForm");
const inputCodigo = document.getElementById("codigo");
const mensagem = document.getElementById("mensagem");
const areaLogin = document.getElementById("areaLogin");
const areaCliente = document.getElementById("areaCliente");
const nomeCliente = document.getElementById("nomeCliente");
const listaTelas = document.getElementById("listaTelas");
const botaoSair = document.getElementById("botaoSair");

let clientesData = {};
let pontosData = {};

function mostrarMensagem(texto, cor = "#ff6b6b") {
  if (!mensagem) return;
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

async function carregarDados() {
  try {
    const [clientesResponse, pontosResponse] = await Promise.all([
      fetch("clientes.json?v=1"),
      fetch("pontos.json?v=1")
    ]);

    if (!clientesResponse.ok) {
      throw new Error("Erro ao carregar clientes.json");
    }

    if (!pontosResponse.ok) {
      throw new Error("Erro ao carregar pontos.json");
    }

    clientesData = await clientesResponse.json();
    pontosData = await pontosResponse.json();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao carregar os dados do sistema.");
  }
}

function obterNomeMidia(url) {
  if (!url || typeof url !== "string") {
    return "Nenhum conteúdo na playlist";
  }

  try {
    const semQuery = url.split("?")[0];
    const partes = semQuery.split("/");
    const nomeArquivo = partes[partes.length - 1];

    return nomeArquivo || "Conteúdo sem nome";
  } catch {
    return "Conteúdo sem nome";
  }
}

function criarCardTela(codigoPonto, dadosPonto) {
  const card = document.createElement("div");
  card.className = "card-tela";

  const titulo = document.createElement("h3");
  titulo.textContent = dadosPonto.nome || `Tela ${codigoPonto}`;

  const status = document.createElement("p");
  status.textContent = "Online agora";

  const reproduzindo = document.createElement("p");
  const primeiraMidia = Array.isArray(dadosPonto.playlist) && dadosPonto.playlist.length > 0
    ? dadosPonto.playlist[0]
    : null;
  reproduzindo.textContent = `Reproduzindo: ${obterNomeMidia(primeiraMidia)}`;

  const codigo = document.createElement("p");
  codigo.textContent = `Código da tela: ${codigoPonto}`;

  const botao = document.createElement("a");
  botao.href = `player.html?codigo=${encodeURIComponent(codigoPonto)}`;
  botao.target = "_blank";
  botao.rel = "noopener noreferrer";
  botao.textContent = "Ver exibição";
  botao.className = "botao-ver-exibicao";

  card.appendChild(titulo);
  card.appendChild(status);
  card.appendChild(reproduzindo);
  card.appendChild(codigo);
  card.appendChild(botao);

  return card;
}

function renderizarCliente(codigoCliente) {
  const cliente = clientesData[codigoCliente];

  if (!cliente) {
    mostrarMensagem("Código inválido.");
    return;
  }

  const pontosCliente = Array.isArray(cliente.pontos) ? cliente.pontos : [];

  localStorage.setItem("clienteCodigo", codigoCliente);

  if (nomeCliente) {
    nomeCliente.textContent = cliente.nome || "Cliente";
  }

  if (listaTelas) {
    listaTelas.innerHTML = "";
  }

  if (pontosCliente.length === 0) {
    const aviso = document.createElement("p");
    aviso.textContent = "Nenhuma tela vinculada a este cliente.";
    listaTelas.appendChild(aviso);
  } else {
    pontosCliente.forEach((codigoPonto) => {
      const dadosPonto = pontosData[codigoPonto];

      if (!dadosPonto) return;

      const card = criarCardTela(codigoPonto, dadosPonto);
      listaTelas.appendChild(card);
    });

    if (!listaTelas.children.length) {
      const aviso = document.createElement("p");
      aviso.textContent = "Nenhuma tela válida encontrada para este cliente.";
      listaTelas.appendChild(aviso);
    }
  }

  if (areaLogin) {
    areaLogin.style.display = "none";
  }

  if (areaCliente) {
    areaCliente.style.display = "block";
  }

  mostrarMensagem("");
}

function entrarCliente(event) {
  event.preventDefault();

  const codigoDigitado = inputCodigo.value.trim().toUpperCase();

  if (!codigoDigitado) {
    mostrarMensagem("Digite o código de acesso.");
    return;
  }

  renderizarCliente(codigoDigitado);
}

function sairCliente() {
  localStorage.removeItem("clienteCodigo");

  if (inputCodigo) {
    inputCodigo.value = "";
  }

  if (areaCliente) {
    areaCliente.style.display = "none";
  }

  if (areaLogin) {
    areaLogin.style.display = "block";
  }

  if (listaTelas) {
    listaTelas.innerHTML = "";
  }

  if (nomeCliente) {
    nomeCliente.textContent = "";
  }

  mostrarMensagem("");
}

async function iniciar() {
  await carregarDados();

  const codigoSalvo = (localStorage.getItem("clienteCodigo") || "").trim().toUpperCase();

  if (codigoSalvo && clientesData[codigoSalvo]) {
    renderizarCliente(codigoSalvo);
  } else {
    if (areaLogin) {
      areaLogin.style.display = "block";
    }

    if (areaCliente) {
      areaCliente.style.display = "none";
    }
  }
}

if (form) {
  form.addEventListener("submit", entrarCliente);
}

if (botaoSair) {
  botaoSair.addEventListener("click", sairCliente);
}

iniciar();
