const video = document.getElementById('player');
const loading = document.getElementById('loading');
const erro = document.getElementById('erro');

const params = new URLSearchParams(window.location.search);
const codigo = (params.get('codigo') || '').trim().toLowerCase();

let playlist = [];
let indexAtual = 0;

function mostrarErro(texto) {
  if (loading) loading.classList.add('hidden');
  if (erro) {
    erro.textContent = texto;
    erro.classList.remove('hidden');
  }
}

function tocarAtual() {
  if (!playlist.length) {
    mostrarErro('Nenhum vídeo cadastrado para este código.');
    return;
  }

  video.src = playlist[indexAtual];
  video.play().catch(() => {
    proximoVideo();
  });

  if (loading) loading.classList.add('hidden');
}

function proximoVideo() {
  indexAtual = (indexAtual + 1) % playlist.length;
  tocarAtual();
}

if (video) {
  video.addEventListener('ended', proximoVideo);
  video.addEventListener('error', proximoVideo);
}

async function iniciarPlayer() {
  if (!codigo) {
    mostrarErro('Código não informado.');
    return;
  }

  try {
    const response = await fetch('clientes.json', { cache: 'no-store' });
    const clientes = await response.json();
    const cliente = clientes.find(item => item.codigo.toLowerCase() === codigo);

    if (!cliente) {
      mostrarErro('Cliente não encontrado.');
      return;
    }

    playlist = Array.isArray(cliente.videos) ? cliente.videos : [];
    tocarAtual();
  } catch (error) {
    mostrarErro('Erro ao carregar a playlist.');
  }
}

iniciarPlayer();