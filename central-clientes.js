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
  "E9N2",

  "H2E7",
  "E5L3",
  "L8A1",
  "N4H9",
  "A7E2",
  "H1L6",
  "E9A4",
  "L3N8",
  "A6H5",
  "N2E7",

  "R4I8",
  "I7R2",
  "R9A5",
  "A3N1",
  "N6R7",
  "R2I9",
  "I5A4",
  "A8R3",
  "N1I6",
  "R7N2",

  "P3A8",
  "A1L7",
  "L5O2",
  "O9M4",
  "M6A3",
  "P7L1",
  "A4O8",
  "L2M9",
  "O5P6",
  "M1A7",

  "A9L2",
  "L4F8",
  "F7A3",
  "A5F1",
  "L8A6",
  "F2L9",
  "A3L7",
  "L1F4",
  "F6A8",
  "A7F2",

  "H4A6",
  "E2N9",
  "L7E3",
  "N5A8",
  "A1H7",
  "H9E4",
  "E6L2",
  "L8N1",
  "N3A5",
  "A7E9",

  "R5A2",
  "I3N8",
  "R7I1",
  "A4R6",
  "N9I5",
  "R2A7",
  "I8R4",
  "A6N3",
  "N1R9",
  "R8I2",

  "P6O1",
  "A3M7",
  "L9A2",
  "O4P8",
  "M5L3",
  "P2A9",
  "A8L6",
  "L1O5",
  "O7M4",
  "M3P2",

  "A6F9",
  "L2A8",
  "F5L1",
  "A7F4",
  "L3F2",
  "F8A6",
  "A1L9",
  "L5A7",
  "F4L3",
  "A8F2"
];

const CACHE_CLIENTES_KEY = "central_clientes_cache_v2";
const CACHE_CLIENTES_TTL = 3 * 60 * 1000;
const ORDEM_PERSONALIZADA_KEY = "central_clientes_ordem_personalizada_v1";
const FILTRO_CLIENTES_KEY = "central_clientes_filtro_v1";
const ADMIN_TOKEN_KEY = "painelToken";

let clientesCarregados = [];
let carregandoClientes = false;
let timerBusca = null;
let timerMensagem = null;
let timerLimparMensagem = null;
let dragCodigo = null;
let filtroAtual = localStorage.getItem(FILTRO_CLIENTES_KEY) || "status";

const listaClientes = document.getElementById("listaClientes");
const mensagem = document.getElementById("mensagem");
const botaoNovoCliente = document.getElementById("botaoNovoCliente");
const botaoAtualizar = document.getElementById("botaoAtualizar");
const buscaCliente = document.getElementById("buscaCliente");
const botoesFiltro = document.querySelectorAll("[data-filtro]");
const botaoVoltarPainel = document.getElementById("botaoVoltarPainel");

function obterAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

function verificarAcesso() {
  const liberado = sessionStorage.getItem("painelLiberado");
  const token = sessionStorage.getItem("painelToken");

  if (liberado !== "1" || !token) {
    console.warn("Sessão inválida, redirecionando...");
    return false; //
  }

  return true;
}

async function chamarApi(url, opcoes = {}) {
  const token = obterAdminToken();

  const resposta = await fetch(url, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": token,
      ...(opcoes.headers || {})
    }
  });

  const json = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(json.error || "Erro na API.");
  }

  return json;
}

  if (!resposta.ok) {
    throw new Error(json.error || "Erro na API.");
  }

  return json;
}

function mostrarMensagem(texto, cor = "#9fd2ff") {
  if (!mensagem) return;

  if (timerMensagem) {
    clearTimeout(timerMensagem);
    timerMensagem = null;
  }

  if (timerLimparMensagem) {
    clearTimeout(timerLimparMensagem);
    timerLimparMensagem = null;
  }

  mensagem.classList.remove("saindo");
  mensagem.textContent = texto || "";
  mensagem.style.color = cor;

  if (!texto) return;

  timerMensagem = setTimeout(() => {
    mensagem.classList.add("saindo");

    timerLimparMensagem = setTimeout(() => {
      mensagem.textContent = "";
      mensagem.classList.remove("saindo");
    }, 300);
  }, 5000);
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

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function clienteEhSupervisor(cliente) {
  return String(cliente?.tipo_acesso || "").trim().toLowerCase() === "supervisor";
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
    return Array.isArray(lista) ? lista.map(normalizarCodigo) : [];
  } catch {
    return [];
  }
}

