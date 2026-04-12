const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "videos";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const inputCodigo = document.getElementById("codigo");
const inputNome = document.getElementById("nome");
const inputTelefone = document.getElementById("telefone");
const inputSegmento = document.getElementById("segmento");
const inputObservacao = document.getElementById("observacao");
const inputVencimento = document.getElementById("vencimentoExibicao");
const statusCliente = document.getElementById("statusCliente");

const listaPontos = document.getElementById("listaPontos");
const resumoCliente = document.getElementById("resumoCliente");
const mensagem = document.getElementById("mensagem");
const botaoSalvar = document.getElementById("botaoSalvar");
const botaoVoltar = document.getElementById("botaoVoltar");

const arquivoInput = document.getElementById("arquivoInput");
const btnUploadCliente = document.getElementById("btnUploadCliente");
const statusUpload = document.getElementById("statusUpload");

let pontosData = {};
let codigoClienteAtual = "";

function mostrarMensagem(texto, cor = "#9fd2ff") {
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

function obterCodigoDaUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("codigo") || "").trim().toUpperCase();
}

function formatarTelefone(valor) {
  const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);

  if (numeros.length === 0) return "";
  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function atualizarStatus() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (inputVencimento.value) {
    const venc = new Date(inputVencimento.value);
    venc.setHours(23, 59, 59, 999);

    if (venc >= hoje) {
      statusCliente.textContent = "Ativo";
      statusCliente.style.color = "#7CFC9A";
      return;
    }
  }

  statusCliente.textContent = "Não ativo";
  statusCliente.style.color = "#ff6b6b";
}

async function carregarPontos() {
  const response = await fetch("pontos.json?v=1");
  pontosData = await response.json();
}

function obterPontosMarcados() {
  return Array.from(document.querySelectorAll('input[name="pontos"]:checked')).map(i => i.value);
}

function atualizarResumo() {
  const pontos = obterPontosMarcados();

  resumoCliente.innerHTML = `
    <div><strong>Código:</strong> ${codigoClienteAtual}</div>
    <div><strong>Status:</strong> ${statusCliente.textContent}</div>
    <div><strong>Vencimento:</strong> ${inputVencimento.value || "-"}</div>
    <div><strong>Nome:</strong> ${inputNome.value || "-"}</div>
    <div><strong>Telefone:</strong> ${inputTelefone.value || "-"}</div>
    <div><strong>PONTOS DAS TELAS:</strong> ${pontos.join(", ") || "nenhum"}</div>
  `;
}

function renderizarPontosSelecionaveis() {
  listaPontos.innerHTML = "";

  Object.keys(pontosData).forEach((codigoVisual) => {
    const ponto = pontosData[codigoVisual];

    const item = document.createElement("label");
    item.className = "item-ponto";

    item.innerHTML = `
      <input type="checkbox" name="pontos" value="${codigoVisual}">
      <div class="item-ponto-info">
        <strong>${codigoVisual} - ${ponto.nome}</strong>
      </div>
    `;

    listaPontos.appendChild(item);
  });

  atualizarResumo();
}

async function salvarPlaylistNosPontos(urlFinal, tipoFinal, pathArquivo = null) {
  const pontosMarcados = obterPontosMarcados();

  const nomeCliente = inputNome.value.trim();
  const dataFim = inputVencimento.value || null;
  const agoraIso = new Date().toISOString();
  const baseOrdem = Date.now();

  const registros = pontosMarcados.map((codigoVisual, index) => {
    const pontoReal = pontosData[codigoVisual];

    return {
      codigo: pontoReal.codigo_ponto,
      nome: nomeCliente,
      video_url: urlFinal,
      tipo: tipoFinal,
      data_inicio: agoraIso,
      data_fim: dataFim,
      storage_path: pathArquivo,
      ordem: baseOrdem + index
    };
  });

  const { error } = await supabaseClient.from("playlists").insert(registros);
  if (error) throw error;
}

async function uploadArquivoCliente() {
  const file = arquivoInput.files[0];

  if (!file) {
    statusUpload.textContent = "Selecione um arquivo";
    return;
  }

  if (!obterPontosMarcados().length) {
    statusUpload.textContent = "Selecione um ponto";
    return;
  }

  statusUpload.textContent = "Enviando...";

  try {
    if (file.name.endsWith(".txt")) {
      const url = (await file.text()).trim();
      await salvarPlaylistNosPontos(url, "url", null);
    } else {
      const path = `clientes/${codigoClienteAtual}/${Date.now()}-${file.name}`;

      await supabaseClient.storage.from(BUCKET).upload(path, file);
      const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);

      await salvarPlaylistNosPontos(data.publicUrl, "arquivo", path);
    }

    statusUpload.textContent = "Enviado com sucesso";
    arquivoInput.value = "";
  } catch {
    statusUpload.textContent = "Erro ao enviar";
  }
}

inputTelefone.addEventListener("input", (e) => {
  e.target.value = formatarTelefone(e.target.value);
});

inputVencimento.addEventListener("change", atualizarStatus);
listaPontos.addEventListener("change", atualizarResumo);

btnUploadCliente.addEventListener("click", uploadArquivoCliente);

async function iniciar() {
  codigoClienteAtual = obterCodigoDaUrl();
  await carregarPontos();
  renderizarPontosSelecionaveis();
}

iniciar();
