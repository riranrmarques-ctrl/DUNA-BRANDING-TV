const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "videos";
const TABELA_PLAYLISTS = "playlists";
const TABELA_PONTOS = "pontos";
const SENHA_PAINEL = "@Helena";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================
   ELEMENTOS
========================= */
const loginBox = document.getElementById("loginBox");
const conteudoPainel = document.getElementById("conteudoPainel");
const senhaInput = document.getElementById("senhaInput");
const btnLogin = document.getElementById("btnLogin");
const loginErro = document.getElementById("loginErro");

const listaPontos = document.getElementById("listaPontos");
const pontoDetalhe = document.getElementById("pontoDetalhe");
const codigoAtual = document.getElementById("codigoAtual");
const nomeAtual = document.getElementById("nomeAtual");

const videoInput = document.getElementById("videoInput");
const btnUpload = document.getElementById("btnUpload");
const btnVoltar = document.getElementById("btnVoltar");
const playlistLista = document.getElementById("playlistLista");
const statusBox = document.getElementById("status");

let codigoSelecionado = null;
let pontosMap = {};

/* =========================
   HELPERS
========================= */
function setStatus(texto, tipo = "ok") {
  if (!statusBox) return;
  statusBox.textContent = texto;
  statusBox.style.background = tipo === "erro" ? "#dc2626" : "#16a34a";
}

function escapeHtml(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizarNomeArquivo(nome) {
  return String(nome || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

function detectarTipoPorArquivo(file) {
  const nome = String(file?.name || "").toLowerCase();

  if (nome.endsWith(".mp4")) return "video";
  if (
    nome.endsWith(".jpg") ||
    nome.endsWith(".jpeg") ||
    nome.endsWith(".png") ||
    nome.endsWith(".webp")
  ) {
    return "imagem";
  }
  if (nome.endsWith(".txt")) return "site";

  return "";
}

function detectarTipoPorItem(item) {
  if (item?.tipo) return item.tipo;

  const nome = String(item?.nome || "").toLowerCase();
  if (nome.endsWith(".mp4")) return "video";
  if (
    nome.endsWith(".jpg") ||
    nome.endsWith(".jpeg") ||
    nome.endsWith(".png") ||
    nome.endsWith(".webp")
  ) {
    return "imagem";
  }
  if (nome.endsWith(".txt")) return "site";

  return "arquivo";
}

function formatarTipo(tipo) {
  if (tipo === "video") return "Vídeo";
  if (tipo === "imagem") return "Imagem";
  if (tipo === "site") return "Site";
  return "Arquivo";
}

/* =========================
   LOGIN
========================= */
function validarLogin() {
  const senha = String(senhaInput?.value || "").trim();

  if (senha !== SENHA_PAINEL) {
    if (loginErro) loginErro.textContent = "Código inválido.";
    setStatus("Código inválido.", "erro");
    return;
  }

  if (loginErro) loginErro.textContent = "";
  if (loginBox) loginBox.style.display = "none";
  if (conteudoPainel) conteudoPainel.style.display = "block";

  setStatus("Painel liberado.", "ok");
  iniciarPainel();
}

function configurarLogin() {
  if (btnLogin) {
    btnLogin.addEventListener("click", validarLogin);
  }

  if (senhaInput) {
    senhaInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        validarLogin();
      }
    });
  }
}

/* =========================
   PONTOS
========================= */
async function buscarPontos() {
  const { data, error } = await supabaseClient
    .from(TABELA_PONTOS)
    .select("codigo, nome")
    .order("codigo", { ascending: true });

  if (error) throw error;
  return data || [];
}

function renderizarNomesDosCards(pontos) {
  pontosMap = {};

  pontos.forEach((ponto) => {
    pontosMap[ponto.codigo] = ponto;
  });

  document.querySelectorAll(".card-ponto").forEach((card) => {
    const codigo = card.dataset.codigo;
    const nomeEl = card.querySelector(".card-nome");

    if (!nomeEl) return;

    const nomeBanco = pontosMap[codigo]?.nome;
    nomeEl.textContent = nomeBanco || `Ponto ${codigo}`;
  });
}

