async function carregarMetricasCliente() {
  if (!codigoClienteAtual) return;

  const dias = obterUltimosDiasGrafico(7);

  const [serieReproducoes, serieQrCode, totaisPeriodo] = await Promise.all([
    buscarReproducoesCliente(codigoClienteAtual, dias),
    buscarQrCodeCliente(codigoClienteAtual, dias),
    buscarTotaisPeriodoReproducoes(codigoClienteAtual)
  ]);

  const totalQrCode = serieQrCode.reduce((total, item) => {
    return total + Number(item.total || 0);
  }, 0);

  if (totalReproducoesCliente) {
    totalReproducoesCliente.textContent = formatarNumeroMetrica(totaisPeriodo.mes);
    totalReproducoesCliente.title = `Hoje: ${formatarNumeroMetrica(totaisPeriodo.dia)} | Semana: ${formatarNumeroMetrica(totaisPeriodo.semana)} | Mês: ${formatarNumeroMetrica(totaisPeriodo.mes)}`;
  }

  if (totalQrCodeCliente) {
    totalQrCodeCliente.textContent = formatarNumeroMetrica(totalQrCode);
  }

  renderizarGraficoBarrasCliente(serieReproducoes);
  renderizarGraficoLinhaCliente(serieQrCode);
}
