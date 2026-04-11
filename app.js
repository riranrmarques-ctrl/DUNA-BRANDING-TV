const video = document.getElementById('player');
const loading = document.getElementById('loading');

const params = new URLSearchParams(window.location.search);
const codigo = (params.get('codigo') || '').trim().toLowerCase();

let playlist = [];
let indexAtual = 0;

function mostrarLoading(texto) {
  loading.textContent = texto;
  loading.classList.remove('hidden');
}

function esconderLoading() {
  loading.classList.add('hidden');
}

function mostrarErro(texto) {
  mostrarLoading(texto);
}

function tocarAtual() {
  if (!playlist.length) {
    mostrarErro('Nenhum vídeo cadastrado para este ponto.');
    return;
  }

  video.controls = false;
  video.removeAttribute('controls');
  video.src = playlist[indexAtual];
  video.load();

  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        esconderLoading();
      })
      .catch((error) => {
        console.error(error);
        proximoVideo();
      });
  } else {
    esconderLoading();
  }
}

function proximoVideo() {
  indexAtual = (indexAtual + 1) % playlist.length;
  tocarAtual();
}

video.addEventListener('ended', proximoVideo);
video.addEventListener('error', proximoVideo);

async function iniciarPlayer() {
  if (!codigo) {
    mostrarErro('Código não informado.');
    return;
  }

  try {
    const response = await fetch('clientes.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Erro ao carregar clientes.json');
    }

    const dados = await response.json();
    const ponto = dados.find(item => item.codigo.toLowerCase() === codigo);

    if (!ponto) {
      mostrarErro('Ponto não encontrado.');
      return;
    }

    playlist = Array.isArray(ponto.videos) ? ponto.videos : [];

    if (!playlist.length) {
      mostrarErro('Nenhum vídeo cadastrado para este ponto.');
      return;
    }

    tocarAtual();
  } catch (error) {
    console.error(error);
    mostrarErro('Erro ao carregar a playlist.');
  }
}

iniciarPlayer();
