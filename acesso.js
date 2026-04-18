function obterChaveMaterial(item) {
  return [
    item?.id,
    item?.storage_path,
    item?.video_url,
    item?.arquivo_url,
    item?.url,
    item?.nome_arquivo,
    item?.titulo_arquivo,
    item?.nome
  ]
    .map((valor) => String(valor || "").trim())
    .find(Boolean) || "";
}

function obterMapaOrdemPlaylist(lista) {
  const mapa = new Map();

  (lista || []).forEach((item, index) => {
    const chave = obterChaveMaterial(item);
    if (!chave) return;

    const ordemBanco = Number(item?.ordem);
    const ordemReal = Number.isFinite(ordemBanco) && ordemBanco > 0 ? ordemBanco : index + 1;

    if (!mapa.has(chave)) {
      mapa.set(chave, ordemReal);
    }
  });

  return mapa;
}

function renderizarMateriais(lista) {
  if (!listaMateriais) return;

  const materiaisCliente = filtrarMateriaisDoCliente(lista);
  const mapaOrdem = obterMapaOrdemPlaylist(lista);

  if (!materiaisCliente.length) {
    listaMateriais.innerHTML = `<div class="vazio">Nenhum material encontrado para este cliente.</div>`;
    return;
  }

  listaMateriais.innerHTML = materiaisCliente.map((item) => {
    const arquivo = obterNomeArquivo(item);
    const chave = obterChaveMaterial(item);
    const ordemPlaylist = mapaOrdem.get(chave) || Number(item?.ordem) || "-";

    return `
      <div class="linha-material">
        <span>${escapeHtml(String(ordemPlaylist))}°</span>
        <div>
          <strong>${escapeHtml(arquivo)}</strong>
        </div>
        <span>${formatarDataHora(item.created_at)}</span>
        <span>${formatarData(item.data_fim)}</span>
      </div>
    `;
  }).join("");
}
