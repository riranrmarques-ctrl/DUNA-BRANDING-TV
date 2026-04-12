const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "videos";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const inputCodigo = document.getElementById("codigo");
const inputNome = document.getElementById("nome");
const inputTelefone = document.getElementById("telefone");
const inputEmail = document.getElementById("email");
const inputCpfCnpj = document.getElementById("cpfCnpj");
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
let houveAlteracao = true;

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

function itemPlaylistEstaAtivo(item) {
  if (!item || !item.data_fim) return true;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fim = new Date(item.data_fim);
  fim.setHours(23, 59, 59, 999);

  return fim >= hoje;
}

function marcarErro(campo) {
  campo.style.border = "1px solid #ff6b6b";
}

function limparErro(campo) {
  campo.style.border = "1px solid #313847";
}

function ativarBotaoSalvar() {
  houveAlteracao = true;
  botaoSalvar.disabled = false;
  botaoSalvar.style.opacity = "1";
  botaoSalvar.style.cursor = "pointer";
}

function desativarBotaoSalvar() {
  houveAlteracao = false;
  botaoSalvar.disabled = true;
  botaoSalvar.style.opacity = "0.5";
  botaoSalvar.style.cursor = "not-allowed";
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

function obterCodigosReaisDosPontosMarcados() {
  return obterPontosMarcados()
    .map((codigoVisual) => pontosData[codigoVisual]?.codigo_ponto || null)
    .filter(Boolean);
}

function atualizarResumo() {
  const nome = inputNome.value.trim() || "-";
  const telefone = inputTelefone.value.trim() || "-";
  const email = inputEmail.value.trim() || "-";
  const cpfCnpj = inputCpfCnpj.value.trim() || "-";
  const vencimento = inputVencimento.value || "-";
  const status = statusCliente.textContent;
  const pontos = obterPontosMarcados();

  resumoCliente.innerHTML = `
    <div class="linha"><strong>Código:</strong> ${codigoClienteAtual || "-"}</div>
    <div class="linha"><strong>Status:</strong> ${status}</div>
    <div class="linha"><strong>Vencimento:</strong> ${vencimento}</div>
    <div class="linha"><strong>Nome completo:</strong> ${nome}</div>
    <div class="linha"><strong>Telefone:</strong> ${telefone}</div>
    <div class="linha"><strong>Email:</strong> ${email}</div>
    <div class="linha"><strong>CPF / CNPJ:</strong> ${cpfCnpj}</div>
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

function atualizarStatusClientePorConteudo(statusPontosCliente, pontosSelecionadosVisuais = []) {
  const existeAtivo = pontosSelecionadosVisuais.some((codigoVisual) => {
    const codigoReal = pontosData[codigoVisual]?.codigo_ponto;
    if (!codigoReal) return false;
    return statusPontosCliente[codigoReal]?.temAtivo;
  });

  if (existeAtivo) {
    statusCliente.textContent = "Ativo";
    statusCliente.style.color = "#7CFC9A";
  } else {
    statusCliente.textContent = "Não ativo";
    statusCliente.style.color = "#ff6b6b";
  }
}

function renderizarPontosSelecionaveis(selecionados = []) {
  listaPontos.innerHTML = "";

  const codigos = Object.keys(pontosData);

  if (!codigos.length) {
    listaPontos.innerHTML = `<div class="vazio">Nenhum ponto encontrado.</div>`;
    return;
  }

  codigos.forEach((codigoVisual) => {
    const ponto = pontosData[codigoVisual];

    const item = document.createElement("label");
    item.className = "item-ponto";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "pontos";
    checkbox.value = codigoVisual;
    checkbox.checked = selecionados.includes(codigoVisual);

    const info = document.createElement("div");
    info.className = "item-ponto-info";

    const titulo = document.createElement("strong");
    titulo.textContent = `${codigoVisual} - ${ponto.nome || "Sem nome"}`;

    info.appendChild(titulo);
    item.appendChild(checkbox);
    item.appendChild(info);
    listaPontos.appendChild(item);
  });

  atualizarResumo();
}

function validarCamposCliente() {
  let valido = true;

  const campos = [
    inputVencimento,
    inputNome,
    inputTelefone,
    inputEmail,
    inputCpfCnpj
  ];

  campos.forEach((campo) => {
    if (!campo.value.trim()) {
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
    mostrarMensagem("Preencha todos os campos obrigatórios.", "#ff6b6b");
    return false;
  }

  return true;
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
  inputEmail.value = cliente.email || "";
  inputCpfCnpj.value = cliente.cpf_cnpj || "";
  inputVencimento.value = cliente.vencimento_exibicao || "";

  limparErro(inputVencimento);
  limparErro(inputNome);
  limparErro(inputTelefone);
  limparErro(inputEmail);
  limparErro(inputCpfCnpj);

  renderizarPontosSelecionaveis(pontosSelecionados);

  const statusPontosCliente = await buscarStatusPontosDoCliente(cliente.nome || "");
  atualizarStatusClientePorConteudo(statusPontosCliente, pontosSelecionados);
  atualizarResumo();
  desativarBotaoSalvar();
}

async function salvarCliente() {
  if (!validarCamposCliente()) {
    ativarBotaoSalvar();
    return;
  }

  const nome = inputNome.value.trim();
  const telefone = inputTelefone.value.trim();
  const email = inputEmail.value.trim();
  const cpfCnpj = inputCpfCnpj.value.trim();
  const vencimento = inputVencimento.value;
  const pontosMarcados = obterPontosMarcados();

  botaoSalvar.disabled = true;
  botaoSalvar.style.opacity = "0.7";
  botaoSalvar.style.cursor = "wait";

  try {
    const { error: errorCliente } = await supabaseClient
      .from("clientes_app")
      .upsert({
        codigo: codigoClienteAtual,
        nome,
        telefone: telefone || null,
        email: email || null,
        cpf_cnpj: cpfCnpj || null,
        vencimento_exibicao: vencimento || null
      }, { onConflict: "codigo" });

    if (errorCliente) {
      throw errorCliente;
    }

    const { error: errorDelete } = await supabaseClient
      .from("cliente_pontos")
      .delete()
      .eq("cliente_codigo", codigoClienteAtual);

    if (errorDelete) {
      throw errorDelete;
    }

    const vinculos = pontosMarcados.map((pontoVisual) => ({
      cliente_codigo: codigoClienteAtual,
      ponto_codigo: pontoVisual
    }));

    const { error: errorInsert } = await supabaseClient
      .from("cliente_pontos")
      .insert(vinculos);

    if (errorInsert) {
      throw errorInsert;
    }

    const statusPontosCliente = await buscarStatusPontosDoCliente(nome);
    atualizarStatusClientePorConteudo(statusPontosCliente, pontosMarcados);
    atualizarResumo();
    mostrarMensagem("Cliente salvo com sucesso.", "#7CFC9A");
    desativarBotaoSalvar();
  } catch (err) {
    console.error(err);
    mostrarMensagem("Erro ao salvar.", "#ff6b6b");
    ativarBotaoSalvar();
  }
}

async function removerMidiasAnterioresDoClienteNosPontos(codigosReaisPontos, nomeCliente) {
  const { data: antigos, error } = await supabaseClient
    .from("playlists")
    .select("id, storage_path")
    .eq("nome", nomeCliente)
    .in("codigo", codigosReaisPontos);

  if (error) {
    throw error;
  }

  const ids = (antigos || []).map((item) => item.id).filter(Boolean);
  const caminhos = Array.from(new Set((antigos || []).map((item) => item.storage_path).filter(Boolean)));

  if (ids.length) {
    const { error: deleteError } = await supabaseClient
      .from("playlists")
      .delete()
      .in("id", ids);

    if (deleteError) {
      throw deleteError;
    }
  }

  if (caminhos.length) {
    await supabaseClient.storage.from(BUCKET).remove(caminhos);
  }
}

async function salvarPlaylistNosPontos(urlFinal, tipoFinal, pathArquivo = null) {
  const pontosMarcados = obterPontosMarcados();
  const codigosReais = obterCodigosReaisDosPontosMarcados();

  if (!pontosMarcados.length || !codigosReais.length) {
    throw new Error("Selecione ao menos um ponto.");
  }

  const nomeCliente = inputNome.value.trim();
  const dataFim = inputVencimento.value || null;
  const agoraIso = new Date().toISOString();
  const baseOrdem = Date.now();

  await removerMidiasAnterioresDoClienteNosPontos(codigosReais, nomeCliente);

  const registros = codigosReais.map((codigoReal, index) => ({
    codigo: codigoReal,
    nome: nomeCliente,
    video_url: urlFinal,
    tipo: tipoFinal,
    data_inicio: agoraIso,
    data_fim: dataFim,
    storage_path: pathArquivo,
    ordem: baseOrdem + index
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

  if (!validarCamposCliente()) {
    ativarBotaoSalvar();
    return;
  }

  if (!file) {
    statusUpload.textContent = "Selecione um arquivo";
    statusUpload.style.color = "#ff6b6b";
    return;
  }

  statusUpload.textContent = "Enviando...";
  statusUpload.style.color = "#9fd2ff";
  btnUploadCliente.disabled = true;

  try {
    await salvarCliente();

    if (file.name.toLowerCase().endsWith(".txt")) {
      const texto = await file.text();
      const url = texto.trim();

      if (!url) {
        throw new Error("O TXT está vazio.");
      }

      await salvarPlaylistNosPontos(url, "url", null);
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

      const nomeArquivo = file.name.toLowerCase();
      const tipoFinal = nomeArquivo.endsWith(".jpg") || nomeArquivo.endsWith(".jpeg") ? "imagem" : "video";

      await salvarPlaylistNosPontos(data.publicUrl, tipoFinal, path);
    }

    statusUpload.textContent = "Enviado com sucesso";
    statusUpload.style.color = "#7CFC9A";
    arquivoInput.value = "";

    const pontosMarcados = obterPontosMarcados();
    const statusPontosCliente = await buscarStatusPontosDoCliente(inputNome.value.trim());
    atualizarStatusClientePorConteudo(statusPontosCliente, pontosMarcados);
    atualizarResumo();
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
  limparErro(inputTelefone);
  atualizarResumo();
  ativarBotaoSalvar();
});

inputNome.addEventListener("input", () => {
  limparErro(inputNome);
  atualizarResumo();
  ativarBotaoSalvar();
});

inputEmail.addEventListener("input", () => {
  limparErro(inputEmail);
  atualizarResumo();
  ativarBotaoSalvar();
});

inputCpfCnpj.addEventListener("input", () => {
  limparErro(inputCpfCnpj);
  atualizarResumo();
  ativarBotaoSalvar();
});

inputVencimento.addEventListener("input", () => {
  limparErro(inputVencimento);
  atualizarResumo();
  ativarBotaoSalvar();
});

inputVencimento.addEventListener("change", () => {
  limparErro(inputVencimento);
  atualizarResumo();
  ativarBotaoSalvar();
});

listaPontos.addEventListener("change", () => {
  atualizarResumo();
  ativarBotaoSalvar();
});

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
    ativarBotaoSalvar();
  }
}

iniciar();
