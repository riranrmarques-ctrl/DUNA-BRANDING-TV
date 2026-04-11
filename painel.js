const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "videos";
const TABELA = "playlists";
const TABELA_PONTOS = "pontos";

const SENHA_PAINEL = "@Helena";

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
const nomeAtual = document.getElementById("nomeAtual");
const videoInput = document.getElementById("videoInput");
const btnUpload = document.getElementById("btnUpload");
const btnVoltar = document.getElementById("btnVoltar");
const playlistLista = document.getElementById("playlistLista");

let codigoSelecionado = null;
let pontosMap = {};
let dragItemId = null;

/* =========================
   STATUS
========================= */
function setStatus(texto, tipo = "normal") {
  if (!statusEl) return;

  statusEl.textContent = texto;
  statusEl.className = "status-box";

  if (tipo === "ok") statusEl.classList.add("ok");
  if (tipo === "erro") statusEl.classList.add("erro");
}

/* =========================
   HELPERS
========================= */
function escaparHtml(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pegarCodigoAtual() {
  return codigoSelecionado;
}

function normalizarNomeArquivo(nome) {
  return String(nome || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

function detectarTipoPorNome(nomeArquivo) {
  const ext = String(nomeArquivo || "").split(".").pop().toLowerCase();

  if (ext === "mp4") return "video";
  if (ext === "jpg" || ext === "jpeg") return "imagem";
  if (ext === "txt") return "site";

  return "";
}

/* =========================
   LOGIN
========================= */
function validarLogin() {
  const senha = (senhaInput?.value || "").trim();

  if (senha !== SENHA_PAINEL) {
    if (loginErro) loginErro.textContent = "Código inválido.";
    return;
  }

  if (loginErro) loginErro.textContent = "";
  if (loginBox) loginBox.style.display = "none";
  if (conteudoPainel) conteudoPainel.style.display = "block";

  setStatus("Painel Ativo", "ok");
  iniciarPainel();
}

function configurarLogin() {
  if (btnLogin) {
    btnLogin.addEventListener("click", validarLogin);
  }

  if (senhaInput) {
    senhaInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") validarLogin();
    });
  }
}

/* =========================
   PONTOS
========================= */
async function buscarPontos() {
  const { data, error } = await supabaseClient
    .from(TABELA_PONTOS)
    .select("*")
    .order("codigo", { ascending: true });

  if (error) throw error;
  return data || [];
}

function renderizarCardsPontos(lista) {
  pontosMap = {};

  lista.forEach((ponto) => {
    pontosMap[ponto.codigo] = ponto;
  });

  document.querySelectorAll(".card-ponto").forEach((card) => {
    const codigo = card.dataset.codigo;
    const nomeEl = card.querySelector(".card-nome");

    if (!nomeEl) return;

    if (pontosMap[codigo]) {
      nomeEl.textContent = pontosMap[codigo].nome || `Ponto ${codigo}`;
    } else {
      nomeEl.textContent = `Ponto ${codigo}`;
    }
  });
}

async function renomearPonto(codigo) {
  const nomeAtualPonto = pontosMap[codigo]?.nome || `Ponto ${codigo}`;
  const novoNome = window.prompt(`Novo nome para o ponto ${codigo}:`, nomeAtualPonto);

  if (novoNome === null) return;

  const nomeLimpo = novoNome.trim();

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

  codigoAtual.textContent = codigo;
  nomeAtual.textContent = pontosMap[codigo]?.nome || `Ponto ${codigo}`;

  listaPontos.style.display = "none";
  pontoDetalhe.style.display = "block";

  setStatus(`Pasta ${codigo} aberta.`, "ok");
  carregarPlaylist();
}

function voltarParaPontos() {
  codigoSelecionado = null;
  pontoDetalhe.style.display = "none";
  listaPontos.style.display = "grid";
  setStatus("Painel Ativo", "ok");
}

/* =========================
   PLAYLIST / DADOS
========================= */
async function buscarPlaylist(codigo) {
  const { data, error } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigo)
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function garantirColunaTipoNosResultados(lista) {
  return (lista || []).map((item) => {
    if (!item.tipo || !String(item.tipo).trim()) {
      return {
        ...item,
        tipo: detectarTipoPorNome(item.nome)
      };
    }
    return item;
  });
}

async function pegarProximaOrdem(codigo) {
  const lista = await buscarPlaylist(codigo);

  if (!lista.length) return 0;

  const maior = Math.max(...lista.map(item => Number(item.ordem) || 0));
  return maior + 1;
}

/* =========================
   UPLOAD DE MÍDIA
========================= */
async function uploadMidia() {
  const codigo = pegarCodigoAtual();
  const arquivo = videoInput.files[0];

  if (!codigo) {
    setStatus("Abra uma pasta antes de enviar mídia.", "erro");
    return;
  }

  if (!arquivo) {
    setStatus("Selecione um arquivo.", "erro");
    return;
  }

  const ext = arquivo.name.split(".").pop().toLowerCase();

  if (!["mp4", "jpg", "jpeg", "txt"].includes(ext)) {
    setStatus("Formato inválido. Use MP4, JPG ou TXT.", "erro");
    return;
  }

  try {
    btnUpload.disabled = true;
    setStatus("Enviando mídia...");

    let tipo = "";
    let urlFinal = "";
    let storagePath = "";

    if (ext === "txt") {
      const texto = await arquivo.text();
      const match = texto.match(/URL\s*=\s*(.+)/i);
      let urlLida = match ? match[1].trim() : texto.trim();

      if (!urlLida) {
        throw new Error("O TXT está vazio.");
      }

      if (!/^https?:\/\//i.test(urlLida)) {
        urlLida = "https://" + urlLida;
      }

      tipo = "site";
      urlFinal = urlLida;
      storagePath = "";
    } else {
      tipo = ext === "mp4" ? "video" : "imagem";

      const nomeSeguro = normalizarNomeArquivo(arquivo.name);
      const nomeFinal = `${Date.now()}-${nomeSeguro}`;
      const caminho = `${codigo}/${nomeFinal}`;

      storagePath = caminho;

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
    }

    const ordem = await pegarProximaOrdem(codigo);

    const payload = {
      codigo: codigo,
      nome: arquivo.name,
      video_url: urlFinal,
      storage_path: storagePath,
      ordem: ordem,
      tipo: tipo
    };

    const { error: insertError } = await supabaseClient
      .from(TABELA)
      .insert(payload);

    if (insertError) {
      if (
        String(insertError.message || "").toLowerCase().includes("column") &&
        String(insertError.message || "").toLowerCase().includes("tipo")
      ) {
        throw new Error("A coluna 'tipo' ainda não existe na tabela playlists.");
      }
      throw insertError;
    }

    videoInput.value = "";
    setStatus("Enviado com sucesso", "ok");
    await carregarPlaylist();
  } catch (error) {
    console.error("Erro no upload:", error);
    setStatus("Erro ao enviar: " + error.message, "erro");
  } finally {
    btnUpload.disabled = false;
  }
}

/* =========================
   RENDER DA PLAYLIST
========================= */
function montarItemPlaylistHtml(item, indice) {
  const nome = escaparHtml(item.nome || "Sem nome");
  const tipo = escaparHtml(item.tipo || detectarTipoPorNome(item.nome) || "arquivo");
  const storagePathEscapado = escaparHtml(item.storage_path || "");

  return `
    <div class="playlist-item" draggable="true" data-id="${item.id}">
      <div class="playlist-item-topo">
        <strong
          contenteditable="true"
          spellcheck="false"
          onblur="renomearItemPlaylist(${item.id}, this.innerText)"
        >${nome}</strong>
      </div>

      <div class="playlist-item-meta">
        Item ${indice + 1} • Tipo: ${tipo}
      </div>

      <div class="playlist-item-acoes">
        <button onclick="removerItemPlaylist(${item.id}, '${storagePathEscapado}')">Remover</button>
      </div>
    </div>
  `;
}

async function carregarPlaylist() {
  const codigo = pegarCodigoAtual();
  if (!codigo) return;

  try {
    let lista = await buscarPlaylist(codigo);
    lista = await garantirColunaTipoNosResultados(lista);

    if (!lista.length) {
      playlistLista.innerHTML = `
        <div class="playlist-item">
          <div class="playlist-item-topo">
            <strong>Nenhum item</strong>
          </div>
        </div>
      `;
      return;
    }

    playlistLista.innerHTML = lista
      .map((item, indice) => montarItemPlaylistHtml(item, indice))
      .join("");

    ativarDrag(lista);
  } catch (error) {
    console.error("Erro ao carregar playlist:", error);
    playlistLista.innerHTML = `
      <div class="playlist-item">
        <div class="playlist-item-topo">
          <strong>Erro ao carregar playlist</strong>
        </div>
      </div>
    `;
    setStatus("Erro ao carregar playlist", "erro");
  }
}

/* =========================
   REMOVER ITEM
========================= */
async function removerItemPlaylist(id, storagePath) {
  const confirmar = window.confirm("Deseja remover este item?");
  if (!confirmar) return;

  try {
    setStatus("Removendo item...");

    if (storagePath) {
      const { error: storageError } = await supabaseClient
        .storage
        .from(BUCKET)
        .remove([storagePath]);

      if (storageError) throw storageError;
    }

    const { error: deleteError } = await supabaseClient
      .from(TABELA)
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    await reordenarCodigo(pegarCodigoAtual());
    await carregarPlaylist();
    setStatus("Item removido com sucesso.", "ok");
  } catch (error) {
    console.error("Erro ao remover item:", error);
    setStatus("Erro ao remover item: " + error.message, "erro");
  }
}

/* =========================
   RENOMEAR ITEM DA PLAYLIST
========================= */
async function renomearItemPlaylist(id, novoNome) {
  const nomeLimpo = String(novoNome || "").trim();

  if (!nomeLimpo) {
    setStatus("Nome inválido.", "erro");
    await carregarPlaylist();
    return;
  }

  try {
    const { error } = await supabaseClient
      .from(TABELA)
      .update({ nome: nomeLimpo })
      .eq("id", id);

    if (error) throw error;

    setStatus("Nome atualizado.", "ok");
  } catch (error) {
    console.error("Erro ao renomear item:", error);
    setStatus("Erro ao renomear item: " + error.message, "erro");
    await carregarPlaylist();
  }
}

/* =========================
   DRAG & DROP
========================= */
function ativarDrag(lista) {
  const items = document.querySelectorAll(".playlist-item");

  items.forEach((item) => {
    item.addEventListener("dragstart", () => {
      dragItemId = Number(item.dataset.id);
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      item.classList.remove("drag-over");
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      item.classList.add("drag-over");
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over");
    });

    item.addEventListener("drop", async (e) => {
      e.preventDefault();
      item.classList.remove("drag-over");

      const destinoId = Number(item.dataset.id);

      if (!dragItemId || dragItemId === destinoId) return;

      try {
        const listaAtual = [...lista];
        const origemIndex = listaAtual.findIndex(x => Number(x.id) === dragItemId);
        const destinoIndex = listaAtual.findIndex(x => Number(x.id) === destinoId);

        if (origemIndex === -1 || destinoIndex === -1) return;

        const [movido] = listaAtual.splice(origemIndex, 1);
        listaAtual.splice(destinoIndex, 0, movido);

        for (let i = 0; i < listaAtual.length; i++) {
          const { error } = await supabaseClient
            .from(TABELA)
            .update({ ordem: i })
            .eq("id", listaAtual[i].id);

          if (error) throw error;
        }

        setStatus("Ordem atualizada.", "ok");
        await carregarPlaylist();
      } catch (error) {
        console.error("Erro ao ordenar playlist:", error);
        setStatus("Erro ao ordenar playlist: " + error.message, "erro");
      } finally {
        dragItemId = null;
      }
    });
  });
}

async function reordenarCodigo(codigo) {
  const lista = await buscarPlaylist(codigo);

  for (let i = 0; i < lista.length; i++) {
    const item = lista[i];

    if ((Number(item.ordem) || 0) !== i) {
      const { error } = await supabaseClient
        .from(TABELA)
        .update({ ordem: i })
        .eq("id", item.id);

      if (error) throw error;
    }
  }
}

/* =========================
   COPIAR
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
  document.querySelectorAll(".btn-copiar").forEach((btn) => {
    btn.addEventListener("click", () => {
      copiarCodigoPonto(btn.dataset.codigo);
    });
  });

  document.querySelectorAll(".btn-abrir").forEach((btn) => {
    btn.addEventListener("click", () => {
      abrirPonto(btn.dataset.codigo);
    });
  });

  document.querySelectorAll(".btn-editar-nome").forEach((btn) => {
    btn.addEventListener("click", () => {
      renomearPonto(btn.dataset.codigo);
    });
  });

  if (btnUpload) {
    btnUpload.addEventListener("click", uploadMidia);
  }

  if (btnVoltar) {
    btnVoltar.addEventListener("click", voltarParaPontos);
  }
}

/* =========================
   INIT
========================= */
window.removerItemPlaylist = removerItemPlaylist;
window.renomearItemPlaylist = renomearItemPlaylist;

async function iniciarPainel() {
  try {
    setStatus("Carregando pontos...");

    configurarEventos();

    const pontos = await buscarPontos();
    renderizarCardsPontos(pontos);

    setStatus("Painel Ativo", "ok");
  } catch (error) {
    console.error("Erro ao iniciar painel:", error);
    setStatus("Erro ao carregar pontos: " + error.message, "erro");
  }
}

configurarLogin();
