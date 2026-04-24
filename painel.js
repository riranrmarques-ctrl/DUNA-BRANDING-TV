const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";
const BUCKET = "midias";

const TABELA = "playlists";
const TABELA_PONTOS = "pontos";
const TABELA_STATUS_PONTOS = "statuspontos";

const CACHE_PONTOS_KEY = "painel_pontos_cache_v10";
const CACHE_PONTOS_TTL = 15 * 60 * 1000;
const CACHE_PLAYLIST_PREFIX = "painel_playlist_cache_v9_";
const CACHE_PLAYLIST_TTL = 60 * 1000;
const LIMITE_STATUS_ATIVO_MS = 60 * 1000;

function limparCachesAntigos() {
  try {
    sessionStorage.removeItem("painel_pontos_cache_v1");
    sessionStorage.removeItem("painel_pontos_cache_v2");
    sessionStorage.removeItem("painel_pontos_cache_v3");
    sessionStorage.removeItem("painel_pontos_cache_v4");
    sessionStorage.removeItem("painel_pontos_cache_v5");
    sessionStorage.removeItem("painel_pontos_cache_v6");
    sessionStorage.removeItem("painel_pontos_cache_v7");
    sessionStorage.removeItem("painel_pontos_cache_v8");
    sessionStorage.removeItem("painel_pontos_cache_v9");

    Object.keys(sessionStorage).forEach((key) => {
      if (
        key.startsWith("painel_playlist_cache_v1_") ||
        key.startsWith("painel_playlist_cache_v2_") ||
        key.startsWith("painel_playlist_cache_v3_") ||
        key.startsWith("painel_playlist_cache_v4_") ||
        key.startsWith("painel_playlist_cache_v5_") ||
        key.startsWith("painel_playlist_cache_v6_") ||
        key.startsWith("painel_playlist_cache_v7_") ||
        key.startsWith("painel_playlist_cache_v8_")
      ) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    return;
  }
}

limparCachesAntigos();

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

if (sessionStorage.getItem("painelLiberado") !== "1") {
  window.location.replace("centralpainel.html");
  throw new Error("Acesso bloqueado. Entre pela centralpainel.html");
}

const statusEl = document.querySelector(".status-topo") || document.getElementById("status");
const listaPontos = document.getElementById("listaPontos");
const pontoDetalhe = document.getElementById("pontoDetalhe");
const pontosBox = document.querySelector(".pontos-box");

const codigoAtual = document.getElementById("codigoAtual");
const tituloPasta = document.getElementById("tituloPasta");

const btnVoltar = document.getElementById("btnVoltar");
const btnCopiarCodigo = document.getElementById("btnCopiarCodigo");
const btnEditarInfo = document.getElementById("btnEditarInfo");
const btnToggleDisponibilidade = document.getElementById("btnToggleDisponibilidade");
const btnNovoPonto = document.getElementById("btnNovoPonto");
const btnUpgradePlaylist = document.getElementById("btnUpgradePlaylist");
const inputUpgradePlaylist = document.getElementById("inputUpgradePlaylist");
const btnDeletarPonto = document.getElementById("btnDeletarPonto");

const modalEditar = document.getElementById("modalEditar");
const editNome = document.getElementById("editNome");
const editCidade = document.getElementById("editCidade");
const editEndereco = document.getElementById("editEndereco");
const previewImagem = document.getElementById("previewImagem");
const inputImagem = document.getElementById("inputImagem");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const btnFecharModal = document.getElementById("btnFecharModal");

let codigoSelecionado = null;
let pontosMap = {};
let dragIndex = null;
let arquivoImagemEdicao = null;
let painelIniciado = false;
let carregandoPontos = false;
let carregandoPlaylist = false;
let criandoNovoPonto = false;

let posicaoImagemAtual = { x: 50, y: 50 };
let arrastandoPreview = false;

function setStatus(msg, tipo = "normal") {
  if (!statusEl) return;

  statusEl.textContent = msg;
  statusEl.classList.remove("ok", "erro");

  if (tipo === "ok") statusEl.classList.add("ok");
  if (tipo === "erro") statusEl.classList.add("erro");
}

function salvarCachePontos(pontos) {
  try {
    sessionStorage.setItem(
      CACHE_PONTOS_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        dados: pontos
      })
    );
  } catch {}
}

