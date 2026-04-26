const codigo = new URLSearchParams(window.location.search).get("codigo");

if (!codigo) {
  window.location.replace("/painel.html");
}

const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";

const BUCKET = "midias";
const TABELA_CLIENTES = "dadosclientes";
const TABELA_VINCULOS = "playercliente";
const TABELA_PLAYLISTS = "playlists";
const TABELA_PONTOS = "pontos";
const TABELA_CONTRATOS_MODELOS = "contratos_modelos";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const inputCodigo = document.getElementById("codigo");
const inputNome = document.getElementById("nome");
const inputTelefone = document.getElementById("telefone");
const inputEmail = document.getElementById("email");
const inputCpfCnpj = document.getElementById("cpfCnpj");
const inputVencimento = document.getElementById("vencimentoExibicao");
const inputValorContratado = document.getElementById("valorContratado");
const inputDataPostagem = document.getElementById("dataPostagem");
const statusCliente = document.getElementById("statusCliente");

const listaPontos = document.getElementById("listaPontos");
const mensagem = document.getElementById("mensagem");
const botaoSalvar = document.getElementById("botaoSalvar");
const botaoVoltar = document.getElementById("botaoVoltar");
const botaoExcluirCliente = document.getElementById("botaoExcluirCliente");

const arquivoInput = document.getElementById("arquivoInput");
const btnUploadCliente = document.getElementById("btnUploadCliente");
const statusUpload = document.getElementById("statusUpload");

const historicoContratos = document.getElementById("historicoContratos");
const historicoArquivos = document.getElementById("historicoArquivos");

const contratoPreview = document.getElementById("contratoPreview");
const contratoStatus = document.getElementById("contratoStatus");
const btnBaixarContrato = document.getElementById("btnBaixarContrato");
const btnBaixarQrCode = document.getElementById("btnBaixarQrCode");

let pontosData = {};
let codigoClienteAtual = "";
let clausulasContrato = [];
let clienteAtual = null;

let dadosDunaContrato = {
  empresa: "Duna Branding",
  cnpj: "",
  telefone: "",
  email: "",
  endereco: "",
  responsavel: "",
  titulo_contrato: "Contrato de Prestação de Serviços de Publicidade em Telas Digitais",
  subtitulo_contrato: "Contrato de prestação de serviços de publicidade em telas digitais."
};

function mostrarMensagem(texto, cor = "#9fd2ff") {
  if (!mensagem) return;
  mensagem.textContent = texto || "";
  mensagem.style.color = cor;
}

function mostrarStatusUpload(texto, cor = "#9fd2ff") {
  if (!statusUpload) return;
  statusUpload.textContent = texto || "";
  statusUpload.style.color = cor;
}

