const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

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
  valor = valor.replace(/\D/g, "").slice(0, 10);

  if (valor.length <= 2) return `(${valor}`;
  if (valor.length <= 6) return `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
  return `(${valor.slice(0, 2)}) ${valor.slice(2, 6)}-${valor.slice(6)}`;
}

function itemPlaylistEstaAtivo(item) {
  if (!item || !item.data_fim) return true;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fim = new Date(item.data_fim);
  fim.setHours(23, 59, 59, 999);

  return fim >= hoje;
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

  if (!response.ok) {
    throw new Error("Não foi possível carregar pontos.json");
  }

  pontosData = await response.json();
}

function obterPontosMarcados() {
  return Array.from(document.querySelectorAll('input[name="pontos"]:checked')).map((item) => item.value);
}

function atualizarResumo() {
  const nome = inputNome.value.trim() || "-";
  const telefone = inputTelefone.value.trim() || "-";
  const segmento = inputSegmento.value || "-";
  const observacao = inputObservacao.value.trim() || "-";
  const vencimento = inputVencimento.value || "-";
  const status = statusCliente.textContent;
  const pontos = obterPontosMarcados();

  resumoCliente.innerHTML = `
    <div class="linha"><strong>Código:</strong> ${codigoClienteAtual || "-"}</div>
    <div class="linha"><strong>Status:</strong> ${status}</div>
    <div class="linha"><strong>Vencimento:</strong> ${vencimento}</div>
    <div class="linha"><strong>Nome:</strong> ${nome}</div>
    <div class="linha"><strong>Telefone:</strong> ${telefone}</div>
    <div class="linha"><strong>Segmento:</strong> ${segmento}</div>
    <div class="linha"><strong>Observação:</strong> ${observacao}</div>
    <div class="linha"><strong>PONTOS DAS TELAS:</strong> ${pontos.length ? pontos.join(", ") : "nenhum"}</div>
  `;
}

async function buscarStatusPontosDoCliente(nomeCliente) {
  const nomeLimpo = String(nomeCliente || "").trim();
  const mapaStatus = {};

  if (!nomeLimpo) {
    return mapaStatus;
  }

  const { data, error } = await supabaseClient
    .from("playlists")
    .select("codigo, nome, data_fim");

  if (error) {
    throw error;
  }

  (data || []).forEach((item) => {
    const codigoPonto = String(item.codigo || "").trim();
    const nomeItem = String(item.nome || "").trim();

    if (!codigoPonto || !nomeItem) return;
    if (nomeItem !== nomeLimpo) return;

    if (!mapaStatus[codigoPonto]) {
      mapaStatus[codigoPonto] = {
        temAtivo: false,
        temInativo: false
      };
    }

    if (itemPlaylistEstaAtivo(item)) {
      mapaStatus[codigoPonto].temAtivo = true;
    } else {
      mapaStatus[codigoPonto].temInativo = true;
    }
  });

  return mapaStatus;
}

function renderizarPontosSelecionaveis(selecionados = [], statusPontosCliente = {}) {
  listaPontos.innerHTML = "";

  const codigos = Object.keys(pontosData);

  if (!codigos.length) {
    listaPontos.innerHTML = `<div class="vazio">Nenhum ponto encontrado.</div>`;
    return;
  }

  codigos.forEach((codigoPonto) => {
    const ponto = pontosData[codigoPonto];
    const statusInfo = statusPontosCliente[codigoPonto] || null;

    const item = document.createElement("label");
    item.className = "item-ponto";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "pontos";
    checkbox.value = codigoPonto;
    checkbox.checked = selecionados.includes(codigoPonto);

    const info = document.createElement("div");
    info.className = "item-ponto-info";

    const titulo = document.createElement("strong");
    titulo.textContent = `${codigoPonto} - ${ponto.nome || "Sem nome"}`;

    const detalhe = document.createElement("span");

    if (statusInfo?.temAtivo) {
      detalhe.textContent = "Status: ativo";
      detalhe.style.color = "#7CFC9A";
    } else if (statusInfo?.temInativo) {
      detalhe.textContent = "Status: inativo";
      detalhe.style.color = "#ffb347";
    } else {
      detalhe.textContent = "Disponível para marcação";
      detalhe.style.color = "#bfc7d5";
    }

    info.appendChild(titulo);
    info.appendChild(detalhe);

    item.appendChild(checkbox);
    item.appendChild(info);
    listaPontos.appendChild(item);
  });

  atualizarResumo();
}

async function carregarCliente() {
  const { data: cliente, error } = await supabaseClient
    .from("clientes_app")
    .select("*")
    .eq("codigo", codigoClienteAtual)
    .maybeSingle();

  if (error) throw error;
  if (!cliente) throw new Error("Cliente não encontrado.");

  const { data: vinculos, error: erroVinculos } = await supabaseClient
    .from("cliente_pontos")
    .select("*")
    .eq("cliente_codigo", codigoClienteAtual);

  if (erroVinculos) throw erroVinculos;

  const pontosSelecionados = Array.isArray(vinculos)
    ? vinculos.map((i) => i.ponto_codigo)
    : [];

  inputCodigo.value = cliente.codigo || "";
  inputNome.value = cliente.nome || "";
  inputTelefone.value = cliente.telefone || "";
  inputTelefone.value = formatarTelefone(inputTelefone.value);
  inputSegmento.value = cliente.segmento || "";
  inputObservacao.value = cliente.observacao || "";
  inputVencimento.value = cliente.vencimento_exibicao || "";

  atualizarStatus();

  const statusPontosCliente = await buscarStatusPontosDoCliente(cliente.nome || "");
  renderizarPontosSelecionaveis(pontosSelecionados, statusPontosCliente);
  atualizarResumo();
}

async function salvarCliente() {
  const nome = inputNome.value.trim();
  const telefone = inputTelefone.value.trim();
  const segmento = inputSegmento.value;
  const observacao = inputObservacao.value.trim();
  const vencimento = inputVencimento.value;
  const pontosMarcados = obterPontosMarcados();

  if (!codigoClienteAtual) {
    mostrarMensagem("Código não encontrado.", "#ff6b6b");
    return;
  }

  if (!nome) {
    mostrarMensagem("Digite o nome.", "#ff6b6b");
    return;
  }

  botaoSalvar.disabled = true;

  try {
    await supabaseClient.from("clientes_app").upsert({
      codigo: codigoClienteAtual,
      nome,
      telefone: telefone || null,
      segmento: segmento || null,
      observacao: observacao || null,
      vencimento_exibicao: vencimento || null
    }, { onConflict: "codigo" });

    await supabaseClient.from("cliente_pontos")
      .delete()
      .eq("cliente_codigo", codigoClienteAtual);

    if (pontosMarcados.length) {
      await supabaseClient.from("cliente_pontos").insert(
        pontosMarcados.map((p) => ({
          cliente_codigo: codigoClienteAtual,
          ponto_codigo: p
        }))
      );
    }

    atualizarStatus();

    const statusPontosCliente = await buscarStatusPontosDoCliente(nome);
    renderizarPontosSelecionaveis(pontosMarcados, statusPontosCliente);
    atualizarResumo();
    mostrarMensagem("Cliente salvo com sucesso.", "#7CFC9A");
  } catch (err) {
    console.error(err);
    mostrarMensagem("Erro ao salvar.", "#ff6b6b");
  } finally {
    botaoSalvar.disabled = false;
  }
}

inputTelefone.addEventListener("input", (e) => {
  e.target.value = formatarTelefone(e.target.value);
  atualizarResumo();
});

inputNome.addEventListener("input", atualizarResumo);
inputObservacao.addEventListener("input", atualizarResumo);
inputSegmento.addEventListener("change", atualizarResumo);
inputVencimento.addEventListener("change", () => {
  atualizarStatus();
  atualizarResumo();
});

listaPontos.addEventListener("change", atualizarResumo);

botaoSalvar.addEventListener("click", salvarCliente);
botaoVoltar.addEventListener("click", () => {
  window.location.href = "central-clientes.html";
});

async function iniciar() {
  try {
    codigoClienteAtual = obterCodigoDaUrl();

    if (!codigoClienteAtual) {
      mostrarMensagem("Código não informado.", "#ff6b6b");
      return;
    }

    mostrarMensagem("Carregando...");
    await carregarPontos();
    await carregarCliente();
    mostrarMensagem("Cliente carregado.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao carregar.", "#ff6b6b");
  }
}

const arquivoInput = document.getElementById("arquivoInput");
const btnUploadCliente = document.getElementById("btnUploadCliente");
const statusUpload = document.getElementById("statusUpload");

async function uploadArquivoCliente() {
  const file = arquivoInput.files[0];

  if (!file) {
    statusUpload.textContent = "Selecione um arquivo";
    statusUpload.style.color = "#ff6b6b";
    return;
  }

  statusUpload.textContent = "Enviando...";
  statusUpload.style.color = "#9fd2ff";

  try {
    if (file.name.endsWith(".txt")) {
      const texto = await file.text();
      const url = texto.trim();

      await salvarMidiaCliente(url, "url");

    } else {
      const path = `clientes/${codigoClienteAtual}/${Date.now()}-${file.name}`;

      const { error } = await supabaseClient.storage
        .from("videos")
        .upload(path, file);

      if (error) throw error;

      const { data } = supabaseClient.storage
        .from("videos")
        .getPublicUrl(path);

      await salvarMidiaCliente(data.publicUrl, "arquivo");
    }

    statusUpload.textContent = "Enviado com sucesso";
    statusUpload.style.color = "#7CFC9A";

    arquivoInput.value = "";

  } catch (err) {
    console.error(err);
    statusUpload.textContent = "Erro ao enviar";
    statusUpload.style.color = "#ff6b6b";
  }
}

async function salvarMidiaCliente(url, tipo) {
  await supabaseClient.from("playlists").insert({
    codigo: null,
    nome: inputNome.value.trim(),
    video_url: url,
    tipo: tipo,
    data_inicio: new Date().toISOString(),
    data_fim: inputVencimento.value || null,
    ordem: Date.now()
  });
}

btnUploadCliente.addEventListener("click", uploadArquivoCliente);

iniciar();
