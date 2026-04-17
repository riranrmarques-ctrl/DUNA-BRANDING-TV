      const { error: insertError } = await supabaseClient.from("playlists").insert(registros);
      if (insertError) throw insertError;
    }

    await carregarHistoricoArquivos(codigosDestino);
    await sincronizarStatusCliente();
    await atualizarResumo();

    gerarContratoCliente(false);
    mostrarStatusUpload("Enviado com sucesso", "#7CFC9A");
    arquivoInput.value = "";
  } catch (error) {
    console.error(error);
    mostrarStatusUpload("Erro ao enviar", "#ff6b6b");
  } finally {
    btnUploadCliente.disabled = false;
    btnUploadCliente.style.opacity = "1";
    btnUploadCliente.style.cursor = "pointer";
  }
}

function renderizarPontosSelecionaveis(selecionados = []) {
  if (!listaPontos) return;

  listaPontos.innerHTML = "";

  const codigos = Object.keys(pontosData);
  if (!codigos.length) {
    listaPontos.innerHTML = '<div class="vazio">Nenhum ponto encontrado.</div>';
    atualizarResumo();
    return;
  }

  const mapaSelecionados = new Set(
    selecionados.map((item) => String(item || "").trim()).filter(Boolean)
  );

  const selecionadosArr = [];
  const disponiveisArr = [];
  const inativosArr = [];

  codigos
    .sort((a, b) => {
      const nomeA = obterNomeDoPonto(pontosData[a], a);
      const nomeB = obterNomeDoPonto(pontosData[b], b);
      return nomeA.localeCompare(nomeB, "pt-BR", { numeric: true });
    })
    .forEach((codigoVisual) => {
      const ponto = pontosData[codigoVisual];
      const nome = obterNomeDoPonto(ponto, codigoVisual);
      const codigoReal = obterCodigoRealDoPonto(codigoVisual);
      const isSelecionado = mapaSelecionados.has(codigoVisual) || mapaSelecionados.has(codigoReal);
      const isInativo = pontoEstaInativo(ponto);

      if (isSelecionado) {
        selecionadosArr.push(montarCardPonto({
          codigo: codigoVisual,
          nome,
          tema: obterTemaStatus("selecionado"),
          marcado: true
        }));
      } else if (isInativo) {
        inativosArr.push(montarCardPonto({
          codigo: codigoVisual,
          nome,
          tema: obterTemaStatus("inativo"),
          desabilitado: true
        }));
      } else {
        disponiveisArr.push(montarCardPonto({
          codigo: codigoVisual,
          nome,
          tema: obterTemaStatus("disponivel")
        }));
      }
    });

  const grupos = [];

  if (selecionadosArr.length) {
    grupos.push(montarGrupoPontos("selecionado", "selecionado", selecionadosArr.join("")));
  }

  grupos.push(montarGrupoPontos("disponivel", "disponivel", disponiveisArr.join("")));

  if (inativosArr.length) {
    grupos.push(montarGrupoPontos("inativo", "inativo", inativosArr.join("")));
  }

  listaPontos.innerHTML = grupos.join("");
  atualizarResumo();
}

function obterDadosContratoCliente() {
  return {
    codigo: inputCodigo?.value || codigoClienteAtual || "-",
    nome: inputNome?.value?.trim() || "-",
    telefone: inputTelefone?.value?.trim() || "-",
    email: inputEmail?.value?.trim() || "-",
    cpfCnpj: inputCpfCnpj?.value?.trim() || "-",
    valor: inputValorContratado?.value || "R$ 0,00",
    dataInicio: formatarDataBR(inputDataPostagem?.value),
    dataVencimento: formatarDataBR(inputVencimento?.value),
    pontos: obterPontosContratoTexto(),
    status: statusCliente?.value || statusCliente?.textContent || "Nao ativo",
    emissao: new Date().toLocaleDateString("pt-BR")
  };
}