function obterCodigoDaUrl() {
  return String(new URLSearchParams(window.location.search).get("codigo") || "").trim().toUpperCase();
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarCodigo(valor) {
  return String(valor || "").trim().toUpperCase();
}

function formatarTelefone(valor) {
  const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);
  if (!numeros) return "";
  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function formatarCpfCnpj(valor) {
  const numeros = String(valor || "").replace(/\D/g, "").slice(0, 14);

  if (numeros.length <= 11) {
    if (numeros.length <= 3) return numeros;
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
  }

  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 5) return `${numeros.slice(0, 2)}.${numeros.slice(2)}`;
  if (numeros.length <= 8) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5)}`;
  if (numeros.length <= 12) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8)}`;
  return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12)}`;
}

function formatarMoedaBR(valor) {
  const texto = String(valor ?? "").trim();

  if (!texto) {
    return (0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  let numero;

  if (typeof valor === "number") {
    numero = valor;
  } else {
    const limpo = texto.replace(/\s/g, "").replace("R$", "").replace(/[^\d,.-]/g, "");
    numero = limpo.includes(",")
      ? Number(limpo.replace(/\./g, "").replace(",", "."))
      : Number(limpo);
  }

  if (!Number.isFinite(numero)) numero = 0;

  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function extrairNumeroMoeda(valor) {
  const texto = String(valor ?? "").trim();
  if (!texto) return 0;

  const limpo = texto.replace(/\s/g, "").replace("R$", "").replace(/[^\d,.-]/g, "");
  const numero = limpo.includes(",")
    ? Number(limpo.replace(/\./g, "").replace(",", "."))
    : Number(limpo);

  return Number.isFinite(numero) ? numero : 0;
}

function formatarDataBR(valor) {
  if (!valor) return "-";

  const partes = String(valor).split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);

  return data.toLocaleDateString("pt-BR");
}

function formatarDataHistorico(valor) {
  if (!valor) return "-";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);

  return data.toLocaleString("pt-BR");
}

function marcarErro(campo) {
  if (!campo) return;
  campo.style.border = "1px solid #ff6b6b";
}

function limparErro(campo) {
  if (!campo) return;
  campo.style.border = "1px solid #313847";
}

function ativarBotaoSalvar() {
  if (!botaoSalvar) return;
  botaoSalvar.disabled = false;
  botaoSalvar.style.opacity = "1";
  botaoSalvar.style.cursor = "pointer";
}

function desativarBotaoSalvar() {
  if (!botaoSalvar) return;
  botaoSalvar.disabled = true;
  botaoSalvar.style.opacity = "0.5";
  botaoSalvar.style.cursor = "not-allowed";
}

function aplicarCampoDesativado(campo, desativado) {
  if (!campo) return;
  campo.disabled = desativado;
  campo.style.opacity = desativado ? "0.45" : "1";
  campo.style.cursor = desativado ? "not-allowed" : "";
}

function atualizarStatusClienteVisual(statusTexto) {
  if (!statusCliente) return;

  const ativo = String(statusTexto || "").trim().toLowerCase() === "ativo";
  statusCliente.textContent = ativo ? "Ativo" : "Não ativo";
  statusCliente.style.color = ativo ? "#7CFC9A" : "#ff6b6b";
}

function itemEstaInativo(item) {
  if (!item?.data_fim) return false;

  const fim = new Date(item.data_fim);
  if (Number.isNaN(fim.getTime())) return false;

  fim.setHours(23, 59, 59, 999);
  return new Date() > fim;
}

function pontoEstaDisponivel(ponto) {
  return ponto?.disponivel !== false;
}

function atualizarCamposCliente() {
  [
    inputTelefone,
    inputEmail,
    inputCpfCnpj,
    inputVencimento,
    inputValorContratado,
    inputDataPostagem,
    arquivoInput,
    btnUploadCliente,
    btnBaixarContrato,
    btnBaixarQrCode
  ].forEach((campo) => aplicarCampoDesativado(campo, false));

  if (inputCodigo) {
    inputCodigo.style.opacity = "1";
    inputCodigo.style.cursor = "default";
  }

  aplicarCampoDesativado(inputNome, false);
  aplicarCampoDesativado(botaoSalvar, false);

  document.querySelectorAll('input[name="pontos"]').forEach((checkbox) => {
    checkbox.disabled = false;
    checkbox.style.cursor = "pointer";
    checkbox.style.opacity = "1";
  });
}

function obterCodigoPonto(ponto) {
  return String(ponto?.codigo || "").trim();
}

function obterCodigoRealDoPonto(codigoVisual) {
  const ponto = pontosData[codigoVisual];
  return String(ponto?.codigo || codigoVisual || "").trim();
}

async function carregarPontos() {
  const { data, error } = await supabaseClient
    .from(TABELA_PONTOS)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  pontosData = {};

  (data || []).forEach((ponto) => {
    const chave = obterCodigoPonto(ponto);
    if (!chave) return;
    pontosData[chave] = ponto;
  });
}

function extrairClausulasDoHtmlModelo(htmlModelo) {
  const temp = document.createElement("div");
  temp.innerHTML = htmlModelo || "";

  const ignorar = [
    "Empresa:",
    "CNPJ:",
    "Telefone:",
    "Email:",
    "Endereço:",
    "Responsável:",
    "Nome:",
    "CPF/CNPJ:",
    "Valor:",
    "Período:",
    "Pontos:"
  ];

  return Array.from(temp.querySelectorAll("p"))
    .filter((p) => {
      const texto = p.textContent.trim();
      return texto && !ignorar.some((prefixo) => texto.startsWith(prefixo));
    })
    .map((p) => {
      const strong = p.querySelector("strong");
      const titulo = strong ? strong.textContent.replace(":", "").trim() : "CLÁUSULA";

      let texto = p.textContent.trim();

      if (strong) {
        texto = texto.replace(strong.textContent, "").trim();
      }

      return {
        titulo,
        texto,
        ativo: true
      };
    });
}

async function carregarModeloContrato() {
  try {
    const { data, error } = await supabaseClient
      .from(TABELA_CONTRATOS_MODELOS)
      .select("*")
      .eq("tipo", "contratante")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      console.warn("Nenhum modelo contratante encontrado em contratos_modelos.");
      clausulasContrato = [];
      return;
    }

    const dados = typeof data.dados_contratada === "string"
      ? JSON.parse(data.dados_contratada || "{}")
      : data.dados_contratada || {};

    dadosDunaContrato = {
      empresa: dados.empresa || "Duna Branding",
      cnpj: dados.cnpj || "",
      telefone: dados.telefone || "",
      email: dados.email || "",
      endereco: dados.endereco || "",
      responsavel: dados.responsavel || "",
      titulo_contrato: data.titulo || "Contrato de Prestação de Serviços de Publicidade em Telas Digitais",
      subtitulo_contrato: data.subtitulo || "Contrato de prestação de serviços de publicidade em telas digitais."
    };

    clausulasContrato = extrairClausulasDoHtmlModelo(data.html_modelo);
  } catch (error) {
    console.error("Erro ao carregar modelo do contrato:", error);
    clausulasContrato = [];
  }
}

function obterNomeDoPonto(ponto, codigo) {
  return ponto?.nome || ponto?.nome_painel || ponto?.titulo || ponto?.ambiente || `Ponto ${codigo}`;
}

function obterPontosMarcados() {
  return Array.from(document.querySelectorAll('#listaPontos input[name="pontos"]:checked'))
    .map((input) => String(input.value || "").trim())
    .filter(Boolean);
}

function obterCodigosDestinoSelecionados() {
  return obterPontosMarcados();
}

function obterPontosContratoTexto() {
  return obterPontosMarcados()
    .map((codigoVisual) => obterNomeDoPonto(pontosData[codigoVisual], codigoVisual))
    .filter(Boolean)
    .join(", ") || "Nenhum ponto selecionado";
}

function preencherMarcadoresContrato(texto, dados) {
  return String(texto || "")
    .replaceAll("{{empresa}}", dadosDunaContrato.empresa || "")
    .replaceAll("{{cnpj}}", dadosDunaContrato.cnpj || "")
    .replaceAll("{{telefone_empresa}}", dadosDunaContrato.telefone || "")
    .replaceAll("{{email_empresa}}", dadosDunaContrato.email || "")
    .replaceAll("{{endereco_empresa}}", dadosDunaContrato.endereco || "")
    .replaceAll("{{responsavel}}", dadosDunaContrato.responsavel || "")

    .replaceAll("{{telefoneEmpresa}}", dadosDunaContrato.telefone || "")
    .replaceAll("{{emailEmpresa}}", dadosDunaContrato.email || "")
    .replaceAll("{{enderecoEmpresa}}", dadosDunaContrato.endereco || "")

    .replaceAll("{{cliente_nome}}", dados.nome || "")
    .replaceAll("{{cliente_cpf_cnpj}}", dados.cpfCnpj || "")
    .replaceAll("{{cliente_telefone}}", dados.telefone || "")
    .replaceAll("{{cliente_email}}", dados.email || "")

    .replaceAll("{{cliente}}", dados.nome || "")
    .replaceAll("{{codigo}}", dados.codigo || "")
    .replaceAll("{{cpfCnpj}}", dados.cpfCnpj || "")
    .replaceAll("{{telefone}}", dados.telefone || "")
    .replaceAll("{{email}}", dados.email || "")

    .replaceAll("{{valor}}", dados.valor || "")
    .replaceAll("{{data_inicio}}", dados.dataInicio || "")
    .replaceAll("{{data_vencimento}}", dados.dataVencimento || "")
    .replaceAll("{{dataInicio}}", dados.dataInicio || "")
    .replaceAll("{{dataVencimento}}", dados.dataVencimento || "")

    .replaceAll("{{pontos}}", dados.pontos || "")
    .replaceAll("{{emissao}}", dados.emissao || "");
}

function obterDadosContratoCliente() {
  return {
    codigo: codigoClienteAtual || inputCodigo?.textContent || "-",
    nome: inputNome?.value?.trim() || "-",
    telefone: inputTelefone?.value?.trim() || "-",
    email: inputEmail?.value?.trim() || "-",
    cpfCnpj: inputCpfCnpj?.value?.trim() || "-",
    valor: inputValorContratado?.value || "R$ 0,00",
    dataInicio: formatarDataBR(inputDataPostagem?.value),
    dataVencimento: formatarDataBR(inputVencimento?.value),
    pontos: obterPontosContratoTexto(),
    emissao: new Date().toLocaleDateString("pt-BR")
  };
}


function gerarContratoCliente() {
  if (!contratoPreview || !contratoStatus) return;

  const dados = obterDadosContratoCliente();

  const htmlClausulas = clausulasContrato.length
    ? clausulasContrato.map((clausula) => `
        <p style="margin-bottom:10px;">
          <strong>${escaparHtml(clausula.titulo || "")}:</strong>
          ${escaparHtml(preencherMarcadoresContrato(clausula.texto || "", dados))}
        </p>
      `).join("")
    : `
        <p><strong>Cliente:</strong> ${escaparHtml(dados.nome)}</p>
        <p><strong>CPF/CNPJ:</strong> ${escaparHtml(dados.cpfCnpj)}</p>
        <p><strong>Telefone:</strong> ${escaparHtml(dados.telefone)}</p>
        <p><strong>Email:</strong> ${escaparHtml(dados.email)}</p>
        <p><strong>Valor:</strong> ${escaparHtml(dados.valor)}</p>
        <p><strong>Período:</strong> ${escaparHtml(dados.dataInicio)} até ${escaparHtml(dados.dataVencimento)}</p>
        <p><strong>Pontos:</strong> ${escaparHtml(dados.pontos)}</p>
      `;

  contratoPreview.innerHTML = `
    <div style="margin-bottom:12px;">
      <div style="font-size:1rem;font-weight:700;color:#fff;">${escaparHtml(dadosDunaContrato.titulo_contrato || "Contrato")}</div>
      <div style="font-size:0.82rem;color:#9fb0cb;margin-top:4px;">${escaparHtml(dadosDunaContrato.subtitulo_contrato || "")}</div>
    </div>

    <div style="margin-bottom:12px;color:#d5dbea;">
      <p><strong>Cliente:</strong> ${escaparHtml(dados.nome)}</p>
      <p><strong>Pontos:</strong> ${escaparHtml(dados.pontos)}</p>
    </div>

    <div style="color:#d5dbea;">
      ${htmlClausulas}
    </div>
  `;

  contratoStatus.textContent = "Modelo carregado";
}

function montarHtmlContratoCompleto(dadosContrato = null) {
  const dados = dadosContrato || obterDadosContratoCliente();

  const clausulasHtml = clausulasContrato.length
    ? clausulasContrato.map((clausula) => `
        <p style="margin:0 0 12px 0;line-height:1.7;text-align:justify;">
          <strong>${escaparHtml(clausula.titulo || "")}:</strong>
          ${escaparHtml(preencherMarcadoresContrato(clausula.texto || "", dados))}
        </p>
      `).join("")
    : `
        <p><strong>Cliente:</strong> ${escaparHtml(dados.nome)}</p>
        <p><strong>CPF/CNPJ:</strong> ${escaparHtml(dados.cpfCnpj)}</p>
        <p><strong>Telefone:</strong> ${escaparHtml(dados.telefone)}</p>
        <p><strong>Email:</strong> ${escaparHtml(dados.email)}</p>
        <p><strong>Valor:</strong> ${escaparHtml(dados.valor)}</p>
        <p><strong>Período:</strong> ${escaparHtml(dados.dataInicio)} até ${escaparHtml(dados.dataVencimento)}</p>
        <p><strong>Pontos:</strong> ${escaparHtml(dados.pontos)}</p>
      `;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Contrato ${escaparHtml(dados.nome)}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111827; background: #fff; margin: 0; padding: 32px; }
        .topo { border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 20px; }
        h1 { font-size: 24px; margin: 0 0 6px 0; }
        .sub { color: #475569; font-size: 14px; }
        .bloco { margin-bottom: 18px; }
        .bloco h2 { font-size: 16px; margin: 0 0 10px 0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .campo { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #f8fafc; font-size: 14px; }
        .campo strong { display: block; margin-bottom: 4px; }
        .assinaturas { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 20px; margin-top: 46px; align-items: end; }
        .assinatura-box { text-align: center; min-height: 120px; display: flex; flex-direction: column; justify-content: flex-end; }
        .assinatura-img { display: block; width: 300px; max-width: 90%; height: 120px; object-fit: contain; margin: 0 auto -10px; }
        .linha-assinatura { border-top: 1px solid #111827; padding-top: 8px; font-size: 14px; color: #111827; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="topo">
        <h1>${escaparHtml(dadosDunaContrato.titulo_contrato || "Contrato")}</h1>
        <div class="sub">${escaparHtml(dadosDunaContrato.subtitulo_contrato || "")}</div>
      </div>

      <div class="bloco">
        <h2>Dados da Contratada</h2>
        <div class="grid">
          <div class="campo"><strong>Empresa</strong>${escaparHtml(dadosDunaContrato.empresa || "-")}</div>
          <div class="campo"><strong>CNPJ</strong>${escaparHtml(dadosDunaContrato.cnpj || "-")}</div>
          <div class="campo"><strong>Telefone</strong>${escaparHtml(dadosDunaContrato.telefone || "-")}</div>
          <div class="campo"><strong>Email</strong>${escaparHtml(dadosDunaContrato.email || "-")}</div>
          <div class="campo"><strong>Endereço</strong>${escaparHtml(dadosDunaContrato.endereco || "-")}</div>
          <div class="campo"><strong>Responsável</strong>${escaparHtml(dadosDunaContrato.responsavel || "-")}</div>
        </div>
      </div>

      <div class="bloco">
        <h2>Dados do Cliente</h2>
        <div class="grid">
          <div class="campo"><strong>Nome</strong>${escaparHtml(dados.nome)}</div>
          <div class="campo"><strong>CPF/CNPJ</strong>${escaparHtml(dados.cpfCnpj)}</div>
          <div class="campo"><strong>Telefone</strong>${escaparHtml(dados.telefone)}</div>
          <div class="campo"><strong>Email</strong>${escaparHtml(dados.email)}</div>
          <div class="campo"><strong>Valor</strong>${escaparHtml(dados.valor)}</div>
          <div class="campo"><strong>Período</strong>${escaparHtml(dados.dataInicio)} até ${escaparHtml(dados.dataVencimento)}</div>
          <div class="campo" style="grid-column:1 / -1;"><strong>Pontos</strong>${escaparHtml(dados.pontos)}</div>
        </div>
      </div>

      <div class="bloco">
        <h2>Termos do Contrato</h2>
        ${clausulasHtml}
      </div>

      <div class="assinaturas">
        <div class="assinatura-box">
          <div class="linha-assinatura">CONTRATANTE</div>
        </div>
        <div class="assinatura-box">
          <img src="${escaparHtml(`${window.location.origin}/assinatura.png`)}" alt="Assinatura Duna Branding" class="assinatura-img">
          <div class="linha-assinatura">${escaparHtml(dadosDunaContrato.empresa || "Duna Branding")}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function obterChaveHistoricoContratos() {
  return `historico_contratos_cliente_${codigoClienteAtual}`;
}

function lerHistoricoContratosGerados() {
  try {
    const bruto = sessionStorage.getItem(obterChaveHistoricoContratos());
    const lista = JSON.parse(bruto || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function salvarHistoricoContratosGerados(lista) {
  sessionStorage.setItem(obterChaveHistoricoContratos(), JSON.stringify(lista));
}

function obterProximoNumeroContrato() {
  const historico = lerHistoricoContratosGerados();

  return historico.reduce((maior, item) => {
    const match = String(item.nome_arquivo || "").match(/^branding-(\d+)\.html$/i);
    const numero = match ? Number(match[1]) : 0;
    return Number.isFinite(numero) && numero > maior ? numero : maior;
  }, 0) + 1;
}

function obterNomeArquivoContrato() {
  return `branding-${obterProximoNumeroContrato()}.html`;
}

function baixarHtmlContrato(html, nomeArquivo) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function gerarContratoClienteParaHistorico() {
  try {
    if (!validarDadosParaMaterialOuContrato()) return;
    
    const dados = obterDadosContratoCliente();
    const historico = lerHistoricoContratosGerados();
    const agoraIso = new Date().toISOString();

    const item = {
      id: `${Date.now()}`,
      criado_em: agoraIso,
      nome_arquivo: obterNomeArquivoContrato(),
      status: "pendente",
      dados
    };

    const htmlContrato = montarHtmlContratoCompleto(item.dados);

    historico.unshift(item);
    salvarHistoricoContratosGerados(historico);

    const payloadContrato = {
      contrato_titulo: dadosDunaContrato.titulo_contrato || "Contrato",
      contrato_texto: htmlContrato,
      contrato_modelo_nome: item.nome_arquivo,
      contrato_status: "pendente",
      contrato_enviado_em: agoraIso
    };

    const { data, error } = await supabaseClient
      .from(TABELA_CLIENTES)
      .update(payloadContrato)
      .eq("codigo", codigoClienteAtual)
      .select("*")
      .maybeSingle();

    if (error) throw error;

    clienteAtual = data || { ...(clienteAtual || {}), ...payloadContrato };

    gerarHistoricoContratoVisual();
    gerarContratoCliente();

    mostrarMensagem("Contrato enviado para assinatura do cliente.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem(`Erro ao enviar contrato: ${error.message || "falha desconhecida"}`, "#ff6b6b");
  }
}

function baixarContratoDoHistorico(id) {
  const historico = lerHistoricoContratosGerados();
  const item = historico.find((contrato) => contrato.id === id);

  if (!item) {
    mostrarMensagem("Contrato não encontrado no histórico.", "#ff6b6b");
    return;
  }

  baixarHtmlContrato(clienteAtual?.contrato_texto || montarHtmlContratoCompleto(item.dados), item.nome_arquivo || "contrato.html");
}

async function excluirContratoDoHistorico(id) {
  const confirmar = window.confirm("Deseja apagar este contrato do histórico?");
  if (!confirmar) return;

  try {
    const historicoAtual = lerHistoricoContratosGerados();
    const itemRemovido = historicoAtual.find((contrato) => contrato.id === id);
    const novoHistorico = historicoAtual.filter((contrato) => contrato.id !== id);

    salvarHistoricoContratosGerados(novoHistorico);

    if (itemRemovido && clienteAtual?.contrato_modelo_nome === itemRemovido.nome_arquivo) {
      const payloadLimparContrato = {
        contrato_titulo: null,
        contrato_texto: null,
        contrato_modelo_nome: null,
        contrato_status: null,
        contrato_enviado_em: null
      };

      const { data, error } = await supabaseClient
        .from(TABELA_CLIENTES)
        .update(payloadLimparContrato)
        .eq("codigo", codigoClienteAtual)
        .select("*")
        .maybeSingle();

      if (error) throw error;

      clienteAtual = data || { ...(clienteAtual || {}), ...payloadLimparContrato };
    }

    gerarHistoricoContratoVisual();
    gerarContratoCliente();

    mostrarMensagem("Contrato removido do histórico.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar contrato.", "#ff6b6b");
  }
}

function sincronizarContratoAtualNoHistorico() {
  if (!clienteAtual?.contrato_modelo_nome || !clienteAtual?.contrato_texto) return;

  const historico = lerHistoricoContratosGerados();
  const existe = historico.some((item) => item.nome_arquivo === clienteAtual.contrato_modelo_nome);

  if (existe) return;

  historico.unshift({
    id: String(Date.now()),
    criado_em: clienteAtual.contrato_enviado_em || new Date().toISOString(),
    nome_arquivo: clienteAtual.contrato_modelo_nome,
    status: clienteAtual.contrato_status || "pendente",
    dados: obterDadosContratoCliente()
  });

  salvarHistoricoContratosGerados(historico);
}

function gerarHistoricoContratoVisual() {
  if (!historicoContratos) return;

  sincronizarContratoAtualNoHistorico();

  const historico = lerHistoricoContratosGerados();

  if (!historico.length) {
    historicoContratos.innerHTML = `<div class="historico-vazio">Nenhum contrato gerado ainda.</div>`;
    return;
  }

  historicoContratos.innerHTML = historico.map((item) => {
    const concluido = String(item.status || "").toLowerCase() === "concluido";
    const corStatus = concluido ? "#7CFC9A" : "#f59e0b";

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;border:1px solid #2a3040;border-radius:12px;background:#10131a;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;color:#ffffff;word-break:break-word;margin-bottom:6px;">
            ${escaparHtml(item.nome_arquivo || "contrato.html")}
          </div>
          <div style="color:#c6cedd;font-size:0.9rem;margin-bottom:8px;">
            Enviado em: ${escaparHtml(formatarDataHistorico(item.criado_em))}
          </div>
          <div style="display:inline-flex;width:fit-content;min-height:28px;padding:5px 10px;border-radius:999px;border:1px solid ${corStatus};color:${corStatus};font-size:0.78rem;font-weight:800;text-transform:uppercase;">
            ${concluido ? "Concluído" : "Pendente de assinatura"}
          </div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn-baixar-contrato-historico" data-id="${escaparHtml(item.id)}" style="border:none;border-radius:8px;background:#22c55e;color:#fff;font-weight:700;cursor:pointer;padding:9px 12px;">Baixar</button>
          <button type="button" class="btn-excluir-contrato-historico" data-id="${escaparHtml(item.id)}" style="border:none;border-radius:8px;background:#d9534f;color:#fff;font-weight:700;cursor:pointer;padding:9px 12px;">Deletar</button>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".btn-baixar-contrato-historico").forEach((botao) => {
    botao.onclick = () => baixarContratoDoHistorico(botao.dataset.id);
  });

  document.querySelectorAll(".btn-excluir-contrato-historico").forEach((botao) => {
    botao.onclick = () => excluirContratoDoHistorico(botao.dataset.id);
  });
}

function obterTituloArquivo(item) {
  if (item.titulo_arquivo && String(item.titulo_arquivo).trim()) {
    return String(item.titulo_arquivo).trim();
  }

  if (item.storage_path) {
    const partes = String(item.storage_path).split("/");
    return partes[partes.length - 1] || "Arquivo";
  }

  if (item.video_url) {
    return item.tipo === "url" ? "Link externo" : "Arquivo enviado";
  }

  return "Arquivo";
}

function criarChaveGrupoHistorico(item) {
  return String(item.storage_path || `${item.video_url || ""}|${item.data_inicio || ""}|${item.nome || ""}`).trim();
}

function agruparHistoricoArquivos(itens = []) {
  const grupos = new Map();

  itens.forEach((item) => {
    const chave = criarChaveGrupoHistorico(item);
    if (!chave) return;

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        ids: [],
        storage_path: item.storage_path || "",
        video_url: item.video_url || "",
        titulo: obterTituloArquivo(item),
        tipo: item.tipo || "-",
        data_inicio: item.data_inicio || item.created_at || null,
        data_fim: item.data_fim || null,
        pontos: []
      });
    }

    const grupo = grupos.get(chave);
    grupo.ids.push(item.id);

    const ponto = String(item.codigo || "").trim();
    if (ponto && !grupo.pontos.includes(ponto)) {
      grupo.pontos.push(ponto);
    }

    if (!grupo.data_fim && item.data_fim) {
      grupo.data_fim = item.data_fim;
    }
  });

  return Array.from(grupos.values());
}

function renderizarHistoricoArquivos(itens = []) {
  if (!historicoArquivos) return;

  if (!Array.isArray(itens) || !itens.length) {
    historicoArquivos.innerHTML = `<div class="historico-vazio">Nenhum arquivo enviado para esta pasta ainda.</div>`;
    return;
  }

  const grupos = agruparHistoricoArquivos(itens);

  historicoArquivos.innerHTML = grupos.map((grupo) => {
    const idsEncoded = encodeURIComponent(JSON.stringify(grupo.ids));
    const tituloSeguro = escaparHtml(grupo.titulo || "");
    const pontosTexto = grupo.pontos.length ? grupo.pontos.join(", ") : "-";

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;border:1px solid #2a3040;border-radius:12px;background:#10131a;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;margin-bottom:8px;color:#ffffff;word-break:break-word;">${tituloSeguro}</div>
          <div style="color:#c6cedd;font-size:0.9rem;line-height:1.55;">
            <div><strong>Pontos:</strong> ${escaparHtml(pontosTexto)}</div>
            <div><strong>Tipo:</strong> ${escaparHtml(grupo.tipo)}</div>
            <div><strong>Início:</strong> ${escaparHtml(formatarDataHistorico(grupo.data_inicio))}</div>
            <div><strong>Fim:</strong> ${escaparHtml(grupo.data_fim ? formatarDataHistorico(grupo.data_fim) : "-")}</div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;min-width:110px;flex-shrink:0;">
          <button type="button" class="btn-renomear-historico" data-ids="${idsEncoded}" data-titulo="${tituloSeguro}" style="height:36px;border:none;border-radius:8px;background:#f59e0b;color:#fff;font-size:0.82rem;font-weight:700;cursor:pointer;">Renomear</button>
          <a href="${escaparHtml(grupo.video_url || "#")}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;height:36px;border-radius:8px;background:#2d8cff;color:#fff;text-decoration:none;font-size:0.82rem;font-weight:700;">Abrir</a>
          <button type="button" class="btn-deletar-historico" data-ids="${idsEncoded}" data-storage-path="${escaparHtml(grupo.storage_path || "")}" style="height:36px;border:none;border-radius:8px;background:#ff5f5f;color:#fff;font-size:0.82rem;font-weight:700;cursor:pointer;">Excluir</button>
        </div>
      </div>
    `;
  }).join("");

  ativarBotoesRenomearHistorico();
  ativarBotoesDeletarHistorico();
}

