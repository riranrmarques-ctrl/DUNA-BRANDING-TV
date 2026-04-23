const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";
const TABELA_PONTOS = "pontos";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

function obterImagem(ponto) {
  return (
    ponto?.imagem_url ||
    ponto?.imagem ||
    ponto?.foto_url ||
    ponto?.imagem_ponto ||
    "https://placehold.co/600x320/png"
  );
}

function obterNome(ponto) {
  return (
    ponto?.nome ||
    ponto?.nome_local ||
    ponto?.nome_painel ||
    ponto?.titulo ||
    ponto?.ambiente ||
    "Ponto"
  );
}

function obterCidade(ponto) {
  return (
    ponto?.cidade ||
    ponto?.cidade_regiao ||
    ponto?.municipio ||
    ponto?.localidade ||
    ""
  );
}

function obterEndereco(ponto) {
  return (
    ponto?.endereco ||
    ponto?.endereco_completo ||
    ponto?.endereço ||
    ponto?.local ||
    ""
  );
}

function montarLocalizacao(ponto) {
  const cidade = String(obterCidade(ponto) || "").trim();
  const endereco = String(obterEndereco(ponto) || "").trim();

  if (cidade && endereco) return `${cidade} • ${endereco}`;
  if (cidade) return cidade;
  if (endereco) return endereco;
  return "Localização não informada";
}

function escaparHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mostrarMensagemGrid(container, mensagem) {
  container.innerHTML = `
    <div style="
      grid-column: 1 / -1;
      padding: 28px;
      border: 1px solid rgba(132,168,220,0.1);
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(10,17,28,0.94), rgba(7,12,21,0.98));
      color: #94a8c6;
      text-align: center;
      font-size: 1rem;
    ">
      ${escaparHtml(mensagem)}
    </div>
  `;
}

function montarCard(ponto, index = 0) {
  return `
    <article class="location-card fade-up delay-${Math.min(index + 1, 5)}">
      <img
        src="${escaparHtml(obterImagem(ponto))}"
        alt="${escaparHtml(obterNome(ponto))}"
        loading="lazy"
        decoding="async"
      >
      <div class="location-body">
        <strong>${escaparHtml(obterNome(ponto))}</strong>
        <p>${escaparHtml(montarLocalizacao(ponto))}</p>
      </div>
    </article>
  `;
}

async function carregarAmbientes() {
  const container = document.getElementById("gridAmbientes");
  if (!container) return;

  mostrarMensagemGrid(container, "Carregando ambientes...");

  try {
    const { data, error } = await supabaseClient.from
      .from(TABELA_PONTOS)
      .select("*")
      .limit(8);

    if (error) {
      console.error("Erro ao buscar pontos:", error);
      mostrarMensagemGrid(container, `Erro ao carregar ambientes: ${error.message}`);
      return;
    }

    if (!data || !data.length) {
      mostrarMensagemGrid(container, "Nenhum ambiente encontrado.");
      return;
    }

    container.innerHTML = data.map((ponto, index) => montarCard(ponto, index)).join("");

    container.querySelectorAll(".fade-up").forEach((el) => {
      el.classList.add("visible");
    });
  } catch (erro) {
    console.error("Erro geral:", erro);
    mostrarMensagemGrid(container, `Falha ao carregar ambientes: ${erro.message}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  carregarAmbientes();
});
