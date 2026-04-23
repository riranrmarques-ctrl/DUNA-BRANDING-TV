const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";
const TABELA_PONTOS = "pontos";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
      min-width: 320px;
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
    <article class="location-card fade-up delay-${Math.min((index % 5) + 1, 5)}">
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

function iniciarRolagemAutomaticaAmbientes(container) {
  if (!container) return;
  if (container.dataset.carouselAtivo === "1") return;

  container.dataset.carouselAtivo = "1";

  let pausado = false;
  const velocidade = 0.8;

  function animar() {
    if (!pausado) {
      container.scrollLeft += velocidade;

      if (container.scrollLeft >= container.scrollWidth / 2) {
        container.scrollLeft = 0;
      }
    }

    requestAnimationFrame(animar);
  }

  container.addEventListener("mouseenter", () => {
    pausado = true;
  });

  container.addEventListener("mouseleave", () => {
    pausado = false;
  });

  container.addEventListener(
    "touchstart",
    () => {
      pausado = true;
    },
    { passive: true }
  );

  container.addEventListener(
    "touchend",
    () => {
      pausado = false;
    },
    { passive: true }
  );

  requestAnimationFrame(animar);
}

async function carregarAmbientes() {
  const container = document.getElementById("gridAmbientes");
  if (!container) return;

  mostrarMensagemGrid(container, "Carregando ambientes...");

  try {
    const { data, error } = await supabaseClient
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

    const ambientes = [...data, ...data];

    container.innerHTML = ambientes
      .map((ponto, index) => montarCard(ponto, index))
      .join("");

    container.querySelectorAll(".fade-up").forEach((el) => {
      el.classList.add("visible");
    });

    iniciarRolagemAutomaticaAmbientes(container);
  } catch (erro) {
    console.error("Erro geral:", erro);
    mostrarMensagemGrid(container, `Falha ao carregar ambientes: ${erro.message}`);
  }
}

function iniciarAnimacoesBasicas() {
  const fadeElements = document.querySelectorAll(".fade-up");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, { threshold: 0.14 });

  fadeElements.forEach((el) => observer.observe(el));

  const numberFormatter = (value, decimals = 0) => {
    return Number(value).toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const animateCount = (element) => {
    const target = Number(element.dataset.count || 0);
    const decimals = Number(element.dataset.decimals || 0);
    const duration = 1600;
    const start = performance.now();

    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      element.textContent = numberFormatter(current, decimals);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  };

  const countObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll("[data-count]").forEach((item) => {
    countObserver.observe(item);
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;

      const target = document.querySelector(id);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  iniciarAnimacoesBasicas();
  carregarAmbientes();
});