function ativarBotoesRenomearHistorico() {
  document.querySelectorAll(".btn-renomear-historico").forEach((botao) => {
    botao.onclick = async () => {
      let ids = [];

      try {
        ids = JSON.parse(decodeURIComponent(botao.dataset.ids || "[]"));
      } catch (error) {
        console.error("Erro ao ler ids para renomear:", error);
      }

      await renomearGrupoHistorico(ids, botao.dataset.titulo || "");
    };
  });
}

function ativarBotoesDeletarHistorico() {
  document.querySelectorAll(".btn-deletar-historico").forEach((botao) => {
    botao.onclick = async () => {
      let ids = [];

      try {
        ids = JSON.parse(decodeURIComponent(botao.dataset.ids || "[]"));
      } catch (error) {
        console.error("Erro ao ler ids do histórico:", error);
      }

      await deletarItemHistorico(ids, botao.dataset.storagePath || "");
    };
  });
}

async function renomearGrupoHistorico(ids, tituloAtual) {
  const listaIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!listaIds.length) return;

  const novoTitulo = window.prompt("Digite o novo nome do arquivo:", tituloAtual || "");
  if (novoTitulo === null) return;

  const tituloFinal = String(novoTitulo || "").trim();

  if (!tituloFinal) {
    mostrarMensagem("Digite um nome válido para o arquivo.", "#ff6b6b");
    return;
  }

  try {
    const { error } = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .update({ titulo_arquivo: tituloFinal })
      .in("id", listaIds);

    if (error) throw error;

    await carregarHistoricoArquivos();
    mostrarMensagem("Nome do arquivo atualizado com sucesso.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao renomear arquivo.", "#ff6b6b");
  }
}

