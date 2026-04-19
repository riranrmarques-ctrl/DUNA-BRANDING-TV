const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const TABELA_CLIENTES = "clientes_app";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const btnVoltarCliente = document.getElementById("btnVoltarCliente");
const btnBaixarContrato = document.getElementById("btnBaixarContrato");
const mensagemAssinatura = document.getElementById("mensagemAssinatura");
const statusContrato = document.getElementById("statusContrato");
const nomeCliente = document.getElementById("nomeCliente");
const codigoCliente = document.getElementById("codigoCliente");
const previewContrato = document.getElementById("previewContrato");
const canvasAssinatura = document.getElementById("canvasAssinatura");
const btnLimparAssinatura = document.getElementById("btnLimparAssinatura");
const btnConcluirDesenho = document.getElementById("btnConcluirDesenho");
const fotosInput = document.getElementById("fotosInput");
const btnConcluirFotos = document.getElementById("btnConcluirFotos");
const estadoConcluido = document.getElementById("estadoConcluido");

let codigoAtual = "";
let clienteAtual = null;
let contratoAtualHtml = "";
let contratoFinalHtml = "";
let desenhando = false;
let assinaturaFoiDesenhada = false;

function setMensagem(texto, tipo = "normal") {
  if (!mensagemAssinatura) return;

  mensagemAssinatura.textContent = texto || "";
  mensagemAssinatura.classList.remove("ok", "erro");

  if (tipo === "ok") mensagemAssinatura.classList.add("ok");
  if (tipo === "erro") mensagemAssinatura.classList.add("erro");
}

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function obterCodigoUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizarCodigo(params.get("codigo"));
}

function obterNomeCliente(cliente) {
  return (
    cliente?.nome_completo ||
    cliente?.nome ||
    cliente?.cliente ||
    cliente?.razao_social ||
    "Cliente"
  );
}

function clienteEhSupervisor(cliente) {
  return String(cliente?.tipo_acesso || "").trim().toLowerCase() === "supervisor";
}

function contratoEstaConcluido(cliente) {
  return Boolean(cliente?.contrato_assinado_em || cliente?.contrato_assinado_html);
}

function formatarDataHora(valor) {
  if (!valor) return "-";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleString("pt-BR");
}

function atualizarEstadoVisual() {
  const concluido = contratoEstaConcluido(clienteAtual);

  if (statusContrato) {
    statusContrato.textContent = concluido ? "Concluído" : "Pendente";
    statusContrato.classList.toggle("concluido", concluido);
    statusContrato.classList.toggle("pendente", !concluido);
  }

  if (estadoConcluido) {
    estadoConcluido.hidden = !concluido;
  }

  if (btnBaixarContrato) {
    btnBaixarContrato.disabled = !contratoFinalHtml && !contratoAtualHtml;
  }

  if (btnConcluirDesenho) btnConcluirDesenho.disabled = concluido;
  if (btnConcluirFotos) btnConcluirFotos.disabled = concluido;
}

function renderizarPreview(html) {
  if (!previewContrato) return;
  previewContrato.srcdoc = html || "<p>Contrato indisponível.</p>";
}

