  if (contratoBadge) {
    contratoBadge.textContent = concluido
      ? "Contrato assinado"
      : disponivel
        ? "Contrato pendente"
        : "Contrato indisponível";

    contratoBadge.classList.toggle("inativo", !disponivel && !concluido);
    contratoBadge.classList.toggle("pendente", disponivel && !concluido);
    contratoBadge.classList.toggle("concluido", concluido);
  }

  if (contratoInfo) {
    if (!disponivel) {
      contratoInfo.textContent = "Seu contrato ainda não está pronto. Caso necessário, solicite à equipe Duna.";
    } else if (concluido) {
      contratoInfo.textContent = "Seu contrato foi assinado e está disponível para download.";
    } else {
      contratoInfo.textContent = "Seu contrato já está disponível. Para finalizá-lo, leia e conclua a assinatura.";
    }
  }

  if (btnAssinarContrato) {
    if (!disponivel) {
      btnAssinarContrato.style.display = "none";
      btnAssinarContrato.disabled = true;
      btnAssinarContrato.onclick = null;
      return;
    }

    btnAssinarContrato.style.display = "";
    btnAssinarContrato.textContent = concluido ? "Baixar contrato" : "Assinar contrato";
    btnAssinarContrato.disabled = false;
    btnAssinarContrato.classList.toggle("concluido", concluido);
    btnAssinarContrato.classList.toggle("pendente", !concluido);

    btnAssinarContrato.onclick = () => {
      if (concluido) {
        baixarContratoCliente();
        return;
      }

      mostrarLoading();

      const params = new URLSearchParams({
        codigo: codigoClienteAtual,
        contrato: String(contratoAtualCliente.id || "")
      });

      setTimeout(() => {
        window.location.href = `/assinatura.html?${params.toString()}`;
      }, 220);
    };
  }
}

function montarCardPonto(ponto) {
  const codigo = normalizarCodigo(ponto.codigo);
  const historico = historicosPorPonto[codigo] || [];
  const status = calcularStatusPonto(ponto, historico);
  const ativo = pontoSelecionado === codigo;

  return `
    <button class="ponto-card ${ativo ? "ativo" : ""}" type="button" data-codigo="${escapeHtml(codigo)}">
      <img src="${escapeHtml(obterImagemPonto(ponto))}" alt="${escapeHtml(obterNomePonto(ponto))}">
      <div>
        <h3>${escapeHtml(obterNomePonto(ponto))}</h3>
        <p>${escapeHtml(obterLocalizacaoPonto(ponto))}</p>
        <span class="status-mini ${status.classe}">${escapeHtml(status.detalhe)}</span>
      </div>
    </button>
  `;
}

function ordenarPontosPorPrioridade(lista = pontosContratados) {
  return [...(lista || [])].sort((a, b) => {
    const codigoA = normalizarCodigo(a.codigo);
    const codigoB = normalizarCodigo(b.codigo);
    const statusA = calcularStatusPonto(a, historicosPorPonto[codigoA] || []);
    const statusB = calcularStatusPonto(b, historicosPorPonto[codigoB] || []);

    const ativoA = statusA.classe === "ativo" ? 0 : 1;
    const ativoB = statusB.classe === "ativo" ? 0 : 1;

    if (ativoA !== ativoB) return ativoA - ativoB;

    const ordemA = pontosContratados.findIndex((item) => normalizarCodigo(item.codigo) === codigoA);
    const ordemB = pontosContratados.findIndex((item) => normalizarCodigo(item.codigo) === codigoB);

    return ordemA - ordemB;
  });
}

function obterPontoInicialPrioritario() {
  return ordenarPontosPorPrioridade(pontosContratados)[0] || null;
}

function renderizarListaPontos() {
  if (contadorPontos) {
    const total = pontosContratados.length;
    contadorPontos.textContent = total === 1 ? "1 ponto" : `${total} pontos`;
  }

  if (!listaPontosCliente) return;

  if (!pontosContratados.length) {
    listaPontosCliente.innerHTML = `<div class="vazio">Nenhum ponto contratado encontrado para este cliente.</div>`;
    return;
  }

  const pontosOrdenados = ordenarPontosPorPrioridade(pontosContratados);

  listaPontosCliente.innerHTML = pontosOrdenados.map(montarCardPonto).join("");

  document.querySelectorAll(".ponto-card").forEach((card) => {
    card.onclick = () => abrirPonto(card.dataset.codigo);
  });
}