async function deletarItemHistorico(ids, storagePath) {
  const listaIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!listaIds.length) return;

  const confirmar = window.confirm("Deseja deletar este arquivo de todos os pontos?");
  if (!confirmar) return;

  try {
    const caminho = String(storagePath || "").trim();

    if (caminho) {
      const { error: storageError } = await supabaseClient.storage.from(BUCKET).remove([caminho]);
      if (storageError) console.error("Erro ao deletar do storage:", storageError);
    }

    const { error: deleteError } = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .delete()
      .in("id", listaIds);

    if (deleteError) throw deleteError;

    await carregarHistoricoArquivos();
    await sincronizarStatusCliente();

    mostrarMensagem("Arquivo excluído de todos os pontos.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao excluir arquivo.", "#ff6b6b");
  }
}

async function carregarHistoricoArquivos() {
  try {
    const { data, error } = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .select("*")
      .eq("codigo_cliente", codigoClienteAtual)
      .order("ordem", { ascending: false });

    if (error) throw error;

    renderizarHistoricoArquivos(data || []);
    return data || [];
  } catch (error) {
    console.error(error);

    if (historicoArquivos) {
      historicoArquivos.innerHTML = `<div class="historico-vazio">Erro ao carregar histórico de arquivo.</div>`;
    }

    return [];
  }
}