function lerCachePontos() {
  try {
    const cache = sessionStorage.getItem(CACHE_PONTOS_KEY);
    if (!cache) return null;

    const obj = JSON.parse(cache);

    if (Date.now() - obj.timestamp > CACHE_PONTOS_TTL) {
      sessionStorage.removeItem(CACHE_PONTOS_KEY);
      return null;
    }

    return obj.dados;
  } catch {
    return null;
  }
}

function salvarCachePlaylist(codigo, dados) {
  try {
    sessionStorage.setItem(
      CACHE_PLAYLIST_PREFIX + codigo,
      JSON.stringify({
        timestamp: Date.now(),
        dados
      })
    );
  } catch {}
}

function lerCachePlaylist(codigo) {
  try {
    const cache = sessionStorage.getItem(CACHE_PLAYLIST_PREFIX + codigo);
    if (!cache) return null;

    const obj = JSON.parse(cache);

    if (Date.now() - obj.timestamp > CACHE_PLAYLIST_TTL) {
      sessionStorage.removeItem(CACHE_PLAYLIST_PREFIX + codigo);
      return null;
    }

    return obj.dados;
  } catch {
    return null;
  }
}

function limparCachePlaylist(codigo) {
  try {
    sessionStorage.removeItem(CACHE_PLAYLIST_PREFIX + codigo);
  } catch {}
}

function iniciarPainel() {
  if (painelIniciado) return;
  painelIniciado = true;

  setStatus("Carregando pontos...", "normal");

  const cache = lerCachePontos();

  if (cache) {
    renderizarPontos(cache);
  }

  carregarPontosRemoto();
}

