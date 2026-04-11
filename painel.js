const pastasFixas = [
  { codigo: "0001", nomePadrao: "Pasta 1" },
  { codigo: "0002", nomePadrao: "Pasta 2" },
  { codigo: "0003", nomePadrao: "Pasta 3" },
  { codigo: "0004", nomePadrao: "Pasta 4" },
  { codigo: "0005", nomePadrao: "Pasta 5" }
];

function carregarDados() {
  try {
    return JSON.parse(localStorage.getItem("dunaPastas")) || {};
  } catch (e) {
    console.error("Erro ao ler localStorage:", e);
    return {};
  }
}

function salvarDados(dados) {
  localStorage.setItem("dunaPastas", JSON.stringify(dados));
}

function renderizarPastas() {
  const container = document.getElementById("cardsContainer");
  const dados = carregarDados();
  container.innerHTML = "";

  pastasFixas.forEach((pasta) => {
    const item = dados[pasta.codigo] || {};
    const nome = item.nome || pasta.nomePadrao;
    const playlist = Array.isArray(item.playlist) && item.playlist.length > 0
      ? item.playlist
      : [""];

    const linksHtml = playlist.map((link, index) => `
      <div class="field">
        <label>Link do vídeo ${index + 1}</label>
        <input type="text" id="video-${pasta.codigo}-${index}" value="${link}" placeholder="https://site.com/video.mp4">
      </div>
    `).join("");

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${nome}</h3>
      <div class="codigo">Código fixo: ${pasta.codigo}</div>

      <div class="field">
        <label>Nome da pasta</label>
        <input type="text" id="nome-${pasta.codigo}" value="${nome}" placeholder="Digite o nome da pasta">
      </div>

      <div id="playlist-${pasta.codigo}">
        ${linksHtml}
      </div>

      <div class="buttons">
        <button class="btn-save" onclick="adicionarCampoVideo('${pasta.codigo}')">Adicionar vídeo</button>
        <button class="btn-save" onclick="salvarPasta('${pasta.codigo}')">Salvar</button>
        <button class="btn-clear" onclick="limparPasta('${pasta.codigo}')">Limpar</button>
        <button class="btn-clear" onclick="copiarLinkPlayer('${pasta.codigo}')">Copiar link do player</button>
      </div>

      <div class="video-info" id="info-${pasta.codigo}">
        ${playlist.filter(Boolean).length > 0
          ? `<strong>${playlist.filter(Boolean).length} vídeo(s) salvo(s):</strong><br>${playlist.filter(Boolean).join("<br>")}`
          : "Nenhum vídeo salvo."
        }
      </div>

      <div class="status" id="status-${pasta.codigo}"></div>
    `;

    container.appendChild(card);
  });
}

function adicionarCampoVideo(codigo) {
  const playlistDiv = document.getElementById(`playlist-${codigo}`);
  const quantidade = playlistDiv.querySelectorAll("input").length;

  const novoCampo = document.createElement("div");
  novoCampo.className = "field";
  novoCampo.innerHTML = `
    <label>Link do vídeo ${quantidade}</label>
    <input type="text" id="video-${codigo}-${quantidade - 1}" placeholder="https://site.com/video.mp4">
  `;

  playlistDiv.appendChild(novoCampo);
}

function salvarPasta(codigo) {
  const dados = carregarDados();
  const base = pastasFixas.find((p) => p.codigo === codigo);

  const nome = document.getElementById(`nome-${codigo}`).value.trim() || base.nomePadrao;

  const playlistDiv = document.getElementById(`playlist-${codigo}`);
  const inputs = playlistDiv.querySelectorAll("input[type='text']");
  const playlist = [];

  inputs.forEach((input) => {
    if (input.id !== `nome-${codigo}`) {
      const valor = input.value.trim();
      if (valor) {
        playlist.push(valor);
      }
    }
  });

  dados[codigo] = {
    nome,
    playlist
  };

  salvarDados(dados);
  renderizarPastas();
  gerarJSON();

  setTimeout(() => {
    const status = document.getElementById(`status-${codigo}`);
    if (status) status.textContent = "Salvo com sucesso.";
  }, 50);
}

function limparPasta(codigo) {
  const dados = carregarDados();
  const base = pastasFixas.find((p) => p.codigo === codigo);

  dados[codigo] = {
    nome: base.nomePadrao,
    playlist: []
  };

  salvarDados(dados);
  renderizarPastas();
  gerarJSON();

  setTimeout(() => {
    const status = document.getElementById(`status-${codigo}`);
    if (status) status.textContent = "Pasta limpa.";
  }, 50);
}

function gerarJSON() {
  const dados = carregarDados();
  const resultado = {};

  pastasFixas.forEach((pasta) => {
    const item = dados[pasta.codigo] || {};
    resultado[pasta.codigo] = {
      nome: item.nome || pasta.nomePadrao,
      playlist: Array.isArray(item.playlist) ? item.playlist.filter(Boolean) : []
    };
  });

  document.getElementById("jsonOutput").value = JSON.stringify(resultado, null, 2);
}

function formatarJson() {
  const textarea = document.getElementById("jsonOutput");

  try {
    const json = JSON.parse(textarea.value);
    textarea.value = JSON.stringify(json, null, 2);
  } catch (e) {
    alert("JSON inválido para formatar.");
  }
}

function copiarJson() {
  const textarea = document.getElementById("jsonOutput");
  textarea.select();
  textarea.setSelectionRange(0, 999999);
  document.execCommand("copy");
  alert("JSON copiado com sucesso.");
}

function copiarLinkPlayer(codigo) {
  const link = `${window.location.origin}/player.html?codigo=${codigo}`;

  navigator.clipboard.writeText(link)
    .then(() => {
      const status = document.getElementById(`status-${codigo}`);
      if (status) status.textContent = `Link copiado: ${link}`;
    })
    .catch(() => {
      alert("Não foi possível copiar o link.");
    });
}

renderizarPastas();
gerarJSON();
