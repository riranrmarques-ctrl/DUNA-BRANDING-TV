function reorganizarMobile() {
  const contrato = document.querySelector(".contrato-card");
  const contratoOrigem = document.getElementById("contratoOrigem");
  const contratoMobileFinal = document.getElementById("contratoMobileFinal");

  const historicoBloco = document.querySelector("#historicoOrigem .historico-secao");
  const historicoOrigem = document.getElementById("historicoOrigem");
  const historicoMobileFinal = document.getElementById("historicoMobileFinal");

  // 🔥 PROTEÇÃO TOTAL (isso faltava)
  if (
    !contrato ||
    !contratoOrigem ||
    !contratoMobileFinal ||
    !historicoBloco ||
    !historicoOrigem ||
    !historicoMobileFinal
  ) {
    console.warn("Elementos ainda não prontos para reorganizar mobile");
    return;
  }

  if (window.innerWidth <= 760) {

    if (contrato.parentElement !== contratoMobileFinal) {
      contratoMobileFinal.appendChild(contrato);
    }

    if (historicoBloco.parentElement !== historicoMobileFinal) {
      historicoMobileFinal.appendChild(historicoBloco);
    }

  } else {

    if (contrato.parentElement !== contratoOrigem) {
      contratoOrigem.appendChild(contrato);
    }

    if (historicoBloco.parentElement !== historicoOrigem) {
      historicoOrigem.appendChild(historicoBloco);
    }

  }
}