function salvarOrdemPersonalizada(lista) {
  localStorage.setItem(
    ORDEM_PERSONALIZADA_KEY,
    JSON.stringify((lista || []).map(normalizarCodigo).filter(Boolean))
  );
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
      cliente.status_real,
      cliente.tipo_acesso
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

  if (filtroAtual === "data") {
    return copia.sort((a, b) => {
      const dataA = new Date(a.data_postagem || 0).getTime();
      const dataB = new Date(b.data_postagem || 0).getTime();

      if (dataA !== dataB) return dataB - dataA;
      return obterNomeCliente(a).localeCompare(obterNomeCliente(b), "pt-BR");
    });
  }

  return copia.sort((a, b) => {
    const supervisorA = clienteEhSupervisor(a) ? 0 : 1;
    const supervisorB = clienteEhSupervisor(b) ? 0 : 1;

    if (supervisorA !== supervisorB) return supervisorA - supervisorB;

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
    const supervisor = clienteEhSupervisor(cliente);

    card.className = `cliente-card ${supervisor ? "supervisor" : ativo ? "ativo" : "nao-ativo"} ${personalizado ? "personalizado" : ""}`;
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

        <div class="cliente-selos">
          ${
            supervisor
              ? `<span class="cliente-tipo supervisor">Supervisor</span>`
              : `<span class="cliente-status ${ativo ? "ativo" : "nao-ativo"}">
                  ${escaparHtml(statusReal)}
                </span>`
          }
        </div>
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

  if (!lerOrdemPersonalizada().length) {
    salvarOrdemPersonalizada(clientesCarregados.map((cliente) => cliente.codigo));
  }

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

  carregandoClientes = true;

  if (botaoAtualizar) {
    botaoAtualizar.disabled = true;
    botaoAtualizar.style.opacity = "0.6";
    botaoAtualizar.style.cursor = "not-allowed";
  }

  try {
    mostrarMensagem(cache?.clientes?.length ? "Atualizando..." : "Carregando clientes...");

    const resposta = await chamarApi("/api/admin-clientes");
    const clientes = Array.isArray(resposta.clientes) ? resposta.clientes : [];

    salvarCacheClientes(clientes);
    aplicarClientes(clientes, "Carregado.");
  } catch (error) {
    console.error(error);

    if (cache?.clientes?.length) {
      aplicarClientes(cache.clientes, "Carregado pelo cache.");
      return;
    }

    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Erro ao carregar clientes.</div>`;
    }

    mostrarMensagem(error.message || "Erro ao carregar clientes.", "#ff6b6b");
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

    await chamarApi("/api/admin-clientes", {
      method: "POST",
      body: JSON.stringify({ codigo: codigoLivre })
    });

    sessionStorage.removeItem(CACHE_CLIENTES_KEY);

    mostrarMensagem(`Cliente ${codigoLivre} criado com sucesso.`, "#7CFC9A");
    await carregarClientes({ forcarAtualizacao: true });
    abrirCliente(codigoLivre);
  } catch (error) {
    console.error(error);
    mostrarMensagem(error.message || "Erro ao criar novo cliente.", "#ff6b6b");
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
    mostrarMensagem("Sessão expirada. Faça login novamente.", "#ff6b6b");
    return;
  }

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
      localStorage.setItem(FILTRO_CLIENTES_KEY, filtroAtual);
      renderizarClientes();
    });
  });

  atualizarBotoesFiltro();
  carregarClientes();
}

iniciarPagina();
