const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔐 BLOQUEIO DIRETO (SEM LOGIN LOCAL)
if (sessionStorage.getItem("painelLiberado") !== "1") {
  window.location.href = "centralpainel.html";
}

// ELEMENTOS
const listaPontos = document.querySelector(".pontos-box");
const pontoDetalhe = document.getElementById("pontoDetalhe");
const listaContainer = document.getElementById("listaPontos");
const btnVoltar = document.getElementById("btnVoltar");

// INICIALIZA
document.addEventListener("DOMContentLoaded", () => {
  carregarPontos();
});

// 🔥 CARREGAR PONTOS
async function carregarPontos() {
  try {
    const { data, error } = await supabaseClient
      .from("pontos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    renderizarPontos(data || []);
  } catch (err) {
    console.error("Erro ao carregar pontos:", err);
  }
}

// 🎯 RENDERIZAR
function renderizarPontos(pontos) {
  if (!listaPontos) return;

  if (!pontos.length) {
    listaPontos.innerHTML = `<div class="empty-state">Nenhum ponto encontrado</div>`;
    return;
  }

  listaPontos.innerHTML = pontos.map(p => {
    const nome = p.nome || "Sem nome";
    const endereco = p.endereco || "Endereço não informado";
    const codigo = p.codigo || "";
    const imagem = p.imagem_url || "https://placehold.co/600x300";

    return `
      <div class="point-card" onclick="abrirPonto('${codigo}')">
        <img src="${imagem}">
        <div class="point-body">
          <h4>${nome}</h4>
          <p>${endereco}</p>
          <span class="status offline">OFFLINE</span>
          <div class="progress"><i style="width:0%"></i></div>
        </div>
      </div>
    `;
  }).join("");
}

// 👉 ABRIR PONTO
window.abrirPonto = function(codigo) {
  listaContainer.style.display = "none";
  pontoDetalhe.style.display = "block";

  carregarDetalhePonto(codigo);
};

// 🔄 VOLTAR
if (btnVoltar) {
  btnVoltar.onclick = () => {
    pontoDetalhe.style.display = "none";
    listaContainer.style.display = "block";
  };
}

// 🔍 DETALHE
async function carregarDetalhePonto(codigo) {
  try {
    const { data, error } = await supabaseClient
      .from("pontos")
      .select("*")
      .eq("codigo", codigo)
      .single();

    if (error) throw error;

    preencherDetalhe(data);
  } catch (err) {
    console.error("Erro detalhe:", err);
  }
}

// 🎯 PREENCHER DETALHE
function preencherDetalhe(ponto) {
  document.getElementById("tituloPasta").textContent = ponto.nome || "";
  document.getElementById("cidadePonto").textContent = ponto.cidade || "";
  document.getElementById("enderecoPonto").textContent = ponto.endereco || "";
  document.getElementById("codigoAtual").textContent = ponto.codigo || "";

  const img = document.getElementById("imagemPonto");
  if (img) {
    img.src = ponto.imagem_url || "https://placehold.co/600x300";
  }
}
