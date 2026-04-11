const form = document.getElementById("codeForm");
const codigoInput = document.getElementById("codigo");
const dispositivoInput = document.getElementById("dispositivo");
const mensagem = document.getElementById("mensagem");
const contadorTexto = document.getElementById("contadorTexto");

let countdown = 30;
let countdownInterval = null;

/* CARREGA DADOS SALVOS */
const codigoSalvo = localStorage.getItem("codigoEstabelecimento") || "";
const dispositivoSalvo = localStorage.getItem("nomeDispositivo") || "";

codigoInput.value = codigoSalvo;
dispositivoInput.value = dispositivoSalvo;

/* SALVA AUTOMATICAMENTE OS DOIS CAMPOS */
function salvarDados() {
  localStorage.setItem("codigoEstabelecimento", codigoInput.value.trim());
  localStorage.setItem("nomeDispositivo", dispositivoInput.value.trim());
}

/* ENTRA NO PLAYER */
function entrarNoPlayer() {
  const codigo = codigoInput.value.trim();
  const dispositivo = dispositivoInput.value.trim();

  if (!codigo) {
    mensagem.textContent = "Informe o código do estabelecimento.";
    return;
  }

  localStorage.setItem("codigoEstabelecimento", codigo);
  localStorage.setItem("nomeDispositivo", dispositivo);

  window.location.href = `player.html?codigo=${encodeURIComponent(codigo)}`;
}

/* AUTOSAVE */
codigoInput.addEventListener("input", salvarDados);
dispositivoInput.addEventListener("input", salvarDados);

/* SUBMIT DO FORM */
form.addEventListener("submit", function (e) {
  e.preventDefault();
  entrarNoPlayer();
});

/* AUTO START */
function iniciarContador() {
  contadorTexto.classList.remove("hidden");
  contadorTexto.textContent = `Iniciando automaticamente em ${countdown}s`;

  countdownInterval = setInterval(() => {
    countdown--;
    contadorTexto.textContent = `Iniciando automaticamente em ${countdown}s`;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      entrarNoPlayer();
    }
  }, 1000);
}

iniciarContador();

/* REINICIA CONTADOR SE MEXER NOS CAMPOS */
function reiniciarContador() {
  clearInterval(countdownInterval);
  countdown = 30;
  iniciarContador();
}

codigoInput.addEventListener("input", reiniciarContador);
dispositivoInput.addEventListener("input", reiniciarContador);
