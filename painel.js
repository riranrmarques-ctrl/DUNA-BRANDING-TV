const nomeInput = document.getElementById("nome");
const codigoInput = document.getElementById("codigo");
const linksInput = document.getElementById("links");
const jsonInput = document.getElementById("json");
const mensagem = document.getElementById("mensagem");

/* CHAVES STORAGE */
const STORAGE_NOME = "painel_nome";
const STORAGE_CODIGO = "painel_codigo";
const STORAGE_LINKS = "painel_links";
const STORAGE_JSON = "painel_json";

/* SALVAR CAMPOS AUTOMATICAMENTE */
function salvarRascunho() {
  localStorage.setItem(STORAGE_NOME, nomeInput.value);
  localStorage.setItem(STORAGE_CODIGO, codigoInput.value);
  localStorage.setItem(STORAGE_LINKS, linksInput.value);
  localStorage.setItem(STORAGE_JSON, jsonInput.value);
}

/* CARREGAR CAMPOS SALVOS */
function carregarRascunho() {
  const nomeSalvo = localStorage.getItem(STORAGE_NOME);
  const codigoSalvo = localStorage.getItem(STORAGE_CODIGO);
  const linksSalvos = localStorage.getItem(STORAGE_LINKS);
  const jsonSalvo = localStorage.getItem(STORAGE_JSON);

  if (nomeSalvo !== null) nomeInput.value = nomeSalvo;
  if (codigoSalvo !== null) codigoInput.value = codigoSalvo;
  if (linksSalvos !== null) linksInput.value = linksSalvos;
  if (jsonSalvo !== null && jsonSalvo.trim() !== "") {
    jsonInput.value = jsonSalvo;
  } else {
    jsonInput.value = "{}";
  }
}

/* MENSAGEM */
function mostrarMensagem(texto, tipo = "sucesso") {
  mensagem.textContent = texto;
  mensagem.style.color = tipo === "erro" ? "#ff4d4f" : "#22c55e";
}

/* NORMALIZA CÓDIGO */
function normalizarCodigo(valor) {
  return String(valor || "").trim();
}

/* QUEBRA LINKS */
function extrairPlaylist(texto) {
  return texto
    .split("\n")
    .map(item => item.trim())
    .filter(item => item !== "");
}

/* SALVAR / ATUALIZAR */
function salvar() {
  const nome = nomeInput.value.trim();
  const codigo = normalizarCodigo(codigoInput.value);
  const playlist = extrairPlaylist(linksInput.value);

  if (!codigo) {
    mostrarMensagem("Informe o código.", "erro");
    return;
  }

  if (playlist.length === 0) {
    mostrarMensagem("Adicione pelo menos 1 link.", "erro");
    return;
  }

  let data = {};

  try {
    data = JSON.parse(jsonInput.value || "{}");
  } catch (erro) {
    mostrarMensagem("O JSON está inválido.", "erro");
    return;
  }

  data[codigo] = {
    playlist: playlist
  };

  jsonInput.value = JSON.stringify(data, null, 2);
  salvarRascunho();
  mostrarMensagem("Código salvo com sucesso!");
}

/* FORMATAR JSON */
function formatar() {
  try {
    const obj = JSON.parse(jsonInput.value || "{}");
    jsonInput.value = JSON.stringify(obj, null, 2);
    salvarRascunho();
    mostrarMensagem("JSON formatado com sucesso!");
  } catch (erro) {
    mostrarMensagem("JSON inválido!", "erro");
  }
}

/* COPIAR JSON */
async function copiar() {
  try {
    await navigator.clipboard.writeText(jsonInput.value);
    mostrarMensagem("JSON copiado com sucesso!");
  } catch (erro) {
    jsonInput.select();
    document.execCommand("copy");
    mostrarMensagem("JSON copiado com sucesso!");
  }
}

/* LIMPAR FORMULÁRIO */
function limparFormulario() {
  nomeInput.value = "";
  codigoInput.value = "";
  linksInput.value = "";
  salvarRascunho();
  mostrarMensagem("Formulário limpo.");
}

/* LIMPAR TUDO */
function limparTudo() {
  nomeInput.value = "";
  codigoInput.value = "";
  linksInput.value = "";
  jsonInput.value = "{}";

  localStorage.removeItem(STORAGE_NOME);
  localStorage.removeItem(STORAGE_CODIGO);
  localStorage.removeItem(STORAGE_LINKS);
  localStorage.removeItem(STORAGE_JSON);

  mostrarMensagem("Tudo foi limpo.");
}

/* EVENTOS DE AUTOSAVE */
nomeInput.addEventListener("input", salvarRascunho);
codigoInput.addEventListener("input", salvarRascunho);
linksInput.addEventListener("input", salvarRascunho);
jsonInput.addEventListener("input", salvarRascunho);

/* DEIXAR FUNÇÕES GLOBAIS PARA O HTML */
window.salvar = salvar;
window.formatar = formatar;
window.copiar = copiar;
window.limparFormulario = limparFormulario;
window.limparTudo = limparTudo;

/* INICIAR */
carregarRascunho();
