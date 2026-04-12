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

const historicoContratos = document.getElementById("historicoContratos");
const historicoArquivos = document.getElementById("historicoArquivos");

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
}

function desativarBotaoSalvar() {
  houveAlteracao = false;
  botaoSalvar.disabled = true;
  botaoSalvar.style.opacity = "0.5";
}

async function carregarPontos() {
  const { data, error } = await supabaseClient
    .from("pontos")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    throw error;
  }

  pontosData = {};

  (data || []).forEach((ponto) => {
    const chaveInterna = String(
      ponto.codigo_visual ||
      ponto.codigo ||
      ponto.codigo_ponto ||
      ponto.id_ponto ||
      ""
    ).trim();

    if (!chaveInterna) return;

    pontosData[chaveInterna] = ponto;
  });
}

function obterPontosMarcados() {
  return Array.from(document.querySelectorAll('input[name="pontos"]:checked')).map(i => i.value);
}

function obterNomeDoPonto(ponto, codigo) {
  return (
    ponto?.nome ||
    ponto?.nome_painel ||
    ponto?.titulo ||
    ponto?.ambiente ||
    `Ponto ${codigo}`
  );
}

function obterCodigoExibicaoDoPonto(ponto, codigo) {
  return String(
    ponto?.codigo_ponto ||
    ponto?.codigo ||
    ponto?.codigo_visual ||
    codigo ||
    ""
  ).trim();
}

