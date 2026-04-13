const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "pontos";
const TABELA = "playlists";
const TABELA_PONTOS = "pontos";

const SENHA_PAINEL = "@Helena26";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginBox = document.getElementById("loginBox");
const conteudoPainel = document.getElementById("conteudoPainel");
const senhaInput = document.getElementById("senhaInput");
const btnLogin = document.getElementById("btnLogin");
const loginErro = document.getElementById("loginErro");

const statusEl = document.getElementById("status");
const listaPontos = document.getElementById("listaPontos");
const pontoDetalhe = document.getElementById("pontoDetalhe");

const codigoAtual = document.getElementById("codigoAtual");
const tituloPasta = document.getElementById("tituloPasta");

const btnVoltar = document.getElementById("btnVoltar");
const btnCopiarCodigo = document.getElementById("btnCopiarCodigo");
const btnEditarInfo = document.getElementById("btnEditarInfo");

let codigoSelecionado = null;
let pontosMap = {};

function setStatus(texto, tipo = "normal") {
  statusEl.textContent = texto;
  statusEl.className = "status-box";
  if (tipo === "ok") statusEl.classList.add("ok");
  if (tipo === "erro") statusEl.classList.add("erro");
}

function obterImagemPonto(ponto) {
  return ponto?.imagem_url || "https://placehold.co/600x320/png";
}

function criarSeletorImagem() {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.click();
    input.onchange = () => resolve(input.files[0]);
  });
}

async function uploadImagemPonto(file, codigo) {
  const nome = `${codigo}/${Date.now()}.${file.name.split(".").pop()}`;

  const { error } = await supabaseClient.storage
    .from(BUCKET)
    .upload(nome, file, { upsert: true });

  if (error) throw error;

  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(nome);
  return data.publicUrl;
}

function abrirPonto(codigo) {
  codigoSelecionado = codigo;
  const ponto = pontosMap[codigo];

  listaPontos.style.display = "none";
  pontoDetalhe.style.display = "block";

  tituloPasta.textContent = ponto.nome || codigo;
  codigoAtual.textContent = codigo;

  document.getElementById("cidadePonto").textContent = ponto.cidade || "Cidade não definida";
  document.getElementById("enderecoPonto").textContent = ponto.endereco || "Endereço não definido";
  document.getElementById("statusPonto").textContent = "Carregando...";

  // 👇 IMAGEM
  const img = document.getElementById("imagemPonto");
  if (img) {
    img.src = obterImagemPonto(ponto);
  }

  carregarPlaylist();
}

document.getElementById("btnTrocarImagem").onclick = async () => {
  if (!codigoSelecionado) return;

  try {
    const file = await criarSeletorImagem();
    if (!file) return;

    setStatus("Enviando imagem...");

    const url = await uploadImagemPonto(file, codigoSelecionado);

    await supabaseClient
      .from(TABELA_PONTOS)
      .update({ imagem_url: url })
      .eq("codigo", codigoSelecionado);

    pontosMap[codigoSelecionado].imagem_url = url;

    document.getElementById("imagemPonto").src = url;

    renderizarCardsPontos(Object.values(pontosMap));

    setStatus("Imagem atualizada", "ok");

  } catch {
    setStatus("Erro ao enviar imagem", "erro");
  }
};

function renderizarCardsPontos(lista) {
  lista.forEach(p => {
    pontosMap[p.codigo] = p;

    const card = document.querySelector(`.card-ponto[data-codigo="${p.codigo}"]`);
    if (!card) return;

    card.querySelector(".card-nome").textContent = p.nome || p.codigo;
    card.querySelector(".card-cidade").textContent = p.cidade || "Cidade não definida";

    const img = card.querySelector(".card-imagem");
    img.src = obterImagemPonto(p);
  });
}

async function iniciarPainel() {
  const { data } = await supabaseClient.from(TABELA_PONTOS).select("*");
  renderizarCardsPontos(data);

  document.querySelectorAll(".btn-abrir").forEach(btn => {
    btn.onclick = () => abrirPonto(btn.dataset.codigo);
  });
}

btnLogin.onclick = () => {
  if (senhaInput.value !== SENHA_PAINEL) {
    loginErro.textContent = "Código inválido";
    return;
  }

  loginBox.style.display = "none";
  conteudoPainel.style.display = "block";

  iniciarPainel();
};
