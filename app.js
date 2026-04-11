const form = document.getElementById('codeForm');
const codigoInput = document.getElementById('codigo');
const mensagem = document.getElementById('mensagem');
const contadorTexto = document.getElementById('contadorTexto');

const ULTIMO_CODIGO_KEY = 'duna_codigo';
const TEMPO = 30;

let tempoAtual = TEMPO;
let intervalo;
let timeout;

async function carregarClientes() {
  const res = await fetch('clientes.json');
  return await res.json();
}

function abrirPlayer(codigo) {
  window.location.href = `player.html?codigo=${codigo}`;
}

async function validar(codigo) {
  const dados = await carregarClientes();
  return dados.find(c => c.codigo === codigo);
}

function iniciarContagem(codigo) {
  contadorTexto.textContent = `Iniciando automaticamente em ${tempoAtual}s`;

  intervalo = setInterval(() => {
    tempoAtual--;
    contadorTexto.textContent = `Iniciando automaticamente em ${tempoAtual}s`;

    if (tempoAtual <= 0) clearInterval(intervalo);
  }, 1000);

  timeout = setTimeout(() => {
    abrirPlayer(codigo);
  }, TEMPO * 1000);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const codigo = codigoInput.value.trim();

  if (!codigo) return;

  const ok = await validar(codigo);

  if (!ok) {
    mensagem.textContent = 'Código inválido';
    return;
  }

  localStorage.setItem(ULTIMO_CODIGO_KEY, codigo);
  abrirPlayer(codigo);
});

const ultimo = localStorage.getItem(ULTIMO_CODIGO_KEY);

if (ultimo) {
  codigoInput.value = ultimo;
  iniciarContagem(ultimo);
}