function obterChavePreviewVirtual() {
  return `preview_virtual_${codigoClienteAtual}_${pontoSelecionado}`;
}

function lerEstadoPreviewVirtual() {
  try {
    return JSON.parse(localStorage.getItem(obterChavePreviewVirtual()) || "{}");
  } catch {
    return {};
  }
}

function salvarEstadoPreviewVirtual(estado) {
  localStorage.setItem(obterChavePreviewVirtual(), JSON.stringify(estado));
}

function obterIdMaterialPreview(item) {
  return String(item?.id || item?.storage_path || item?.video_url || item?.arquivo_url || item?.url || item?.nome || "").trim();
}

function calcularEstadoPorRelogio(playlist) {
  const lista = obterListaPreviewAtiva(playlist);
  const duracaoTotal = lista.reduce((total, item) => total + obterDuracaoMaterialMs(item), 0);

  if (!lista.length || duracaoTotal <= 0) {
    return { indice: 0, restante: 0 };
  }

  let restanteRelogio = Date.now() % duracaoTotal;

  for (let index = 0; index < lista.length; index += 1) {
    const duracao = obterDuracaoMaterialMs(lista[index]);

    if (restanteRelogio < duracao) {
      return {
        indice: index,
        restante: duracao - restanteRelogio
      };
    }

    restanteRelogio -= duracao;
  }

  return {
    indice: 0,
    restante: obterDuracaoMaterialMs(lista[0])
  };
}

function calcularEstadoVirtualAtual(playlist, estadoSalvo, offline = false) {
  if (!playlist.length) {
    return {
      indice: 0,
      restante: 0
    };
  }

  const indiceSalvo = Number(estadoSalvo.indice);
  const iniciouEm = Number(estadoSalvo.iniciouEm || 0);

  if (offline && Number.isFinite(indiceSalvo) && indiceSalvo >= 0) {
    return {
      indice: indiceSalvo >= playlist.length ? 0 : indiceSalvo,
      restante: 0
    };
  }

  if (!iniciouEm) {
    return calcularEstadoPorRelogio(playlist);
  }

  let indice = Number.isFinite(indiceSalvo) && indiceSalvo >= 0 ? indiceSalvo : 0;
  if (indice >= playlist.length) indice = 0;

  let tempoPassado = Math.max(Date.now() - iniciouEm, 0);

  while (tempoPassado >= 0) {
    const item = playlist[indice];
    const duracao = obterDuracaoMaterialMs(item);

    if (tempoPassado < duracao) {
      return {
        indice,
        restante: duracao - tempoPassado
      };
    }

    tempoPassado -= duracao;
    indice = indice + 1 >= playlist.length ? 0 : indice + 1;
  }

  return calcularEstadoPorRelogio(playlist);
}

function renderizarPreview(lista, indice = null, statusPonto = null) {
  limparTimerPreview();

  if (!previewMidia) return;

  const playlist = obterListaPreviewAtiva(lista);
  const offline = statusPonto?.classe !== "ativo";
  const tituloPreview = document.getElementById("tituloPreview");

  if (tituloPreview) {
    tituloPreview.textContent = offline ? "Playlist offline |" : "Exibição em tempo real |";
  }

  if (!playlist.length) {
    if (previewNome) previewNome.textContent = "";

    previewMidia.classList.toggle("offline", offline);
    previewMidia.innerHTML = `
      <div class="preview-vazio">Nenhum material para preview neste ponto.</div>
      ${offline ? `<div class="preview-aviso-offline">Você está assistindo a playlist da TV offline.</div>` : ""}
    `;
    return;
  }

  const estadoSalvo = lerEstadoPreviewVirtual();
  const estadoVirtual = indice === null
    ? calcularEstadoVirtualAtual(playlist, estadoSalvo, offline)
    : { indice: Number(indice || 0), restante: 0 };

  const indexSeguro = estadoVirtual.indice >= playlist.length ? 0 : estadoVirtual.indice;
  const item = playlist[indexSeguro];
  const proximoIndex = indexSeguro + 1 >= playlist.length ? 0 : indexSeguro + 1;

  const url = normalizarUrl(obterUrlPlaylist(item));
  const tipo = detectarTipo(url, item.tipo);
  const arquivo = obterNomeArquivo(item);
  const agora = Date.now();