function renderizarPontosSelecionaveis(selecionados = []) {
  if (!listaPontos) return;

  const codigos = Object.keys(pontosData);

  if (!codigos.length) {
    listaPontos.innerHTML = `<div class="vazio">Nenhum ponto encontrado na tabela pontos.</div>`;
    return;
  }

  const selecionadosSet = new Set(selecionados.map((item) => String(item || "").trim()));
  const cardsSelecionados = [];
  const cardsDisponiveis = [];
  const cardsIndisponiveis = [];

  codigos
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
    .forEach((codigoPonto) => {
      const ponto = pontosData[codigoPonto];
      const nome = obterNomeDoPonto(ponto, codigoPonto);
      const checked = selecionadosSet.has(codigoPonto);
      const disponivel = pontoEstaDisponivel(ponto);
      const disabled = !disponivel;

      const card = `
        <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;min-height:52px;cursor:${disabled ? "not-allowed" : "pointer"};border:1px solid ${checked ? "#8ce063" : disabled ? "#ff7b7b" : "#6f8bff"};background:${checked ? "#76d34f" : disabled ? "#e85252" : "#4f6ff0"};color:#fff;opacity:1;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.16);">
          <input
            type="checkbox"
            name="pontos"
            value="${escaparHtml(codigoPonto)}"
            ${checked ? "checked" : ""}
            ${disabled ? "disabled" : ""}
            style="width:16px;height:16px;flex-shrink:0;accent-color:#ffffff;cursor:${disabled ? "not-allowed" : "pointer"};"
          >
          <div style="display:flex;align-items:center;min-width:0;flex:1;overflow:hidden;">
            <span style="font-size:0.88rem;font-weight:700;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${escaparHtml(nome)}
            </span>
          </div>
        </label>
      `;

      if (checked) {
        cardsSelecionados.push(card);
      } else if (!disponivel) {
        cardsIndisponiveis.push(card);
      } else {
        cardsDisponiveis.push(card);
      }
    });

  const montarGrupo = (titulo, cor, cards) => {
    if (!cards.length) return "";
    return `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="font-size:0.92rem;font-weight:700;color:${cor};text-transform:lowercase;">${titulo}</div>
        <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px;" class="grid-pontos-grupo">
          ${cards.join("")}
        </div>
      </div>
    `;
  };

  listaPontos.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${montarGrupo("selecionado", "#7CFC9A", cardsSelecionados)}
      ${montarGrupo("disponível", "#6ea8ff", cardsDisponiveis)}
      ${montarGrupo("indisponível", "#ff8f8f", cardsIndisponiveis)}
    </div>
  `;

  atualizarCamposCliente();
}

function extrairCodigoClienteVinculo(item) {
  return normalizarCodigo(item?.cliente_codigo || item?.codigo_cliente || item?.codigo || "");
}

function extrairCodigoPontoVinculo(item) {
  return String(item?.ponto_codigo || item?.codigo_ponto || item?.codigo || "").trim();
}

async function carregarVinculosCliente() {
  try {
    const { data, error } = await supabaseClient
      .from(TABELA_VINCULOS)
      .select("*");

    if (error) throw error;

    return (data || [])
      .filter((item) => extrairCodigoClienteVinculo(item) === codigoClienteAtual)
      .map(extrairCodigoPontoVinculo)
      .filter(Boolean);
  } catch (error) {
    console.error("Erro ao buscar vínculos em playercliente:", error);
    return [];
  }
}

async function calcularStatusClienteRealPorCodigoCliente() {

  const { data, error } = await supabaseClient
    .from(TABELA_PLAYLISTS)
    .select("data_fim")
    .eq("codigo_cliente", codigoClienteAtual);

  if (error) return "Não ativo";

  const ativos = (data || []).filter((item) => !itemEstaInativo(item));
  return ativos.length ? "Ativo" : "Não ativo";
}

async function sincronizarStatusCliente() {
  const statusReal = await calcularStatusClienteRealPorCodigoCliente();
  const statusBanco = statusReal === "Ativo" ? "ativo" : "inativo";

  atualizarStatusClienteVisual(statusReal);

  const { error } = await supabaseClient
    .from(TABELA_CLIENTES)
    .update({
      status: statusBanco,
      statuscliente: statusBanco
    })
    .eq("codigo", codigoClienteAtual);

  if (error) console.error(error);
}

function validarDadosCliente() {
  let valido = true;

  const camposObrigatorios = [inputNome, inputTelefone, inputEmail, inputCpfCnpj];

  [inputNome, inputTelefone, inputEmail, inputCpfCnpj, inputVencimento].forEach(limparErro);

  camposObrigatorios.forEach((campo) => {
    if (!String(campo?.value || "").trim()) {
      marcarErro(campo);
      valido = false;
    } else {
      limparErro(campo);
    }
  });

  if (!valido) {
    mostrarMensagem("Preencha os dados obrigatórios do cliente.", "#ff6b6b");
    return false;
  }

  return true;
}

function validarDadosParaMaterialOuContrato() {
  if (!validarDadosCliente()) return false;

  let valido = true;

  if (!String(inputVencimento?.value || "").trim()) {
    marcarErro(inputVencimento);
    valido = false;
  } else {
    limparErro(inputVencimento);
  }

  if (!obterPontosMarcados().length) {
    mostrarMensagem("Selecione ao menos um ponto.", "#ff6b6b");
    valido = false;
  }

  if (!valido) {
    mostrarMensagem("Selecione os pontos e informe o vencimento da mídia.", "#ff6b6b");
    return false;
  }

  return true;
}

async function carregarCliente() {
  const { data, error } = await supabaseClient
    .from(TABELA_CLIENTES)
    .select("*")
    .eq("codigo", codigoClienteAtual)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar cliente em dadosclientes:", error);
    throw error;
  }

  if (inputCodigo) inputCodigo.textContent = codigoClienteAtual;

  clienteAtual = data || null;

  if (!data) {
    if (inputNome) inputNome.value = "";
    if (inputTelefone) inputTelefone.value = "";
    if (inputEmail) inputEmail.value = "";
    if (inputCpfCnpj) inputCpfCnpj.value = "";
    if (inputVencimento) inputVencimento.value = "";
    if (inputValorContratado) inputValorContratado.value = formatarMoedaBR(0);
    if (inputDataPostagem) inputDataPostagem.value = new Date().toISOString().split("T")[0];

    atualizarStatusClienteVisual("Não ativo");
    renderizarPontosSelecionaveis([]);
    renderizarHistoricoArquivos([]);
    gerarHistoricoContratoVisual();
    gerarContratoCliente();
    ativarBotaoSalvar();

    mostrarMensagem(`Cliente ${codigoClienteAtual} ainda não existe no banco. Preencha e clique em Salvar.`, "#ffb86b");
    return;
  }

  const nomeFinal = data.nome_completo || data.nome || "";

  if (inputNome) inputNome.value = nomeFinal;
  if (inputTelefone) inputTelefone.value = formatarTelefone(data.telefone || "");
  if (inputEmail) inputEmail.value = data.email || "";
  if (inputCpfCnpj) inputCpfCnpj.value = formatarCpfCnpj(data.cpf_cnpj || "");
  if (inputVencimento) inputVencimento.value = data.vencimento_midia || "";
  if (inputValorContratado) inputValorContratado.value = formatarMoedaBR(data.valor_contratado ?? 0);
  if (inputDataPostagem) inputDataPostagem.value = data.data_postagem || new Date().toISOString().split("T")[0];

  const statusBanco = data.statuscliente || data.status || "inativo";
  atualizarStatusClienteVisual(String(statusBanco).toLowerCase() === "ativo" ? "Ativo" : "Não ativo");

  const selecionados = await carregarVinculosCliente();

  renderizarPontosSelecionaveis(selecionados);
  await carregarHistoricoArquivos();
  await sincronizarStatusCliente();

  gerarHistoricoContratoVisual();
  gerarContratoCliente();
  desativarBotaoSalvar();

  mostrarMensagem(`Cliente ${codigoClienteAtual} carregado com sucesso.`, "#7CFC9A");
}

async function inserirVinculosCliente(vinculos) {
  if (!vinculos.length) return;

  const { error } = await supabaseClient
    .from(TABELA_VINCULOS)
    .insert(vinculos);

  if (!error) return;

  const erroTexto = String(error.message || "").toLowerCase();
  const erroColuna = erroTexto.includes("column") || erroTexto.includes("schema cache") || erroTexto.includes("does not exist");

  if (!erroColuna) throw error;

  const fallback = vinculos.map((item) => ({
    codigo_cliente: item.cliente_codigo,
    ponto_codigo: item.ponto_codigo,
    tipo_vinculo: item.tipo_vinculo
  }));

  const { error: fallbackError } = await supabaseClient
    .from(TABELA_VINCULOS)
    .insert(fallback);

  if (fallbackError) throw fallbackError;
}

async function apagarVinculosCliente() {
  const tentativas = [
    ["cliente_codigo", codigoClienteAtual],
    ["codigo_cliente", codigoClienteAtual]
  ];

  let ultimoErro = null;

  for (const [campo, valor] of tentativas) {
    const { error } = await supabaseClient
      .from(TABELA_VINCULOS)
      .delete()
      .eq(campo, valor);

    if (!error) return;

    ultimoErro = error;
  }

  if (ultimoErro) throw ultimoErro;
}

async function salvarCliente() {
  if (!validarDadosCliente()) return false;

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
    valor_contratado: extrairNumeroMoeda(inputValorContratado.value),
    status: statusBanco,
    statuscliente: statusBanco,
    tipo_acesso: "cliente"
  };

  try {
    const { data: clienteAtualizado, error: errorUpdate } = await supabaseClient
      .from(TABELA_CLIENTES)
      .update(payload)
      .eq("codigo", codigoClienteAtual)
      .select("codigo");

    if (errorUpdate) throw errorUpdate;

    if (!clienteAtualizado || !clienteAtualizado.length) {
      const { error: errorInsert } = await supabaseClient
        .from(TABELA_CLIENTES)
        .insert([payload]);

      if (errorInsert) throw errorInsert;
    }

    atualizarStatusClienteVisual(statusReal);

    gerarHistoricoContratoVisual();
    gerarContratoCliente();

    mostrarMensagem("Cliente salvo com sucesso.", "#7CFC9A");
    desativarBotaoSalvar();
    return true;
  } catch (error) {
    console.error("Erro ao salvar cliente:", error);
    mostrarMensagem(`Erro ao salvar cliente: ${error.message || "falha desconhecida"}`, "#ff6b6b");
    return false;
  }
}

function detectarTipoArquivoPlaylist(file) {
  const nome = String(file?.name || "").toLowerCase();

  if (/\.(jpg|jpeg|png|webp)$/i.test(nome)) return "imagem";
  if (nome.endsWith(".txt")) return "url";

  return "video";
}

function limparNomeArquivo(nome) {
  return String(nome || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function montarUrlContatoQrCodeCliente() {
  const codigo = normalizarCodigo(codigoClienteAtual || inputCodigo?.textContent);

  if (!codigo) return "";

  return `${window.location.origin}/contato-qrcode.html?cliente=${encodeURIComponent(codigo)}`;
}

function baixarArquivoUrl(url, nomeArquivo) {
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function baixarQrCodeCliente() {
  const codigo = normalizarCodigo(codigoClienteAtual || inputCodigo?.textContent);

  if (!codigo) {
    mostrarMensagem("Código do cliente não encontrado.", "#ff6b6b");
    return;
  }

  try {
    mostrarMensagem("Gerando QR Code...", "#9fd2ff");

    const urlContato = montarUrlContatoQrCodeCliente();
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=900x900&margin=40&format=png&data=${encodeURIComponent(urlContato)}`;

    const resposta = await fetch(qrUrl);
    if (!resposta.ok) throw new Error("Não foi possível gerar o QR Code.");

    const blob = await resposta.blob();
    const urlBlob = URL.createObjectURL(blob);

    baixarArquivoUrl(urlBlob, `qrcode-${codigo}.png`);

    setTimeout(() => URL.revokeObjectURL(urlBlob), 1000);

    mostrarMensagem("QR Code baixado com sucesso.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem(`Erro ao baixar QR Code: ${error.message || "falha desconhecida"}`, "#ff6b6b");
  }
}

