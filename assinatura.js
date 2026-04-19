const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const TABELA_CLIENTES = "clientes_app";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const btnVoltarCliente = document.getElementById("btnVoltarCliente");
const btnBaixarContrato = document.getElementById("btnBaixarContrato");
const btnBaixarContratoConcluido = document.getElementById("btnBaixarContratoConcluido");
const mensagemAssinatura = document.getElementById("mensagemAssinatura");
const statusContrato = document.getElementById("statusContrato");
const nomeCliente = document.getElementById("nomeCliente");
const codigoCliente = document.getElementById("codigoCliente");
const loadingOverlay = document.getElementById("loadingOverlay");
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
let contratoFoiLidoAteOFim = false;

function setMensagem(texto, tipo = "normal") {
  console.log(texto || "", tipo);

  if (!mensagemAssinatura) return;

  mensagemAssinatura.textContent = "";
  mensagemAssinatura.classList.remove("ok", "erro");
}

function mostrarLoading() {
  document.body.classList.add("loading-page");

  if (loadingOverlay) {
    loadingOverlay.style.display = "flex";
    requestAnimationFrame(() => {
      loadingOverlay.classList.add("ativo");
    });
  }
}

function esconderLoading() {
  document.body.classList.remove("loading-page");

  if (loadingOverlay) {
    loadingOverlay.classList.remove("ativo");

    setTimeout(() => {
      if (!loadingOverlay.classList.contains("ativo")) {
        loadingOverlay.style.display = "none";
      }
    }, 280);
  }
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
    cliente?.responsavel ||
    "Cliente"
  );
}

function clienteEhSupervisor(cliente) {
  return String(cliente?.tipo_acesso || "").trim().toLowerCase() === "supervisor";
}

function contratoEstaConcluido(cliente) {
  if (!cliente) return false;

  const temAssinatura = Boolean(cliente.contrato_assinado_em || cliente.contrato_assinado_html);
  if (!temAssinatura) return false;

  const dataAssinatura = new Date(cliente.contrato_assinado_em || cliente.updated_at || 0);
  const dataContrato = new Date(
    cliente.contrato_enviado_em ||
    cliente.updated_at ||
    0
  );

  if (Number.isNaN(dataAssinatura.getTime())) {
    return Boolean(cliente.contrato_assinado_html);
  }

  if (!Number.isNaN(dataContrato.getTime()) && dataContrato > dataAssinatura) {
    return false;
  }

  return true;
}

function formatarDataHora(valor) {
  if (!valor) return "-";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";

  return data.toLocaleString("pt-BR");
}

function aplicarTituloVisual(concluido) {
  document.body.classList.toggle("contrato-pendente", !concluido);
  document.body.classList.toggle("contrato-assinado", concluido);
}

function ocultarOpcaoFotos() {
  const blocoFotos = fotosInput?.closest(".bloco");
  const divisor = document.querySelector(".assinatura-card .divisor");

  if (blocoFotos) blocoFotos.style.display = "none";
  if (divisor) divisor.style.display = "none";
}

function atualizarBotaoConclusaoPorLeitura() {
  const concluido = contratoEstaConcluido(clienteAtual);

  if (!btnConcluirDesenho) return;

  if (concluido) {
    btnConcluirDesenho.disabled = true;
    btnConcluirDesenho.textContent = "Concluir com assinatura";
    btnConcluirDesenho.classList.remove("leitura-pendente");
    return;
  }

  btnConcluirDesenho.disabled = false;
  btnConcluirDesenho.textContent = "Concluir com assinatura";
  btnConcluirDesenho.classList.toggle("leitura-pendente", !contratoFoiLidoAteOFim);
}

function verificarLeituraContrato() {
  if (!previewContrato) return;

  const documento = previewContrato.contentDocument;
  const janela = previewContrato.contentWindow;

  if (!documento || !janela) return;

  const scrollTop = janela.scrollY || documento.documentElement.scrollTop || documento.body.scrollTop || 0;
  const alturaVisivel = janela.innerHeight || documento.documentElement.clientHeight || 0;
  const alturaTotal = Math.max(
    documento.body.scrollHeight || 0,
    documento.documentElement.scrollHeight || 0
  );

  if (alturaTotal <= alturaVisivel + 24) {
    contratoFoiLidoAteOFim = true;
    atualizarBotaoConclusaoPorLeitura();
    return;
  }

  if (scrollTop + alturaVisivel >= alturaTotal - 24) {
    contratoFoiLidoAteOFim = true;
    atualizarBotaoConclusaoPorLeitura();
  }
}

function configurarLeituraObrigatoria() {
  if (!previewContrato) return;

  previewContrato.addEventListener("load", () => {
    contratoFoiLidoAteOFim = false;
    atualizarBotaoConclusaoPorLeitura();

    const documento = previewContrato.contentDocument;
    const janela = previewContrato.contentWindow;

    if (!documento || !janela) return;

    janela.addEventListener("scroll", verificarLeituraContrato);
    documento.addEventListener("scroll", verificarLeituraContrato);

    setTimeout(verificarLeituraContrato, 300);
    setTimeout(verificarLeituraContrato, 900);
  });
}

