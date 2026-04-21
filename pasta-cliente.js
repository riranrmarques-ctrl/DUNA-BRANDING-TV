async function salvarCliente() {
  if (!validarCamposCliente()) return false;

  const tipoAcesso = obterTipoAcessoAtual();
  const tipoVinculo = tipoAcesso === "supervisor" ? "supervisor" : "cliente";
  const statusReal = await calcularStatusClienteRealPorCodigoCliente();
  const statusBanco = statusReal === "Ativo" ? "ativo" : "inativo";
  const nomeCliente = inputNome.value.trim();

  const payload = {
    codigo: codigoClienteAtual,
    nome: nomeCliente,
    nome_completo: nomeCliente,
    telefone: inputTelefone.value.trim(),
    email: inputEmail.value.trim(),
    cpf_cnpj: inputCpfCnpj.value.trim(),
    vencimento_midia: inputVencimento.value || null,
    valor_contratado: extrairNumeroMoeda(inputValorContratado.value),
    data_postagem: inputDataPostagem.value || null,
    status: statusBanco,
    statuscliente: statusBanco,
    tipo_acesso: tipoAcesso
  };

  try {
    const { data: clienteAtualizado, error: errorUpdate } = await supabaseClient
      .from("dadosclientes")
      .update(payload)
      .eq("codigo", codigoClienteAtual)
      .select("codigo");

    if (errorUpdate) throw errorUpdate;

    if (!clienteAtualizado || !clienteAtualizado.length) {
      const { error: errorInsert } = await supabaseClient
        .from("dadosclientes")
        .insert([payload]);

      if (errorInsert) throw errorInsert;
    }

    const { error: errorDeleteVinculos } = await supabaseClient
      .from("playercliente")
      .delete()
      .eq("cliente_codigo", codigoClienteAtual);

    if (errorDeleteVinculos) throw errorDeleteVinculos;

    const pontosSelecionados = obterPontosMarcados();

    if (pontosSelecionados.length) {
      const vinculos = pontosSelecionados.map((codigoVisual) => ({
        cliente_codigo: codigoClienteAtual,
        ponto_codigo: obterCodigoRealDoPonto(codigoVisual),
        tipo_vinculo: tipoVinculo
      }));

      const { error: errorInsertVinculos } = await supabaseClient
        .from("playercliente")
        .insert(vinculos);

      if (errorInsertVinculos) throw errorInsertVinculos;
    }

    atualizarStatusClienteVisual(statusReal);
    await carregarHistoricoArquivos();

    gerarHistoricoContratoVisual();
    gerarContratoCliente();
    atualizarModoSupervisor();

    mostrarMensagem("Cliente salvo com sucesso.", "#7CFC9A");
    desativarBotaoSalvar();
    return true;
  } catch (error) {
    console.error("Erro ao salvar cliente:", error);
    mostrarMensagem(`Erro ao salvar cliente: ${error.message || "falha desconhecida"}`, "#ff6b6b");
    return false;
  }
}
