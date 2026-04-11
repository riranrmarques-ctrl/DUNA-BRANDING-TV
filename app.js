const form = document.getElementById('codeForm');
const input = document.getElementById('codigo');
const mensagem = document.getElementById('mensagem');
const contadorTexto = document.getElementById('contadorTexto');

const ULTIMO_CODIGO_KEY = 'duna_ultimo_codigo';
const TEMPO_ESPERA = 30;

let intervalo = null;
let timeout = null;

async function carregarClientes() {
  const response = await fetch('clientes.json', { cache: 'no-store' });
  return await response.json();
}

function abrirPlayer(codigo) {
  window.location.href = `player.html?codigo=${codigo}`;
}

async function validarCodigo(codigo) {
  const clientes = await carregarClientes();
  return clientes.find(c => c.codigo === codigo);
}

function iniciarContagem(codigo) {
  let tempo = TEMPO_ESPERA;
  contadorTexto.classList.remove('hidden');

  contadorTexto.textContent = `Iniciando automaticamente em ${tempo}s`;

  intervalo = setInterval(() => {
    tempo--;
    contadorTexto.textContent = `Iniciando automaticamente em ${tempo}s`;

    if (tempo <= 0) clearInterval(intervalo);
  }, 1000);

  timeout = setTimeout(() => {
    abrirPlayer(codigo);
  }, TEMPO_ESPERA * 1000);
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const codigo = input.value.trim();

    if (!codigo) {
      mensagem.textContent = 'Digite um código válido';
      return;
    }

    const valido = await validarCodigo(codigo);

    if (!valido) {
      mensagem.textContent = 'Código não encontrado';
      return;
    }

    localStorage.setItem(ULTIMO_CODIGO_KEY, codigo);
    abrirPlayer(codigo);
  });

  const ultimo = localStorage.getItem(ULTIMO_CODIGO_KEY);

  if (ultimo) {
    input.value = ultimo;
    iniciarContagem(ultimo);
  }
}
