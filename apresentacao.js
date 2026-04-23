const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";
const TABELA_PONTOS = "pontos";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function montarCard(ponto) {
  return `
    <article class="location-card">
      <img src="${ponto.imagem_url || 'https://placehold.co/600x320'}">
      <div class="location-body">
        <strong>${ponto.nome || 'Ponto'}</strong>
        <p>${ponto.endereco || ''}</p>
      </div>
    </article>
  `;
}

async function carregarAmbientes() {
  const container = document.getElementById("gridAmbientes");
  if (!container) return;

  container.innerHTML = "Carregando...";

  const { data, error } = await supabase
    .from(TABELA_PONTOS)
    .select("*")
    .limit(6);

  if (error) {
    container.innerHTML = "Erro ao carregar";
    console.error(error);
    return;
  }

  if (!data.length) {
    container.innerHTML = "Sem pontos no banco";
    return;
  }

  container.innerHTML = data.map(montarCard).join("");
}

document.addEventListener("DOMContentLoaded", carregarAmbientes);
