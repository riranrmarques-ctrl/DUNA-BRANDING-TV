const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "pontos";
const TABELA = "playlists";
const TABELA_PONTOS = "pontos";

const SENHA_PAINEL = "@Helena26";

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
const tituloPasta = document.getElementById("tituloPasta");

const btnVoltar = document.getElementById("btnVoltar");
const btnCopiarCodigo = document.getElementById("btnCopiarCodigo");
const btnEditarInfo = document.getElementById("btnEditarInfo");
const btnTrocarImagem = document.getElementById("btnTrocarImagem");

let codigoSelecionado = null;
let pontosMap = {};
let dragIndex = null;

function setStatus(texto, tipo = "normal") {
  if (!statusEl) return;
  statusEl.textContent = texto;
  statusEl.className = "status-box";
  if (tipo === "ok") statusEl.classList.add("ok");
  if (tipo === "erro") statusEl.classList.add("erro");
}

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function obterImagemPonto(ponto) {
  return ponto?.imagem_url || "https://placehold.co/600x320/png";
}

function obterCidadeFormatada(cidade) {
  const nome = String(cidade || "").trim();
  return nome ? `Cidade de ${nome}` : "Cidade não definida";
}

function calcularStatusInfo(ponto) {
  if (!ponto?.ultimo_ping) {
    return {
      texto: "Inativo",
      detalhe: "sem histórico",
      ativo: false
    };
  }

  const dataPing = new Date(ponto.ultimo_ping);
  if (Number.isNaN(dataPing.getTime())) {
    return {
      texto: "Inativo",
      detalhe: "sem histórico",
      ativo: false
    };
  }

  const diff = Date.now() - dataPing.getTime();
  const horario = dataPing.toLocaleString("pt-BR");

  if (diff < 5 * 60 * 1000) {
    return {
      texto: "Ativo",
      detalhe: horario,
      ativo: true
    };
  }

  return {
    texto: "Inativo",
    detalhe: horario,
    ativo: false
  };
}

function formatarData(valor) {
  if (!valor) return "Sem data";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Sem data";
  return data.toLocaleDateString("pt-BR");
}

function formatarDataHora(valor) {
  if (!valor) return "Sem data";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Sem data";
  return data.toLocaleString("pt-BR");
}

function itemEstaInativo(item) {
  if (!item?.data_fim) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fim = new Date(item.data_fim);
  if (Number.isNaN(fim.getTime())) return false;

  fim.setHours(23, 59, 59, 999);
  return fim < hoje;
}

function criarSeletorImagem() {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", () => {
      const file = input.files && input.files[0] ? input.files[0] : null;
      document.body.removeChild(input);
      resolve(file);
    });

    input.click();
  });
}