async function renomearPonto(codigo) {
  const nomeAtualPonto = pontosMap[codigo]?.nome || `Ponto ${codigo}`;
  const novoNome = window.prompt(`Novo nome para o ponto ${codigo}:`, nomeAtualPonto);

  if (novoNome === null) return;

  const nomeLimpo = String(novoNome).trim();

  if (!nomeLimpo) {
    setStatus("Digite um nome válido.", "erro");
    return;
  }

  try {
    setStatus("Salvando nome...");

    const { error } = await supabaseClient
      .from(TABELA_PONTOS)
      .update({ nome: nomeLimpo })
      .eq("codigo", codigo);

    if (error) throw error;

    if (!pontosMap[codigo]) {
      pontosMap[codigo] = { codigo, nome: nomeLimpo };
    } else {
      pontosMap[codigo].nome = nomeLimpo;
    }

    document.querySelectorAll(".card-ponto").forEach((card) => {
      if (card.dataset.codigo === codigo) {
        const nomeEl = card.querySelector(".card-nome");
        if (nomeEl) nomeEl.textContent = nomeLimpo;
      }
    });

    if (codigoSelecionado === codigo && nomeAtual) {
      nomeAtual.textContent = nomeLimpo;
    }

    setStatus("Nome atualizado com sucesso.", "ok");
  } catch (error) {
    console.error("Erro ao salvar nome:", error);
    setStatus("Erro ao salvar nome: " + error.message, "erro");
  }
}

function abrirPonto(codigo) {
  codigoSelecionado = codigo;

  if (codigoAtual) codigoAtual.textContent = codigo;
  if (nomeAtual) nomeAtual.textContent = pontosMap[codigo]?.nome || `Ponto ${codigo}`;

  if (listaPontos) listaPontos.style.display = "none";
  if (pontoDetalhe) pontoDetalhe.style.display = "block";

  setStatus(`Pasta ${codigo} aberta.`, "ok");
  carregarPlaylist();
}

function voltarParaPontos() {
  codigoSelecionado = null;

  if (pontoDetalhe) pontoDetalhe.style.display = "none";
  if (listaPontos) listaPontos.style.display = "grid";

  setStatus("Voltou para os pontos.", "ok");
}

/* =========================
   PLAYLIST
========================= */
async function buscarPlaylist(codigo) {
  const { data, error } = await supabaseClient
    .from(TABELA_PLAYLISTS)
    .select("*")
    .eq("codigo", codigo)
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return data || [];
}

function renderizarPlaylist(lista) {
  if (!playlistLista) return;

  if (!lista.length) {
    playlistLista.innerHTML = `
      <div class="playlist-item">
        <span>Nenhum item</span>
      </div>
    `;
    return;
  }

  playlistLista.innerHTML = lista.map((item) => {
    const nomeSeguro = escapeHtml(item.nome || "Sem nome");
    const tipoSeguro = escapeHtml(formatarTipo(detectarTipoPorItem(item)));
    const nomeJs = JSON.stringify(item.nome || "Sem nome");
    const pathJs = JSON.stringify(item.storage_path || "");

    return `
      <div class="playlist-item">
        <span>${nomeSeguro} • ${tipoSeguro}</span>
        <div>
          <button type="button" onclick="renomearItem(${item.id}, ${nomeJs})">✎</button>
          <button type="button" onclick="excluirItem(${item.id}, ${pathJs})">X</button>
        </div>
      </div>
    `;
  }).join("");
}

async function carregarPlaylist() {
  if (!codigoSelecionado) return;

  try {
    setStatus("Carregando playlist...");
    const lista = await buscarPlaylist(codigoSelecionado);
    renderizarPlaylist(lista);
    setStatus("Playlist carregada.", "ok");
  } catch (error) {
    console.error("Erro ao carregar playlist:", error);
    setStatus("Erro ao carregar playlist: " + error.message, "erro");
  }
}

/* =========================
   UPLOAD
========================= */
async function pegarProximaOrdem(codigo) {
  const lista = await buscarPlaylist(codigo);

  if (!lista.length) return 0;

  const maior = Math.max(...lista.map(item => Number(item.ordem) || 0));
  return maior + 1;
}

