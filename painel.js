async function uploadMidia() {
  const file = videoInput.files[0];
  if (!file) {
    setStatus("Selecione um arquivo", "erro");
    return;
  }

  const ext = file.name.split(".").pop().toLowerCase();
  let tipo = "";
  let urlFinal = "";
  let storagePath = "";

  try {
    setStatus("Enviando mídia...");

    if (ext !== "mp4" && ext !== "jpg" && ext !== "txt") {
      setStatus("Formato inválido. Use MP4, JPG ou TXT.", "erro");
      return;
    }

    if (ext === "txt") {
      const text = await file.text();
      const match = text.match(/URL=(.*)/i);
      let urlLida = match ? match[1].trim() : text.trim();

      if (!/^https?:\/\//i.test(urlLida)) {
        urlLida = "https://" + urlLida;
      }

      urlFinal = urlLida;
      tipo = "site";
      storagePath = "";
    } else {
      tipo = ext === "mp4" ? "video" : "imagem";

      const nomeSeguro = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "");

      const path = `${codigoSelecionado}/${Date.now()}-${nomeSeguro}`;
      storagePath = path;

      const { error: uploadError } = await supabaseClient
        .storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabaseClient
        .storage
        .from(BUCKET)
        .getPublicUrl(path);

      urlFinal = publicData.publicUrl;
    }

    const { error: insertError } = await supabaseClient
      .from(TABELA)
      .insert({
        codigo: codigoSelecionado,
        nome: file.name,
        video_url: urlFinal,
        storage_path: storagePath,
        ordem: Date.now(),
        tipo: tipo
      });

    if (insertError) throw insertError;

    setStatus("Enviado com sucesso", "ok");
    videoInput.value = "";
    await carregarPlaylist();

  } catch (e) {
    console.error("Erro no upload:", e);
    setStatus("Erro ao enviar: " + (e.message || "falha no upload"), "erro");
  }
}
