const { createClient } = supabase;

const supabaseClient = createClient(
  "https://hhqqwjjdhzxqjuyazjwk.supabase.co",
  "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly"
);

const TABELA = "dadosclientes";

let contratos = [];

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function parseValor(valor) {
  if (!valor) return 0;

  return Number(
    String(valor)
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
  ) || 0;
}

function hoje() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d;
}

function diasEntre(data) {
  const diff = new Date(data) - hoje();
  return diff / (1000 * 60 * 60 * 24);
}

async function carregarDados() {
  const { data, error } = await supabase
    .from(TABELA)
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  contratos = data || [];

  calcularCards();
  montarTabela();
  montarRanking();
  montarGraficos();
}

function calcularCards() {
  let vendasMes = 0;
  let vendasTotais = 0;
  let locais = 0;
  let encerrando = 0;

  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();

  contratos.forEach(c => {
    const valor = parseValor(c.valor_contratado);
    vendasTotais += valor;

    if (c.data_postagem) {
      const d = new Date(c.data_postagem);
      if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
        vendasMes += valor;
      }
    }

    if (c.codigo) locais++;

    if (c.data_vencimento) {
      const dias = diasEntre(c.data_vencimento);
      if (dias >= 0 && dias <= 30) {
        encerrando++;
      }
    }
  });

  document.getElementById("vendasMes").textContent = formatarMoeda(vendasMes);
  document.getElementById("vendasTotais").textContent = formatarMoeda(vendasTotais);
  document.getElementById("locaisContratados").textContent = locais;
  document.getElementById("contratosEncerrando").textContent = encerrando;
}

function montarTabela() {
  const tbody = document.getElementById("tabelaContratos");
  tbody.innerHTML = "";

  contratos.forEach(c => {
    const tr = document.createElement("tr");

    const status = (c.status || "").toLowerCase() === "ativo";

    tr.innerHTML = `
      <td>${c.nome_completo || "-"}</td>
      <td>${c.codigo || "-"}</td>
      <td>${formatarMoeda(parseValor(c.valor_contratado))}</td>
      <td>${formatarData(c.data_postagem)}</td>
      <td>${formatarData(c.data_vencimento)}</td>
      <td>
        <span class="status ${status ? "ativo" : "inativo"}">
          ${status ? "Ativo" : "Inativo"}
        </span>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function formatarData(data) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR");
}

function montarRanking() {
  const box = document.getElementById("rankingFinanceiro");
  box.innerHTML = "";

  const ordenado = [...contratos]
    .sort((a, b) => parseValor(b.valor_contratado) - parseValor(a.valor_contratado))
    .slice(0, 5);

  ordenado.forEach(c => {
    const item = document.createElement("div");
    item.className = "ranking-item";

    item.innerHTML = `
      <div>
        <strong>${c.nome_completo || "-"}</strong>
        <span>${c.codigo || "-"}</span>
      </div>
      <b>${formatarMoeda(parseValor(c.valor_contratado))}</b>
    `;

    box.appendChild(item);
  });
}

function montarGraficos() {
  const vendasPorMes = {};
  const encerramentos = {};

  contratos.forEach(c => {
    if (c.data_postagem) {
      const mes = new Date(c.data_postagem).toLocaleDateString("pt-BR", { month: "short" });
      vendasPorMes[mes] = (vendasPorMes[mes] || 0) + parseValor(c.valor_contratado);
    }

    if (c.data_vencimento) {
      const mes = new Date(c.data_vencimento).toLocaleDateString("pt-BR", { month: "short" });
      encerramentos[mes] = (encerramentos[mes] || 0) + 1;
    }
  });

  new Chart(document.getElementById("graficoVendas"), {
    type: "line",
    data: {
      labels: Object.keys(vendasPorMes),
      datasets: [{
        label: "Vendas",
        data: Object.values(vendasPorMes),
      }]
    }
  });

  new Chart(document.getElementById("graficoEncerramentos"), {
    type: "bar",
    data: {
      labels: Object.keys(encerramentos),
      datasets: [{
        label: "Encerramentos",
        data: Object.values(encerramentos),
      }]
    }
  });
}

document.getElementById("btnAtualizar").onclick = carregarDados;

carregarDados();
