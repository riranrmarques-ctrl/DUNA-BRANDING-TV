const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";
const TABELA_PONTOS = "pontos";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function iniciarRolagemAutomaticaAmbientes(container) {
  if (!container) return;
  if (container.dataset.carouselAtivo === "1") return;

  container.dataset.carouselAtivo = "1";

  let posicao = container.scrollLeft;
  let ultimoFrame = performance.now();
  const velocidade = 42;

  function animar(agora) {
    const delta = Math.min(agora - ultimoFrame, 64);
    ultimoFrame = agora;

    if (container.scrollWidth > container.clientWidth) {
      const limite = container.scrollWidth / 4;
      posicao += (velocidade * delta) / 1000;

      if (posicao >= limite) {
        posicao = 0;
      }

      container.scrollLeft = posicao;
    }

    requestAnimationFrame(animar);
  }

  container.addEventListener("scroll", () => {
    posicao = container.scrollLeft;
  });

  requestAnimationFrame(animar);
}

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
