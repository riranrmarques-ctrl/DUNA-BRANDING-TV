if (inputNome) inputNome.addEventListener("input", () => { ativarBotaoSalvar(); gerarContratoCliente(); });
if (inputEmail) inputEmail.addEventListener("input", () => { ativarBotaoSalvar(); gerarContratoCliente(); });
if (inputVencimento) inputVencimento.addEventListener("input", () => { ativarBotaoSalvar(); gerarContratoCliente(); });
if (inputDataPostagem) inputDataPostagem.addEventListener("change", () => { ativarBotaoSalvar(); gerarContratoCliente(); });

if (inputTelefone) {
  inputTelefone.addEventListener("input", (event) => {
    event.target.value = formatarTelefone(event.target.value);
    ativarBotaoSalvar();
    gerarContratoCliente();
  });
}

if (inputCpfCnpj) {
  inputCpfCnpj.addEventListener("input", (event) => {
    event.target.value = formatarCpfCnpj(event.target.value);
    ativarBotaoSalvar();
    gerarContratoCliente();
  });
}

if (inputValorContratado) {
  inputValorContratado.addEventListener("blur", (event) => {
    event.target.value = formatarMoedaBR(event.target.value);
    ativarBotaoSalvar();
    gerarContratoCliente();
  });

  if (!inputValorContratado.value) {
    inputValorContratado.value = formatarMoedaBR(0);
  }
}

if (botaoSalvar) botaoSalvar.addEventListener("click", salvarCliente);
if (botaoExcluirCliente) botaoExcluirCliente.addEventListener("click", excluirClienteAtual);
if (botaoVoltar) botaoVoltar.addEventListener("click", () => { window.location.href = "/central-clientes.html"; });
if (btnUploadCliente) btnUploadCliente.addEventListener("click", uploadArquivoCliente);
if (btnBaixarContrato) btnBaixarContrato.addEventListener("click", gerarContratoClienteParaHistorico);
if (btnToggleContrato) btnToggleContrato.addEventListener("click", alternarContratoAtivo);

async function iniciar() {
  try {
    codigoClienteAtual = obterCodigoDaUrl();

    if (!codigoClienteAtual) {
      if (inputCodigo) inputCodigo.value = "";
      mostrarMensagem("Codigo do cliente nao encontrado na URL.", "#ff6b6b");
      return;
    }

    if (inputCodigo) inputCodigo.value = codigoClienteAtual;

    mostrarMensagem(`Carregando cliente ${codigoClienteAtual}...`, "#9fd2ff");

    await carregarPontos();
    await carregarConfigContrato();
    await carregarClausulasContrato();
    await carregarCliente();
    gerarContratoCliente();
    atualizarToggleContratoVisual();
  } catch (error) {
    console.error("Erro ao iniciar pasta-cliente:", error);
    mostrarMensagem("Erro ao carregar dados da pasta do cliente.", "#ff6b6b");
  }
}

iniciar();
