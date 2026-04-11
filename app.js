const form = document.getElementById("codeForm");
const codigoInput = document.getElementById("codigo");
const dispositivoInput = document.getElementById("dispositivo");
const mensagem = document.getElementById("mensagem");
const contadorTexto = document.getElementById("contadorTexto");

let countdown = 30;
let countdownInterval = null;
let codigosValidos = null;

/* CARREGA DADOS SALVOS */
const codigoSalvo = localStorage.getItem("codigoEstabelecimento") || "";
const dispositivoSalvo = localStorage.getItem("nomeDispositivo") || "";

codigoInput.value = codigoSalvo;
dispositivoInput.value = dispositivoSalvo;

/* SALVA AUTOMATICAMENTE */
function salvarDados() {
  localStorage.setItem("codigoEstabelecimento", codigoInput.value.trim());
  localStorage.setItem("nomeDispositivo", dispositivoInput.value.trim());
}

/* CARREGA CLIENTES UMA VEZ */
async function carregarCodigos() {
  if (codigosValidos) return codigosValidos;

  try {
    const resposta = await fetch("clientes.json", { cache: "no-store" });

    if (!resposta.ok) {
      throw new Error("Erro ao carregar clientes.json");
    }

    const dados = await resposta.json();

    if (Array.isArray(dados)) {
      codigosValidos = dados
        .map(item => String(item.codigo || "").trim().toLowerCase())
        .filter(Boolean);
      return codigosValidos;
    }

    if (typeof dados === "object" && dados !== null) {
      codigosValidos = Object.keys(dados)
        .map(item => String(item).trim().toLowerCase())
        .filter(Boolean);
      return codigosValidos;
    }

    codigosValidos = [];
    return codigosValidos;
  } catch (erro) {
    console.error("Erro ao carregar códigos:", erro);
    codigosValidos = [];
    return codigosValidos;
  }
}

/* VERIFICA SE O CÓDIGO EXISTE */
async function codigoExiste(codigo) {
  const lista = await carregarCodigos();
  return lista.includes(codigo.trim().toLowerCase());
}

/* VALIDAÇÃO EM TEMPO REAL */
async function validarCodigoAoDigitar() {
  const codigo = codigoInput.value.trim();

  if (!codigo) {
    mensagem.textContent = "";
    return;
  }

  const existe = await codigoExiste(codigo);

  if (existe) {
    mensagem.textContent = "";
  } else {
    mensagem.textContent = "Código incorreto!";
  }
}

/* ENTRA NO PLAYER */
async function entrarNoPlayer() {
  const codigo = codigoInput.value.trim();
  const dispositivo = dispositivoInput.value.trim();

  if (!codigo) {
    mensagem.textContent = "Informe o código do estabelecimento.";
    return;
  }

  localStorage.setItem("codigoEstabelecimento", codigo);
  localStorage.setItem("nomeDispositivo", dispositivo);

  const existe = await codigoExiste(codigo);

  if (!existe) {
    mensagem.textContent = "Código incorreto!";
    return;
  }

  mensagem.textContent = "";
  window.location.href = `player.html?codigo=${encodeURIComponent(codigo)}`;
}

/* SUBMIT */
form.addEventListener("submit", async function (e) {
  e.preventDefault();
  await entrarNoPlayer();
});

/* AUTOSAVE */
codigoInput.addEventListener("input", async () => {
  salvarDados();
  await validarCodigoAoDigitar();
});

dispositivoInput.addEventListener("input", () => {
  salvarDados();
});

/* TAMBÉM VALIDA AO SAIR DO CAMPO */
codigoInput.addEventListener("blur", async () => {
  await validarCodigoAoDigitar();
});

/* AUTO START */
function iniciarContador() {
  contadorTexto.classList.remove("hidden");
  contadorTexto.textContent = `Iniciando automaticamente em ${countdown}s`;

  countdownInterval = setInterval(async () => {
    countdown--;
    contadorTexto.textContent = `Iniciando automaticamente em ${countdown}s`;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      await entrarNoPlayer();
    }
  }, 1000);
}

function reiniciarContador() {
  clearInterval(countdownInterval);
  countdown = 30;
  iniciarContador();
}

codigoInput.addEventListener("input", reiniciarContador);
dispositivoInput.addEventListener("input", reiniciarContador);

/* INICIA */
carregarCodigos();
iniciarContador();
