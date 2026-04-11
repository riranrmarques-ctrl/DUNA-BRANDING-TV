const form = document.getElementById('codeForm');
const dispositivoInput = document.getElementById('dispositivo');
const codigoInput = document.getElementById('codigo');
const mensagem = document.getElementById('mensagem');
const contadorTexto = document.getElementById('contadorTexto');

const CODIGO_KEY = 'duna_codigo';
const DISPOSITIVO_KEY = 'duna_dispositivo';
const TEMPO_AUTOMATICO = 30;

let countdownInterval = null;
let autoStartTimeout = null;

function limparTimers() {
  if (countdownInterval) clearInterval(countdownInterval);
  if (autoStartTimeout) clearTimeout(autoStartTimeout);
}

async function carregarPontos() {
  const response = await fetch('clientes.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Erro ao carregar clientes.json');
  }
  return await response.json();
}

async function validarCodigo(codigo) {
  const dados = await carregarPontos();
  return dados.find(item => item.codigo.toLowerCase() === codigo.toLowerCase());
}

function abrirPlayer(codigo, dispositivo) {
  const params = new URLSearchParams();
  params.set('codigo', codigo);

  if (dispositivo && dispositivo.trim()) {
    params.set('dispositivo', dispositivo.trim());
  }

  window.location.href = `player.html?${params.toString()}`;
}

function salvarCampos() {
  const dispositivo = dispositivoInput.value.trim();
  const codigo = codigoInput.value.trim();

  localStorage.setItem(DISPOSITIVO_KEY, dispositivo);
  localStorage.setItem(CODIGO_KEY, codigo);
}

function preencherCamposSalvos() {
  const dispositivoSalvo = localStorage.getItem(DISPOSITIVO_KEY) || '';
  const codigoSalvo = localStorage.getItem(CODIGO_KEY) || '';

  dispositivoInput.value = dispositivoSalvo;
  codigoInput.value = codigoSalvo;
}

function iniciarContagem(codigo, dispositivo) {
  limparTimers();

  let segundos = TEMPO_AUTOMATICO;
  contadorTexto.classList.remove('hidden');
  contadorTexto.textContent = `Iniciando automaticamente em ${segundos}s`;

  countdownInterval = setInterval(() => {
    segundos -= 1;
    contadorTexto.textContent = `Iniciando automaticamente em ${segundos}s`;

    if (segundos <= 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);

  autoStartTimeout = setTimeout(() => {
    abrirPlayer(codigo, dispositivo);
  }, TEMPO_AUTOMATICO * 1000);
}

function reiniciarAutoInicioSePossivel() {
  const codigo = codigoInput.value.trim();
  const dispositivo = dispositivoInput.value.trim();

  salvarCampos();

  if (!codigo) {
    limparTimers();
    contadorTexto.classList.add('hidden');
    contadorTexto.textContent = '';
    return;
  }

  iniciarContagem(codigo, dispositivo);
}

dispositivoInput.addEventListener('input', () => {
  reiniciarAutoInicioSePossivel();
});

codigoInput.addEventListener('input', () => {
  mensagem.textContent = '';
  reiniciarAutoInicioSePossivel();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const codigo = codigoInput.value.trim();
  const dispositivo = dispositivoInput.value.trim();

  if (!codigo) {
    mensagem.textContent = 'Digite um código válido.';
    return;
  }

  try {
    const ponto = await validarCodigo(codigo);

    if (!ponto) {
      mensagem.textContent = 'Código inválido.';
      return;
    }

    salvarCampos();
    abrirPlayer(codigo, dispositivo);
  } catch (error) {
    console.error(error);
    mensagem.textContent = 'Erro ao validar o código.';
  }
});

window.addEventListener('load', async () => {
  preencherCamposSalvos();

  const codigoSalvo = codigoInput.value.trim();
  const dispositivoSalvo = dispositivoInput.value.trim();

  if (!codigoSalvo) {
    contadorTexto.classList.add('hidden');
    return;
  }

  try {
    const ponto = await validarCodigo(codigoSalvo);

    if (ponto) {
      iniciarContagem(codigoSalvo, dispositivoSalvo);
    } else {
      contadorTexto.classList.add('hidden');
    }
  } catch (error) {
    console.error(error);
    contadorTexto.classList.add('hidden');
  }
});