function anexarConclusaoAoContrato({ metodo, assinaturaImagem = "", fotos = [] }) {
  const dataConclusao = new Date().toLocaleString("pt-BR");

  const fotosHtml = fotos.length
    ? fotos.map((foto, index) => `
        <div style="margin:12px 0;padding:10px;border:1px solid #e5e7eb;border-radius:10px;">
          <strong>Foto ${index + 1}</strong>
          <img src="${foto}" alt="Comprovante ${index + 1}" style="display:block;width:100%;max-width:640px;margin-top:10px;border-radius:8px;">
        </div>
      `).join("")
    : "";

  const assinaturaHtml = assinaturaImagem
    ? `<img src="${assinaturaImagem}" alt="Assinatura digital" style="display:block;width:320px;max-width:100%;height:auto;margin:14px 0 8px;">`
    : "";

  const blocoConclusao = `
    <section style="page-break-inside:avoid;margin-top:42px;padding-top:22px;border-top:2px solid #111827;">
      <h2 style="font-size:18px;margin:0 0 12px;color:#111827;">Assinatura e conclusão</h2>
      <p style="margin:0 0 8px;line-height:1.6;color:#111827;">
        Contrato concluído por ${escapeHtml(obterNomeCliente(clienteAtual))} em ${escapeHtml(dataConclusao)}.
      </p>
      <p style="margin:0 0 14px;line-height:1.6;color:#111827;">
        Método utilizado: ${metodo === "fotos" ? "impressão e envio de fotos" : "assinatura virtual desenhada"}.
      </p>
      ${assinaturaHtml}
      ${fotosHtml}
    </section>
  `;

  if (/<\/body>/i.test(contratoAtualHtml)) {
    return contratoAtualHtml.replace(/<\/body>/i, `${blocoConclusao}</body>`);
  }

  return `${contratoAtualHtml}${blocoConclusao}`;
}

function baixarHtmlContrato() {
  const html = contratoFinalHtml || contratoAtualHtml;
  if (!html) return;

  const nomeArquivo = clienteAtual?.contrato_nome_arquivo || `contrato-${codigoAtual}.html`;
  const nomeFinal = contratoEstaConcluido(clienteAtual)
    ? nomeArquivo.replace(/\.html$/i, "-assinado.html")
    : nomeArquivo;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeFinal;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function salvarContratoConcluido({ metodo, assinaturaImagem = "", fotos = [] }) {
  contratoFinalHtml = anexarConclusaoAoContrato({ metodo, assinaturaImagem, fotos });

  setMensagem("Salvando contrato concluído...");

  const payload = {
    contrato_status: "concluido",
    contrato_assinado_em: new Date().toISOString(),
    contrato_assinado_html: contratoFinalHtml,
    contrato_assinatura_imagem: assinaturaImagem || null,
    contrato_comprovantes: fotos,
    contrato_metodo_assinatura: metodo
  };

  const { data, error } = await supabaseClient
    .from(TABELA_CLIENTES)
    .update(payload)
    .eq("codigo", codigoAtual)
    .select("*")
    .maybeSingle();

  if (error) throw error;

  clienteAtual = data || { ...clienteAtual, ...payload };
  renderizarPreview(contratoFinalHtml);
  atualizarEstadoVisual();
  setMensagem("Contrato concluído. Você já pode baixar o documento.", "ok");
}

function obterPontoCanvas(event) {
  const rect = canvasAssinatura.getBoundingClientRect();
  const toque = event.touches?.[0] || event;
  const escalaX = canvasAssinatura.width / rect.width;
  const escalaY = canvasAssinatura.height / rect.height;

  return {
    x: (toque.clientX - rect.left) * escalaX,
    y: (toque.clientY - rect.top) * escalaY
  };
}

function prepararCanvas() {
  if (!canvasAssinatura) return;

  const contexto = canvasAssinatura.getContext("2d");
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, canvasAssinatura.width, canvasAssinatura.height);
  contexto.strokeStyle = "#111827";
  contexto.lineWidth = 4;
  contexto.lineCap = "round";
  contexto.lineJoin = "round";

  const iniciar = (event) => {
    event.preventDefault();
    desenhando = true;
    assinaturaFoiDesenhada = true;
    const ponto = obterPontoCanvas(event);
    contexto.beginPath();
    contexto.moveTo(ponto.x, ponto.y);
  };

  const mover = (event) => {
    if (!desenhando) return;
    event.preventDefault();
    const ponto = obterPontoCanvas(event);
    contexto.lineTo(ponto.x, ponto.y);
    contexto.stroke();
  };

  const parar = () => {
    desenhando = false;
  };

  canvasAssinatura.addEventListener("mousedown", iniciar);
  canvasAssinatura.addEventListener("mousemove", mover);
  window.addEventListener("mouseup", parar);
  canvasAssinatura.addEventListener("touchstart", iniciar, { passive: false });
  canvasAssinatura.addEventListener("touchmove", mover, { passive: false });
  window.addEventListener("touchend", parar);
}

