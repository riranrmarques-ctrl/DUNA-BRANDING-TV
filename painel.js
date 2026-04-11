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

function setStatus(texto, tipo = "normal") {
  if (!statusEl) return;

  statusEl.textContent = texto;
  statusEl.className = "status-box";

  if (tipo === "erro") statusEl.classList.add("erro");
  if (tipo === "ok") statusEl.classList.add("ok");
}

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
      if (event.key === "Enter") {
        validarLogin();
      }
    });
  }
}

async function buscarPontos() {
  const { data, error } = await supabaseClient
    .from(TABELA_PONTOS)
    .select("*")
    .order("codigo", { ascending: true });

  if (error) throw error;
  return data || [];
}

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

async function pegarProximaOrdem(codigo) {
  const lista = await buscarPlaylist(codigo);

  if (!lista.length) return 0;

  const maior = Math.max(...lista.map(item => Number(item.ordem) || 0));
  return maior + 1;
}

function montarItemHtml(item, indice, total) {
  const nome = escaparHtml(item.nome || "Sem nome");
  const url = escaparHtml(item.video_url || "");
  const storagePathEscapado = escaparHtml(item.storage_path || "");

  return `
    <div class="playlist-item" data-id="${item.id}">
      <div class="playlist-item-topo">
        <strong>${indice + 1}. ${nome}</strong>
      </div>

      <div class="playlist-item-url">
        <a href="${url}" target="_blank" rel="noopener noreferrer">Abrir vídeo</a>
      </div>

      <div class="playlist-item-acoes">
        <button onclick="moverVideo(${item.id}, 'up')" ${indice === 0 ? "disabled" : ""}>↑ Subir</button>
        <button onclick="moverVideo(${item.id}, 'down')" ${indice === total - 1 ? "disabled" : ""}>↓ Descer</button>
        <button onclick="removerVideo(${item.id}, '${storagePathEscapado}')">Remover</button>
        <button onclick="copiarLinkPlayer('${item.codigo}')">Copiar link do player</button>
      </div>
    </div>
  `;
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

async function renderizarPlaylist() {
  const codigo = pegarCodigoAtual();
  if (!codigo) return;

  codigoAtual.textContent = codigo;
  nomeAtual.textContent = pontosMap[codigo]?.nome || `Ponto ${codigo}`;
  playlistLista.innerHTML = "<div class='playlist-item'><div class='playlist-item-topo'><strong>Carregando playlist...</strong></div></div>";

  try {
    const lista = await buscarPlaylist(codigo);

    if (!lista.length) {
      playlistLista.innerHTML = `
        <div class="playlist-item">
          <div class="playlist-item-topo">
            <strong>Nenhum vídeo carregado.</strong>
          </div>
        </div>
      `;
      return;
    }

    playlistLista.innerHTML = lista
      .map((item, indice) => montarItemHtml(item, indice, lista.length))
      .join("");
  } catch (error) {
    console.error("Erro ao renderizar playlist:", error);
    playlistLista.innerHTML = `
      <div class="playlist-item">
        <div class="playlist-item-topo">
          <strong>Erro ao carregar playlist.</strong>
        </div>
      </div>
    `;
    setStatus("Erro ao carregar playlist: " + error.message, "erro");
  }
}

function abrirPonto(codigo) {
  codigoSelecionado = codigo;

  codigoAtual.textContent = codigo;
  nomeAtual.textContent = pontosMap[codigo]?.nome || `Ponto ${codigo}`;

  listaPontos.style.display = "none";
  pontoDetalhe.style.display = "block";

  setStatus(`Pasta ${codigo} aberta.`, "ok");
  renderizarPlaylist();
}

function voltarParaPontos() {
  codigoSelecionado = null;
  pontoDetalhe.style.display = "none";
  listaPontos.style.display = "grid";
  setStatus("Painel Ativo", "ok");
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

async function uploadVideo() {
  const codigo = pegarCodigoAtual();
  const arquivo = videoInput.files[0];

  if (!codigo) {
    setStatus("Abra uma pasta antes de enviar vídeo.", "erro");
    return;
  }

  if (!arquivo) {
    setStatus("Selecione um vídeo antes de enviar.", "erro");
    return;
  }

  try {
    btnUpload.disabled = true;
    setStatus("Enviando vídeo...");

    const nomeSeguro = arquivo.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const nomeFinal = `${Date.now()}-${nomeSeguro || "video.mp4"}`;
    const caminho = `${codigo}/${nomeFinal}`;

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

    const videoUrl = publicData.publicUrl;
    const ordem = await pegarProximaOrdem(codigo);

    const { error: insertError } = await supabaseClient
      .from(TABELA)
      .insert({
        codigo: codigo,
        nome: arquivo.name,
        video_url: videoUrl,
        storage_path: caminho,
        ordem: ordem
      });

    if (insertError) throw insertError;

    videoInput.value = "";
    setStatus("Vídeo enviado com sucesso.", "ok");
    await renderizarPlaylist();
  } catch (error) {
    console.error("Erro no upload:", error);
    setStatus("Erro ao enviar vídeo: " + error.message, "erro");
  } finally {
    btnUpload.disabled = false;
  }
}

async function removerVideo(id, storagePath) {
  const confirmar = window.confirm("Deseja remover este vídeo?");
  if (!confirmar) return;

  try {
    setStatus("Removendo vídeo...");

    const { error: storageError } = await supabaseClient
      .storage
      .from(BUCKET)
      .remove([storagePath]);

    if (storageError) throw storageError;

    const { error: deleteError } = await supabaseClient
      .from(TABELA)
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    await reordenarCodigo(pegarCodigoAtual());
    setStatus("Vídeo removido com sucesso.", "ok");
    await renderizarPlaylist();
  } catch (error) {
    console.error("Erro ao remover vídeo:", error);
    setStatus("Erro ao remover vídeo: " + error.message, "erro");
  }
}

async function moverVideo(id, direcao) {
  try {
    const codigo = pegarCodigoAtual();
    const lista = await buscarPlaylist(codigo);

    const indiceAtualLista = lista.findIndex(item => Number(item.id) === Number(id));
    if (indiceAtualLista === -1) return;

    const novoIndice = direcao === "up" ? indiceAtualLista - 1 : indiceAtualLista + 1;

    if (novoIndice < 0 || novoIndice >= lista.length) return;

    const atual = lista[indiceAtualLista];
    const destino = lista[novoIndice];

    const ordemAtual = atual.ordem;
    const ordemDestino = destino.ordem;

    const { error: error1 } = await supabaseClient
      .from(TABELA)
      .update({ ordem: ordemDestino })
      .eq("id", atual.id);

    if (error1) throw error1;

    const { error: error2 } = await supabaseClient
      .from(TABELA)
      .update({ ordem: ordemAtual })
      .eq("id", destino.id);

    if (error2) throw error2;

    setStatus("Ordem atualizada.", "ok");
    await renderizarPlaylist();
  } catch (error) {
    console.error("Erro ao mover vídeo:", error);
    setStatus("Erro ao mover vídeo: " + error.message, "erro");
  }
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

function copiarLinkPlayer(codigo) {
  const link = `${window.location.origin}/player.html?codigo=${codigo}`;

  navigator.clipboard.writeText(link)
    .then(() => {
      setStatus("Link copiado: " + link, "ok");
    })
    .catch(() => {
      setStatus("Não foi possível copiar o link.", "erro");
    });
}

function configurarEventos() {
  document.querySelectorAll(".btn-copiar").forEach((btn) => {
    btn.addEventListener("click", () => {
      copiarLinkPlayer(btn.dataset.codigo);
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
    btnUpload.addEventListener("click", uploadVideo);
  }

  if (btnVoltar) {
    btnVoltar.addEventListener("click", voltarParaPontos);
  }
}

window.removerVideo = removerVideo;
window.moverVideo = moverVideo;
window.copiarLinkPlayer = copiarLinkPlayer;

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