async function uploadArquivoCliente() {

  const file = arquivoInput?.files?.[0];

  if (!file) {
    mostrarStatusUpload("Selecione um arquivo.", "#ff6b6b");
    return;
  }

  const codigosDestino = obterPontosMarcados();

  if (!codigosDestino.length) {
    mostrarStatusUpload("Selecione ao menos um ponto antes de enviar.", "#ff6b6b");
    mostrarMensagem("Selecione ao menos um ponto antes de enviar o material.", "#ff6b6b");
    return;
  }

  if (!validarDadosParaMaterialOuContrato()) return;

  try {
    mostrarStatusUpload("Salvando cliente...", "#9fd2ff");

    const clienteSalvo = await salvarCliente();
    if (!clienteSalvo) return;

    const dataFim = inputVencimento.value || null;
    const agoraIso = new Date().toISOString();
    const baseOrdem = Date.now();
    const tipoFinal = detectarTipoArquivoPlaylist(file);

    let videoUrl = "";
    let storagePath = null;

    if (tipoFinal === "url") {
      const texto = await file.text();
      videoUrl = texto.trim();

      if (!videoUrl) {
        mostrarStatusUpload("O arquivo TXT está vazio.", "#ff6b6b");
        return;
      }
    } else {
      mostrarStatusUpload("Enviando arquivo...", "#9fd2ff");

      const nomeLimpo = limparNomeArquivo(file.name);
      storagePath = `clientes/${codigoClienteAtual}/${Date.now()}-${nomeLimpo}`;

      const { error: uploadError } = await supabaseClient.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          cacheControl: "86400",
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabaseClient.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      videoUrl = publicData.publicUrl;
    }

    const registros = codigosDestino.map((codigoPonto, index) => ({
      codigo: codigoPonto,
      codigo_cliente: codigoClienteAtual,
      nome: inputNome.value.trim(),
      titulo_arquivo: file.name,
      video_url: videoUrl,
      storage_path: storagePath,
      tipo: tipoFinal,
      data_inicio: agoraIso,
      data_fim: dataFim,
      ordem: baseOrdem + index
    }));

    console.log("Enviando material para pontos:", codigosDestino);
    console.log("Registros playlists:", registros);

    const { error: insertError } = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .insert(registros);

    if (insertError) throw insertError;

    await carregarHistoricoArquivos();
    await sincronizarStatusCliente();

    gerarHistoricoContratoVisual();
    gerarContratoCliente();

    mostrarStatusUpload("Material enviado para a playlist.", "#7CFC9A");
    mostrarMensagem("Material enviado para os pontos selecionados.", "#7CFC9A");

    arquivoInput.value = "";
  } catch (error) {
    console.error("Erro ao enviar material:", error);
    mostrarStatusUpload(`Erro ao enviar: ${error.message || "falha desconhecida"}`, "#ff6b6b");
  }
}

