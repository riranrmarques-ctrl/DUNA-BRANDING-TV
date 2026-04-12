const clienteSelect = document.getElementById("clienteSelect");

async function carregarClientesAtivos() {
  const { data } = await supabaseClient.from("clientes_app").select("*");

  const hoje = new Date();

  const ativos = (data || []).filter(c => {
    if (!c.vencimento_exibicao) return false;
    return new Date(c.vencimento_exibicao) >= hoje;
  });

  clienteSelect.innerHTML = `<option value="">Selecionar cliente</option>`;

  ativos.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.codigo;
    opt.textContent = c.nome;
    clienteSelect.appendChild(opt);
  });
}

async function vincularClientePonto(clienteCodigo, pontoCodigo) {
  if (!clienteCodigo) return;

  await supabaseClient.from("cliente_pontos").insert({
    cliente_codigo: clienteCodigo,
    ponto_codigo: pontoCodigo
  });
}

async function uploadMidia() {
  const file = videoInput.files[0];
  const clienteCodigo = clienteSelect.value;
  const clienteNome = clienteSelect.options[clienteSelect.selectedIndex]?.text;

  if (!file) return setStatus("Selecione um arquivo", "erro");
  if (!codigoSelecionado) return setStatus("Nenhum ponto selecionado", "erro");
  if (!clienteCodigo) return setStatus("Selecione um cliente", "erro");

  const codigo = codigoSelecionado;
  const dataInicio = normalizarDataInput(dataInicioInput.value) || new Date().toISOString();
  const dataFim = normalizarDataInput(dataFimInput.value);
  const path = `${codigo}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabaseClient.storage.from(BUCKET).upload(path, file);
  if (uploadError) return setStatus("Erro no upload", "erro");

  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);

  await supabaseClient.from(TABELA).insert({
    codigo,
    nome: clienteNome,
    video_url: data.publicUrl,
    storage_path: path,
    ordem: Date.now(),
    tipo: "video",
    data_inicio: dataInicio,
    data_fim: dataFim
  });

  await vincularClientePonto(clienteCodigo, codigo);

  setStatus("Enviado", "ok");

  videoInput.value = "";
  clienteSelect.value = "";

  await carregarPlaylist();
  await atualizarStatusDosPontos();
}

btnUpload.onclick = uploadMidia;

async function iniciarPainel() {
  const pontos = await buscarPontos();
  renderizarCardsPontos(pontos);
  await atualizarStatusDosPontos();
  await carregarClientesAtivos();
}
