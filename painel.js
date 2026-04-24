const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const listaPontos = document.getElementById("listaPontos");
const pontoDetalhe = document.getElementById("pontoDetalhe");

const nomePonto = document.getElementById("nomePonto");
const enderecoPonto = document.getElementById("enderecoPonto");
const listaArquivos = document.getElementById("listaArquivos");

const btnVoltarLista = document.getElementById("btnVoltarLista");
const btnDeletarPonto = document.getElementById("btnDeletarPonto");

let codigoSelecionado = null;

document.addEventListener("DOMContentLoaded", () => {
  carregarPontos();
});

async function carregarPontos() {
  listaPontos.innerHTML = "Carregando...";

  const { data, error } = await supabaseClient
    .from("pontos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    listaPontos.innerHTML = "Erro ao carregar";
    console.error(error);
    return;
  }

  listaPontos.innerHTML = data.map(p => `
    <div class="card-ponto" onclick="abrirPonto('${p.codigo}')">
      <h3>${p.nome || "Sem nome"}</h3>
      <p>${p.endereco || "Sem endereço"}</p>
    </div>
  `).join("");
}

function abrirPonto(codigo) {
  codigoSelecionado = codigo;

  listaPontos.style.display = "none";
  pontoDetalhe.style.display = "block";

  carregarDetalhe();
}

async function carregarDetalhe() {
  const { data } = await supabaseClient
    .from("pontos")
    .select("*")
    .eq("codigo", codigoSelecionado)
    .single();

  if (!data) return;

  nomePonto.textContent = data.nome;
  enderecoPonto.textContent = data.endereco;

  carregarArquivos();
}

async function carregarArquivos() {
  listaArquivos.innerHTML = "Carregando arquivos...";

  const { data, error } = await supabaseClient.storage
    .from("playlists")
    .list(codigoSelecionado);

  if (error) {
    listaArquivos.innerHTML = "Erro ao carregar arquivos";
    return;
  }

  listaArquivos.innerHTML = data.map(file => `
    <div class="arquivo-item">${file.name}</div>
  `).join("");
}

btnVoltarLista.onclick = () => {
  pontoDetalhe.style.display = "none";
  listaPontos.style.display = "block";
};

async function deletarPontoAtual() {
  if (!codigoSelecionado) return;

  const confirmar = confirm("Deseja deletar este ponto?");

  if (!confirmar) return;

  try {
    await supabaseClient
      .from("playlists")
      .delete()
      .eq("codigo", codigoSelecionado);

    await supabaseClient
      .from("statuspontos")
      .delete()
      .or(`codigo.eq.${codigoSelecionado},codigo_ponto.eq.${codigoSelecionado}`);

    const { error } = await supabaseClient
      .from("pontos")
      .delete()
      .eq("codigo", codigoSelecionado);

    if (error) throw error;

    pontoDetalhe.style.display = "none";
    listaPontos.style.display = "block";

    carregarPontos();

  } catch (err) {
    console.error(err);
    alert("Erro ao deletar");
  }
}

if (btnDeletarPonto) {
  btnDeletarPonto.onclick = deletarPontoAtual;
}
