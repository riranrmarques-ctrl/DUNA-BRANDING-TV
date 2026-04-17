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

let pontosData = {};
let codigoClienteAtual = "";

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
  const codigo = String(params.get("codigo") || "").trim().toUpperCase();
  console.log("Codigo recebido na URL:", codigo);
  return codigo;
}

function formatarTelefone(valor) {
  const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);
  if (!numeros) return "";
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
    return (0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  let numero;

  if (typeof valor === "number") {
    numero = valor;
  } else {
    const limpo = texto.replace(/\s/g, "").replace("R$", "").replace(/[^\d,.-]/g, "");
    numero = limpo.includes(",")
      ? Number(limpo.replace(/\./g, "").replace(",", "."))
      : Number(limpo);
  }

  if (!Number.isFinite(numero)) numero = 0;

  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function extrairNumeroMoeda(valor) {
  const texto = String(valor ?? "").trim();
  if (!texto) return 0;

  const limpo = texto.replace(/\s/g, "").replace("R$", "").replace(/[^\d,.-]/g, "");
  const numero = limpo.includes(",")
    ? Number(limpo.replace(/\./g, "").replace(",", "."))
    : Number(limpo);

  return Number.isFinite(numero) ? numero : 0;
}

function marcarErro(campo) {
  if (!campo) return;
  campo.style.border = "1px solid #ff6b6b";
}

function limparErro(campo) {
  if (!campo) return;
  campo.style.border = "1px solid #313847";
}

function atualizarStatusClienteVisual(statusTexto) {
  if (!statusCliente) return;
  const ativo = String(statusTexto || "").trim().toLowerCase() === "ativo";
  const valor = ativo ? "Ativo" : "Não ativo";
  statusCliente.textContent = valor;
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

function desativarBotaoSalvar() {
  if (!botaoSalvar) return;
  botaoSalvar.disabled = true;
  botaoSalvar.style.opacity = "0.5";
  botaoSalvar.style.cursor = "not-allowed";
}

function ativarBotaoSalvar() {
  if (!botaoSalvar) return;
  botaoSalvar.disabled = false;
  botaoSalvar.style.opacity = "1";
  botaoSalvar.style.cursor = "pointer";
}

async function carregarPontos() {
  const { data, error } = await supabaseClient.from("pontos").select("*");
  if (error) throw error;

  pontosData = {};

  (data || []).forEach((ponto) => {
    const chave = String(
      ponto.codigo_visual ||
      ponto.codigo_ponto ||
      ponto.codigo ||
      ponto.id_ponto ||
      ponto.id ||
      ""
    ).trim();

    if (!chave) return;
    pontosData[chave] = ponto;
  });
}

function obterNomeDoPonto(ponto, codigo) {
  return ponto?.nome || ponto?.nome_painel || ponto?.titulo || ponto?.ambiente || `Ponto ${codigo}`;
}

function obterCodigoRealDoPonto(codigoVisual) {
  const ponto = pontosData[codigoVisual];
  return String(
    ponto?.codigo_ponto ||
    ponto?.codigo_visual ||
    ponto?.codigo ||
    codigoVisual ||
    ""
  ).trim();
}

function obterPontosMarcados() {
  return Array.from(document.querySelectorAll('input[name="pontos"]:checked')).map((item) => item.value);
}

function obterCodigosDestinoSelecionados() {
  return obterPontosMarcados().map(obterCodigoRealDoPonto).filter(Boolean);
}

function renderizarPontosSelecionaveis(selecionados = []) {
  if (!listaPontos) return;

  const codigos = Object.keys(pontosData);

  if (!codigos.length) {
    listaPontos.innerHTML = `<div class="vazio">Nenhum ponto encontrado na tabela pontos.</div>`;
    return;
  }

  const selecionadosSet = new Set(
    selecionados.map((item) => String(item || "").trim())
  );

  const cardsSelecionados = [];
  const cardsDisponiveis = [];

  codigos
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
    .forEach((codigoVisual) => {
      const ponto = pontosData[codigoVisual];
      const nome = obterNomeDoPonto(ponto, codigoVisual);
      const codigoReal = obterCodigoRealDoPonto(codigoVisual);
      const checked = selecionadosSet.has(codigoVisual) || selecionadosSet.has(codigoReal);

      const card = `
        <label style="
          display:flex;
          align-items:flex-start;
          gap:12px;
          padding:14px;
          border-radius:12px;
          min-height:72px;
          cursor:pointer;
          border:1px solid ${checked ? "#8ce063" : "#6f8bff"};
          background:${checked ? "#76d34f" : "#4f6ff0"};
          color:#fff;
          overflow:hidden;
          box-shadow:0 6px 18px rgba(0,0,0,0.18);
        ">
          <input
            type="checkbox"
            name="pontos"
            value="${escaparHtml(codigoVisual)}"
            ${checked ? "checked" : ""}
            style="
              width:16px;
              height:16px;
              margin-top:4px;
              flex-shrink:0;
              accent-color:#ffffff;
              cursor:pointer;
            "
          >

          <div style="
            display:flex;
            flex-direction:column;
            min-width:0;
            flex:1;
            overflow:hidden;
          ">
            <span style="
              font-size:0.95rem;
              font-weight:700;
              line-height:1.2;
              white-space:nowrap;
              overflow:hidden;
              text-overflow:ellipsis;
            ">
              ${escaparHtml(codigoVisual)}
            </span>

            <span style="
              font-size:0.82rem;
              opacity:0.95;
              line-height:1.25;
              margin-top:4px;
              display:-webkit-box;
              -webkit-line-clamp:2;
              -webkit-box-orient:vertical;
              overflow:hidden;
              word-break:break-word;
            ">
              ${escaparHtml(nome)}
            </span>
          </div>
        </label>
      `;

      if (checked) {
        cardsSelecionados.push(card);
      } else {
        cardsDisponiveis.push(card);
      }
    });

  const montarGrupo = (titulo, cor, cards) => {
    if (!cards.length) return "";

    return `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="
          font-size:0.92rem;
          font-weight:700;
          color:${cor};
          text-transform:lowercase;
        ">
          ${titulo}
        </div>

        <div style="
          display:grid;
          grid-template-columns:repeat(2, minmax(0, 1fr));
          gap:12px;
        " class="grid-pontos-grupo">
          ${cards.join("")}
        </div>
      </div>
    `;
  };

  listaPontos.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px;">
      ${montarGrupo("selecionado", "#7CFC9A", cardsSelecionados)}
      ${montarGrupo("disponivel", "#6ea8ff", cardsDisponiveis)}
    </div>
  `;
}

async function atualizarResumo() {
  if (!resumoCliente) return;

  const { data, error } = await supabaseClient
    .from("playlists")
    .select("codigo, data_fim")
    .eq("codigo_cliente", codigoClienteAtual);

  if (error) {
    resumoCliente.innerHTML = `<div class="linha">Erro ao carregar resumo.</div>`;
    return;
  }

  const pontosAtivos = [...new Set(
    (data || [])
      .filter((item) => !itemEstaInativo(item))
      .map((item) => String(item.codigo || "").trim())
      .filter(Boolean)
  )];

  resumoCliente.innerHTML = `
    <div class="linha"><strong>Código:</strong> ${escaparHtml(codigoClienteAtual)}</div>
    <div class="linha"><strong>Pontos ativos:</strong> ${escaparHtml(pontosAtivos.join(", ") || "nenhum")}</div>
  `;
}

async function calcularStatusClienteRealPorCodigoCliente() {
  const { data, error } = await supabaseClient
    .from("playlists")
    .select("data_fim")
    .eq("codigo_cliente", codigoClienteAtual);

  if (error) return "Não ativo";

  const ativos = (data || []).filter((item) => !itemEstaInativo(item));
  return ativos.length ? "Ativo" : "Não ativo";
}

async function sincronizarStatusCliente() {
  const statusReal = await calcularStatusClienteRealPorCodigoCliente();
  atualizarStatusClienteVisual(statusReal);

  const { error } = await supabaseClient
    .from("clientes_app")
    .update({ status: statusReal })
    .eq("codigo", codigoClienteAtual);

  if (error) console.error(error);
}

function validarCamposCliente() {
  let valido = true;

  [inputNome, inputTelefone, inputEmail, inputCpfCnpj, inputVencimento].forEach((campo) => {
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

function renderizarHistoricoArquivos(itens = []) {
  if (!historicoArquivos) return;

  if (!itens.length) {
    historicoArquivos.innerHTML = `<div class="historico-vazio">Nenhum arquivo enviado para esta pasta ainda.</div>`;
    return;
  }

  historicoArquivos.innerHTML = itens.map((item) => {
    const titulo = item.storage_path
      ? item.storage_path.split("/").pop()
      : (item.video_url ? "Arquivo enviado" : "Arquivo");

    return `
      <div style="background:#10131a;border:1px solid #2a3040;border-radius:12px;padding:14px;">
        <div style="font-weight:bold;margin-bottom:8px;">${escaparHtml(titulo || "Arquivo")}</div>
        <div style="color:#c6cedd;font-size:0.9rem;line-height:1.5;"><strong>Ponto:</strong> ${escaparHtml(item.codigo || "-")}</div>
        <div style="color:#c6cedd;font-size:0.9rem;line-height:1.5;"><strong>Tipo:</strong> ${escaparHtml(item.tipo || "-")}</div>
      </div>
    `;
  }).join("");
}

async function carregarHistoricoArquivos(codigosDestino = []) {
  if (!codigosDestino.length) {
    renderizarHistoricoArquivos([]);
    return;
  }

  const { data, error } = await supabaseClient
    .from("playlists")
    .select("*")
    .eq("codigo_cliente", codigoClienteAtual)
    .in("codigo", codigosDestino)
    .order("ordem", { ascending: false });

  if (error) {
    console.error(error);
    renderizarHistoricoArquivos([]);
    return;
  }

  renderizarHistoricoArquivos(data || []);
}

function gerarContratoCliente() {
  if (!historicoContratos) return;

  historicoContratos.innerHTML = `
    <div class="historico-vazio">
      Área reservada para o histórico de contratos.
    </div>
  `;
}

async function carregarCliente() {
  const { data, error } = await supabaseClient
    .from("clientes_app")
    .select("*")
    .eq("codigo", codigoClienteAtual)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar cliente em clientes_app:", error);
    throw error;
  }

  if (inputCodigo) inputCodigo.value = codigoClienteAtual;

  if (!data) {
    if (inputNome) inputNome.value = "";
    if (inputTelefone) inputTelefone.value = "";
    if (inputEmail) inputEmail.value = "";
    if (inputCpfCnpj) inputCpfCnpj.value = "";
    if (inputVencimento) inputVencimento.value = "";
    if (inputValorContratado) inputValorContratado.value = formatarMoedaBR(0);
    if (inputDataPostagem) inputDataPostagem.value = new Date().toISOString().split("T")[0];

    atualizarStatusClienteVisual("Não ativo");
    renderizarPontosSelecionaveis([]);
    renderizarHistoricoArquivos([]);
    gerarContratoCliente();
    desativarBotaoSalvar();

    mostrarMensagem(`Cliente ${codigoClienteAtual} não encontrado na tabela clientes_app.`, "#ff6b6b");
    console.warn("Cliente nao encontrado:", codigoClienteAtual);
    return;
  }

  if (inputNome) inputNome.value = data.nome_completo || "";
  if (inputTelefone) inputTelefone.value = formatarTelefone(data.telefone || "");
  if (inputEmail) inputEmail.value = data.email || "";
  if (inputCpfCnpj) inputCpfCnpj.value = formatarCpfCnpj(data.cpf_cnpj || "");
  if (inputVencimento) inputVencimento.value = data.vencimento_exibicao || "";
  if (inputValorContratado) inputValorContratado.value = formatarMoedaBR(data.valor_contratado ?? 0);
  if (inputDataPostagem) inputDataPostagem.value = data.data_postagem || new Date().toISOString().split("T")[0];

  let selecionados = [];

  try {
    const { data: vinculos, error: erroVinculos } = await supabaseClient
      .from("cliente_pontos")
      .select("ponto_codigo")
      .eq("cliente_codigo", codigoClienteAtual);

    if (erroVinculos) throw erroVinculos;

    selecionados = Array.isArray(vinculos)
      ? vinculos.map((item) => String(item.ponto_codigo || "").trim()).filter(Boolean)
      : [];
  } catch (error) {
    console.error("Erro ao buscar vinculos em cliente_pontos:", error);
  }

  renderizarPontosSelecionaveis(selecionados);
  await carregarHistoricoArquivos(selecionados);
  await sincronizarStatusCliente();
  await atualizarResumo();
  gerarContratoCliente();
  desativarBotaoSalvar();

  mostrarMensagem(`Cliente ${codigoClienteAtual} carregado com sucesso.`, "#7CFC9A");
}

async function salvarCliente() {
  if (!validarCamposCliente()) return;

  const payload = {
    codigo: codigoClienteAtual,
    nome_completo: inputNome.value.trim(),
    telefone: inputTelefone.value.trim(),
    email: inputEmail.value.trim(),
    cpf_cnpj: inputCpfCnpj.value.trim(),
    vencimento_exibicao: inputVencimento.value || null,
    valor_contratado: extrairNumeroMoeda(inputValorContratado.value),
    data_postagem: inputDataPostagem.value || null,
    status: await calcularStatusClienteRealPorCodigoCliente()
  };

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

    const pontosSelecionados = obterPontosMarcados();

    if (pontosSelecionados.length) {
      const vinculos = pontosSelecionados.map((codigoVisual) => ({
        cliente_codigo: codigoClienteAtual,
        ponto_codigo: obterCodigoRealDoPonto(codigoVisual)
      }));

      const { error: errorInsert } = await supabaseClient.from("cliente_pontos").insert(vinculos);
      if (errorInsert) throw errorInsert;
    }

    await sincronizarStatusCliente();
    await atualizarResumo();
    mostrarMensagem("Cliente salvo com sucesso.", "#7CFC9A");
    desativarBotaoSalvar();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao salvar cliente.", "#ff6b6b");
  }
}

async function uploadArquivoCliente() {
  const file = arquivoInput?.files?.[0];

  if (!validarCamposCliente()) return;

  if (!file) {
    mostrarStatusUpload("Selecione um arquivo.", "#ff6b6b");
    return;
  }

  const codigosDestino = obterCodigosDestinoSelecionados();

  if (!codigosDestino.length) {
    mostrarStatusUpload("Selecione ao menos um ponto.", "#ff6b6b");
    return;
  }

  try {
    await salvarCliente();

    const dataFim = inputVencimento.value || null;
    const agoraIso = new Date().toISOString();
    const baseOrdem = Date.now();

    if (file.name.toLowerCase().endsWith(".txt")) {
      const texto = await file.text();
      const url = texto.trim();

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

      const { error } = await supabaseClient.from("playlists").insert(registros);
      if (error) throw error;
    } else {
      const nomeLimpo = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();

      const path = `clientes/${codigoClienteAtual}/${Date.now()}-${nomeLimpo}`;

      const { error: uploadError } = await supabaseClient.storage.from(BUCKET).upload(path, file);
      if (uploadError) throw uploadError;

      const { data: publicData } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);

      const tipoFinal = /\.(jpg|jpeg|png|webp)$/i.test(file.name) ? "imagem" : "video";

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

      const { error } = await supabaseClient.from("playlists").insert(registros);
      if (error) throw error;
    }

    await carregarHistoricoArquivos(codigosDestino);
    await sincronizarStatusCliente();
    await atualizarResumo();
    mostrarStatusUpload("Enviado com sucesso.", "#7CFC9A");
    arquivoInput.value = "";
  } catch (error) {
    console.error(error);
    mostrarStatusUpload("Erro ao enviar.", "#ff6b6b");
  }
}

if (listaPontos) {
  listaPontos.addEventListener("change", () => {
    ativarBotaoSalvar();
  });
}

if (inputNome) inputNome.addEventListener("input", ativarBotaoSalvar);
if (inputEmail) inputEmail.addEventListener("input", ativarBotaoSalvar);
if (inputVencimento) inputVencimento.addEventListener("input", ativarBotaoSalvar);
if (inputDataPostagem) inputDataPostagem.addEventListener("change", ativarBotaoSalvar);

if (inputTelefone) {
  inputTelefone.addEventListener("input", (event) => {
    event.target.value = formatarTelefone(event.target.value);
    ativarBotaoSalvar();
  });
}

if (inputCpfCnpj) {
  inputCpfCnpj.addEventListener("input", (event) => {
    event.target.value = formatarCpfCnpj(event.target.value);
    ativarBotaoSalvar();
  });
}

if (inputValorContratado) {
  inputValorContratado.addEventListener("blur", (event) => {
    event.target.value = formatarMoedaBR(event.target.value);
    ativarBotaoSalvar();
  });

  if (!inputValorContratado.value) {
    inputValorContratado.value = formatarMoedaBR(0);
  }
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

async function iniciar() {
  try {
    codigoClienteAtual = obterCodigoDaUrl();

    if (!codigoClienteAtual) {
      if (inputCodigo) inputCodigo.value = "";
      mostrarMensagem("Codigo do cliente nao encontrado na URL.", "#ff6b6b");
      console.error("URL sem codigo:", window.location.href);
      return;
    }

    if (inputCodigo) inputCodigo.value = codigoClienteAtual;

    mostrarMensagem(`Carregando cliente ${codigoClienteAtual}...`, "#9fd2ff");

    await carregarPontos();
    await carregarCliente();
  } catch (error) {
    console.error("Erro ao iniciar pasta-cliente:", error);
    mostrarMensagem("Erro ao carregar dados da pasta do cliente.", "#ff6b6b");
  }
}

iniciar();