function atualizarEstadoVisual() {
  const concluido = contratoEstaConcluido(clienteAtual);

  aplicarTituloVisual(concluido);
  ocultarOpcaoFotos();

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
    btnBaixarContrato.textContent = "Baixar contrato";
    btnBaixarContrato.classList.toggle("concluido", concluido);
    btnBaixarContrato.classList.toggle("pendente", !concluido);
  }

  if (btnConcluirFotos) {
    btnConcluirFotos.disabled = true;
  }

  const assinaturaCard = document.querySelector(".assinatura-card");
  const blocoDesenho = canvasAssinatura?.closest(".bloco");

  if (blocoDesenho) {
    blocoDesenho.style.display = concluido ? "none" : "";
  }

  if (assinaturaCard) {
    assinaturaCard.classList.toggle("contrato-concluido", concluido);
  }

  atualizarBotaoConclusaoPorLeitura();
}

function renderizarPreview(html) {
  if (!previewContrato) return;

  const conteudo = String(html || "").trim();

  previewContrato.srcdoc = conteudo || `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          margin: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: Arial, sans-serif;
          color: #111827;
          background: #ffffff;
        }

        .vazio {
          max-width: 520px;
          padding: 32px;
          text-align: center;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
        }

        h1 {
          margin: 0 0 12px;
          font-size: 24px;
        }

        p {
          margin: 0;
          color: #6b7280;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="vazio">
        <h1>Contrato não carregado</h1>
        <p>O documento ainda não foi encontrado para este cliente.</p>
      </div>
    </body>
    </html>
  `;
}

function montarInfoAssinatura(dataConclusao) {
  return `
    <div style="font-size:11px;line-height:1.35;color:#374151;margin:4px auto 8px;text-align:center;max-width:420px;">
      Contrato concluído por ${escapeHtml(obterNomeCliente(clienteAtual))} em ${escapeHtml(dataConclusao)}.<br>
      Método utilizado: assinatura eletrônica.
    </div>
  `;
}

function inserirAssinaturaNoContratante(html, assinaturaImagem, dataConclusao) {
  if (!assinaturaImagem) return html;

  const assinaturaNoContratante = `
    <div style="margin:0 auto 8px;text-align:center;max-width:420px;">
      <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:6px;">
        Assinatura eletrônica
      </div>
      <img
        src="${assinaturaImagem}"
        alt="Assinatura eletrônica"
        style="display:block;width:300px;max-width:100%;height:90px;margin:0 auto 4px;object-fit:contain;"
      >
      ${montarInfoAssinatura(dataConclusao)}
    </div>
  `;

  const assinaturaBoxVaziaRegex = /<div class="assinatura-box">\s*<div class="linha-assinatura">CONTRATANTE<\/div>\s*<\/div>/i;
  const linhaContratanteRegex = /<div class="linha-assinatura">CONTRATANTE<\/div>/i;

  if (assinaturaBoxVaziaRegex.test(html)) {
    return html.replace(
      assinaturaBoxVaziaRegex,
      `
        <div class="assinatura-box">
          ${assinaturaNoContratante}
          <div class="linha-assinatura">CONTRATANTE</div>
        </div>
      `
    );
  }

  if (linhaContratanteRegex.test(html)) {
    return html.replace(
      linhaContratanteRegex,
      `${assinaturaNoContratante}<div class="linha-assinatura">CONTRATANTE</div>`
    );
  }

  return `${html}
    <section style="page-break-inside:avoid;margin-top:42px;">
      <div style="text-align:center;max-width:520px;margin:0 auto;">
        ${assinaturaNoContratante}
        <div style="border-top:1.8px solid #111827;margin-top:0;padding-top:8px;font-weight:700;color:#111827;">
          CONTRATANTE
        </div>
      </div>
    </section>
  `;
}

function obterHtmlConclusao({ metodo, fotos = [], dataConclusao = "" }) {
  const nome = escapeHtml(obterNomeCliente(clienteAtual));
  const data = escapeHtml(dataConclusao || new Date().toLocaleString("pt-BR"));

  const fotosHtml = fotos.length
    ? fotos.map((foto, index) => `
        <a
          href="${foto}"
          download="comprovante-assinatura-${index + 1}.png"
          style="display:block;margin:14px 0;padding:10px;border:1px solid #e5e7eb;border-radius:10px;text-decoration:none;color:#111827;"
        >
          <strong>Comprovante ${index + 1}</strong>
          <img
            src="${foto}"
            alt="Comprovante ${index + 1}"
            style="display:block;width:100%;max-width:640px;margin-top:10px;border-radius:8px;"
          >
        </a>
      `).join("")
    : "";

  const comprovantesHtml = fotos.length
    ? `
      <div style="margin:30px 0 18px;">
        <h3 style="font-size:15px;margin:0 0 12px;color:#111827;">
          Assinado físico com comprovante em imagem abaixo.
        </h3>
        ${fotosHtml}
      </div>
    `
    : "";

  return `
    <section style="page-break-inside:avoid;margin-top:42px;padding-top:22px;border-top:2px solid #111827;">
      <h2 style="font-size:18px;margin:0 0 12px;color:#111827;">Assinatura e conclusão</h2>
      <p style="margin:0 0 8px;line-height:1.6;color:#111827;">
        Contrato concluído por ${nome} em ${data}.
      </p>
      <p style="margin:0 0 14px;line-height:1.6;color:#111827;">
        Método utilizado: ${metodo === "fotos" ? "assinatura física com comprovante em imagem" : "assinatura eletrônica"}.
      </p>
      ${comprovantesHtml}
    </section>
  `;
}