function atualizarResumo() {
  const pontos = obterPontosMarcados();
  resumoCliente.innerHTML = `<div><strong>PONTOS:</strong> ${pontos.join(", ") || "nenhum"}</div>`;
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function montarCardPonto({
  codigo,
  codigoExibicao,
  nome,
  corFundo,
  corBorda,
  desabilitado = false,
  marcado = false
}) {
  return `
    <label
      style="
        display:flex;
        align-items:center;
        gap:8px;
        min-height:58px;
        padding:12px 14px;
        border-radius:10px;
        border:1px solid ${corBorda};
        background:${corFundo};
        color:#ffffff;
        cursor:${desabilitado ? "not-allowed" : "pointer"};
        opacity:${desabilitado ? "0.65" : "1"};
        font-size:0.84rem;
        font-weight:600;
        overflow:hidden;
      "
    >
      <input
        type="checkbox"
        name="pontos"
        value="${escaparHtml(codigo)}"
        ${marcado ? "checked" : ""}
        ${desabilitado ? "disabled" : ""}
        style="
          width:16px;
          height:16px;
          accent-color:#2d8cff;
          flex-shrink:0;
          cursor:${desabilitado ? "not-allowed" : "pointer"};
        "
      >
      <span style="
        color:#e2e8f2;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      ">${escaparHtml(nome)}</span>
      <span style="
        font-weight:700;
        white-space:nowrap;
        margin-left:auto;
        color:#ffffff;
        flex-shrink:0;
      ">${escaparHtml(codigoExibicao)}</span>
    </label>
  `;
}

function montarGrupoPontos(titulo, corTitulo, conteudoHtml, mensagemVazia) {
  return `
    <div style="margin-bottom:18px;">
      <div style="
        color:${corTitulo};
        font-size:0.95rem;
        font-weight:700;
        margin-bottom:10px;
        text-transform:lowercase;
      ">${titulo}</div>

      <div style="
        display:grid;
        grid-template-columns:repeat(3, minmax(0, 1fr));
        gap:12px;
        min-height:92px;
        max-height:250px;
        overflow-y:auto;
        padding:14px;
        border:1px dashed #2d8cff;
        border-radius:12px;
        background:#10131a;
      ">
        ${conteudoHtml || `<div style="color:#bfc7d5; font-size:0.9rem;">${mensagemVazia}</div>`}
      </div>
    </div>
  `;
}

function pontoEstaInativo(ponto) {
  return (
    ponto?.status === "inativo" ||
    ponto?.status === "ocupado" ||
    ponto?.status === "sem_vaga" ||
    ponto?.ativo === false ||
    ponto?.disponivel === false
  );
}

function renderizarPontosSelecionaveis(selecionados = []) {
  listaPontos.innerHTML = "";

  const codigos = Object.keys(pontosData);

  if (!codigos.length) {
    listaPontos.innerHTML = `<div class="vazio">Nenhum ponto encontrado.</div>`;
    atualizarResumo();
    return;
  }

  const selecionadosArr = [];
  const disponiveisArr = [];
  const inativosArr = [];

  codigos
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
    .forEach((codigo) => {
      const ponto = pontosData[codigo];
      const nome = obterNomeDoPonto(ponto, codigo);
      const codigoExibicao = obterCodigoExibicaoDoPonto(ponto, codigo);

      const isSelecionado = selecionados.includes(codigo);
      const isInativo = pontoEstaInativo(ponto);

      if (isSelecionado) {
        selecionadosArr.push(
          montarCardPonto({
            codigo,
            codigoExibicao,
            nome,
            corFundo: "rgba(124, 252, 154, 0.16)",
            corBorda: "#7CFC9A",
            desabilitado: false,
            marcado: true
          })
        );
      } else if (isInativo) {
        inativosArr.push(
          montarCardPonto({
            codigo,
            codigoExibicao,
            nome,
            corFundo: "rgba(255, 107, 107, 0.10)",
            corBorda: "#ff6b6b",
            desabilitado: true,
            marcado: false
          })
        );
      } else {
        disponiveisArr.push(
          montarCardPonto({
            codigo,
            codigoExibicao,
            nome,
            corFundo: "rgba(45, 140, 255, 0.10)",
            corBorda: "#6ea8ff",
            desabilitado: false,
            marcado: false
          })
        );
      }
    });

  listaPontos.innerHTML = `
    ${montarGrupoPontos("selecionado", "#7CFC9A", selecionadosArr.join(""), "Nenhum ponto selecionado.")}
    ${montarGrupoPontos("disponível", "#6ea8ff", disponiveisArr.join(""), "Nenhum ponto disponível.")}
    ${montarGrupoPontos("inativo", "#ff6b6b", inativosArr.join(""), "Nenhum ponto inativo.")}
  `;

  atualizarResumo();
}

listaPontos.addEventListener("change", () => {
  renderizarPontosSelecionaveis(obterPontosMarcados());
  ativarBotaoSalvar();
});

async function carregarCliente() {
  const { data, error } = await supabaseClient
    .from("clientes_app")
    .select("*")
    .eq("codigo", codigoClienteAtual)
    .single();

  if (error) {
    throw error;
  }

  inputCodigo.value = data.codigo;
  inputNome.value = data.nome || "";
  inputTelefone.value = formatarTelefone(data.telefone || "");
  inputEmail.value = data.email || "";
  inputCpfCnpj.value = data.cpf_cnpj || "";
  inputVencimento.value = data.vencimento_exibicao || "";

  let selecionados = [];

  try {
    const { data: vinculos, error: erroVinculos } = await supabaseClient
      .from("cliente_pontos")
      .select("ponto_codigo")
      .eq("cliente_codigo", codigoClienteAtual);

    if (erroVinculos) {
      throw erroVinculos;
    }

    selecionados = Array.isArray(vinculos)
      ? vinculos.map(item => item.ponto_codigo).filter(Boolean)
      : [];
  } catch (error) {
    console.error(error);
  }

  renderizarPontosSelecionaveis(selecionados);
  desativarBotaoSalvar();
}

botaoSalvar.addEventListener("click", () => {
  mostrarMensagem("Salvo");
  desativarBotaoSalvar();
});

botaoVoltar.addEventListener("click", () => {
  window.location.href = "central-clientes.html";
});

async function iniciar() {
  try {
    codigoClienteAtual = obterCodigoDaUrl();
    await carregarPontos();
    await carregarCliente();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao carregar pontos.", "#ff6b6b");
  }
}

iniciar();