async function executarComAnimacaoBotao(botao, acao) {
  if (!botao || botao.disabled) return;

  botao.classList.add("carregando");
  botao.disabled = true;

  try {
    await acao();
  } finally {
    setTimeout(() => {
      botao.classList.remove("carregando");
      botao.disabled = false;
    }, 450);
  }
}

async function excluirClienteAtual() {
  if (!codigoClienteAtual) return;

  const confirmar = window.confirm(
    `Tem certeza que deseja apagar o cliente ${codigoClienteAtual}? Essa ação também remove os vínculos e arquivos da playlist deste cliente.`
  );

  if (!confirmar) return;

  try {
    mostrarMensagem("Apagando cliente...", "#9fd2ff");

    await apagarVinculosCliente();

    const { error: erroPlaylists } = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .delete()
      .eq("codigo_cliente", codigoClienteAtual);

    if (erroPlaylists) throw erroPlaylists;

    const { error: erroCliente } = await supabaseClient
      .from(TABELA_CLIENTES)
      .delete()
      .eq("codigo", codigoClienteAtual);

    if (erroCliente) throw erroCliente;

    sessionStorage.removeItem(obterChaveHistoricoContratos());

    mostrarMensagem("Cliente apagado com sucesso.", "#7CFC9A");

    setTimeout(() => {
      window.location.href = "/central-clientes.html";
    }, 500);
  } catch (error) {
    console.error(error);
    mostrarMensagem(`Erro ao apagar cliente: ${error.message || "falha desconhecida"}`, "#ff6b6b");
  }
}

