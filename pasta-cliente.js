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
  const numeros = valor.replace(/\D/g, "").slice(0, 11);

  if (numeros.length === 0) return "";
  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
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
  inputTelefone.value = formatarTelefone(cliente.telefone || "");
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

async function salvarPlaylistNosPontos(urlFinal, tipoFinal) {
  const pontosMarcados = obterPontosMarcados();

  if (!pontosMarcados.length) {
    throw new Error("Selecione ao menos um ponto.");
  }

  const nomeCliente = inputNome.value.trim();
  const dataFim = inputVencimento.value || null;
  const agoraIso = new Date().toISOString();

  const registros = pontosMarcados.map((codigoPonto) => ({
    codigo: codigoPonto,
    nome: nomeCliente,
    video_url: urlFinal,
    tipo: tipoFinal,
    data_inicio: agoraIso,
    data_fim: dataFim,
    ordem: Date.now() + Math.floor(Math.random() * 1000)
  }));

  const { error } = await supabaseClient
    .from("playlists")
    .insert(registros);

  if (error) {
    throw error;
  }
}

async function uploadArquivoCliente() {
  const file = arquivoInput.files[0];

  if (!file) {
    statusUpload.textContent = "Selecione um arquivo";
    statusUpload.style.color = "#ff6b6b";
    return;
  }

  if (!inputNome.value.trim()) {
    statusUpload.textContent = "Preencha o nome do cliente";
    statusUpload.style.color = "#ff6b6b";
    return;
  }

  if (!obterPontosMarcados().length) {
    statusUpload.textContent = "Selecione ao menos um ponto";
    statusUpload.style.color = "#ff6b6b";
    return;
  }

  statusUpload.textContent = "Enviando...";
  statusUpload.style.color = "#9fd2ff";
  btnUploadCliente.disabled = true;

  try {
    if (file.name.toLowerCase().endsWith(".txt")) {
      const texto = await file.text();
      const url = texto.trim();

      if (!url) {
        throw new Error("O TXT está vazio.");
      }

      await salvarPlaylistNosPontos(url, "url");
    } else {
      const path = `clientes/${codigoClienteAtual}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabaseClient.storage
        .from(BUCKET)
        .upload(path, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabaseClient.storage
        .from(BUCKET)
        .getPublicUrl(path);

      await salvarPlaylistNosPontos(data.publicUrl, "arquivo");
    }

    statusUpload.textContent = "Enviado com sucesso";
    statusUpload.style.color = "#7CFC9A";
    arquivoInput.value = "";

    const statusPontosCliente = await buscarStatusPontosDoCliente(inputNome.value.trim());
    renderizarPontosSelecionaveis(obterPontosMarcados(), statusPontosCliente);
  } catch (err) {
    console.error(err);
    statusUpload.textContent = "Erro ao enviar";
    statusUpload.style.color = "#ff6b6b";
  } finally {
    btnUploadCliente.disabled = false;
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
btnUploadCliente.addEventListener("click", uploadArquivoCliente);

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

iniciar();
