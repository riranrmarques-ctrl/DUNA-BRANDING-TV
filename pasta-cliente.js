const liberado = sessionStorage.getItem("painelLiberado");

if (liberado !== "1") {
  window.location.replace("/painel.html");
}

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
const inputValorContratado = document.getElementById("valorContratado");
const inputDataPostagem = document.getElementById("dataPostagem");
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

const btnBaixarContratoPdf = document.getElementById("btnBaixarContratoPdf");
const contratoPreview = document.getElementById("contratoPreview");
const contratoStatus = document.getElementById("contratoStatus");
const contratoPdfArea = document.getElementById("contratoPdfArea");

let pontosData = {};
let codigoClienteAtual = "";
let houveAlteracao = true;

let dadosDunaContrato = {
  empresa: "DUNA AUDIOVISUAL",
  cnpj: "",
  telefone: "",
  email: "",
  endereco: "",
  responsavel: "",
  assinatura_url: "/assinatura.png",
  titulo_contrato: "Contrato de Prestação de Serviços de Publicidade em Telas Digitais",
  subtitulo_contrato: "Contrato de prestação de serviços de publicidade em telas digitais."
};

let clausulasContrato = [];

function mostrarMensagem(texto, cor = "#9fd2ff") {
  if (!mensagem) return;
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

function mostrarStatusUpload(texto, cor = "#9fd2ff") {
  if (!statusUpload) return;
  statusUpload.textContent = texto;
  statusUpload.style.color = cor;
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
    return (0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  let numero;

  if (typeof valor === "number") {
    numero = valor;
  } else {
    const limpo = texto
      .replace(/\s/g, "")
      .replace("R$", "")
      .replace(/[^\d,.-]/g, "");

    if (limpo.includes(",")) {
      numero = Number(
        limpo
          .replace(/\./g, "")
          .replace(",", ".")
      );
    } else {
      numero = Number(limpo);
    }
  }

  if (!Number.isFinite(numero)) {
    numero = 0;
  }

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function extrairNumeroMoeda(valor) {
  const texto = String(valor ?? "").trim();

  if (!texto) return 0;

  const limpo = texto
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace(/[^\d,.-]/g, "");

  let numero;

  if (limpo.includes(",")) {
    numero = Number(
      limpo
        .replace(/\./g, "")
        .replace(",", ".")
    );
  } else {
    numero = Number(limpo);
  }

  return Number.isFinite(numero) ? numero : 0;
}

function formatarDataBR(valor) {
  if (!valor) return "-";

  const partes = String(valor).split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);

  return data.toLocaleDateString("pt-BR");
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
  houveAlteracao = true;

  if (!botaoSalvar) return;

  botaoSalvar.disabled = false;
  botaoSalvar.style.opacity = "1";
  botaoSalvar.style.cursor = "pointer";
}

function desativarBotaoSalvar() {
  houveAlteracao = false;

  if (!botaoSalvar) return;

  botaoSalvar.disabled = true;
  botaoSalvar.style.opacity = "0.5";
  botaoSalvar.style.cursor = "not-allowed";
}

function atualizarStatusClienteVisual(statusTexto) {
  if (!statusCliente) return;

  const texto = String(statusTexto || "").trim().toLowerCase();
  const ativo = texto === "ativo";
  const valor = ativo ? "Ativo" : "Não ativo";

  statusCliente.textContent = valor;
  statusCliente.value = valor;
  statusCliente.style.color = ativo ? "#7CFC9A" : "#ff6b6b";
}

function itemEstaInativo(item) {
  if (!item?.data_fim) return false;

  const agora = new Date();
  const fim = new Date(item.data_fim);

  if (Number.isNaN(fim.getTime())) return false;

  fim.setHours(23, 59, 59, 999);

  return agora > fim;
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textoComQuebras(texto) {
  return escaparHtml(texto).replace(/\n/g, "<br>");
}

async function carregarConfigContrato() {
  try {
    const { data, error } = await supabaseClient
      .from("config_contrato")
      .select("*")
      .eq("id", "duna")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      dadosDunaContrato = {
        empresa: data.empresa || "DUNA AUDIOVISUAL",
        cnpj: data.cnpj || "",
        telefone: data.telefone || "",
        email: data.email || "",
        endereco: data.endereco || "",
        responsavel: data.responsavel || "",
        assinatura_url: data.assinatura_url || "/assinatura.png",
        titulo_contrato: data.titulo_contrato || "Contrato de Prestação de Serviços de Publicidade em Telas Digitais",
        subtitulo_contrato: data.subtitulo_contrato || "Contrato de prestação de serviços de publicidade em telas digitais."
      };
    }
  } catch (error) {
    console.error("Erro ao carregar configuração do contrato:", error);
  }
}

async function carregarClausulasContrato() {
  try {
    const { data, error } = await supabaseClient
      .from("contrato_clausulas")
      .select("*")
      .eq("contrato_id", "duna")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (error) {
      throw error;
    }

    clausulasContrato = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro ao carregar cláusulas do contrato:", error);
    clausulasContrato = [];
  }
}

async function carregarPontos() {
  try {
    const { data, error } = await supabaseClient
      .from("pontos")
      .select("*");

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
  } catch (error) {
    console.error("Erro real ao carregar pontos:", error);
    throw error;
  }
}

function obterPontosMarcados() {
  return Array.from(document.querySelectorAll('input[name="pontos"]:checked')).map((item) => item.value);
}

function obterCodigosDestinoSelecionados() {
  return obterPontosMarcados()
    .map((codigoSelecionado) => {
      const ponto = pontosData[codigoSelecionado];

      return String(
        ponto?.codigo_ponto ||
        ponto?.codigo ||
        ponto?.codigo_visual ||
        codigoSelecionado ||
        ""
      ).trim();
    })
    .filter(Boolean);
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

function obterCidadeDoPonto(ponto) {
  return String(ponto?.cidade || "").trim();
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

function obterPontosContratoLista() {
  const pontosSelecionados = obterPontosMarcados();

  return pontosSelecionados.map((codigo) => {
    const ponto = pontosData[codigo];
    const nome = obterNomeDoPonto(ponto, codigo);
    const cidade = obterCidadeDoPonto(ponto);

    return {
      codigo,
      nome,
      cidade
    };
  });
}

function obterPontosContratoTexto() {
  const pontos = obterPontosContratoLista();

  if (!pontos.length) {
    return "Nenhum ponto selecionado";
  }

  return pontos
    .map((ponto) => {
      if (ponto.cidade) {
        return `${ponto.nome} - ${ponto.cidade}`;
      }

      return ponto.nome;
    })
    .join(", ");
}

async function atualizarResumo() {
  if (!resumoCliente) return;

  if (!codigoClienteAtual) {
    resumoCliente.innerHTML = `<div><strong>PONTOS:</strong> nenhum</div>`;
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("playlists")
      .select("codigo, codigo_cliente, data_fim, ordem")
      .eq("codigo_cliente", codigoClienteAtual)
      .order("ordem", { ascending: false });

    if (error) {
      throw error;
    }

    const pontosAtivos = [...new Set(
      (data || [])
        .filter((item) => !itemEstaInativo(item))
        .map((item) => String(item.codigo || "").trim())
        .filter(Boolean)
    )];

    resumoCliente.innerHTML = `<div><strong>PONTOS:</strong> ${pontosAtivos.join(", ") || "nenhum"}</div>`;
  } catch (error) {
    console.error(error);
    resumoCliente.innerHTML = `<div><strong>PONTOS:</strong> nenhum</div>`;
  }
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
  const ponto = pontosData[codigo] || {};
  const cidade = String(ponto.cidade || "").trim() || "Cidade não definida";

  return `
    <label
      style="
        display:flex;
        align-items:flex-start;
        gap:10px;
        min-height:70px;
        padding:14px 16px;
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
          margin-top:4px;
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
        line-height:1.2;
      ">
        <span
          title="${escaparHtml(nome)}"
          style="
            color:#ffffff;
            font-size:0.92rem;
            font-weight:700;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
            margin-bottom:6px;
          "
        >${escaparHtml(nome)}</span>

        <span
          title="${escaparHtml(cidade)}"
          style="
            color:rgba(255,255,255,0.72);
            font-size:0.74rem;
            font-weight:600;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          "
        >${escaparHtml(cidade)}</span>
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
          max-height:300px;
          overflow-y:auto;
          overflow-x:hidden;
          padding:14px;
          border:1px solid ${tema.areaBorda};
          border-radius:14px;
          background:${tema.areaFundo};
          scrollbar-width:none !important;
          -ms-overflow-style:none !important;
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
      scrollbar-color: transparent transparent !important;
    }

    .grupo-pontos-scroll-selecionado::-webkit-scrollbar,
    .grupo-pontos-scroll-disponivel::-webkit-scrollbar,
    .grupo-pontos-scroll-inativo::-webkit-scrollbar {
      width: 0px !important;
      height: 0px !important;
      display: none !important;
      background: transparent !important;
    }

    .grupo-pontos-scroll-selecionado::-webkit-scrollbar-thumb,
    .grupo-pontos-scroll-disponivel::-webkit-scrollbar-thumb,
    .grupo-pontos-scroll-inativo::-webkit-scrollbar-thumb,
    .grupo-pontos-scroll-selecionado::-webkit-scrollbar-track,
    .grupo-pontos-scroll-disponivel::-webkit-scrollbar-track,
    .grupo-pontos-scroll-inativo::-webkit-scrollbar-track,
    .grupo-pontos-scroll-selecionado::-webkit-scrollbar-corner,
    .grupo-pontos-scroll-disponivel::-webkit-scrollbar-corner,
    .grupo-pontos-scroll-inativo::-webkit-scrollbar-corner {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }

    @media (max-width: 760px) {
      .grupo-pontos-scroll-selecionado,
      .grupo-pontos-scroll-disponivel,
      .grupo-pontos-scroll-inativo {
        grid-template-columns:1fr !important;
      }
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
    mostrarMensagem("Preencha todos os campos obrigatórios.", "#ff6b6b");
    return false;
  }

  return true;
}

function formatarDataHistorico(valor) {
  if (!valor) return "-";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);

  return data.toLocaleString("pt-BR");
}

function obterTituloArquivo(item) {
  if (item.storage_path) {
    const partes = String(item.storage_path).split("/");
    return partes[partes.length - 1] || "Arquivo";
  }

  if (item.video_url) {
    if (item.tipo === "url") return "Link externo";
    return "Arquivo enviado";
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

  historicoArquivos.innerHTML = "";

  if (!Array.isArray(itens) || !itens.length) {
    historicoArquivos.innerHTML = `
      <div class="historico-vazio">Nenhum arquivo enviado para esta pasta ainda.</div>
    `;
    return;
  }

  const grupos = agruparHistoricoArquivos(itens);

  historicoArquivos.innerHTML = grupos.map((grupo) => {
    const inicio = formatarDataHistorico(grupo.data_inicio);
    const fim = grupo.data_fim ? formatarDataHistorico(grupo.data_fim) : "-";
    const pontosTexto = grupo.pontos.length ? grupo.pontos.join(", ") : "-";
    const idsEncoded = encodeURIComponent(JSON.stringify(grupo.ids));

    return `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        padding:12px;
        border:1px solid #2a3342;
        border-radius:10px;
        margin-bottom:10px;
        background:#0f141d;
      ">
        <div style="flex:1; min-width:0;">
          <div style="
            font-weight:700;
            margin-bottom:6px;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">
            ${escaparHtml(grupo.titulo)}
          </div>

          <div style="font-size:0.75rem; opacity:0.82; line-height:1.6;">
            <div><strong>Pontos:</strong> ${escaparHtml(pontosTexto)}</div>
            <div><strong>Tipo:</strong> ${escaparHtml(grupo.tipo)}</div>
            <div><strong>Início:</strong> ${escaparHtml(inicio)}</div>
            <div><strong>Fim:</strong> ${escaparHtml(fim)}</div>
          </div>
        </div>

        <div style="
          display:flex;
          flex-direction:column;
          gap:8px;
          flex-shrink:0;
          min-width:110px;
        ">
          <a
            href="${escaparHtml(grupo.video_url || "#")}"
            download
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
              cursor:pointer;
            "
          >Baixar</a>

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
          >Deletar</button>
        </div>
      </div>
    `;
  }).join("");

  ativarBotoesDeletarHistorico();
}

function extrairCaminhoStorage(storagePath) {
  return String(storagePath || "").trim();
}

async function deletarItemHistorico(ids, storagePath) {
  const listaIds = Array.isArray(ids) ? ids.filter(Boolean) : [];

  if (!listaIds.length) return;

  const confirmar = window.confirm("Deseja deletar este arquivo de todos os pontos?");
  if (!confirmar) return;

  try {
    if (storagePath) {
      const caminho = extrairCaminhoStorage(storagePath);

      if (caminho) {
        const { error: storageError } = await supabaseClient.storage
          .from(BUCKET)
          .remove([caminho]);

        if (storageError) {
          console.error("Erro ao deletar do storage:", storageError);
        }
      }
    }

    const { error: deleteError } = await supabaseClient
      .from("playlists")
      .delete()
      .in("id", listaIds);

    if (deleteError) {
      throw deleteError;
    }

    await carregarHistoricoArquivos(obterCodigosDestinoSelecionados());
    await sincronizarStatusCliente();
    await atualizarResumo();

    mostrarMensagem("Arquivo deletado de todos os pontos.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao deletar arquivo.", "#ff6b6b");
  }
}

function ativarBotoesDeletarHistorico() {
  document.querySelectorAll(".btn-deletar-historico").forEach((botao) => {
    botao.onclick = async () => {
      const idsRaw = botao.dataset.ids || "[]";
      const storagePath = botao.dataset.storagePath || "";

      let ids = [];

      try {
        ids = JSON.parse(decodeURIComponent(idsRaw));
      } catch (error) {
        console.error("Erro ao ler ids do histórico:", error);
      }

      await deletarItemHistorico(ids, storagePath);
    };
  });
}

async function carregarHistoricoArquivos(codigosDestino = []) {
  if (!Array.isArray(codigosDestino) || !codigosDestino.length) {
    renderizarHistoricoArquivos([]);
    return [];
  }

  try {
    const { data, error } = await supabaseClient
      .from("playlists")
      .select("*")
      .eq("codigo_cliente", codigoClienteAtual)
      .in("codigo", codigosDestino)
      .order("ordem", { ascending: false });

    if (error) {
      throw error;
    }

    const itens = data || [];
    renderizarHistoricoArquivos(itens);
    return itens;
  } catch (error) {
    console.error(error);

    if (historicoArquivos) {
      historicoArquivos.innerHTML = `
        <div class="historico-vazio">Erro ao carregar histórico de arquivo.</div>
      `;
    }

    return [];
  }
}

async function calcularStatusClienteRealPorCodigoCliente() {
  if (!codigoClienteAtual) {
    return "Não ativo";
  }

  try {
    const { data, error } = await supabaseClient
      .from("playlists")
      .select("*")
      .eq("codigo_cliente", codigoClienteAtual)
      .order("ordem", { ascending: false });

    if (error) {
      throw error;
    }

    const ativos = (data || []).filter((item) => !itemEstaInativo(item));

    return ativos.length > 0 ? "Ativo" : "Não ativo";
  } catch (error) {
    console.error(error);
    return "Não ativo";
  }
}

async function sincronizarStatusCliente() {
  const statusReal = await calcularStatusClienteRealPorCodigoCliente();
  atualizarStatusClienteVisual(statusReal);

  if (codigoClienteAtual) {
    const { error } = await supabaseClient
      .from("clientes_app")
      .update({ status: statusReal })
      .eq("codigo", codigoClienteAtual);

    if (error) {
      console.error(error);
    }
  }

  return statusReal;
}

async function salvarCliente() {
  if (!validarCamposCliente()) {
    ativarBotaoSalvar();
    return false;
  }

  const pontosSelecionados = obterPontosMarcados();
  const statusRealAntesDeSalvar = await calcularStatusClienteRealPorCodigoCliente();
  const valorContratoNumero = extrairNumeroMoeda(inputValorContratado?.value);

  const payload = {
    codigo: codigoClienteAtual,
    nome_completo: inputNome.value.trim(),
    telefone: inputTelefone.value.trim(),
    email: inputEmail.value.trim(),
    cpf_cnpj: inputCpfCnpj.value.trim(),
    status: statusRealAntesDeSalvar,
    vencimento_exibicao: inputVencimento.value || null,
    valor_contratado: valorContratoNumero,
    data_postagem: inputDataPostagem.value || null
  };

  botaoSalvar.disabled = true;
  botaoSalvar.style.opacity = "0.7";
  botaoSalvar.style.cursor = "wait";

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

    if (pontosSelecionados.length) {
      const vinculos = pontosSelecionados.map((pontoCodigo) => ({
        cliente_codigo: codigoClienteAtual,
        ponto_codigo: pontoCodigo
      }));

      const { error: errorInsert } = await supabaseClient
        .from("cliente_pontos")
        .insert(vinculos);

      if (errorInsert) throw errorInsert;
    }

    await carregarHistoricoArquivos(obterCodigosDestinoSelecionados());
    await sincronizarStatusCliente();
    await atualizarResumo();

    if (inputValorContratado) {
      inputValorContratado.value = formatarMoedaBR(valorContratoNumero);
    }

    gerarContratoCliente(false);

    mostrarMensagem("Cliente salvo com sucesso.", "#7CFC9A");
    desativarBotaoSalvar();
    return true;
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao salvar cliente.", "#ff6b6b");
    ativarBotaoSalvar();
    return false;
  } finally {
    botaoSalvar.style.cursor = botaoSalvar.disabled ? "not-allowed" : "pointer";
  }
}

async function uploadArquivoCliente() {
  const file = arquivoInput.files[0];

  if (!validarCamposCliente()) {
    ativarBotaoSalvar();
    return;
  }

  if (!file) {
    mostrarStatusUpload("Selecione um arquivo", "#ff6b6b");
    return;
  }

  const codigosDestino = obterCodigosDestinoSelecionados();

  if (!codigosDestino.length) {
    mostrarStatusUpload("Selecione ao menos um ponto", "#ff6b6b");
    return;
  }

  mostrarStatusUpload("Enviando...", "#9fd2ff");
  btnUploadCliente.disabled = true;
  btnUploadCliente.style.opacity = "0.7";
  btnUploadCliente.style.cursor = "wait";

  try {
    const clienteSalvo = await salvarCliente();

    if (!clienteSalvo) {
      throw new Error("Falha ao salvar cliente antes do upload.");
    }

    const dataFim = inputVencimento.value || null;
    const agoraIso = new Date().toISOString();
    const baseOrdem = Date.now();

    if (file.name.toLowerCase().endsWith(".txt")) {
      const texto = await file.text();
      const url = texto.trim();

      if (!url) {
        throw new Error("O TXT está vazio.");
      }

      const registros = codigosDestino.map((codigoReal, index) => ({
        codigo: codigoReal,
        codigo_cliente: codigoClienteAtual,
        nome: inputNome.value.trim(),
        video_url: url,
        tipo: "url",
        data_inicio: agoraIso,
        data_fim: dataFim,
        storage_path: null,
        ordem: baseOrdem + index
      }));

      const { error: insertError } = await supabaseClient
        .from("playlists")
        .insert(registros);

      if (insertError) throw insertError;
    } else {
      const nomeLimpo = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();

      const path = `clientes/${codigoClienteAtual}/${Date.now()}-${nomeLimpo}`;

      const { error: uploadError } = await supabaseClient.storage
        .from(BUCKET)
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: publicData } = supabaseClient.storage
        .from(BUCKET)
        .getPublicUrl(path);

      const nomeArquivo = file.name.toLowerCase();
      const tipoFinal =
        nomeArquivo.endsWith(".jpg") ||
        nomeArquivo.endsWith(".jpeg") ||
        nomeArquivo.endsWith(".png") ||
        nomeArquivo.endsWith(".webp")
          ? "imagem"
          : "video";

      const registros = codigosDestino.map((codigoReal, index) => ({
        codigo: codigoReal,
        codigo_cliente: codigoClienteAtual,
        nome: inputNome.value.trim(),
        video_url: publicData.publicUrl,
        tipo: tipoFinal,
        data_inicio: agoraIso,
        data_fim: dataFim,
        storage_path: path,
        ordem: baseOrdem + index
      }));

      const { error: insertError } = await supabaseClient
        .from("playlists")
        .insert(registros);

      if (insertError) throw insertError;
    }

    await carregarHistoricoArquivos(codigosDestino);
    await sincronizarStatusCliente();
    await atualizarResumo();

    gerarContratoCliente(false);

    mostrarStatusUpload("Enviado com sucesso", "#7CFC9A");
    arquivoInput.value = "";
  } catch (error) {
    console.error(error);
    mostrarStatusUpload("Erro ao enviar", "#ff6b6b");
  } finally {
    btnUploadCliente.disabled = false;
    btnUploadCliente.style.opacity = "1";
    btnUploadCliente.style.cursor = "pointer";
  }
}

function renderizarPontosSelecionaveis(selecionados = []) {
  if (!listaPontos) return;

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
    .sort((a, b) => {
      const pontoA = pontosData[a];
      const pontoB = pontosData[b];
      const nomeA = obterNomeDoPonto(pontoA, a);
      const nomeB = obterNomeDoPonto(pontoB, b);
      return nomeA.localeCompare(nomeB, "pt-BR", { numeric: true });
    })
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
    status: statusCliente?.value || statusCliente?.textContent || "Não ativo",
    emissao: new Date().toLocaleDateString("pt-BR")
  };
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

function montarClausulasContratoHtml(dados) {
  if (!clausulasContrato.length) {
    return `
      <p><strong>CLÁUSULA 1 - OBJETO DO CONTRATO.</strong> O presente contrato tem por objeto a prestação de serviços de veiculação de publicidade em telas digitais, instaladas em pontos estratégicos operados pela CONTRATADA.</p>
    `;
  }

  return clausulasContrato.map((clausula) => {
    const ordem = clausula.ordem || "";
    const titulo = clausula.titulo || "";
    const textoPreenchido = preencherMarcadoresContrato(clausula.texto, dados);

    return `
      <p>
        <strong>CLÁUSULA ${escaparHtml(ordem)} - ${escaparHtml(titulo)}.</strong>
        ${textoComQuebras(textoPreenchido)}
      </p>
    `;
  }).join("");
}

function renderizarHistoricoContrato(dados) {
  if (!historicoContratos) return;

  historicoContratos.innerHTML = `
    <div class="historico-item">
      <div class="historico-item-info">
        <div class="historico-item-titulo">Contrato gerado</div>
        <div class="historico-item-linha"><strong>Cliente:</strong> ${escaparHtml(dados.nome)}</div>
        <div class="historico-item-linha"><strong>Valor:</strong> ${escaparHtml(dados.valor)}</div>
        <div class="historico-item-linha"><strong>Período:</strong> ${escaparHtml(dados.dataInicio)} até ${escaparHtml(dados.dataVencimento)}</div>
        <div class="historico-item-linha"><strong>Pontos:</strong> ${escaparHtml(dados.pontos)}</div>
      </div>
    </div>
  `;
}

function montarContratoProfissional(dados) {
  return `
    <div class="contrato-pdf-folha">
      <div class="contrato-pdf-topo">
        <div class="contrato-pdf-marca">
          <h1>${escaparHtml(dadosDunaContrato.empresa)}</h1>
          <p>${escaparHtml(dadosDunaContrato.subtitulo_contrato || "Contrato de prestação de serviços de publicidade em telas digitais.")}</p>
        </div>

        <div class="contrato-pdf-codigo">
          <strong>Código do cliente:</strong> ${escaparHtml(dados.codigo)}<br>
          <strong>Emissão:</strong> ${escaparHtml(dados.emissao)}
        </div>
      </div>

      <h1 class="contrato-pdf-titulo">
        ${escaparHtml(dadosDunaContrato.titulo_contrato || "Contrato de Prestação de Serviços de Publicidade em Telas Digitais")}
      </h1>

      <div class="contrato-pdf-secao">
        <h2>Dados da Contratada</h2>

        <div class="contrato-pdf-grid">
          <div class="contrato-pdf-campo">
            <strong>Empresa</strong>
            <span>${escaparHtml(dadosDunaContrato.empresa || "-")}</span>
          </div>

          <div class="contrato-pdf-campo">
            <strong>CNPJ</strong>
            <span>${escaparHtml(dadosDunaContrato.cnpj || "-")}</span>
          </div>

          <div class="contrato-pdf-campo">
            <strong>Telefone</strong>
            <span>${escaparHtml(dadosDunaContrato.telefone || "-")}</span>
          </div>

          <div class="contrato-pdf-campo">
            <strong>Email</strong>
            <span>${escaparHtml(dadosDunaContrato.email || "-")}</span>
          </div>

          <div class="contrato-pdf-campo">
            <strong>Responsável</strong>
            <span>${escaparHtml(dadosDunaContrato.responsavel || "-")}</span>
          </div>

          <div class="contrato-pdf-campo">
            <strong>Endereço</strong>
            <span>${escaparHtml(dadosDunaContrato.endereco || "-")}</span>
          </div>
        </div>
      </div>

      <div class="contrato-pdf-secao">
        <h2>Dados do Contratante</h2>

        <div class="contrato-pdf-grid">
          <div class="contrato-pdf-campo">
            <strong>Nome</strong>
            <span>${escaparHtml(dados.nome)}</span>
          </div>

          <div class="contrato-pdf-campo">
            <strong>CPF / CNPJ</strong>
            <span>${escaparHtml(dados.cpfCnpj)}</span>
          </div>

          <div class="contrato-pdf-campo">
            <strong>Telefone</strong>
            <span>${escaparHtml(dados.telefone)}</span>
          </div>

          <div class="contrato-pdf-campo">
            <strong>Email</strong>
            <span>${escaparHtml(dados.email)}</span>
          </div>

          <div class="contrato-pdf-campo">
            <strong>Valor contratado</strong>
            <span>${escaparHtml(dados.valor)}</span>
          </div>

          <div class="contrato-pdf-campo">
            <strong>Período</strong>
            <span>${escaparHtml(dados.dataInicio)} até ${escaparHtml(dados.dataVencimento)}</span>
          </div>

          <div class="contrato-pdf-campo full">
            <strong>Pontos contratados</strong>
            <span>${escaparHtml(dados.pontos)}</span>
          </div>
        </div>
      </div>

      <div class="contrato-pdf-secao contrato-pdf-texto">
        <h2>Termos do Contrato</h2>
        ${montarClausulasContratoHtml(dados)}
      </div>

      <div class="contrato-pdf-assinaturas">
        <div class="contrato-pdf-assinatura">
          <div class="contrato-pdf-linha">CONTRATANTE</div>
        </div>

        <div class="contrato-pdf-assinatura">
          <img src="${escaparHtml(dadosDunaContrato.assinatura_url || "/assinatura.png")}" alt="Assinatura ${escaparHtml(dadosDunaContrato.empresa || "DUNA AUDIOVISUAL")}">
          <div class="contrato-pdf-linha">${escaparHtml(dadosDunaContrato.empresa || "DUNA AUDIOVISUAL")}</div>
        </div>
      </div>

      <div class="contrato-pdf-rodape">
        Documento gerado automaticamente pela ${escaparHtml(dadosDunaContrato.empresa || "DUNA AUDIOVISUAL")}.
      </div>
    </div>
  `;
}

function gerarContratoCliente(exibirMensagem = false) {
  if (!contratoPreview || !contratoStatus) return;

  const dados = obterDadosContratoCliente();

  contratoPreview.innerHTML = `
    <div class="contrato-documento">
      <h3>Contrato pronto para download</h3>

      <p><strong>Cliente:</strong></p>
      <p>${escaparHtml(dados.nome)}</p>

      <p><strong>Valor:</strong></p>
      <p>${escaparHtml(dados.valor)}</p>

      <p><strong>Período:</strong></p>
      <p>${escaparHtml(dados.dataInicio)} até ${escaparHtml(dados.dataVencimento)}</p>

      <p><strong>Pontos:</strong></p>
      <p>${escaparHtml(dados.pontos)}</p>
    </div>
  `;

  contratoStatus.textContent = "Gerado";
  contratoStatus.classList.add("gerado");

  renderizarHistoricoContrato(dados);

  if (exibirMensagem) {
    mostrarMensagem("Contrato atualizado com sucesso.", "#7CFC9A");
  }
}

function aguardarImagensContrato(container) {
  const imagens = Array.from(container.querySelectorAll("img"));

  if (!imagens.length) {
    return Promise.resolve();
  }

  return Promise.all(
    imagens.map((img) => {
      if (img.complete) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );
}

async function baixarContratoPdf() {
  if (!contratoPdfArea) return;

  if (!window.jspdf || !window.html2canvas) {
    mostrarMensagem("Bibliotecas de PDF não carregaram.", "#ff6b6b");
    return;
  }

  try {
    mostrarMensagem("Gerando PDF organizado...", "#9fd2ff");

    const dados = obterDadosContratoCliente();
    contratoPdfArea.innerHTML = montarContratoProfissional(dados);

    const contratoDocumento = contratoPdfArea.querySelector(".contrato-pdf-folha");

    if (!contratoDocumento) {
      mostrarMensagem("Contrato não encontrado para gerar PDF.", "#ff6b6b");
      return;
    }

    await aguardarImagensContrato(contratoDocumento);
    await new Promise((resolve) => setTimeout(resolve, 120));

    const { jsPDF } = window.jspdf;

    const canvas = await window.html2canvas(contratoDocumento, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let position = 0;
    let heightLeft = imgHeight;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const codigo = inputCodigo.value || codigoClienteAtual || "cliente";
    const nome = (inputNome.value || "contrato")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    pdf.save(`contrato-${codigo}-${nome}.pdf`);

    contratoPdfArea.innerHTML = "";
    mostrarMensagem("PDF baixado com sucesso.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao gerar PDF.", "#ff6b6b");
  }
}

if (listaPontos) {
  listaPontos.addEventListener("change", () => {
    renderizarPontosSelecionaveis(obterPontosMarcados());
    ativarBotaoSalvar();
    gerarContratoCliente(false);
  });
}

if (inputTelefone) {
  inputTelefone.addEventListener("input", (event) => {
    event.target.value = formatarTelefone(event.target.value);
    limparErro(inputTelefone);
    ativarBotaoSalvar();
    gerarContratoCliente(false);
  });
}

if (inputNome) {
  inputNome.addEventListener("input", () => {
    limparErro(inputNome);
    ativarBotaoSalvar();
    gerarContratoCliente(false);
  });
}

if (inputEmail) {
  inputEmail.addEventListener("input", () => {
    limparErro(inputEmail);
    ativarBotaoSalvar();
    gerarContratoCliente(false);
  });
}

if (inputCpfCnpj) {
  inputCpfCnpj.addEventListener("input", (event) => {
    event.target.value = formatarCpfCnpj(event.target.value);
    limparErro(inputCpfCnpj);
    ativarBotaoSalvar();
    gerarContratoCliente(false);
  });
}

if (inputVencimento) {
  inputVencimento.addEventListener("input", () => {
    limparErro(inputVencimento);
    ativarBotaoSalvar();
    gerarContratoCliente(false);
  });

  inputVencimento.addEventListener("change", () => {
    limparErro(inputVencimento);
    ativarBotaoSalvar();
    gerarContratoCliente(false);
  });
}

if (inputValorContratado) {
  inputValorContratado.addEventListener("paste", (event) => {
    event.preventDefault();

    const textoColado = event.clipboardData.getData("text");
    event.target.value = formatarMoedaBR(textoColado);

    ativarBotaoSalvar();
    gerarContratoCliente(false);
  });

  inputValorContratado.addEventListener("blur", (event) => {
    event.target.value = formatarMoedaBR(event.target.value);

    ativarBotaoSalvar();
    gerarContratoCliente(false);
  });

  inputValorContratado.addEventListener("input", () => {
    ativarBotaoSalvar();
  });

  if (!inputValorContratado.value) {
    inputValorContratado.value = formatarMoedaBR(0);
  }
}

if (inputDataPostagem) {
  inputDataPostagem.addEventListener("change", () => {
    ativarBotaoSalvar();
    gerarContratoCliente(false);
  });
}

async function carregarCliente() {
  const { data, error } = await supabaseClient
    .from("clientes_app")
    .select("*")
    .eq("codigo", codigoClienteAtual)
    .maybeSingle();

  if (error) {
    throw error;
  }

  inputCodigo.value = codigoClienteAtual;

  if (!data) {
    inputNome.value = "";
    inputTelefone.value = "";
    inputEmail.value = "";
    inputCpfCnpj.value = "";
    inputVencimento.value = "";

    if (inputValorContratado) {
      inputValorContratado.value = formatarMoedaBR(0);
    }

    if (inputDataPostagem) {
      inputDataPostagem.value = new Date().toISOString().split("T")[0];
    }

    atualizarStatusClienteVisual("Não ativo");
    renderizarPontosSelecionaveis([]);
    renderizarHistoricoArquivos([]);
    gerarContratoCliente(false);
    desativarBotaoSalvar();
    return;
  }

  inputNome.value = data.nome_completo || "";
  inputTelefone.value = formatarTelefone(data.telefone || "");
  inputEmail.value = data.email || "";
  inputCpfCnpj.value = formatarCpfCnpj(data.cpf_cnpj || "");
  inputVencimento.value = data.vencimento_exibicao || "";

  if (inputValorContratado) {
    inputValorContratado.value = formatarMoedaBR(data.valor_contratado ?? 0);
  }

  if (inputDataPostagem) {
    inputDataPostagem.value = data.data_postagem || new Date().toISOString().split("T")[0];
  }

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
  await carregarHistoricoArquivos(obterCodigosDestinoSelecionados());
  await sincronizarStatusCliente();
  await atualizarResumo();
  gerarContratoCliente(false);
  desativarBotaoSalvar();
}

if (botaoSalvar) {
  botaoSalvar.addEventListener("click", salvarCliente);
}

if (botaoVoltar) {
  botaoVoltar.addEventListener("click", () => {
    window.location.href = "/central-clientes.html";
  });
}

if (btnUploadCliente) {
  btnUploadCliente.addEventListener("click", uploadArquivoCliente);
}

if (btnBaixarContratoPdf) {
  btnBaixarContratoPdf.addEventListener("click", baixarContratoPdf);
}

async function iniciar() {
  try {
    injetarEstilosScroll();
    codigoClienteAtual = obterCodigoDaUrl();

    if (!codigoClienteAtual) {
      mostrarMensagem("Código do cliente não encontrado na URL.", "#ff6b6b");
      return;
    }

    await carregarPontos();
    await carregarConfigContrato();
    await carregarClausulasContrato();
    await carregarCliente();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao carregar pontos.", "#ff6b6b");
  }
}

iniciar();
