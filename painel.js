const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let codigoAtual = null;

// ================= LOGIN =================
const senhaInput = document.getElementById("senhaInput");
const btnLogin = document.getElementById("btnLogin");

btnLogin.onclick = () => {
  if (senhaInput.value === "admin") {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("conteudoPainel").style.display = "block";
    carregarPontos();
  } else {
    document.getElementById("loginErro").textContent = "Código inválido";
  }
};

// ================= COPIAR =================
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-copiar")) {
    e.stopPropagation();
    const codigo = e.target.dataset.codigo;
    navigator.clipboard.writeText(codigo);
    alert("Código copiado!");
  }
});

// ================= ABRIR PASTA =================
document.querySelectorAll(".btn-abrir").forEach(btn => {
  btn.onclick = () => {
    codigoAtual = btn.dataset.codigo;
    abrirPasta(codigoAtual);
  };
});

// ================= CARREGAR PONTOS =================
async function carregarPontos() {
  const { data } = await supabase.from("pontos").select("*");

  document.querySelectorAll(".card-ponto").forEach(card => {
    const codigo = card.dataset.codigo;
    const ponto = data.find(p => p.codigo === codigo);

    if (!ponto) return;

    card.querySelector(".card-nome").textContent = ponto.nome || "Sem nome";
    card.querySelector(".card-cidade").textContent = ponto.cidade
      ? `Cidade de ${ponto.cidade}`
      : "Cidade não definida";

    const img = card.querySelector(".card-imagem");
    if (ponto.imagem_url) {
      img.src = ponto.imagem_url;
    }
  });
}

// ================= ABRIR PASTA =================
async function abrirPasta(codigo) {
  document.getElementById("listaPontos").style.display = "none";
  document.getElementById("pontoDetalhe").style.display = "block";

  const { data } = await supabase
    .from("pontos")
    .select("*")
    .eq("codigo", codigo)
    .single();

  document.getElementById("tituloPasta").textContent = data.nome;
  document.getElementById("cidadePonto").textContent = data.cidade
    ? `Cidade de ${data.cidade}`
    : "Cidade não definida";

  document.getElementById("enderecoPonto").textContent = data.endereco || "Endereço não definido";
  document.getElementById("statusPonto").textContent = "Inativo • sem histórico";
  document.getElementById("codigoAtual").textContent = codigo;
}

// ================= VOLTAR =================
document.getElementById("btnVoltar").onclick = () => {
  document.getElementById("listaPontos").style.display = "block";
  document.getElementById("pontoDetalhe").style.display = "none";
};

// ================= COPIAR CODIGO DENTRO =================
document.getElementById("btnCopiarCodigo").onclick = () => {
  navigator.clipboard.writeText(codigoAtual);
  alert("Código copiado!");
};

// ================= EDITAR INFO + UPLOAD =================
document.getElementById("btnEditarInfo").onclick = async () => {
  const { data } = await supabase
    .from("pontos")
    .select("*")
    .eq("codigo", codigoAtual)
    .single();

  const nome = prompt("Nome:", data.nome);
  const cidade = prompt("Cidade:", data.cidade || "");
  const endereco = prompt("Endereço:", data.endereco || "");

  const inputFile = document.createElement("input");
  inputFile.type = "file";
  inputFile.accept = "image/*";

  inputFile.onchange = async () => {
    const file = inputFile.files[0];

    if (!file) return;

    const fileName = `${codigoAtual}_${Date.now()}`;

    // UPLOAD PARA STORAGE
    const { data: uploadData, error } = await supabase.storage
      .from("pontos")
      .upload(fileName, file);

    if (error) {
      alert("Erro ao enviar imagem");
      return;
    }

    // PEGAR URL PUBLICA
    const { data: urlData } = supabase.storage
      .from("pontos")
      .getPublicUrl(fileName);

    const imagem_url = urlData.publicUrl;

    // SALVAR NO BANCO
    await supabase
      .from("pontos")
      .update({
        nome,
        cidade,
        endereco,
        imagem_url
      })
      .eq("codigo", codigoAtual);

    alert("Atualizado com imagem!");
    carregarPontos();
    abrirPasta(codigoAtual);
  };

  inputFile.click();
};
