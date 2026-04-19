const liberado = sessionStorage.getItem("painelLiberado");

if (liberado !== "1") {
  window.location.replace("/painel.html");
}

const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const SUPABASE_CONTRATO_URL = "https://yiyaxxnewjvmnusfxzom.supabase.co";
const SUPABASE_CONTRATO_KEY = "sb_publishable_EjuRWhlusDG2RLTAHFREQQ_-qZjxm3g";
const BUCKET = "videos";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const supabaseContratoClient = window.supabase.createClient(SUPABASE_CONTRATO_URL, SUPABASE_CONTRATO_KEY);

const inputCodigo = document.getElementById("codigo");
const inputNome = document.getElementById("nome");
const inputTelefone = document.getElementById("telefone");
const inputEmail = document.getElementById("email");
const inputCpfCnpj = document.getElementById("cpfCnpj");
const inputVencimento = document.getElementById("vencimentoExibicao");
const inputValorContratado = document.getElementById("valorContratado");
const inputDataPostagem = document.getElementById("dataPostagem");
const statusCliente = document.getElementById("statusCliente");
const tipoAcessoCliente = document.getElementById("tipoAcessoCliente");
const btnSupervisor = document.getElementById("btnSupervisor");

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

let pontosData = {};
let codigoClienteAtual = "";
let clausulasContrato = [];
let contratoAtivo = true;
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
  const params = new URLSearchParams(window.location.search);
  return String(params.get("codigo") || "").trim().toUpperCase();
}

function supervisorEstaAtivo() {
  return tipoAcessoCliente?.value === "supervisor";
}

function obterTipoAcessoAtual() {
  return supervisorEstaAtivo() ? "supervisor" : "cliente";
}

