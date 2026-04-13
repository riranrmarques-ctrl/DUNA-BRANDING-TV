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
const btnTrocarImagem = document.getElementById("btnTrocarImagem");
const btnTrocarImagemTop = document.getElementById("btnTrocarImagemTop");

let codigoSelecionado = null;
let pontosMap = {};
let dragIndex = null;

function setStatus(texto, tipo = "normal") {
  if (!statusEl) return;
  statusEl.textContent = texto;
  statusEl.className = "status-box";
  if (tipo === "ok") statusEl.classList.add("ok");
  if (tipo === "erro") statusEl.classList.add("erro");
}

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function obterImagemPonto(ponto) {
  return ponto?.imagem_url || "https://placehold.co/600x320/png";
}

function obterCidadeFormatada(cidade) {
  const nome = String(cidade || "").trim();
  return nome ? `Cidade de ${nome}` : "Cidade não definida";
}

function calcularStatusInfo(ponto) {
  if (!ponto?.ultimo_ping) {
    return { texto: "Inativo", detalhe: "sem histórico", ativo: false };
  }

  const dataPing = new Date(ponto.ultimo_ping);
  if (Number.isNaN(dataPing.getTime())) {
    return { texto: "Inativo", detalhe: "sem histórico", ativo: false };
  }

  const diff = Date.now() - dataPing.getTime();
  const horario = dataPing.toLocaleString("pt-BR");

  if (diff < 5 * 60 * 1000) {
    return { texto: "Ativo", detalhe: horario, ativo: true };
  }

  return { texto: "Inativo", detalhe: horario, ativo: false };
}

function formatarData(valor) {
  if (!valor) return "Sem data";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Sem data";
  return data.toLocaleDateString("pt-BR");
}

function formatarDataHora(valor) {
  if (!valor) return "Sem data";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Sem data";
  return data.toLocaleString("pt-BR");
}

function itemEstaInativo(item) {
  if (!item?.data_fim) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fim = new Date(item.data_fim);
  if (Number.isNaN(fim.getTime())) return false;

  fim.setHours(23, 59, 59, 999);
  return fim < hoje;
}

function criarSeletorImagem() {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", () => {
      const file = input.files && input.files[0] ? input.files[0] : null;
      document.body.removeChild(input);
      resolve(file);
    });

    input.click();
  });
}

async function uploadImagemPonto(file, codigo) {
  const extensao = (file.name.split(".").pop() || "jpg").toLowerCase();
  const nomeArquivo = `${codigo}/${Date.now()}.${extensao}`;

  const { error } = await supabaseClient.storage
    .from(BUCKET)
    .upload(nomeArquivo, file, { upsert: true });

  if (error) throw error;

  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(nomeArquivo);
  return data.publicUrl;
}

if (btnTrocarImagem) {
  btnTrocarImagem.onclick = async () => {
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

    } catch (e) {
      console.error(e);
      setStatus("Erro ao enviar imagem", "erro");
    }
  };
}

/* 🔥 LIGA BOTÃO DO LADO DIREITO */
if (btnTrocarImagemTop && btnTrocarImagem) {
  btnTrocarImagemTop.onclick = () => {
    btnTrocarImagem.click();
  };
}

/* RESTO DO SEU JS CONTINUA IGUAL (NÃO ALTERADO) */