function limparCanvas() {
  if (!canvasAssinatura) return;
  const contexto = canvasAssinatura.getContext("2d");
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, canvasAssinatura.width, canvasAssinatura.height);
  assinaturaFoiDesenhada = false;
}

function lerArquivoComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function concluirComDesenho() {
  if (contratoEstaConcluido(clienteAtual)) return;

  if (!assinaturaFoiDesenhada) {
    setMensagem("Desenhe sua assinatura antes de concluir.", "erro");
    return;
  }

  try {
    const assinaturaImagem = canvasAssinatura.toDataURL("image/png");
    await salvarContratoConcluido({ metodo: "desenho", assinaturaImagem });
  } catch (error) {
    console.error(error);
    setMensagem("Erro ao concluir contrato. Verifique se as colunas de assinatura existem no Supabase.", "erro");
  }
}

async function concluirComFotos() {
  if (contratoEstaConcluido(clienteAtual)) return;

  const arquivos = Array.from(fotosInput?.files || []);

  if (!arquivos.length) {
    setMensagem("Envie ao menos uma foto do contrato assinado.", "erro");
    return;
  }

  try {
    setMensagem("Processando fotos...");
    const fotos = await Promise.all(arquivos.map(lerArquivoComoDataUrl));
    await salvarContratoConcluido({ metodo: "fotos", fotos });
  } catch (error) {
    console.error(error);
    setMensagem("Erro ao concluir com fotos. Tente imagens menores ou verifique o Supabase.", "erro");
  }
}

async function carregarContrato() {
  codigoAtual = obterCodigoUrl();

  if (!codigoAtual) {
    setMensagem("Código do cliente não encontrado.", "erro");
    return;
  }

  if (codigoCliente) codigoCliente.textContent = codigoAtual;

  if (btnVoltarCliente) {
    btnVoltarCliente.onclick = () => {
      window.location.href = `/acesso.html?codigo=${encodeURIComponent(codigoAtual)}`;
    };
  }

  try {
    const { data, error } = await supabaseClient
      .from(TABELA_CLIENTES)
      .select("*")
      .eq("codigo", codigoAtual)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      setMensagem("Cliente não encontrado.", "erro");
      return;
    }

    if (clienteEhSupervisor(data)) {
      setMensagem("Supervisor não possui contrato para assinatura.", "erro");
      return;
    }

    if (!data.contrato_html) {
      setMensagem("Ainda não existe contrato enviado para este cliente.", "erro");
      return;
    }

    clienteAtual = data;
    contratoAtualHtml = data.contrato_html;
    contratoFinalHtml = data.contrato_assinado_html || data.contrato_html;

    if (nomeCliente) nomeCliente.textContent = obterNomeCliente(data);

    renderizarPreview(contratoFinalHtml);
    atualizarEstadoVisual();

    const concluido = contratoEstaConcluido(data);

    setMensagem(
      concluido
        ? `Contrato concluído em ${formatarDataHora(data.contrato_assinado_em)}.`
        : "Contrato pendente de assinatura.",
      concluido ? "ok" : "normal"
    );
  } catch (error) {
    console.error(error);
    setMensagem("Erro ao carregar contrato.", "erro");
  }
}

if (btnBaixarContrato) btnBaixarContrato.onclick = baixarHtmlContrato;
if (btnLimparAssinatura) btnLimparAssinatura.onclick = limparCanvas;
if (btnConcluirDesenho) btnConcluirDesenho.onclick = concluirComDesenho;
if (btnConcluirFotos) btnConcluirFotos.onclick = concluirComFotos;

prepararCanvas();
carregarContrato();