function materialUpgradeEstaAtivo() {
  return true;
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function atualizarToggleContratoVisual() {
  if (!btnBaixarContrato) return;

  const bloqueado = supervisorEstaAtivo();
  btnBaixarContrato.disabled = bloqueado;
  btnBaixarContrato.style.opacity = bloqueado ? "0.45" : "1";
  btnBaixarContrato.style.cursor = bloqueado ? "not-allowed" : "pointer";
}

function atualizarModoSupervisor() {
  const ativo = supervisorEstaAtivo();

  if (btnSupervisor) {
    btnSupervisor.classList.toggle("ativo", ativo);
    btnSupervisor.textContent = ativo ? "Supervisor ativo" : "Supervisor";
  }

  const camposBloqueadosNoSupervisor = [
    inputCodigo,
    inputTelefone,
    inputEmail,
    inputCpfCnpj,
    inputVencimento,
    inputValorContratado,
    inputDataPostagem,
    arquivoInput,
    btnUploadCliente,
    btnBaixarContrato
  ];

  camposBloqueadosNoSupervisor.forEach((campo) => aplicarCampoDesativado(campo, ativo));

  aplicarCampoDesativado(inputNome, false);
  aplicarCampoDesativado(botaoSalvar, false);

  document.querySelectorAll('input[name="pontos"]').forEach((checkbox) => {
    checkbox.disabled = false;
    checkbox.style.cursor = "pointer";
    checkbox.style.opacity = "1";
  });

  atualizarToggleContratoVisual();
}

async function carregarPontos() {
  const { data, error } = await supabaseClient
    .from("pontos")
    .select("*");

  if (error) throw error;

  pontosData = {};

  (data || []).forEach((ponto) => {
    const chave = String(
      ponto.codigo_visual ||
      ponto.codigo_ponto ||
      ponto.codigo ||
      ponto.id_ponto ||
      ponto.id ||
      ""
    ).trim();

    if (!chave) return;
    pontosData[chave] = ponto;
  });
}

async function carregarConfigContrato() {
  try {
    const { data, error } = await supabaseContratoClient
      .from("config_contrato")
      .select("*")
      .eq("id", "duna")
      .maybeSingle();

    if (error) throw error;

    if (data) {
      dadosDunaContrato = {
        empresa: data.empresa || "Duna Branding",
        cnpj: data.cnpj || "",
        telefone: data.telefone || "",
        email: data.email || "",
        endereco: data.endereco || "",
        responsavel: data.responsavel || "",
        titulo_contrato: data.titulo_contrato || "Contrato de Prestação de Serviços de Publicidade em Telas Digitais",
        subtitulo_contrato: data.subtitulo_contrato || "Contrato de prestação de serviços de publicidade em telas digitais."
      };
    }
  } catch (error) {
    console.error("Erro ao carregar config do contrato:", error);
  }
}

async function carregarClausulasContrato() {
  try {
    const { data, error } = await supabaseContratoClient
      .from("contrato_clausulas")
      .select("*")
      .eq("contrato_id", "duna")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (error) throw error;

    clausulasContrato = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro ao carregar clausulas:", error);
    clausulasContrato = [];
  }
}

function obterNomeDoPonto(ponto, codigo) {
  return ponto?.nome || ponto?.nome_painel || ponto?.titulo || ponto?.ambiente || `Ponto ${codigo}`;
}

function obterCodigoRealDoPonto(codigoVisual) {
  const ponto = pontosData[codigoVisual];

  return String(
    ponto?.codigo_ponto ||
    ponto?.codigo_visual ||
    ponto?.codigo ||
    codigoVisual ||
    ""
  ).trim();
}

function obterPontosMarcados() {
  return Array.from(document.querySelectorAll('input[name="pontos"]:checked')).map((item) => item.value);
}

function obterCodigosDestinoSelecionados() {
  return obterPontosMarcados().map(obterCodigoRealDoPonto).filter(Boolean);
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

  contratoStatus.textContent = supervisorEstaAtivo() ? "Supervisor sem contrato" : "Modelo carregado";
}

function montarHtmlContratoCompleto(dadosContrato = null) {
  const dados = dadosContrato || obterDadosContratoCliente();
  const assinaturaUrl = `${window.location.origin}/assinatura.png`;

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
        body {
          font-family: Arial, sans-serif;
          color: #111827;
          background: #fff;
          margin: 0;
          padding: 32px;
        }

        .topo {
          border-bottom: 2px solid #111827;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }

        h1 {
          font-size: 24px;
          margin: 0 0 6px 0;
        }

        .sub {
          color: #475569;
          font-size: 14px;
        }

        .bloco {
          margin-bottom: 18px;
        }

        .bloco h2 {
          font-size: 16px;
          margin: 0 0 10px 0;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .campo {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px;
          background: #f8fafc;
          font-size: 14px;
        }

        .campo strong {
          display: block;
          margin-bottom: 4px;
        }

        .assinaturas {
          display: grid;
          grid-template-columns: repeat(2, minmax(220px, 1fr));
          gap: 20px;
          margin-top: 46px;
          align-items: end;
        }

        .assinatura-box {
          text-align: center;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .assinatura-img {
          display: block;
          width: 400px;
          max-width: 400px;
          height: 200px;
          object-fit: contain;
          object-position: center bottom;
          margin: 0 auto 20px;
          pointer-events: none;
        }

        .linha-assinatura {
          border-top: 1px solid #111827;
          padding-top: 8px;
          font-size: 14px;
          color: #111827;
          position: relative;
          z-index: 2;
          font-weight: 700;
        }

        @media print {
          body {
            padding: 24px;
          }

          .assinatura-img {
            width: 260px;
            max-width: 260px;
            height: 80px;
            margin: 0 auto -12px;
          }
        }
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
          <img src="${escaparHtml(assinaturaUrl)}" alt="Assinatura Duna Branding" class="assinatura-img">
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
    const bruto = localStorage.getItem(obterChaveHistoricoContratos());
    const lista = JSON.parse(bruto || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function salvarHistoricoContratosGerados(lista) {
  localStorage.setItem(obterChaveHistoricoContratos(), JSON.stringify(lista));
}

function obterProximoNumeroContrato() {
  const historico = lerHistoricoContratosGerados();

  const maiorNumero = historico.reduce((maior, item) => {
    const nome = String(item.nome_arquivo || "");
    const match = nome.match(/^branding-(\d+)\.html$/i);
    const numero = match ? Number(match[1]) : 0;

    return Number.isFinite(numero) && numero > maior ? numero : maior;
  }, 0);

  return maiorNumero + 1;
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

function baixarContratoDoHistorico(id) {
  const historico = lerHistoricoContratosGerados();
  const item = historico.find((contrato) => contrato.id === id);

  if (!item) {
    mostrarMensagem("Contrato não encontrado no histórico.", "#ff6b6b");
    return;
  }

  const html = montarHtmlContratoCompleto(item.dados);
  baixarHtmlContrato(html, item.nome_arquivo || "contrato.html");
}

function excluirContratoDoHistorico(id) {
  const confirmar = window.confirm("Deseja apagar este contrato do histórico?");
  if (!confirmar) return;

  const historico = lerHistoricoContratosGerados().filter((contrato) => contrato.id !== id);
  salvarHistoricoContratosGerados(historico);
  gerarHistoricoContratoVisual();
  mostrarMensagem("Contrato removido do histórico.", "#7CFC9A");
}

function gerarHistoricoContratoVisual() {
  if (!historicoContratos) return;

  const historico = lerHistoricoContratosGerados();

  if (!historico.length) {
    historicoContratos.innerHTML = `<div class="historico-vazio">Nenhum contrato gerado ainda.</div>`;
    return;
  }

  historicoContratos.innerHTML = historico.map((item) => {
    const data = formatarDataHistorico(item.criado_em);
    const nome = item.nome_arquivo || "contrato.html";

    return `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        padding:12px;
        border:1px solid #2a3040;
        border-radius:12px;
        background:#10131a;
      ">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;color:#ffffff;word-break:break-word;margin-bottom:6px;">
            ${escaparHtml(nome)}
          </div>
          <div style="color:#c6cedd;font-size:0.9rem;">
            Gerado em: ${escaparHtml(data)}
          </div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button
            type="button"
            class="btn-baixar-contrato-historico"
            data-id="${escaparHtml(item.id)}"
            style="
              border:none;
              border-radius:8px;
              background:#2d8cff;
              color:#fff;
              font-weight:700;
              cursor:pointer;
              padding:9px 12px;
            "
          >Baixar</button>

          <button
            type="button"
            class="btn-excluir-contrato-historico"
            data-id="${escaparHtml(item.id)}"
            style="
              border:none;
              border-radius:8px;
              background:#d9534f;
              color:#fff;
              font-weight:700;
              cursor:pointer;
              padding:9px 12px;
            "
          >Apagar</button>
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
  return String(
    item.storage_path ||
    `${item.video_url || ""}|${item.data_inicio || ""}|${item.nome || ""}`
  ).trim();
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
        data_inicio: item.data_inicio || null,
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
    const inicio = formatarDataHistorico(grupo.data_inicio);
    const fim = grupo.data_fim ? formatarDataHistorico(grupo.data_fim) : "-";
    const pontosTexto = grupo.pontos.length ? grupo.pontos.join(", ") : "-";
    const idsEncoded = encodeURIComponent(JSON.stringify(grupo.ids));
    const tituloSeguro = escaparHtml(grupo.titulo || "");

    return `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        padding:12px;
        border:1px solid #2a3040;
        border-radius:12px;
        background:#10131a;
      ">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700;margin-bottom:8px;color:#ffffff;word-break:break-word;">
            ${tituloSeguro}
          </div>

          <div style="color:#c6cedd;font-size:0.9rem;line-height:1.55;">
            <div><strong>Pontos:</strong> ${escaparHtml(pontosTexto)}</div>
            <div><strong>Tipo:</strong> ${escaparHtml(grupo.tipo)}</div>
            <div><strong>Inicio:</strong> ${escaparHtml(inicio)}</div>
            <div><strong>Fim:</strong> ${escaparHtml(fim)}</div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;min-width:110px;flex-shrink:0;">
          <button
            type="button"
            class="btn-renomear-historico"
            data-ids="${idsEncoded}"
            data-titulo="${tituloSeguro}"
            style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              height:36px;
              padding:0 12px;
              border:none;
              border-radius:8px;
              background:#f59e0b;
              color:#fff;
              font-size:0.82rem;
              font-weight:700;
              cursor:pointer;
            "
          >Renomear</button>

          <a
            href="${escaparHtml(grupo.video_url || "#")}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              height:36px;
              padding:0 12px;
              border:none;
              border-radius:8px;
              background:#2d8cff;
              color:#fff;
              text-decoration:none;
              font-size:0.82rem;
              font-weight:700;
            "
          >Abrir</a>

          <button
            type="button"
            class="btn-deletar-historico"
            data-ids="${idsEncoded}"
            data-storage-path="${escaparHtml(grupo.storage_path || "")}"
            style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              height:36px;
              padding:0 12px;
              border:none;
              border-radius:8px;
              background:#ff5f5f;
              color:#fff;
              font-size:0.82rem;
              font-weight:700;
              cursor:pointer;
            "
          >Excluir</button>
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
        console.error("Erro ao ler ids do historico:", error);
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
    mostrarMensagem("Digite um nome valido para o arquivo.", "#ff6b6b");
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("playlists")
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
      .from("playlists")
      .delete()
      .in("id", listaIds);

    if (deleteError) throw deleteError;

    await carregarHistoricoArquivos();
    await sincronizarStatusCliente();

    mostrarMensagem("Arquivo excluido de todos os pontos.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao excluir arquivo.", "#ff6b6b");
  }
}

async function carregarHistoricoArquivos() {
  try {
    const { data, error } = await supabaseClient
      .from("playlists")
      .select("*")
      .eq("codigo_cliente", codigoClienteAtual)
      .order("ordem", { ascending: false });

    if (error) throw error;

    renderizarHistoricoArquivos(data || []);
    return data || [];
  } catch (error) {
    console.error(error);

    if (historicoArquivos) {
      historicoArquivos.innerHTML = `<div class="historico-vazio">Erro ao carregar historico de arquivo.</div>`;
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
    .forEach((codigoVisual) => {
      const ponto = pontosData[codigoVisual];
      const nome = obterNomeDoPonto(ponto, codigoVisual);
      const codigoReal = obterCodigoRealDoPonto(codigoVisual);
      const checked = selecionadosSet.has(codigoVisual) || selecionadosSet.has(codigoReal);
      const disponivel = pontoEstaDisponivel(ponto);
      const disabled = !disponivel;

      const card = `
        <label style="
          display:flex;
          align-items:center;
          gap:10px;
          padding:10px 12px;
          border-radius:10px;
          min-height:52px;
          cursor:${disabled ? "not-allowed" : "pointer"};
          border:1px solid ${checked ? "#8ce063" : disabled ? "#ff7b7b" : "#6f8bff"};
          background:${checked ? "#76d34f" : disabled ? "#e85252" : "#4f6ff0"};
          color:#fff;
          opacity:1;
          overflow:hidden;
          box-shadow:0 4px 12px rgba(0,0,0,0.16);
        ">
          <input
            type="checkbox"
            name="pontos"
            value="${escaparHtml(codigoVisual)}"
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
      ${montarGrupo("disponivel", "#6ea8ff", cardsDisponiveis)}
      ${montarGrupo("indisponivel", "#ff8f8f", cardsIndisponiveis)}
    </div>
  `;

  atualizarModoSupervisor();
}

async function carregarVinculosCliente() {
  try {
    const { data, error } = await supabaseClient
      .from("cliente_pontos")
      .select("ponto_codigo,tipo_vinculo")
      .eq("cliente_codigo", codigoClienteAtual);

    if (error) throw error;

    return Array.isArray(data)
      ? data.map((item) => String(item.ponto_codigo || "").trim()).filter(Boolean)
      : [];
  } catch (error) {
    console.warn("Falha ao buscar tipo_vinculo. Tentando buscar somente ponto_codigo.", error);

    try {
      const { data, error: erroFallback } = await supabaseClient
        .from("cliente_pontos")
        .select("ponto_codigo")
        .eq("cliente_codigo", codigoClienteAtual);

      if (erroFallback) throw erroFallback;

      return Array.isArray(data)
        ? data.map((item) => String(item.ponto_codigo || "").trim()).filter(Boolean)
        : [];
    } catch (fallbackError) {
      console.error("Erro ao buscar vinculos em cliente_pontos:", fallbackError);
      return [];
    }
  }
}

async function calcularStatusClienteRealPorCodigoCliente() {
  if (supervisorEstaAtivo()) return "Não ativo";

  const { data, error } = await supabaseClient
    .from("playlists")
    .select("data_fim")
    .eq("codigo_cliente", codigoClienteAtual);

  if (error) return "Não ativo";

  const ativos = (data || []).filter((item) => !itemEstaInativo(item));
  return ativos.length ? "Ativo" : "Não ativo";
}

async function sincronizarStatusCliente() {
  const statusReal = await calcularStatusClienteRealPorCodigoCliente();
  atualizarStatusClienteVisual(statusReal);

  const { error } = await supabaseClient
    .from("clientes_app")
    .update({ status: statusReal })
    .eq("codigo", codigoClienteAtual);

  if (error) console.error(error);
}

function validarCamposCliente() {
  let valido = true;
  const supervisor = supervisorEstaAtivo();

  const camposObrigatorios = supervisor
    ? [inputNome]
    : [inputNome, inputTelefone, inputEmail, inputCpfCnpj, inputVencimento];

  [inputNome, inputTelefone, inputEmail, inputCpfCnpj, inputVencimento].forEach(limparErro);

  camposObrigatorios.forEach((campo) => {
    if (!String(campo?.value || "").trim()) {
      marcarErro(campo);
      valido = false;
    } else {
      limparErro(campo);
    }
  });

  if (!obterPontosMarcados().length) {
    mostrarMensagem("Selecione ao menos um ponto.", "#ff6b6b");
    return false;
  }

  if (!valido) {
    mostrarMensagem("Preencha os campos obrigatórios.", "#ff6b6b");
    return false;
  }

  return true;
}

async function carregarCliente() {
  const { data, error } = await supabaseClient
    .from("clientes_app")
    .select("*")
    .eq("codigo", codigoClienteAtual)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar cliente em clientes_app:", error);
    throw error;
  }
  
if (inputCodigo) inputCodigo.value = codigoClienteAtual;

clienteAtual = data || null;

if (!data) {

    if (inputNome) inputNome.value = "";
    if (inputTelefone) inputTelefone.value = "";
    if (inputEmail) inputEmail.value = "";
    if (inputCpfCnpj) inputCpfCnpj.value = "";
    if (inputVencimento) inputVencimento.value = "";
    if (inputValorContratado) inputValorContratado.value = formatarMoedaBR(0);
    if (inputDataPostagem) inputDataPostagem.value = new Date().toISOString().split("T")[0];
    if (tipoAcessoCliente) tipoAcessoCliente.value = "cliente";

    contratoAtivo = true;
    atualizarStatusClienteVisual("Não ativo");
    renderizarPontosSelecionaveis([]);
    renderizarHistoricoArquivos([]);
    gerarHistoricoContratoVisual();
    gerarContratoCliente();
    atualizarModoSupervisor();
    desativarBotaoSalvar();

    mostrarMensagem(`Cliente ${codigoClienteAtual} não encontrado na tabela clientes_app.`, "#ff6b6b");
    return;
  }

  if (inputNome) inputNome.value = data.nome_completo || "";
  if (inputTelefone) inputTelefone.value = formatarTelefone(data.telefone || "");
  if (inputEmail) inputEmail.value = data.email || "";
  if (inputCpfCnpj) inputCpfCnpj.value = formatarCpfCnpj(data.cpf_cnpj || "");
  if (inputVencimento) inputVencimento.value = data.vencimento_exibicao || "";
  if (inputValorContratado) inputValorContratado.value = formatarMoedaBR(data.valor_contratado ?? 0);
  if (inputDataPostagem) inputDataPostagem.value = data.data_postagem || new Date().toISOString().split("T")[0];
  if (tipoAcessoCliente) tipoAcessoCliente.value = data.tipo_acesso === "supervisor" ? "supervisor" : "cliente";

  contratoAtivo = data.contrato_ativo !== false;

  const selecionados = await carregarVinculosCliente();

  renderizarPontosSelecionaveis(selecionados);
  await carregarHistoricoArquivos();
  await sincronizarStatusCliente();

  gerarHistoricoContratoVisual();
  gerarContratoCliente();
  atualizarModoSupervisor();
  desativarBotaoSalvar();

  mostrarMensagem(`Cliente ${codigoClienteAtual} carregado com sucesso.`, "#7CFC9A");
}

async function salvarCliente() {
  if (!validarCamposCliente()) return false;

  const tipoAcesso = obterTipoAcessoAtual();
  const tipoVinculo = tipoAcesso === "supervisor" ? "supervisor" : "cliente";

  const payload = {
    codigo: codigoClienteAtual,
    nome_completo: inputNome.value.trim(),
    telefone: inputTelefone.value.trim(),
    email: inputEmail.value.trim(),
    cpf_cnpj: inputCpfCnpj.value.trim(),
    vencimento_exibicao: inputVencimento.value || null,
    valor_contratado: extrairNumeroMoeda(inputValorContratado.value),
    data_postagem: inputDataPostagem.value || null,
    status: await calcularStatusClienteRealPorCodigoCliente(),
    contrato_ativo: true,
    tipo_acesso: tipoAcesso,
    material_upgrade_ativo: materialUpgradeEstaAtivo()
  };

  try {
    const { error: errorCliente } = await supabaseClient
      .from("clientes_app")
      .upsert(payload, { onConflict: "codigo" });

    if (errorCliente) throw errorCliente;

    const { error: errorDelete } = await supabaseClient
      .from("cliente_pontos")
      .delete()
      .eq("cliente_codigo", codigoClienteAtual);

    if (errorDelete) throw errorDelete;

    const pontosSelecionados = obterPontosMarcados();

    if (pontosSelecionados.length) {
      const vinculos = pontosSelecionados.map((codigoVisual) => ({
        cliente_codigo: codigoClienteAtual,
        ponto_codigo: obterCodigoRealDoPonto(codigoVisual),
        tipo_vinculo: tipoVinculo
      }));

      const { error: errorInsert } = await supabaseClient
        .from("cliente_pontos")
        .insert(vinculos);

      if (errorInsert) throw errorInsert;
    }

    await sincronizarStatusCliente();
    await carregarHistoricoArquivos();

    gerarHistoricoContratoVisual();
    gerarContratoCliente();
    atualizarModoSupervisor();

    mostrarMensagem("Cliente salvo com sucesso.", "#7CFC9A");
    desativarBotaoSalvar();
    return true;
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao salvar cliente.", "#ff6b6b");
    return false;
  }
}

async function uploadArquivoCliente() {
  if (supervisorEstaAtivo()) {
    mostrarStatusUpload("Supervisor não envia arquivo por aqui.", "#ffb86b");
    return;
  }

  const file = arquivoInput?.files?.[0];

  if (!validarCamposCliente()) return;

  if (!file) {
    mostrarStatusUpload("Selecione um arquivo.", "#ff6b6b");
    return;
  }

  const codigosDestino = obterCodigosDestinoSelecionados();

  if (!codigosDestino.length) {
    mostrarStatusUpload("Selecione ao menos um ponto.", "#ff6b6b");
    return;
  }

  try {
    const clienteSalvo = await salvarCliente();
    if (!clienteSalvo) return;

    const dataFim = inputVencimento.value || null;
    const agoraIso = new Date().toISOString();
    const baseOrdem = Date.now();

    if (file.name.toLowerCase().endsWith(".txt")) {
      const texto = await file.text();
      const url = texto.trim();

      const registros = codigosDestino.map((codigoReal, index) => ({
        codigo: codigoReal,
        codigo_cliente: codigoClienteAtual,
        nome: inputNome.value.trim(),
        titulo_arquivo: file.name,
        video_url: url,
        tipo: "url",
        data_inicio: agoraIso,
        data_fim: dataFim,
        storage_path: null,
        ordem: baseOrdem + index
      }));

      const { error } = await supabaseClient.from("playlists").insert(registros);
      if (error) throw error;
    } else {
      const nomeLimpo = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();

      const path = `clientes/${codigoClienteAtual}/${Date.now()}-${nomeLimpo}`;

      const { error: uploadError } = await supabaseClient.storage.from(BUCKET).upload(path, file);
      if (uploadError) throw uploadError;

      const { data: publicData } = await supabaseClient.storage.from(BUCKET).getPublicUrl(path);
      const tipoFinal = /\.(jpg|jpeg|png|webp)$/i.test(file.name) ? "imagem" : "video";

      const registros = codigosDestino.map((codigoReal, index) => ({
        codigo: codigoReal,
        codigo_cliente: codigoClienteAtual,
        nome: inputNome.value.trim(),
        titulo_arquivo: file.name,
        video_url: publicData.publicUrl,
        tipo: tipoFinal,
        data_inicio: agoraIso,
        data_fim: dataFim,
        storage_path: path,
        ordem: baseOrdem + index
      }));

      const { error } = await supabaseClient.from("playlists").insert(registros);
      if (error) throw error;
    }

    await carregarHistoricoArquivos();
    await sincronizarStatusCliente();

    gerarHistoricoContratoVisual();
    gerarContratoCliente();

    mostrarStatusUpload("Enviado com sucesso.", "#7CFC9A");
    arquivoInput.value = "";
  } catch (error) {
    console.error(error);
    mostrarStatusUpload("Erro ao enviar.", "#ff6b6b");
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

    const { error: erroVinculos } = await supabaseClient
      .from("cliente_pontos")
      .delete()
      .eq("cliente_codigo", codigoClienteAtual);

    if (erroVinculos) throw erroVinculos;

    const { error: erroPlaylists } = await supabaseClient
      .from("playlists")
      .delete()
      .eq("codigo_cliente", codigoClienteAtual);

    if (erroPlaylists) throw erroPlaylists;

    const { error: erroCliente } = await supabaseClient
      .from("clientes_app")
      .delete()
      .eq("codigo", codigoClienteAtual);

    if (erroCliente) throw erroCliente;

    localStorage.removeItem(obterChaveHistoricoContratos());

    mostrarMensagem("Cliente apagado com sucesso.", "#7CFC9A");

    setTimeout(() => {
      window.location.href = "/central-clientes.html";
    }, 500);
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar cliente.", "#ff6b6b");
  }
}

if (listaPontos) {
  listaPontos.addEventListener("change", () => {
    renderizarPontosSelecionaveis(obterPontosMarcados());
    ativarBotaoSalvar();
    gerarContratoCliente();
  });
}

if (btnSupervisor) {
  btnSupervisor.addEventListener("click", () => {
    if (!tipoAcessoCliente) return;

    tipoAcessoCliente.value = supervisorEstaAtivo() ? "cliente" : "supervisor";
    atualizarModoSupervisor();
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

if (botaoSalvar) botaoSalvar.addEventListener("click", salvarCliente);
if (botaoExcluirCliente) botaoExcluirCliente.addEventListener("click", excluirClienteAtual);
if (botaoVoltar) botaoVoltar.addEventListener("click", () => { window.location.href = "/central-clientes.html"; });
if (btnUploadCliente) btnUploadCliente.addEventListener("click", uploadArquivoCliente);
if (btnBaixarContrato) btnBaixarContrato.addEventListener("click", gerarContratoClienteParaHistorico);

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
    atualizarModoSupervisor();
  } catch (error) {
    console.error("Erro ao iniciar pasta-cliente:", error);
    mostrarMensagem("Erro ao carregar dados da pasta do cliente.", "#ff6b6b");
  }
}

iniciar();