async function carregarPontosRemoto() {
  if (carregandoPontos) return;
  carregandoPontos = true;

  try {
    const { data, error } = await supabaseClient
      .from(TABELA_PONTOS)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    pontosMap = {};
    (data || []).forEach(p => {
      pontosMap[p.codigo] = p;
    });

    salvarCachePontos(data);
    renderizarPontos(data);

    setStatus("Pontos carregados", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Erro ao carregar pontos", "erro");
  } finally {
    carregandoPontos = false;
  }
}

function renderizarPontos(pontos) {
  if (!pontosBox) return;

  if (!pontos || !pontos.length) {
    pontosBox.innerHTML = `<div class="empty-state">Nenhum ponto encontrado</div>`;
    return;
  }

  pontosBox.innerHTML = pontos.map(p => `
    <div class="card-ponto" onclick="abrirPonto('${p.codigo}')">
      <div class="card-conteudo">
        <div class="card-nome">${p.nome || "Sem nome"}</div>
        <div class="card-cidade">${p.endereco || ""}</div>
      </div>
    </div>
  `).join("");
}

function abrirPonto(codigo) {
  codigoSelecionado = String(codigo || "").trim();

  const ponto = pontosMap[codigoSelecionado];

  if (!ponto) {
    setStatus("Ponto não encontrado", "erro");
    return;
  }

  if (listaPontos) listaPontos.style.display = "none";
  if (pontoDetalhe) pontoDetalhe.style.display = "block";

  const nome = ponto.nome || ponto.nome_local || ponto.titulo || codigoSelecionado;
  const cidade = ponto.cidade || ponto.cidade_regiao || "";
  const endereco = ponto.endereco || ponto.endereco_completo || "";
  const imagem = ponto.imagem_url || ponto.imagem || ponto.foto_url || "https://placehold.co/600x320/png";

  if (tituloPasta) tituloPasta.innerHTML = `<strong>${escapeHtml(nome)}</strong>`;
  if (codigoAtual) codigoAtual.textContent = codigoSelecionado;

  const cidadePonto = document.getElementById("cidadePonto");
  const enderecoPonto = document.getElementById("enderecoPonto");
  const imagemPonto = document.getElementById("imagemPonto");

  if (cidadePonto) cidadePonto.textContent = cidade;
  if (enderecoPonto) enderecoPonto.textContent = endereco;

  if (imagemPonto) {
    imagemPonto.src = imagem;
    imagemPonto.alt = nome;
  }

  carregarPlaylist();
}

if (btnVoltar) {
  btnVoltar.onclick = () => {
    if (pontoDetalhe) pontoDetalhe.style.display = "none";
    if (listaPontos) listaPontos.style.display = "block";
    codigoSelecionado = null;
  };
}

async function carregarPlaylist() {
  if (!codigoSelecionado || carregandoPlaylist) return;

  carregandoPlaylist = true;

  const playlistAtiva = document.getElementById("playlistAtiva");
  const historicoEncerramento = document.getElementById("historicoEncerramento");
  const historicoStatus = document.getElementById("historicoStatus");

  if (playlistAtiva) {
    playlistAtiva.innerHTML = `<div class="playlist-vazia">Carregando playlist...</div>`;
  }

  try {
    const { data, error } = await supabaseClient
      .from(TABELA)
      .select("*")
      .eq("codigo", codigoSelecionado)
      .order("ordem", { ascending: true });

    if (error) throw error;

    const ativos = (data || []).filter(item => !item.data_fim);
    const encerrados = (data || []).filter(item => item.data_fim);

    if (playlistAtiva) {
      playlistAtiva.innerHTML = ativos.length
        ? ativos.map((item, index) => montarItemPlaylist(item, index)).join("")
        : `<div class="playlist-vazia">Nenhum item ativo</div>`;
    }

    if (historicoEncerramento) {
      historicoEncerramento.innerHTML = encerrados.length
        ? encerrados.map((item, index) => montarItemHistorico(item, index)).join("")
        : `<div class="playlist-vazia">Sem histórico</div>`;
    }

    if (historicoStatus) {
      historicoStatus.innerHTML = `<div class="playlist-vazia">Sem histórico</div>`;
    }

    setStatus("Playlist carregada", "ok");
  } catch (err) {
    console.error(err);

    if (playlistAtiva) {
      playlistAtiva.innerHTML = `<div class="playlist-vazia">Erro ao carregar playlist</div>`;
    }

    setStatus("Erro ao carregar playlist", "erro");
  } finally {
    carregandoPlaylist = false;
  }
}

function montarItemPlaylist(item, index) {
  const nomeArquivo = item.titulo_arquivo || item.nome || "Arquivo";
  const cliente = item.nome_cliente || item.codigo_cliente || "Cliente não informado";
  const dataPostado = formatarDataHora(item.created_at || item.data_inicio);
  const encerramento = formatarData(item.data_fim);

  return `
    <div class="playlist-item" data-id="${escapeHtml(item.id)}">
      <div class="playlist-item-linha">
        <div class="playlist-item-handle">⋮⋮</div>
        <div class="playlist-item-ordem">${index + 1}.</div>

        <div class="playlist-item-nome">
          <strong>${escapeHtml(cliente)}</strong>
          <small>${escapeHtml(nomeArquivo)}</small>
        </div>

        <div class="playlist-item-data">${dataPostado}</div>
        <div class="playlist-item-data">${encerramento}</div>

        <div class="playlist-item-acoes-laterais">
          <button type="button" class="playlist-acao" onclick="excluirItemPlaylist('${item.id}')">×</button>
        </div>
      </div>
    </div>
  `;
}

function montarItemHistorico(item, index) {
  const nomeArquivo = item.titulo_arquivo || item.nome || "Arquivo";

  return `
    <div class="historico-item">
      <span class="historico-item-ordem">${index + 1}.</span>
      <span class="historico-item-nome">${escapeHtml(nomeArquivo)}</span>
      <span class="historico-item-valor">${formatarData(item.data_fim)}</span>
    </div>
  `;
}

async function enviarMaterialDiretoPlaylist(file) {
  if (!codigoSelecionado || !file) return;

  try {
    setStatus("Enviando material...", "normal");

    const nomeLimpo = file.name.replace(/\s+/g, "_");
    const path = `playlists/${codigoSelecionado}/${Date.now()}-${nomeLimpo}`;

    const { error: uploadError } = await supabaseClient.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "86400",
        upsert: false
      });

    if (uploadError) throw uploadError;

    await supabaseClient.from(TABELA).insert({
      codigo: codigoSelecionado,
      nome: file.name,
      titulo_arquivo: file.name,
      ordem: Date.now()
    });

    limparCachePlaylist(codigoSelecionado);
    await carregarPlaylist();

    setStatus("Material enviado", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Erro no upload", "erro");
  }
}

