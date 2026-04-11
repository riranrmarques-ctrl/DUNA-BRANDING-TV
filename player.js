async function carregarPlaylist() {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get("codigo");
  const video = document.getElementById("videoPlayer");

  function mostrarMensagem(texto) {
    document.body.innerHTML = `
      <div style="
        width: 100vw;
        height: 100vh;
        background: black;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-family: Arial, sans-serif;
        font-size: 24px;
        padding: 20px;
      ">
        ${texto}
      </div>
    `;
  }

  if (!codigo) {
    mostrarMensagem("Código não informado na URL.");
    return;
  }

  let cliente = null;

  try {
    // 1. Tenta ler do localStorage primeiro
    const dadosLocais = JSON.parse(localStorage.getItem("dunaPastas")) || {};

    if (dadosLocais[codigo]) {
      const pastaLocal = dadosLocais[codigo];

      // compatibilidade com formatos diferentes
      if (Array.isArray(pastaLocal.playlist)) {
        cliente = {
          nome: pastaLocal.nome || `Pasta ${codigo}`,
          playlist: pastaLocal.playlist
        };
      } else if (pastaLocal.video && pastaLocal.video.trim()) {
        cliente = {
          nome: pastaLocal.nome || `Pasta ${codigo}`,
          playlist: [pastaLocal.video.trim()]
        };
      }
    }

    // 2. Se não achou no localStorage, tenta no clientes.json
    if (!cliente) {
      const resposta = await fetch("clientes.json?t=" + Date.now());
      const clientes = await resposta.json();

      if (clientes[codigo]) {
        cliente = clientes[codigo];
      }
    }

    if (!cliente) {
      mostrarMensagem("Código não encontrado.");
      return;
    }

    if (!cliente.playlist || !Array.isArray(cliente.playlist) || cliente.playlist.length === 0) {
      mostrarMensagem("Nenhum vídeo cadastrado para este código.");
      return;
    }

    let indiceAtual = 0;

    function tocarVideo() {
      const url = cliente.playlist[indiceAtual];

      if (!url) {
        mostrarMensagem("Link de vídeo inválido.");
        return;
      }

      console.log("Tocando vídeo:", url);

      video.src = url;
      video.load();

      video.play().catch((erro) => {
        console.error("Erro ao reproduzir vídeo:", erro);
        mostrarMensagem("Erro ao reproduzir o vídeo.");
      });
    }

    video.addEventListener("ended", () => {
      indiceAtual++;
      if (indiceAtual >= cliente.playlist.length) {
        indiceAtual = 0;
      }
      tocarVideo();
    });

    video.addEventListener("error", () => {
      console.error("Erro no vídeo:", cliente.playlist[indiceAtual]);
      mostrarMensagem("Erro ao carregar o vídeo.");
    });

    tocarVideo();

  } catch (erro) {
    console.error("Erro geral no player:", erro);
    mostrarMensagem("Erro ao carregar a playlist.");
  }
}

carregarPlaylist();