async function uploadMidia() {
  const arquivo = videoInput?.files?.[0];

  if (!codigoSelecionado) {
    setStatus("Abra uma pasta antes de enviar mídia.", "erro");
    return;
  }

  if (!arquivo) {
    setStatus("Selecione um arquivo.", "erro");
    return;
  }

  const tipo = detectarTipoPorArquivo(arquivo);

  if (!tipo) {
    setStatus("Formato inválido. Use MP4, JPG, JPEG, PNG, WEBP ou TXT.", "erro");
    return;
  }

  try {
    if (btnUpload) btnUpload.disabled = true;
    setStatus("Enviando mídia...");

    let urlFinal = "";
    let storagePath = "";

    if (tipo === "site") {
      const texto = await arquivo.text();
      let urlLida = String(texto || "").trim();

      if (!urlLida) {
        throw new Error("O arquivo TXT está vazio.");
      }

      const match = urlLida.match(/URL\s*=\s*(.+)/i);
      if (match && match[1]) {
        urlLida = match[1].trim();
      }

      if (!/^https?:\/\//i.test(urlLida)) {
        urlLida = "https://" + urlLida;
      }

      urlFinal = urlLida;
      storagePath = "";
    } else {
      const nomeSeguro = normalizarNomeArquivo(arquivo.name);
      const nomeFinal = `${Date.now()}-${nomeSeguro}`;
      const caminho = `${codigoSelecionado}/${nomeFinal}`;

      const { error: uploadError } = await supabaseClient
        .storage
        .from(BUCKET)
        .upload(caminho, arquivo, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabaseClient
        .storage
        .from(BUCKET)
        .getPublicUrl(caminho);

      urlFinal = publicData.publicUrl;
      storagePath = caminho;
    }

    const ordem = await pegarProximaOrdem(codigoSelecionado);

    const { error: insertError } = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .insert({
        codigo: codigoSelecionado,
        nome: arquivo.name,
        video_url: urlFinal,
        storage_path: storagePath,
        ordem: ordem,
        tipo: tipo
      });

    if (insertError) throw insertError;

    if (videoInput) videoInput.value = "";

    setStatus("Mídia enviada com sucesso.", "ok");
    await carregarPlaylist();
  } catch (error) {
    console.error("Erro ao enviar mídia:", error);
    setStatus("Erro ao enviar: " + error.message, "erro");
  } finally {
    if (btnUpload) btnUpload.disabled = false;
  }
}

/* =========================
   RENOMEAR ITEM
========================= */
async function renomearItem(id, nomeAtualItem) {
  const novoNome = window.prompt("Novo nome do item:", nomeAtualItem);

  if (novoNome === null) return;

  const nomeLimpo = String(novoNome || "").trim();

  if (!nomeLimpo) {
    setStatus("Nome inválido.", "erro");
    return;
  }

  try {
    const { error } = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .update({ nome: nomeLimpo })
      .eq("id", id);

    if (error) throw error;

    setStatus("Nome atualizado.", "ok");
    await carregarPlaylist();
  } catch (error) {
    console.error("Erro ao renomear item:", error);
    setStatus("Erro ao renomear item: " + error.message, "erro");
  }
}

/* =========================
   EXCLUIR ITEM
========================= */
async function excluirItem(id, storagePath) {
  const confirmar = window.confirm("Deseja excluir este item?");
  if (!confirmar) return;

  try {
    setStatus("Excluindo item...");

    if (storagePath) {
      const { error: storageError } = await supabaseClient
        .storage
        .from(BUCKET)
        .remove([storagePath]);

      if (storageError) throw storageError;
    }

    const { error: deleteError } = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    setStatus("Item excluído.", "ok");
    await carregarPlaylist();
  } catch (error) {
    console.error("Erro ao excluir item:", error);
    setStatus("Erro ao excluir item: " + error.message, "erro");
  }
}

/* =========================
   COPIAR CÓDIGO
========================= */
function copiarCodigoPonto(codigo) {
  navigator.clipboard.writeText(codigo)
    .then(() => {
      setStatus("Código copiado.", "ok");
    })
    .catch(() => {
      setStatus("Não foi possível copiar o código.", "erro");
    });
}

/* =========================
   EVENTOS
========================= */
function configurarEventos() {
  document.querySelectorAll(".btn-abrir").forEach((btn) => {
    btn.addEventListener("click", () => {
      abrirPonto(btn.dataset.codigo);
    });
  });

  document.querySelectorAll(".btn-copiar").forEach((btn) => {
    btn.addEventListener("click", () => {
      copiarCodigoPonto(btn.dataset.codigo);
    });
  });

  document.querySelectorAll(".btn-editar-nome").forEach((btn) => {
    btn.addEventListener("click", () => {
      renomearPonto(btn.dataset.codigo);
    });
  });

  if (btnVoltar) {
    btnVoltar.addEventListener("click", voltarParaPontos);
  }

  if (btnUpload) {
    btnUpload.addEventListener("click", uploadMidia);
  }
}

/* =========================
   INIT
========================= */
window.renomearItem = renomearItem;
window.excluirItem = excluirItem;

async function iniciarPainel() {
  try {
    configurarEventos();
    setStatus("Carregando pontos...");

    const pontos = await buscarPontos();
    renderizarNomesDosCards(pontos);

    setStatus("Painel ativo.", "ok");
  } catch (error) {
    console.error("Erro ao iniciar painel:", error);
    setStatus("Erro ao carregar pontos: " + error.message, "erro");
  }
}

configurarLogin();
