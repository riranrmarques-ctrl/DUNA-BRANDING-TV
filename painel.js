const codigosFixos = [
  { codigo: "0001", nomePadrao: "Pasta 1" },
  { codigo: "0002", nomePadrao: "Pasta 2" },
  { codigo: "0003", nomePadrao: "Pasta 3" },
  { codigo: "0004", nomePadrao: "Pasta 4" },
  { codigo: "0005", nomePadrao: "Pasta 5" }
];

const cardsContainer = document.getElementById("cardsContainer");
const jsonOutput = document.getElementById("jsonOutput");

let clientes = {
  "0001": { nome: "Pasta 1", playlist: [] },
  "0002": { nome: "Pasta 2", playlist: [] },
  "0003": { nome: "Pasta 3", playlist: [] },
  "0004": { nome: "Pasta 4", playlist: [] },
  "0005": { nome: "Pasta 5", playlist: [] }
};

function garantirEstrutura() {
  codigosFixos.forEach(item => {
    if (!clientes[item.codigo]) {
      clientes[item.codigo] = {
        nome: item.nomePadrao,
        playlist: []
      };
    }

    if (!clientes[item.codigo].nome) {
      clientes[item.codigo].nome = item.nomePadrao;
    }

    if (!Array.isArray(clientes[item.codigo].playlist)) {
      clientes[item.codigo].playlist = [];
    }
  });
}

function renderizarCards() {
  cardsContainer.innerHTML = "";

  codigosFixos.forEach(item => {
    const cliente = clientes[item.codigo];
    const nome = cliente?.nome || item.nomePadrao;
    const playlist = cliente?.playlist || [];

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${escapeHtml(nome)}</h3>
      <div class="code-badge">Código fixo: ${item.codigo}</div>

      <div class="field">
        <label for="nome-${item.codigo}">Nome da pasta</label>
        <input
          type="text"
          id="nome-${item.codigo}"
          value="${escapeHtmlAttr(nome)}"
          placeholder="Digite o nome da pasta"
        >
      </div>

      <div class="field">
        <label for="links-${item.codigo}">Links dos vídeos (1 por linha)</label>
        <textarea
          id="links-${item.codigo}"
          placeholder="https://site.com/video1.mp4&#10;https://site.com/video2.mp4"
        >${playlist.join("\n")}</textarea>
      </div>

      <div class="preview-box" id="preview-${item.codigo}">
        ${montarPreview(playlist)}
      </div>

      <div class="card-actions">
        <button class="btn-save" onclick="salvarCard('${item.codigo}')">Salvar</button>
        <button class="btn-clear" onclick="limparCard('${item.codigo}')">Limpar</button>
      </div>

      <div class="status" id="status-${item.codigo}"></div>
    `;

    cardsContainer.appendChild(card);
  });

  atualizarJson();
}

function montarPreview(playlist) {
  if (!playlist.length) {
    return "Nenhum vídeo salvo.";
  }

  const linhas = playlist
    .slice(0, 3)
    .map(link => `• ${escapeHtml(link)}`)
    .join("<br>");

  const extra = playlist.length > 3
    ? `<br>... e mais ${playlist.length - 3} link(s)`
    : "";

  return `<strong>${playlist.length} vídeo(s) salvo(s):</strong><br>${linhas}${extra}`;
}

function salvarCard(codigo) {
  const nomeInput = document.getElementById(`nome-${codigo}`);
  const linksInput = document.getElementById(`links-${codigo}`);
  const status = document.getElementById(`status-${codigo}`);

  const base = codigosFixos.find(item => item.codigo === codigo);
  const nome = nomeInput.value.trim() || base.nomePadrao;

  const playlist = linksInput.value
    .split("\n")
    .map(link => link.trim())
    .filter(link => link !== "");

  clientes[codigo] = {
    nome,
    playlist
  };

  renderizarCards();

  setTimeout(() => {
    const novoStatus = document.getElementById(`status-${codigo}`);
    if (novoStatus) {
      novoStatus.textContent = "Salvo com sucesso.";
    }
  }, 30);
}

function limparCard(codigo) {
  const base = codigosFixos.find(item => item.codigo === codigo);

  clientes[codigo] = {
    nome: base.nomePadrao,
    playlist: []
  };

  renderizarCards();

  setTimeout(() => {
    const status = document.getElementById(`status-${codigo}`);
    if (status) {
      status.textContent = "Conteúdo limpo.";
    }
  }, 30);
}

function atualizarJson() {
  jsonOutput.value = JSON.stringify(clientes, null, 2);
}

function formatarJson() {
  try {
    const obj = JSON.parse(jsonOutput.value);
    clientes = obj;
    garantirEstrutura();
    renderizarCards();
  } catch (error) {
    alert("O JSON está inválido.");
  }
}

function copiarJson() {
  jsonOutput.select();
  jsonOutput.setSelectionRange(0, 999999);

  navigator.clipboard.writeText(jsonOutput.value)
    .then(() => {
      alert("clientes.json copiado com sucesso.");
    })
    .catch(() => {
      alert("Não foi possível copiar.");
    });
}

function escapeHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlAttr(texto) {
  return escapeHtml(texto);
}

garantirEstrutura();
renderizarCards();