if (btnUpgradePlaylist && inputUpgradePlaylist) {
  btnUpgradePlaylist.onclick = () => inputUpgradePlaylist.click();

  inputUpgradePlaylist.onchange = (e) => {
    const file = e.target.files[0];
    if (file) enviarMaterialDiretoPlaylist(file);
  };
}

async function salvarEdicaoPonto() {
  if (!codigoSelecionado) return;

  try {
    const dados = {
      nome: editNome.value,
      cidade: editCidade.value,
      endereco: editEndereco.value
    };

    const { error } = await supabaseClient
      .from(TABELA_PONTOS)
      .update(dados)
      .eq("codigo", codigoSelecionado);

    if (error) throw error;

    if (modalEditar) modalEditar.style.display = "none";

    await carregarPontosRemoto();
    abrirPonto(codigoSelecionado);

    setStatus("Ponto atualizado", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Erro ao salvar edição", "erro");
  }
}

if (btnEditarInfo) {
  btnEditarInfo.onclick = () => {
    const ponto = pontosMap[codigoSelecionado];
    if (!ponto) return;

    editNome.value = ponto.nome || "";
    editCidade.value = ponto.cidade || "";
    editEndereco.value = ponto.endereco || "";

    if (modalEditar) modalEditar.style.display = "flex";
  };
}

if (btnSalvarEdicao) {
  btnSalvarEdicao.onclick = salvarEdicaoPonto;
}

if (btnFecharModal) {
  btnFecharModal.onclick = () => {
    if (modalEditar) modalEditar.style.display = "none";
  };
}

async function deletarPontoAtual() {
  if (!codigoSelecionado) return;

  const confirmar = confirm(`Deseja deletar o ponto ${codigoSelecionado}?`);
  if (!confirmar) return;

  try {
    setStatus("Deletando ponto...", "normal");

    const { data: arquivos } = await supabaseClient.storage
      .from(BUCKET)
      .list(`playlists/${codigoSelecionado}`);

    if (arquivos?.length) {
      const caminhos = arquivos.map(a => `playlists/${codigoSelecionado}/${a.name}`);
      await supabaseClient.storage.from(BUCKET).remove(caminhos);
    }

    await supabaseClient
      .from(TABELA)
      .delete()
      .eq("codigo", codigoSelecionado);

    await supabaseClient
      .from(TABELA_STATUS_PONTOS)
      .delete()
      .eq("ponto_codigo", codigoSelecionado);

    const { error } = await supabaseClient
      .from(TABELA_PONTOS)
      .delete()
      .eq("codigo", codigoSelecionado);

    if (error) throw error;

    limparCachePlaylist(codigoSelecionado);

    codigoSelecionado = null;

    if (pontoDetalhe) pontoDetalhe.style.display = "none";
    if (listaPontos) listaPontos.style.display = "block";

    await carregarPontosRemoto();

    setStatus("Ponto deletado", "ok");

  } catch (err) {
    console.error(err);
    setStatus("Erro ao deletar ponto", "erro");
  }
}

if (btnDeletarPonto) {
  btnDeletarPonto.onclick = deletarPontoAtual;
}

function excluirItemPlaylist(id) {
  if (!id) return;

  supabaseClient
    .from(TABELA)
    .delete()
    .eq("id", id)
    .then(() => {
      limparCachePlaylist(codigoSelecionado);
      carregarPlaylist();
    });
}

function formatarData(data) {
  if (!data) return "-";
  const d = new Date(data);
  return d.toLocaleDateString("pt-BR");
}

function formatarDataHora(data) {
  if (!data) return "-";
  const d = new Date(data);
  return d.toLocaleString("pt-BR");
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  setStatus("Painel Ativo", "ok");
  iniciarPainel();
});