function preencherMarcadoresContrato(texto, dados) {
  return String(texto || "")
    .replaceAll("{{empresa}}", dadosDunaContrato.empresa || "")
    .replaceAll("{{cnpj}}", dadosDunaContrato.cnpj || "")
    .replaceAll("{{telefoneEmpresa}}", dadosDunaContrato.telefone || "")
    .replaceAll("{{emailEmpresa}}", dadosDunaContrato.email || "")
    .replaceAll("{{enderecoEmpresa}}", dadosDunaContrato.endereco || "")
    .replaceAll("{{responsavel}}", dadosDunaContrato.responsavel || "")
    .replaceAll("{{cliente}}", dados.nome || "")
    .replaceAll("{{codigo}}", dados.codigo || "")
    .replaceAll("{{cpfCnpj}}", dados.cpfCnpj || "")
    .replaceAll("{{telefone}}", dados.telefone || "")
    .replaceAll("{{email}}", dados.email || "")
    .replaceAll("{{valor}}", dados.valor || "")
    .replaceAll("{{dataInicio}}", dados.dataInicio || "")
    .replaceAll("{{dataVencimento}}", dados.dataVencimento || "")
    .replaceAll("{{pontos}}", dados.pontos || "")
    .replaceAll("{{emissao}}", dados.emissao || "");
}

function montarClausulasContratoHtml(dados) {
  if (!clausulasContrato.length) {
    return `
      <p><strong>CLAUSULA 1 - OBJETO DO CONTRATO.</strong> O presente contrato tem por objeto a prestacao de servicos de veiculacao de publicidade em telas digitais, instaladas em pontos estrategicos operados pela CONTRATADA.</p>
    `;
  }

  return clausulasContrato
    .filter((clausula) => {
      const titulo = String(clausula?.titulo || "").trim();
      const texto = String(preencherMarcadoresContrato(clausula?.texto || "", dados)).trim();
      return titulo && texto && texto !== "-" && texto !== ".";
    })
    .map((clausula) => {
      const ordem = clausula.ordem || "";
      const titulo = clausula.titulo || "";
      const textoPreenchido = preencherMarcadoresContrato(clausula.texto, dados);

      return `
        <p>
          <strong>CLAUSULA ${escaparHtml(ordem)} - ${escaparHtml(titulo)}.</strong>
          ${textoComQuebras(textoPreenchido)}
        </p>
      `;
    })
    .join("");
}

function renderizarHistoricoContrato(dados) {
  if (!historicoContratos) return;

  historicoContratos.innerHTML = `
    <div class="historico-item">
      <div class="historico-item-info">
        <div class="historico-item-titulo">Contrato gerado</div>
        <div class="historico-item-linha"><strong>Cliente:</strong> ${escaparHtml(dados.nome)}</div>
        <div class="historico-item-linha"><strong>Valor:</strong> ${escaparHtml(dados.valor)}</div>
        <div class="historico-item-linha"><strong>Periodo:</strong> ${escaparHtml(dados.dataInicio)} ate ${escaparHtml(dados.dataVencimento)}</div>
        <div class="historico-item-linha"><strong>Pontos:</strong> ${escaparHtml(dados.pontos)}</div>
      </div>
    </div>
  `;
}

function montarContratoProfissional(dados) {
  return `
    <style>
      .contrato-pdf-folha {
        width: 794px;
        min-height: auto;
        padding: 34px 44px 28px;
        background: #ffffff;
        color: #111827;
        font-family: Arial, sans-serif;
        font-size: 11.4px;
        line-height: 1.42;
      }
      .contrato-pdf-topo {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        border-bottom: 2px solid #1f2937;
        margin-bottom: 14px;
        padding-bottom: 12px;
      }
      .contrato-pdf-marca h1 {
        font-size: 23px;
        letter-spacing: 0.5px;
        color: #111827;
        margin-bottom: 4px;
      }
      .contrato-pdf-marca p,
      .contrato-pdf-codigo {
        color: #475569;
        font-size: 11.4px;
      }
      .contrato-pdf-codigo {
        min-width: 190px;
        text-align: right;
        line-height: 1.6;
      }
      .contrato-pdf-secao {
        margin-bottom: 12px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .contrato-pdf-secao h2 {
        font-size: 13px;
        color: #111827;
        border-left: 4px solid #2563eb;
        padding-left: 8px;
        margin-bottom: 8px;
      }
      .contrato-pdf-texto p {
        margin-bottom: 7px;
        text-align: justify;
        color: #1f2937;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .contrato-pdf-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
      }
      .contrato-pdf-campo {
        border: 1px solid #e5e7eb;
        background: #f8fafc;
        border-radius: 8px;
        min-height: 42px;
        padding: 7px 9px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .contrato-pdf-campo.full {
        grid-column: 1 / -1;
      }
      .contrato-pdf-campo strong {
        display: block;
        font-size: 10.5px;
        color: #111827;