if (listaPontos) {
  listaPontos.addEventListener("change", () => {
    renderizarPontosSelecionaveis(obterPontosMarcados());
    ativarBotaoSalvar();
    gerarContratoCliente();
  });
}

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
if (botaoSalvar) {
  botaoSalvar.addEventListener("click", () => {
    executarComAnimacaoBotao(botaoSalvar, salvarCliente);
  });
}

if (botaoExcluirCliente) {
  botaoExcluirCliente.addEventListener("click", () => {
    executarComAnimacaoBotao(botaoExcluirCliente, excluirClienteAtual);
  });
}

if (botaoVoltar) {
  botaoVoltar.addEventListener("click", () => {
    botaoVoltar.classList.add("carregando");

    setTimeout(() => {
      window.location.href = "/central-clientes.html";
    }, 250);
  });
}

if (btnUploadCliente) {
  btnUploadCliente.addEventListener("click", () => {
    executarComAnimacaoBotao(btnUploadCliente, uploadArquivoCliente);
  });
}

if (btnBaixarContrato) {
  btnBaixarContrato.addEventListener("click", () => {
    executarComAnimacaoBotao(btnBaixarContrato, gerarContratoClienteParaHistorico);
  });
}

if (btnBaixarQrCode) {
  btnBaixarQrCode.addEventListener("click", () => {
    executarComAnimacaoBotao(btnBaixarQrCode, baixarQrCodeCliente);
  });
}

async function iniciar() {
  try {
    codigoClienteAtual = obterCodigoDaUrl();

    if (!codigoClienteAtual) {
      if (inputCodigo) inputCodigo.textContent = "";
      mostrarMensagem("Código do cliente não encontrado na URL.", "#ff6b6b");
      return;
    }

    if (inputCodigo) inputCodigo.textContent = codigoClienteAtual;

    mostrarMensagem(`Carregando cliente ${codigoClienteAtual}...`, "#9fd2ff");

    await carregarPontos();
    await carregarModeloContrato();
    await carregarCliente();

    gerarContratoCliente();
  } catch (error) {
    console.error("Erro ao iniciar pasta-cliente:", error);
    mostrarMensagem(`Erro ao carregar dados: ${error.message || "falha desconhecida"}`, "#ff6b6b");
  }
}

iniciar();
