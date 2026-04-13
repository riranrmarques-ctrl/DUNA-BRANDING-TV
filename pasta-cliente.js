const liberado = sessionStorage.getItem("painelLiberado");

if (liberado !== "1") {
  window.location.href = "/painel";
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

let pontosData = {};
let codigoClienteAtual = "";
let houveAlteracao = true;

function mostrarMensagem(texto, cor = "#9fd2ff") {
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

function mostrarStatusUpload(texto, cor = "#9fd2ff") {
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
  const numeros = String(valor || "").replace(/\D/g, "");
  const numero = Number(numeros || 0) / 100;
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function extrairNumeroMoeda(valor) {
  const limpo = String(valor || "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
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

function atualizarStatusClienteVisual(statusTexto) {
  const texto = String(statusTexto || "").trim().toLowerCase();
  const ativo = texto === "ativo";

  statusCliente.textContent = ativo ? "Ativo" : "Não ativo";
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

function obterCodigoExibicaoDoPonto(ponto, codigo) {
  return String(
    ponto?.codigo_ponto ||
    ponto?.codigo ||
    ponto?.codigo_visual ||
    codigo ||
    ""
  ).trim();
}

async function atualizarResumo() {
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
    if (!String(campo.value || "").trim()) {
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

function renderizarHistoricoArquivos(itens = []) {
  historicoArquivos.innerHTML = "";

  if (!Array.isArray(itens) || !itens.length) {
    historicoArquivos.innerHTML = `
      <div class="historico-vazio">Nenhum arquivo enviado para esta pasta ainda.</div>
    `;
    return;
  }

  historicoArquivos.innerHTML = itens.map((item) => {
    const titulo = obterTituloArquivo(item);
    const pontoCodigo = item.codigo || "-";
    const tipo = item.tipo || "-";
    const inicio = formatarDataHistorico(item.data_inicio);
    const fim = item.data_fim ? formatarDataHistorico(item.data_fim) : "-";
    const link = item.video_url || "#";

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
            ${escaparHtml(titulo)}
          </div>

          <div style="font-size:0.75rem; opacity:0.82; line-height:1.6;">
            <div><strong>Ponto:</strong> ${escaparHtml(pontoCodigo)}</div>
            <div><strong>Tipo:</strong> ${escaparHtml(tipo)}</div>
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
            href="${escaparHtml(link)}"
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
            data-id="${escaparHtml(item.id)}"
            data-storage-path="${escaparHtml(item.storage_path || "")}"
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

async function deletarItemHistorico(id, storagePath) {
  const confirmar = window.confirm("Deseja deletar este arquivo do histórico?");
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
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    await carregarHistoricoArquivos(obterCodigosDestinoSelecionados());
    await sincronizarStatusCliente();
    await atualizarResumo();

    mostrarMensagem("Arquivo deletado com sucesso.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao deletar arquivo.", "#ff6b6b");
  }
}

function ativarBotoesDeletarHistorico() {
  document.querySelectorAll(".btn-deletar-historico").forEach((botao) => {
    botao.onclick = async () => {
      const id = botao.dataset.id;
      const storagePath = botao.dataset.storagePath || "";

      if (!id) return;

      await deletarItemHistorico(id, storagePath);
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
    historicoArquivos.innerHTML = `
      <div class="historico-vazio">Erro ao carregar histórico de arquivo.</div>
    `;
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

async function obterPontosSelecionadosDoCliente() {
  try {
    const { data: vinculos, error } = await supabaseClient
      .from("cliente_pontos")
      .select("ponto_codigo")
      .eq("cliente_codigo", codigoClienteAtual);

    if (error) {
      throw error;
    }

    return Array.isArray(vinculos)
      ? vinculos.map((item) => item.ponto_codigo).filter(Boolean)
      : [];
  } catch (error) {
    console.error(error);
    return [];
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

  const payload = {
    codigo: codigoClienteAtual,
    nome_completo: inputNome.value.trim(),
    telefone: inputTelefone.value.trim(),
    email: inputEmail.value.trim(),
    cpf_cnpj: inputCpfCnpj.value.trim(),
    status: statusRealAntesDeSalvar,
    vencimento_exibicao: inputVencimento.value || null,
    valor_contratado: extrairNumeroMoeda(inputValorContratado.value),
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

inputTelefone.addEventListener("input", (e) => {
  e.target.value = formatarTelefone(e.target.value);
  limparErro(inputTelefone);
  ativarBotaoSalvar();
});

inputNome.addEventListener("input", () => {
  limparErro(inputNome);
  ativarBotaoSalvar();
});

inputEmail.addEventListener("input", () => {
  limparErro(inputEmail);
  ativarBotaoSalvar();
});

inputCpfCnpj.addEventListener("input", (e) => {
  e.target.value = formatarCpfCnpj(e.target.value);
  limparErro(inputCpfCnpj);
  ativarBotaoSalvar();
});

inputVencimento.addEventListener("input", () => {
  limparErro(inputVencimento);
  ativarBotaoSalvar();
});

inputVencimento.addEventListener("change", () => {
  limparErro(inputVencimento);
  ativarBotaoSalvar();
});

if (inputValorContratado) {
  inputValorContratado.addEventListener("input", (e) => {
    e.target.value = formatarMoedaBR(e.target.value);
    ativarBotaoSalvar();
  });

  if (!inputValorContratado.value) {
    inputValorContratado.value = formatarMoedaBR("");
  }
}

if (inputDataPostagem) {
  inputDataPostagem.addEventListener("change", ativarBotaoSalvar);
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
    if (inputValorContratado) inputValorContratado.value = formatarMoedaBR("");
    if (inputDataPostagem) inputDataPostagem.value = new Date().toISOString().split("T")[0];
    atualizarStatusClienteVisual("Não ativo");
    renderizarPontosSelecionaveis([]);
    renderizarHistoricoArquivos([]);
    desativarBotaoSalvar();
    return;
  }

  inputNome.value = data.nome_completo || "";
  inputTelefone.value = formatarTelefone(data.telefone || "");
  inputEmail.value = data.email || "";
  inputCpfCnpj.value = formatarCpfCnpj(data.cpf_cnpj || "");
  inputVencimento.value = data.vencimento_exibicao || "";
  if (inputValorContratado) inputValorContratado.value = formatarMoedaBR(data.valor_contratado ?? "");
  if (inputDataPostagem) inputDataPostagem.value = data.data_postagem || new Date().toISOString().split("T")[0];

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
  desativarBotaoSalvar();
}

botaoSalvar.addEventListener("click", salvarCliente);
botaoVoltar.addEventListener("click", () => {
  window.location.href = "central-clientes.html";
});
btnUploadCliente.addEventListener("click", uploadArquivoCliente);

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
