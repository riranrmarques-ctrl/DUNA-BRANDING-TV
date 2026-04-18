async function gerarContratoClienteParaHistorico() {
  if (supervisorEstaAtivo()) {
    mostrarMensagem("Supervisor não usa envio de contrato.", "#ffb86b");
    return;
  }

  try {
    const dados = obterDadosContratoCliente();
    const historico = lerHistoricoContratosGerados();

    const item = {
      id: `${Date.now()}`,
      criado_em: new Date().toISOString(),
      nome_arquivo: obterNomeArquivoContrato(),
      dados
    };

    const htmlContrato = montarHtmlContratoCompleto(item.dados);

    historico.unshift(item);
    salvarHistoricoContratosGerados(historico);

    const { error } = await supabaseClient
      .from("clientes_app")
      .update({
        contrato_html: htmlContrato,
        contrato_nome_arquivo: item.nome_arquivo,
        contrato_enviado_em: item.criado_em,
        contrato_ativo: true
      })
      .eq("codigo", codigoClienteAtual);

    if (error) throw error;

    gerarHistoricoContratoVisual();
    mostrarMensagem("Contrato enviado para o histórico e para o acesso do cliente.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao enviar contrato para o cliente.", "#ff6b6b");
  }
}
