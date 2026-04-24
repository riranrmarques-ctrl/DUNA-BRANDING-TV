const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";
const TABELA_PONTOS = "pontos";
const SUPABASE_SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js";

function carregarSupabaseSdk() {
  return new Promise((resolve, reject) => {
    if (window.supabase) {
      resolve();
      return;
    }

    const scriptExistente = document.querySelector(`script[src="${SUPABASE_SDK_URL}"]`);
    if (scriptExistente) {
      scriptExistente.addEventListener("load", resolve, { once: true });
      scriptExistente.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SUPABASE_SDK_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function iniciarRolagemAutomaticaAmbientes(container) {
  if (!container) return;
  if (container.dataset.carouselAtivo === "1") return;

  container.dataset.carouselAtivo = "1";

  let posicao = container.scrollLeft;
  let ultimoFrame = performance.now();
  let pausado = false;
  const velocidade = 72;

  function animar(agora) {
    const delta = Math.min(agora - ultimoFrame, 64);
    ultimoFrame = agora;

    if (!pausado && container.scrollWidth > container.clientWidth) {
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

  container.addEventListener("mouseenter", () => {
    pausado = true;
  });

  container.addEventListener("mouseleave", () => {
    pausado = false;
    posicao = container.scrollLeft;
    ultimoFrame = performance.now();
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
