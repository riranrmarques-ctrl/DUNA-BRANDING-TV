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
  return Array.from(document.querySelectorAll('input[name="pontos"]:checked')).map((i) => i.value);
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

function obterTemaStatus(tipo) {
  if (tipo === "selecionado") {
    return {
      titulo: "#7CFC9A",
      areaBorda: "rgba(124, 252, 154, 0.40)",
      areaFundo: "rgba(124, 252, 154, 0.05)",
      cardBorda: "rgba(124, 252, 154, 0.80)",
      cardFundo: "linear-gradient(180deg, rgba(124, 252, 154, 0.26) 0%, rgba(72, 161, 95, 0.20) 100%)",
      cardSombra: "0 0 0 1px rgba(124, 252, 154, 0.10) inset"
    };
  }

  if (tipo === "inativo") {
    return {
      titulo: "#ff6b6b",
      areaBorda: "rgba(255, 107, 107, 0.35)",
      areaFundo: "rgba(255, 107, 107, 0.04)",
      cardBorda: "rgba(255, 107, 107, 0.72)",
      cardFundo: "linear-gradient(180deg, rgba(255, 107, 107, 0.18) 0%, rgba(153, 52, 52, 0.14) 100%)",
      cardSombra: "0 0 0 1px rgba(255, 107, 107, 0.08) inset"
    };
  }

  return {
    titulo: "#6ea8ff",
    areaBorda: "rgba(110, 168, 255, 0.35)",
    areaFundo: "rgba(110, 168, 255, 0.04)",
    cardBorda: "rgba(110, 168, 255, 0.72)",
    cardFundo: "linear-gradient(180deg, rgba(110, 168, 255, 0.16) 0%, rgba(52, 98, 153, 0.14) 100%)",
    cardSombra: "0 0 0 1px rgba(110, 168, 255, 0.08) inset"
  };
}

function montarCardPonto({
  codigo,
  codigoExibicao,
  nome,
  tema,
  desabilitado = false,
  marcado = false
}) {
  return `
    <label
      style="
        display:flex;
        align-items:center;
        gap:10px;
        min-height:64px;
        padding:12px 14px;
        border-radius:12px;
        border:1px solid ${tema.cardBorda};
        background:${tema.cardFundo};
        box-shadow:${tema.cardSombra};
        color:#ffffff;
        cursor:${desabilitado ? "not-allowed" : "pointer"};
        opacity:${desabilitado ? "0.65" : "1"};
        overflow:hidden;
        transition:0.2s ease;
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

      <div style="
        display:flex;
        flex-direction:column;
        min-width:0;
        flex:1;
        line-height:1.15;
      ">
        <span style="
          color:#ffffff;
          font-size:0.92rem;
          font-weight:700;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          margin-bottom:4px;
        ">${escaparHtml(nome)}</span>

        <span style="
          color:rgba(255,255,255,0.72);
          font-size:0.72rem;
          font-weight:600;
          letter-spacing:0.04em;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        ">${escaparHtml(codigoExibicao)}</span>
      </div>
    </label>
  `;
}

function montarGrupoPontos(titulo, tipo, conteudoHtml) {
  const tema = obterTemaStatus(tipo);

  return `
    <div style="margin-bottom:18px;">
      <div style="
        color:${tema.titulo};
        font-size:0.95rem;
        font-weight:700;
        margin-bottom:10px;
        text-transform:lowercase;
      ">${titulo}</div>

      <div
        style="
          display:grid;
          grid-template-columns:repeat(3, minmax(0, 1fr));
          gap:12px;
          min-height:108px;
          max-height:260px;
          overflow:auto;
          padding:14px;
          border:1px solid ${tema.areaBorda};
          border-radius:14px;
          background:${tema.areaFundo};
          scrollbar-width:none;
          -ms-overflow-style:none;
        "
        class="grupo-pontos-scroll-${tipo}"
      >
        ${conteudoHtml}
      </div>
    </div>
  `;
}

function injetarEstilosScroll() {
  if (document.getElementById("estilo-scroll-pontos")) return;

  const style = document.createElement("style");
  style.id = "estilo-scroll-pontos";
  style.textContent = `
    .grupo-pontos-scroll-selecionado,
    .grupo-pontos-scroll-disponivel,
    .grupo-pontos-scroll-inativo {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }

    .grupo-pontos-scroll-selecionado::-webkit-scrollbar,
    .grupo-pontos-scroll-disponivel::-webkit-scrollbar,
    .grupo-pontos-scroll-inativo::-webkit-scrollbar {
      width: 0 !important;
      height: 0 !important;
      background: transparent !important;
    }

    .grupo-pontos-scroll-selecionado::-webkit-scrollbar-thumb,
    .grupo-pontos-scroll-disponivel::-webkit-scrollbar-thumb,
    .grupo-pontos-scroll-inativo::-webkit-scrollbar-thumb {
      background: transparent !important;
      border: none !important;
    }

    .grupo-pontos-scroll-selecionado::-webkit-scrollbar-track,
    .grupo-pontos-scroll-disponivel::-webkit-scrollbar-track,
    .grupo-pontos-scroll-inativo::-webkit-scrollbar-track {
      background: transparent !important;
    }
  `;
  document.head.appendChild(style);
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
            tema: obterTemaStatus("selecionado"),
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
            tema: obterTemaStatus("inativo"),
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
            tema: obterTemaStatus("disponivel"),
            desabilitado: false,
            marcado: false
          })
        );
      }
    });

  const grupos = [];

  if (selecionadosArr.length) {
    grupos.push(
      montarGrupoPontos("selecionado", "selecionado", selecionadosArr.join(""))
    );
  }

  grupos.push(
    montarGrupoPontos("disponível", "disponivel", disponiveisArr.join(""))
  );

  if (inativosArr.length) {
    grupos.push(
      montarGrupoPontos("inativo", "inativo", inativosArr.join(""))
    );
  }

  listaPontos.innerHTML = grupos.join("");

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
      ? vinculos.map((item) => item.ponto_codigo).filter(Boolean)
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
    injetarEstilosScroll();
    codigoClienteAtual = obterCodigoDaUrl();
    await carregarPontos();
    await carregarCliente();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao carregar pontos.", "#ff6b6b");
  }
}

iniciar();
