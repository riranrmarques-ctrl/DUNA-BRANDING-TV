const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const CODIGOS_FIXOS = [
  "H3L1",
  "E7N4",
  "H8E2",
  "L3A9",
  "N1H6",
  "E4L7",
  "A9H2",
  "H5N8",
  "L2E6",
  "N7A3",
  "E1H9",
  "A4L8",
  "H6A1",
  "L9N5",
  "E3A7",
  "N8H4",
  "A2E6",
  "H7L3",
  "L1H8",
  "E9N2"
];

const CACHE_CLIENTES_KEY = "central_clientes_cache_v2";
const CACHE_CLIENTES_TTL = 3 * 60 * 1000;
const ORDEM_PERSONALIZADA_KEY = "central_clientes_ordem_personalizada_v1";

let supabaseClient = null;
let clientesCarregados = [];
let carregandoClientes = false;
let timerBusca = null;
let dragCodigo = null;
let filtroAtual = "status";

const listaClientes = document.getElementById("listaClientes");
const mensagem = document.getElementById("mensagem");
const botaoNovoCliente = document.getElementById("botaoNovoCliente");
const botaoAtualizar = document.getElementById("botaoAtualizar");
const buscaCliente = document.getElementById("buscaCliente");
const botoesFiltro = document.querySelectorAll("[data-filtro]");
const botaoVoltarPainel = document.getElementById("botaoVoltarPainel");

function verificarAcesso() {
  const liberado = sessionStorage.getItem("painelLiberado");

  if (liberado !== "1") {
    window.location.href = "/painel.html";
    return false;
  }

  return true;
}

