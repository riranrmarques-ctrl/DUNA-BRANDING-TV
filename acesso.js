function renderizarPreview(lista, indice = 0, statusPonto = null, offsetMs = 0) {
  limparTimerPreview();

  if (!previewMidia) return;

  const playlist = obterListaPreviewAtiva(lista);
  const offline = statusPonto?.classe !== "ativo";
  const tituloPreview = document.getElementById("tituloPreview");

  if (tituloPreview) {
    tituloPreview.textContent = offline ? "TV offline ou inativa |" : "Exibição em tempo real |";
  }

  if (!playlist.length) {
    if (previewNome) previewNome.textContent = "";

    previewMidia.classList.toggle("offline", offline);
    previewMidia.innerHTML = offline
      ? `
        <div class="preview-vazio">
          <strong>TV OFFLINE OU INATIVA</strong>
          <span>IMAGEM ATUAL CONGELADA</span>
        </div>
      `
      : `<div class="preview-vazio">Nenhum material para preview neste ponto.</div>`;
    return;
  }

  const indexSeguro = indice >= playlist.length || indice < 0 ? 0 : indice;
  const offsetSeguro = Math.max(0, Number(offsetMs) || 0);
  const item = playlist[indexSeguro];
  const proximoIndex = indexSeguro + 1 >= playlist.length ? 0 : indexSeguro + 1;

  const url = normalizarUrl(obterUrlPlaylist(item));
  const tipo = detectarTipo(url, item.tipo);
  const arquivo = obterNomeArquivo(item);

  if (previewNome) previewNome.textContent = arquivo;

  previewMidia.classList.toggle("offline", offline);

  const avisoOffline = `
    <div class="preview-aviso-offline">
      <strong>TV OFFLINE OU INATIVA</strong>
      <span>IMAGEM ATUAL CONGELADA</span>
    </div>
  `;

  if (offline) {
    if (!url) {
      previewMidia.innerHTML = `
        <div class="preview-vazio">
          <strong>TV OFFLINE OU INATIVA</strong>
          <span>IMAGEM ATUAL CONGELADA</span>
        </div>
      `;
      return;
    }

    if (tipo === "imagem") {
      previewMidia.innerHTML = `
        <img src="${escapeHtml(url)}" alt="${escapeHtml(arquivo)}">
        ${avisoOffline}
      `;
      return;
    }

    if (tipo === "site") {
      previewMidia.innerHTML = `
        <div class="preview-vazio">
          <strong>TV OFFLINE OU INATIVA</strong>
          <span>IMAGEM ATUAL CONGELADA</span>
        </div>
      `;
      return;
    }

    previewMidia.innerHTML = `
      <video src="${escapeHtml(url)}" muted playsinline preload="metadata"></video>
      ${avisoOffline}
    `;

    const video = previewMidia.querySelector("video");

    if (video) {
      video.addEventListener("loadedmetadata", () => {
        try {
          const tempoCongelado = Number.isFinite(video.duration) && video.duration > 2
            ? Math.min(1, video.duration - 1)
            : 0;

          video.currentTime = tempoCongelado;
          video.pause();
        } catch {}
      }, { once: true });
    }

    return;
  }

  if (!url) {
    const tempoRestante = Math.max(1000, obterDuracaoPreviewMs(item) - offsetSeguro);

    previewMidia.innerHTML = `<div class="preview-vazio">Material sem URL disponível.</div>`;

    timerPreviewPlaylist = setTimeout(() => {
      renderizarPreview(playlist, proximoIndex, statusPonto);
    }, tempoRestante);

    return;
  }

  if (tipo === "imagem") {
    const tempoRestante = Math.max(1000, obterDuracaoPreviewMs(item) - offsetSeguro);

    previewMidia.innerHTML = `<img src="${escapeHtml(url)}" alt="${escapeHtml(arquivo)}">`;

    timerPreviewPlaylist = setTimeout(() => {
      renderizarPreview(playlist, proximoIndex, statusPonto);
    }, tempoRestante);

    return;
  }

  if (tipo === "site") {
    const tempoRestante = Math.max(1000, obterDuracaoPreviewMs(item) - offsetSeguro);

    previewMidia.innerHTML = `<iframe src="${escapeHtml(url)}" allow="autoplay; fullscreen"></iframe>`;

    timerPreviewPlaylist = setTimeout(() => {
      renderizarPreview(playlist, proximoIndex, statusPonto);
    }, tempoRestante);

    return;
  }

  previewMidia.innerHTML = `<video src="${escapeHtml(url)}" autoplay muted playsinline></video>`;

  const video = previewMidia.querySelector("video");

  if (video) {
    const segundosIniciais = offsetSeguro / 1000;

    if (segundosIniciais > 0) {
      video.addEventListener("loadedmetadata", () => {
        if (Number.isFinite(video.duration) && video.duration > segundosIniciais + 1) {
          video.currentTime = segundosIniciais;
        }
      }, { once: true });
    }

    video.onended = () => {
      renderizarPreview(playlist, proximoIndex, statusPonto);
    };

    video.onerror = () => {
      timerPreviewPlaylist = setTimeout(() => {
        renderizarPreview(playlist, proximoIndex, statusPonto);
      }, 3000);
    };

    timerPreviewPlaylist = setTimeout(() => {
      renderizarPreview(playlist, proximoIndex, statusPonto);
    }, Math.max(3000, 45000 - offsetSeguro));
  }
}