async function uploadImagemPonto(file, codigo) {
  const extensao = (file.name.split(".").pop() || "jpg").toLowerCase();
  const nomeArquivo = `${codigo}/${Date.now()}.${extensao}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(BUCKET)
    .upload(nomeArquivo, file, {
      cacheControl: "3600",
      upsert: true
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(nomeArquivo);
  return data.publicUrl;
}

function validarLogin() {
  if (!senhaInput || senhaInput.value.trim() !== SENHA_PAINEL) {
    if (loginErro) loginErro.textContent = "Código inválido";
    return;
  }

  if (loginErro) loginErro.textContent = "";
  if (loginBox) loginBox.style.display = "none";
  if (conteudoPainel) conteudoPainel.style.display = "block";

  setStatus("Painel Ativo", "ok");
  iniciarPainel();
}

if (btnLogin) {
  btnLogin.onclick = validarLogin;
}

if (senhaInput) {
  senhaInput.addEventListener("keydown", e => {
    if (e.key === "Enter") validarLogin();
  });
}

async function buscarPontos() {
  const { data, error } = await supabaseClient.from(TABELA_PONTOS).select("*");

  if (error) {
    setStatus("Erro ao carregar pontos", "erro");
    return [];
  }

  return data || [];
}

function renderizarCardsPontos(lista) {
  pontosMap = {};
  lista.forEach(p => {
    pontosMap[p.codigo] = p;
  });

  document.querySelectorAll(".card-ponto").forEach(card => {
    const codigo = String(card.dataset.codigo || "").trim();
    const ponto = pontosMap[codigo] || {};

    const nomeEl = card.querySelector(".card-nome");
    const cidadeEl = card.querySelector(".card-cidade");
    const statusElCard = card.querySelector(".card-status");
    const bolinhaEl = card.querySelector(".status-bolinha");
    const imagemEl = card.querySelector(".card-imagem");

    const statusInfo = calcularStatusInfo(ponto);

    if (nomeEl) {
      nomeEl.textContent = ponto.nome || codigo;
    }

    if (cidadeEl) {
      cidadeEl.textContent = obterCidadeFormatada(ponto.cidade);
    }

    if (statusElCard) {
      statusElCard.textContent = `${statusInfo.texto} ${statusInfo.detalhe}`;
    }

    if (bolinhaEl) {
      bolinhaEl.classList.toggle("ativo", statusInfo.ativo);
      bolinhaEl.classList.toggle("inativo", !statusInfo.ativo);
    }

    if (imagemEl) {
      imagemEl.src = obterImagemPonto(ponto);
      imagemEl.alt = ponto.nome || codigo;
    }
  });
}

function abrirPonto(codigo) {
  codigoSelecionado = String(codigo || "").trim();
  const ponto = pontosMap[codigoSelecionado] || {};

  if (listaPontos) listaPontos.style.display = "none";
  if (pontoDetalhe) pontoDetalhe.style.display = "block";

  if (codigoAtual) {
    codigoAtual.textContent = codigoSelecionado;
  }

  if (tituloPasta) {
    tituloPasta.textContent = ponto.nome || codigoSelecionado;
  }

  const cidadePonto = document.getElementById("cidadePonto");
  const enderecoPonto = document.getElementById("enderecoPonto");
  const statusPonto = document.getElementById("statusPonto");
  const imagemPonto = document.getElementById("imagemPonto");

  const statusInfo = calcularStatusInfo(ponto);

  if (cidadePonto) {
    cidadePonto.textContent = obterCidadeFormatada(ponto.cidade);
  }

  if (enderecoPonto) {
    enderecoPonto.textContent = ponto.endereco || "Endereço não definido";
  }

  if (statusPonto) {
    statusPonto.textContent = `${statusInfo.texto} • ${statusInfo.detalhe}`;
  }

  if (imagemPonto) {
    imagemPonto.src = obterImagemPonto(ponto);
    imagemPonto.alt = ponto.nome || codigoSelecionado;
  }

  carregarPlaylist();
}

if (btnVoltar) {
  btnVoltar.onclick = () => {
    if (listaPontos) listaPontos.style.display = "grid";
    if (pontoDetalhe) pontoDetalhe.style.display = "none";
  };
}

if (btnCopiarCodigo) {
  btnCopiarCodigo.onclick = async () => {
    if (!codigoSelecionado) return;

    try {
      await navigator.clipboard.writeText(codigoSelecionado);
      setStatus("Código copiado", "ok");
    } catch {
      setStatus("Erro ao copiar código", "erro");
    }
  };
}

if (btnEditarInfo) {
  btnEditarInfo.onclick = async () => {
    if (!codigoSelecionado) return;

    const ponto = pontosMap[codigoSelecionado] || {};

    const nome = prompt("Nome:", ponto.nome || "");
    if (nome === null) return;

    const cidade = prompt("Cidade:", ponto.cidade || "");
    if (cidade === null) return;

    const endereco = prompt("Endereço:", ponto.endereco || "");
    if (endereco === null) return;

    const { error } = await supabaseClient
      .from(TABELA_PONTOS)
      .update({
        nome: nome.trim(),
        cidade: cidade.trim(),
        endereco: endereco.trim()
      })
      .eq("codigo", codigoSelecionado);

    if (error) {
      console.error(error);
      setStatus("Erro ao atualizar informações", "erro");
      return;
    }

    ponto.nome = nome.trim();
    ponto.cidade = cidade.trim();
    ponto.endereco = endereco.trim();
    pontosMap[codigoSelecionado] = ponto;

    abrirPonto(codigoSelecionado);
    renderizarCardsPontos(Object.values(pontosMap));
    setStatus("Atualizado com sucesso", "ok");
  };
}

if (btnTrocarImagem) {
  btnTrocarImagem.onclick = async () => {
    if (!codigoSelecionado) return;

    try {
      const arquivo = await criarSeletorImagem();
      if (!arquivo) return;

      setStatus("Enviando imagem...", "normal");

      const imagemUrlFinal = await uploadImagemPonto(arquivo, codigoSelecionado);

      const { error } = await supabaseClient
        .from(TABELA_PONTOS)
        .update({
          imagem_url: imagemUrlFinal
        })
        .eq("codigo", codigoSelecionado);

      if (error) {
        console.error(error);
        setStatus("Erro ao atualizar imagem", "erro");
        return;
      }

      const ponto = pontosMap[codigoSelecionado] || {};
      ponto.imagem_url = imagemUrlFinal;
      pontosMap[codigoSelecionado] = ponto;

      const imagemPonto = document.getElementById("imagemPonto");
      if (imagemPonto) {
        imagemPonto.src = imagemUrlFinal;
      }

      renderizarCardsPontos(Object.values(pontosMap));
      setStatus("Imagem atualizada com sucesso", "ok");
    } catch (error) {
      console.error(error);
      setStatus("Erro ao enviar imagem", "erro");
    }
  };
}

function montarItemPlaylist(item, index) {
  return `
    <div class="playlist-item" draggable="true" data-index="${index}">
      <div class="playlist-item-handle">⋮⋮</div>

      <div class="playlist-item-conteudo">
        <div class="playlist-item-nome">${escapeHtml(item.nome)}</div>
        <div class="playlist-item-info">
          Postado em: ${formatarDataHora(item.created_at)}<br>
          Encerramento: ${formatarData(item.data_fim)}
        </div>
      </div>

      <div class="playlist-item-acoes-laterais">
        <button class="playlist-acao btn-excluir-item" type="button" data-id="${item.id}" title="Excluir">🗑</button>
      </div>
    </div>
  `;
}

function montarItemHistorico(item) {
  return `
    <div>
      ${escapeHtml(item.nome)} — ${formatarData(item.data_fim)}
    </div>
  `;
}

async function carregarPlaylist() {
  if (!codigoSelecionado) return;

  const { data, error } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigoSelecionado)
    .order("ordem", { ascending: true });

  if (error) {
    console.error(error);
    setStatus("Erro ao carregar playlist", "erro");
    return;
  }

  const lista = data || [];
  const ativos = lista.filter(item => !itemEstaInativo(item));
  const inativos = lista.filter(item => itemEstaInativo(item));

  const playlistAtiva = document.getElementById("playlistAtiva");
  const playlistInativa = document.getElementById("playlistInativa");

  if (playlistAtiva) {
    playlistAtiva.innerHTML = ativos.length
      ? ativos.map((item, index) => montarItemPlaylist(item, index)).join("")
      : `<div class="playlist-vazia">Nenhum item ativo</div>`;
  }

  if (playlistInativa) {
    playlistInativa.innerHTML = inativos.length
      ? inativos.map(item => montarItemHistorico(item)).join("")
      : `<div class="playlist-vazia">Sem histórico</div>`;
  }

  ativarDrag(ativos);
  ativarExclusaoItens();
}

async function ativarExclusaoItens() {
  document.querySelectorAll(".btn-excluir-item").forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();

      const id = btn.dataset.id;
      if (!id) return;

      const confirmar = window.confirm("Deseja excluir este item da playlist?");
      if (!confirmar) return;

      const { error } = await supabaseClient
        .from(TABELA)
        .delete()
        .eq("id", id);

      if (error) {
        console.error(error);
        setStatus("Erro ao excluir item", "erro");
        return;
      }

      setStatus("Item excluído", "ok");
      carregarPlaylist();
    };
  });
}

function ativarDrag(lista) {
  const items = document.querySelectorAll("#playlistAtiva .playlist-item");

  items.forEach(item => {
    item.addEventListener("dragstart", () => {
      dragIndex = Number(item.dataset.index);
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });

    item.addEventListener("dragover", e => {
      e.preventDefault();
      item.classList.add("drag-over");
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over");
    });

    item.addEventListener("drop", async () => {
      item.classList.remove("drag-over");

      const target = Number(item.dataset.index);
      if (Number.isNaN(dragIndex) || Number.isNaN(target) || dragIndex === target) return;

      const novo = [...lista];
      const movido = novo.splice(dragIndex, 1)[0];
      novo.splice(target, 0, movido);

      for (let i = 0; i < novo.length; i++) {
        const { error } = await supabaseClient
          .from(TABELA)
          .update({ ordem: i })
          .eq("id", novo[i].id);

        if (error) {
          console.error(error);
          setStatus("Erro ao reordenar playlist", "erro");
          return;
        }
      }

      carregarPlaylist();
    });
  });
}

async function iniciarPainel() {
  const pontos = await buscarPontos();
  renderizarCardsPontos(pontos);

  document.querySelectorAll(".btn-abrir").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      abrirPonto(btn.dataset.codigo);
    };
  });

  document.querySelectorAll(".btn-copiar").forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      const codigo = btn.dataset.codigo;
      if (!codigo) return;

      try {
        await navigator.clipboard.writeText(codigo);
        setStatus("Código copiado", "ok");
      } catch {
        setStatus("Erro ao copiar código", "erro");
      }
    };
  });
}