function mostrarMensagem(texto, cor = "#9fd2ff") {
  if (!mensagem) return;
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

function escaparHtml(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function abrirCliente(codigo) {
  window.location.href = `/pasta-cliente.html?codigo=${encodeURIComponent(codigo)}`;
}

function obterDataHojeISO() {
  return new Date().toISOString().split("T")[0];
}

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function lerCacheClientes() {
  try {
    const cache = JSON.parse(sessionStorage.getItem(CACHE_CLIENTES_KEY) || "null");
    if (!cache || !Array.isArray(cache.clientes)) return null;

    return {
      clientes: cache.clientes,
      fresco: Date.now() - Number(cache.criadoEm || 0) < CACHE_CLIENTES_TTL
    };
  } catch {
    return null;
  }
}

function salvarCacheClientes(clientes) {
  try {
    sessionStorage.setItem(CACHE_CLIENTES_KEY, JSON.stringify({
      criadoEm: Date.now(),
      clientes
    }));
  } catch {
    return;
  }
}

function lerOrdemPersonalizada() {
  try {
    const lista = JSON.parse(localStorage.getItem(ORDEM_PERSONALIZADA_KEY) || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function salvarOrdemPersonalizada(lista) {
  localStorage.setItem(ORDEM_PERSONALIZADA_KEY, JSON.stringify(lista));
}

async function copiarCodigoCliente(codigo) {
  const codigoFinal = String(codigo || "").trim();
  if (!codigoFinal) return;

  try {
    await navigator.clipboard.writeText(codigoFinal);
    mostrarMensagem(`Código ${codigoFinal} copiado.`, "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Não foi possível copiar o código.", "#ff6b6b");
  }
}

function obterNomeCliente(cliente) {
  return String(cliente.nome_completo || "Novo Cliente").trim();
}

function atualizarBotoesFiltro() {
  botoesFiltro.forEach((botao) => {
    botao.classList.toggle("ativo", botao.dataset.filtro === filtroAtual);
  });
}

function obterListaFiltrada() {
  const termo = (buscaCliente?.value || "").trim().toLowerCase();

  if (!termo) {
    return clientesCarregados;
  }

  return clientesCarregados.filter((cliente) => {
    const textoBusca = [
      cliente.codigo,
      cliente.nome_completo,
      cliente.telefone,
      cliente.email,
      cliente.cpf_cnpj,
      cliente.status_real
    ].join(" ").toLowerCase();

    return textoBusca.includes(termo);
  });
}

function ordenarClientes(lista) {
  const copia = [...lista];

  if (filtroAtual === "personalizado") {
    const ordem = lerOrdemPersonalizada();
    const posicoes = new Map(ordem.map((codigo, index) => [normalizarCodigo(codigo), index]));

    return copia.sort((a, b) => {
      const codigoA = normalizarCodigo(a.codigo);
      const codigoB = normalizarCodigo(b.codigo);
      const posA = posicoes.has(codigoA) ? posicoes.get(codigoA) : 9999;
      const posB = posicoes.has(codigoB) ? posicoes.get(codigoB) : 9999;

      if (posA !== posB) return posA - posB;
      return obterNomeCliente(a).localeCompare(obterNomeCliente(b), "pt-BR");
    });
  }

  if (filtroAtual === "nome") {
    return copia.sort((a, b) => obterNomeCliente(a).localeCompare(obterNomeCliente(b), "pt-BR"));
  }

  return copia.sort((a, b) => {
    const ativoA = a.status_real === "Ativo" ? 0 : 1;
    const ativoB = b.status_real === "Ativo" ? 0 : 1;

    if (ativoA !== ativoB) return ativoA - ativoB;
    return obterNomeCliente(a).localeCompare(obterNomeCliente(b), "pt-BR");
  });
}

function atualizarOrdemAposArrastar(codigoOrigem, codigoDestino) {
  const visiveis = ordenarClientes(obterListaFiltrada()).map((cliente) => normalizarCodigo(cliente.codigo));
  const todos = clientesCarregados.map((cliente) => normalizarCodigo(cliente.codigo));
  const ordemAtual = lerOrdemPersonalizada().filter((codigo) => todos.includes(normalizarCodigo(codigo)));

  todos.forEach((codigo) => {
    if (!ordemAtual.includes(codigo)) {
      ordemAtual.push(codigo);
    }
  });

  const origem = normalizarCodigo(codigoOrigem);
  const destino = normalizarCodigo(codigoDestino);

  if (!origem || !destino || origem === destino) return;

  const ordemVisivel = visiveis.filter((codigo) => ordemAtual.includes(codigo));
  const indexOrigem = ordemVisivel.indexOf(origem);
  const indexDestino = ordemVisivel.indexOf(destino);

  if (indexOrigem < 0 || indexDestino < 0) return;

  ordemVisivel.splice(indexOrigem, 1);
  ordemVisivel.splice(indexDestino, 0, origem);

  const novaOrdem = ordemAtual.filter((codigo) => !visiveis.includes(codigo));
  ordemVisivel.forEach((codigo) => novaOrdem.push(codigo));

  salvarOrdemPersonalizada(novaOrdem);
}

function limparAlvosDrop() {
  document.querySelectorAll(".cliente-card.alvo-drop").forEach((card) => {
    card.classList.remove("alvo-drop");
  });
}

function ativarArrasteCards() {
  if (filtroAtual !== "personalizado") return;

  document.querySelectorAll(".cliente-card").forEach((card) => {
    card.addEventListener("dragstart", () => {
      dragCodigo = card.dataset.codigo;
      card.classList.add("arrastando");
    });

    card.addEventListener("dragend", () => {
      dragCodigo = null;
      card.classList.remove("arrastando");
      limparAlvosDrop();
    });

    card.addEventListener("dragenter", (event) => {
      event.preventDefault();
      if (!dragCodigo || card.dataset.codigo === dragCodigo) return;
      limparAlvosDrop();
      card.classList.add("alvo-drop");
    });

    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!dragCodigo || card.dataset.codigo === dragCodigo) return;

      if (!card.classList.contains("alvo-drop")) {
        limparAlvosDrop();
        card.classList.add("alvo-drop");
      }
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("alvo-drop");
    });

    card.addEventListener("drop", (event) => {
      event.preventDefault();

      const destino = card.dataset.codigo;
      if (!dragCodigo || !destino || dragCodigo === destino) return;

      atualizarOrdemAposArrastar(dragCodigo, destino);
      limparAlvosDrop();
      renderizarClientes();
    });
  });
}

function renderizarClientes() {
  if (!listaClientes) return;

  atualizarBotoesFiltro();

  const filtrados = ordenarClientes(obterListaFiltrada());
  const personalizado = filtroAtual === "personalizado";

  listaClientes.innerHTML = "";

  if (!filtrados.length) {
    listaClientes.innerHTML = `<div class="vazio">Nenhum cliente encontrado.</div>`;
    return;
  }

  const fragmento = document.createDocumentFragment();

  filtrados.forEach((cliente) => {
    const card = document.createElement("div");
    const statusReal = cliente.status_real || "Não ativo";
    const ativo = statusReal === "Ativo";

    card.className = `cliente-card ${ativo ? "ativo" : "nao-ativo"} ${personalizado ? "personalizado" : ""} ${cliente.contrato_ativo === false ? "contrato-off" : ""}`;
    card.dataset.codigo = cliente.codigo;
    card.draggable = personalizado;

    card.innerHTML = `
      <div class="cliente-topo">
        <button
          class="cliente-codigo"
          type="button"
          data-codigo="${escaparHtml(cliente.codigo)}"
          title="Clique para copiar o código"
        >${escaparHtml(cliente.codigo)}</button>

        <span class="cliente-status ${ativo ? "ativo" : "nao-ativo"}">
          ${escaparHtml(statusReal)}
        </span>
      </div>

      <h3>${escaparHtml(cliente.nome_completo || "Novo Cliente")}</h3>
      <p><strong>Telefone:</strong> ${escaparHtml(cliente.telefone || "-")}</p>
    `;

    card.addEventListener("click", () => abrirCliente(cliente.codigo));

    const botaoCodigo = card.querySelector(".cliente-codigo");

    if (botaoCodigo) {
      botaoCodigo.addEventListener("click", (event) => {
        event.stopPropagation();
        copiarCodigoCliente(cliente.codigo);
      });
    }

    fragmento.appendChild(card);
  });

  listaClientes.appendChild(fragmento);
  ativarArrasteCards();
}

function aplicarClientes(clientes, mensagemTexto = "Carregado.") {
  clientesCarregados = clientes || [];
  renderizarClientes();
  mostrarMensagem(mensagemTexto, "#7CFC9A");
}

async function carregarClientes(opcoes = {}) {
  const forcarAtualizacao = opcoes.forcarAtualizacao === true;

  if (carregandoClientes) return;

  const cache = lerCacheClientes();

  if (!forcarAtualizacao && cache?.clientes?.length) {
    aplicarClientes(cache.clientes, cache.fresco ? "Carregado." : "Atualizando...");
    if (cache.fresco) return;
  }

  if (!supabaseClient) {
    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Erro ao conectar com o Supabase.</div>`;
    }

    mostrarMensagem("Supabase não carregou. Verifique o script CDN no HTML.", "#ff6b6b");
    return;
  }

  carregandoClientes = true;

  if (botaoAtualizar) {
    botaoAtualizar.disabled = true;
    botaoAtualizar.style.opacity = "0.6";
    botaoAtualizar.style.cursor = "not-allowed";
  }

  try {
    mostrarMensagem(cache?.clientes?.length ? "Atualizando..." : "Carregando clientes...");

    const hoje = obterDataHojeISO();

    const [
      { data: clientes, error: errorClientes },
      { data: playlists, error: errorPlaylists }
    ] = await Promise.all([
      supabaseClient
        .from("clientes_app")
        .select("codigo,nome_completo,telefone,email,cpf_cnpj,status,contrato_ativo,data_postagem")
        .order("codigo", { ascending: true }),

      supabaseClient
        .from("playlists")
        .select("codigo_cliente,data_fim")
        .or(`data_fim.is.null,data_fim.gte.${hoje}`)
    ]);

    if (errorClientes) throw errorClientes;
    if (errorPlaylists) throw errorPlaylists;

    const mapaAtivos = new Map();

    (playlists || []).forEach((item) => {
      const codigo = normalizarCodigo(item.codigo_cliente);
      if (!codigo) return;
      mapaAtivos.set(codigo, true);
    });

    const final = (clientes || []).map((cliente) => {
      const codigoOriginal = String(cliente.codigo || "").trim();
      const codigoNormalizado = normalizarCodigo(codigoOriginal);
      const statusReal = mapaAtivos.has(codigoNormalizado) ? "Ativo" : "Não ativo";

      return {
        ...cliente,
        status_real: statusReal
      };
    });

    salvarCacheClientes(final);
    aplicarClientes(final, "Carregado.");
  } catch (error) {
    console.error(error);

    if (cache?.clientes?.length) {
      aplicarClientes(cache.clientes, "Carregado pelo cache.");
      return;
    }

    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Erro ao carregar clientes.</div>`;
    }

    mostrarMensagem("Erro ao carregar clientes do Supabase.", "#ff6b6b");
  } finally {
    carregandoClientes = false;

    if (botaoAtualizar) {
      botaoAtualizar.disabled = false;
      botaoAtualizar.style.opacity = "1";
      botaoAtualizar.style.cursor = "pointer";
    }
  }
}

function obterCodigoLivre() {
  const usados = new Set(clientesCarregados.map((cliente) => cliente.codigo));
  return CODIGOS_FIXOS.find((codigo) => !usados.has(codigo)) || null;
}

async function criarNovoCliente() {
  const codigoLivre = obterCodigoLivre();

  if (!codigoLivre) {
    mostrarMensagem("Todos os códigos fixos já foram usados.", "#ffb86b");
    return;
  }

  try {
    if (botaoNovoCliente) {
      botaoNovoCliente.disabled = true;
      botaoNovoCliente.style.opacity = "0.6";
      botaoNovoCliente.style.cursor = "not-allowed";
    }

    mostrarMensagem("Criando novo cliente...");

    const payload = {
      codigo: codigoLivre,
      nome_completo: "Novo Cliente",
      telefone: "",
      email: "",
      cpf_cnpj: "",
      status: "Não ativo",
      vencimento_exibicao: null
    };

    const { error } = await supabaseClient
      .from("clientes_app")
      .insert(payload);

    if (error) throw error;

    sessionStorage.removeItem(CACHE_CLIENTES_KEY);

    mostrarMensagem(`Cliente ${codigoLivre} criado com sucesso.`, "#7CFC9A");
    await carregarClientes({ forcarAtualizacao: true });
    abrirCliente(codigoLivre);
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao criar novo cliente.", "#ff6b6b");
  } finally {
    if (botaoNovoCliente) {
      botaoNovoCliente.disabled = false;
      botaoNovoCliente.style.opacity = "1";
      botaoNovoCliente.style.cursor = "pointer";
    }
  }
}

function iniciarPagina() {
  if (botaoVoltarPainel) {
    botaoVoltarPainel.addEventListener("click", () => {
      window.location.href = "/painel.html";
    });
  }

  if (!verificarAcesso()) {
    return;
  }

  if (!window.supabase) {
    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Supabase não carregou.</div>`;
    }

    mostrarMensagem("Supabase não carregou. Verifique o script no HTML.", "#ff6b6b");
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  if (botaoNovoCliente) {
    botaoNovoCliente.addEventListener("click", criarNovoCliente);
  }

  if (botaoAtualizar) {
    botaoAtualizar.addEventListener("click", () => carregarClientes({ forcarAtualizacao: true }));
  }

  if (buscaCliente) {
    buscaCliente.addEventListener("input", () => {
      clearTimeout(timerBusca);
      timerBusca = setTimeout(renderizarClientes, 180);
    });
  }

  botoesFiltro.forEach((botao) => {
    botao.addEventListener("click", () => {
      filtroAtual = botao.dataset.filtro || "status";
      renderizarClientes();
    });
  });

  atualizarBotoesFiltro();
  carregarClientes();
}

iniciarPagina();