function anexarConclusaoAoContrato({ metodo, assinaturaImagem = "", fotos = [] }) {
  const dataConclusao = new Date().toLocaleString("pt-BR");
  let htmlFinal = contratoAtualHtml;

  if (metodo !== "fotos" && assinaturaImagem) {
    htmlFinal = inserirAssinaturaNoContratante(htmlFinal, assinaturaImagem, dataConclusao);
  }

  const blocoConclusao = obterHtmlConclusao({
    metodo,
    fotos,
    dataConclusao
  });

  if (/<\/body>/i.test(htmlFinal)) {
    return htmlFinal.replace(/<\/body>/i, `${blocoConclusao}</body>`);
  }

  return `${htmlFinal}${blocoConclusao}`;
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

  if (!contratoFoiLidoAteOFim) {
    alert("Leia o contrato completo antes de concluir.");
    return;
  }

  if (!assinaturaFoiDesenhada) {
    alert("Desenhe sua assinatura antes de concluir.");
    return;
  }

  try {
    const assinaturaImagem = canvasAssinatura.toDataURL("image/png");
    await salvarContratoConcluido({ metodo: "desenho", assinaturaImagem });
  } catch (error) {
    console.error(error);
    alert("Erro ao concluir contrato. Verifique se as colunas de assinatura existem no Supabase.");
  }
}

async function concluirComFotos() {
  if (contratoEstaConcluido(clienteAtual)) return;

  const arquivos = Array.from(fotosInput?.files || []);

  if (!arquivos.length) {
    alert("Envie ao menos uma foto do contrato assinado.");
    return;
  }

  try {
    const fotos = await Promise.all(arquivos.map(lerArquivoComoDataUrl));
    await salvarContratoConcluido({ metodo: "fotos", fotos });
  } catch (error) {
    console.error(error);
    alert("Erro ao concluir com fotos. Tente imagens menores ou verifique o Supabase.");
  }
}

function aplicarEstadoCarregado(data) {
  clienteAtual = data;
  contratoAtualHtml = data.contrato_html || "";

  const concluido = contratoEstaConcluido(data);

  contratoFinalHtml = concluido
    ? data.contrato_assinado_html || data.contrato_html || ""
    : data.contrato_html || "";

  if (nomeCliente) {
    nomeCliente.textContent = "Seu Contrato";
  }

  if (codigoCliente) {
    codigoCliente.textContent = "";
    codigoCliente.style.display = "none";
  }

  renderizarPreview(contratoFinalHtml);
  atualizarEstadoVisual();
}

async function carregarContrato() {
  codigoAtual = obterCodigoUrl();
  mostrarLoading();

  if (!codigoAtual) {
    esconderLoading();
    alert("Código do cliente não encontrado.");
    aplicarTituloVisual(true);
    return;
  }

  if (codigoCliente) {
    codigoCliente.textContent = "";
    codigoCliente.style.display = "none";
  }

  if (btnVoltarCliente) {
    btnVoltarCliente.onclick = () => {
      mostrarLoading();

      setTimeout(() => {
        window.location.href = `/acesso.html?codigo=${encodeURIComponent(codigoAtual)}&voltar=1`;
      }, 220);
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
      alert("Cliente não encontrado.");
      aplicarTituloVisual(true);
      return;
    }

    if (clienteEhSupervisor(data)) {
      alert("Supervisor não possui contrato para assinatura.");
      aplicarTituloVisual(true);
      return;
    }

    if (!data.contrato_html) {
      alert("Ainda não existe contrato enviado para este cliente.");
      aplicarTituloVisual(true);
      return;
    }

    aplicarEstadoCarregado(data);
  } catch (error) {
    console.error(error);
    alert("Erro ao carregar contrato.");
    aplicarTituloVisual(true);
  } finally {
    esconderLoading();
  }
}

if (btnBaixarContrato) btnBaixarContrato.onclick = baixarHtmlContrato;
if (btnBaixarContratoConcluido) btnBaixarContratoConcluido.onclick = baixarHtmlContrato;
if (btnLimparAssinatura) btnLimparAssinatura.onclick = limparCanvas;
if (btnConcluirDesenho) btnConcluirDesenho.onclick = concluirComDesenho;
if (btnConcluirFotos) btnConcluirFotos.onclick = concluirComFotos;

ocultarOpcaoFotos();
prepararCanvas();
configurarLeituraObrigatoria();
carregarContrato();
