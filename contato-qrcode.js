const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function obterDataHoje() {
  return new Date().toISOString().split("T")[0];
}

function limparTelefone(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function obterTelefoneCliente(cliente) {
  return (
    cliente?.telefone ||
    cliente?.celular ||
    cliente?.whatsapp ||
    cliente?.numero ||
    cliente?.numero_whatsapp ||
    ""
  );
}

function montarLinkWhatsapp(telefone, nomeCliente = "") {
  const numeroLimpo = limparTelefone(telefone);

  if (!numeroLimpo) return null;

  const numeroFinal = numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;
  const nome = String(nomeCliente || "").trim();

  const textoMensagem = nome
    ? `Olá, vim pelo QR Code da Branding. Cliente: ${nome}`
    : "Olá, vim pelo QR Code da Branding.";

  const mensagem = encodeURIComponent(textoMensagem);

  return `https://wa.me/${numeroFinal}?text=${mensagem}`;
}

async function incrementarContador(codigoCliente) {
  const dataHoje = obterDataHoje();

  const { data: existente, error: erroBusca } = await supabaseClient
    .from("qrcode_contadores")
    .select("*")
    .eq("codigo_cliente", codigoCliente)
    .eq("data", dataHoje)
    .maybeSingle();

  if (erroBusca) {
    console.warn("Erro ao buscar contador:", erroBusca);
    return;
  }

  if (existente) {
    const { error: erroUpdate } = await supabaseClient
      .from("qrcode_contadores")
      .update({
        total: Number(existente.total || 0) + 1,
        atualizado_em: new Date().toISOString()
      })
      .eq("id", existente.id);

    if (erroUpdate) console.warn("Erro ao atualizar contador:", erroUpdate);
    return;
  }

  const { error: erroInsert } = await supabaseClient
    .from("qrcode_contadores")
    .insert({
      codigo_cliente: codigoCliente,
      data: dataHoje,
      total: 1,
      atualizado_em: new Date().toISOString()
    });

  if (erroInsert) console.warn("Erro ao criar contador:", erroInsert);
}

async function iniciarContatoQrCode() {
  const params = new URLSearchParams(window.location.search);
  const codigoCliente = String(params.get("cliente") || params.get("codigo") || "").trim().toUpperCase();

  if (!codigoCliente) {
    document.body.innerHTML = "<p>Cliente não informado.</p>";
    return;
  }

  const { data: cliente, error } = await supabaseClient
    .from("dadosclientes")
    .select("*")
    .eq("codigo", codigoCliente)
    .maybeSingle();

  if (error || !cliente) {
    document.body.innerHTML = "<p>Cliente não encontrado.</p>";
    return;
  }

  const telefone = obterTelefoneCliente(cliente);
  const nomeCliente = cliente.nome_completo || cliente.nome || cliente.cliente || "";

  const whatsappUrl = montarLinkWhatsapp(telefone, nomeCliente);

  if (!whatsappUrl) {
    document.body.innerHTML = "<p>Telefone do cliente não encontrado.</p>";
    return;
  }

  await incrementarContador(codigoCliente);

  window.location.href = whatsappUrl;
}

iniciarContatoQrCode();
