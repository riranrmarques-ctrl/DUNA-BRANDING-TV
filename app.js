const form = document.getElementById('codeForm');
const input = document.getElementById('codigo');
const mensagem = document.getElementById('mensagem');

const autoBox = document.getElementById('autoBox');
const ultimoCodigoTexto = document.getElementById('ultimoCodigoTexto');
const contadorTexto = document.getElementById('contadorTexto');
const usarUltimoBtn = document.getElementById('usarUltimoBtn');
const limparCodigoBtn = document.getElementById('limparCodigoBtn');

const ULTIMO_CODIGO_KEY = 'duna_ultimo_codigo';
const TEMPO_ESPERA = 60;

let contadorInterval = null;
let autoTimeout = null;

async function carregarClientes() {
  const response = await fetch('clientes.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Erro ao carregar clientes.json');
  return await response.json();
}

function abrirPlayer(codigo) {
  window.location.href = `player.html?codigo=${encodeURIComponent(codigo)}`;
}

async function validarCodigo(codigo) {
  const clientes = await carregarClientes();
  return clientes.find(item => item.codigo.toLowerCase() === codigo.toLowerCase());
}

function limparTimers() {
  if (contadorInterval) clearInterval(contadorInterval);
  if (autoTimeout) clearTimeout(autoTimeout);
}

function iniciarContagem(codigo) {
  let segundos = TEMPO_ESPERA;
  contadorTexto.textContent = `Reprodução automática em ${segundos}s`;

  contadorInterval = setInterval(() => {
    segundos--;
    contadorTexto.textContent = `Reprodução automática em ${segundos}s`;

    if (segundos <= 0) {
      clearInterval(contadorInterval);
    }
  }, 1000);

  autoTimeout = setTimeout(async () => {
    try {
      const cliente = await validarCodigo(codigo);
      if (cliente) abrirPlayer(codigo);
    } catch (error) {
      console.error(error);
    }
  }, TEMPO_ESPERA * 1000);
}

if (form && input && mensagem) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const codigo = input.value.trim().toLowerCase();

    if (!codigo) {
      mensagem.textContent = 'Digite um código válido.';
      return;
    }

    try {
      const cliente = await validarCodigo(codigo);

      if (!cliente) {
        mensagem.textContent = 'Código não encontrado.';
        return;
      }

      localStorage.setItem(ULTIMO_CODIGO_KEY, codigo);
      abrirPlayer(codigo);
    } catch (error) {
      mensagem.textContent = 'Erro ao carregar os dados.';
      console.error(error);
    }
  });

  const ultimoCodigo = localStorage.getItem(ULTIMO_CODIGO_KEY);

  if (ultimoCodigo && autoBox && ultimoCodigoTexto) {
    autoBox.classList.remove('hidden');
    ultimoCodigoTexto.textContent = ultimoCodigo;
    iniciarContagem(ultimoCodigo);

    usarUltimoBtn?.addEventListener('click', () => {
      limparTimers();
      abrirPlayer(ultimoCodigo);
    });

    limparCodigoBtn?.addEventListener('click', () => {
      localStorage.removeItem(ULTIMO_CODIGO_KEY);
      limparTimers();
      autoBox.classList.add('hidden');
      contadorTexto.textContent = '';
      mensagem.textContent = 'Código salvo removido. Digite um novo cliente.';
      input.focus();
    });
  }
}
