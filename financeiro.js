const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TABELA = "dadosclientes";

let contratos = [];
let graficoVendasInstance = null;
let graficoEncerramentosInstance = null;

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function parseValor(valor) {
  if (!valor) return 0;

  const limpo = String(valor)
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  return Number(limpo) || 0;
}

function criarDataSegura(valor) {
  if (!valor) return null;

  const texto = String(valor).trim();

  if (texto.includes("-")) {
    const partes = texto.split("-");
    if (partes.length === 3) {
      const ano = Number(partes[0]);
      const mes = Number(partes[1]) - 1;
      const dia = Number(partes[2]);
      return new Date(ano, mes, dia);
    }
  }

  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function hoje() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function diasEntre(data) {
  const dataFinal = criarDataSegura(data);
  if (!dataFinal) return 999999;

  dataFinal.setHours(0, 0, 0, 0);

  const diff = dataFinal - hoje();
  return diff / (1000 * 60 * 60 * 24);
}

function formatarData(valor) {
  const data = criarDataSegura(valor);
  if (!data) return "-";

  return data.toLocaleDateString("pt-BR");
}

async function carregarDados() {
  const { data, error } = await supabaseClient
    .from(TABELA)
    .select("*")
    .order("codigo", { ascending: true });

  if (error) {
    console.error("Erro ao carregar dados financeiros:", error);
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

  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  contratos.forEach((c) => {
    const valor = parseValor(c.valor_contratado);
    vendasTotais += valor;

    const dataPostagem = criarDataSegura(c.data_postagem);

    if (dataPostagem) {
      if (
        dataPostagem.getMonth() === mesAtual &&
        dataPostagem.getFullYear() === anoAtual
      ) {
        vendasMes += valor;
      }
    }

    if (c.codigo) {
      locais++;
    }

    if (c.vencimento_midia) {
      const dias = diasEntre(c.vencimento_midia);

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
  if (!tbody) return;

  tbody.innerHTML = "";

  contratos.forEach((c) => {
    const tr = document.createElement("tr");
    const status = String(c.status || "").toLowerCase() === "ativo";

    tr.innerHTML = `
      <td>${c.nome_completo || "-"}</td>
      <td>${c.codigo || "-"}</td>
      <td>${formatarMoeda(parseValor(c.valor_contratado))}</td>
      <td>${formatarData(c.data_postagem)}</td>
      <td>${formatarData(c.vencimento_midia)}</td>
      <td>
        <span class="status ${status ? "ativo" : "inativo"}">
          ${status ? "Ativo" : "Inativo"}
        </span>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function montarRanking() {
  const box = document.getElementById("rankingFinanceiro");
  if (!box) return;

  box.innerHTML = "";

  const ordenado = [...contratos]
    .filter(c => parseValor(c.valor_contratado) > 0)
    .sort((a, b) => parseValor(b.valor_contratado) - parseValor(a.valor_contratado))
    .slice(0, 5);

  ordenado.forEach((c, index) => {
    const item = document.createElement("div");
    item.className = "ranking-item";

    item.innerHTML = `
      <div class="ranking-left">
        <span class="ranking-pos">#${index + 1}</span>
        <div class="ranking-info">
          <strong>${c.nome_completo || "-"}</strong>
          <span>${c.codigo || "-"}</span>
        </div>
      </div>

      <div class="ranking-valor">
        ${formatarMoeda(parseValor(c.valor_contratado))}
      </div>
    `;

    box.appendChild(item);
  });
}

function obterMesAno(valor) {
  const data = criarDataSegura(valor);
  if (!data) return null;

  return {
    chave: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`,
    label: data.toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit"
    })
  };
}

function montarGraficos() {
  const canvasVendas = document.getElementById("graficoVendas");
  const canvasEncerramentos = document.getElementById("graficoEncerramentos");

  if (!canvasVendas || !canvasEncerramentos) return;

  if (graficoVendasInstance) {
    graficoVendasInstance.destroy();
  }

  if (graficoEncerramentosInstance) {
    graficoEncerramentosInstance.destroy();
  }

  const vendasPorMes = {};
  const encerramentos = {};
  const labelsPorChave = {};

  contratos.forEach((c) => {
    const mesVenda = obterMesAno(c.data_postagem);

    if (mesVenda) {
      labelsPorChave[mesVenda.chave] = mesVenda.label;
      vendasPorMes[mesVenda.chave] = (vendasPorMes[mesVenda.chave] || 0) + parseValor(c.valor_contratado);
    }

    const mesVencimento = obterMesAno(c.vencimento_midia);

    if (mesVencimento) {
      labelsPorChave[mesVencimento.chave] = mesVencimento.label;
      encerramentos[mesVencimento.chave] = (encerramentos[mesVencimento.chave] || 0) + 1;
    }
  });

  const chavesVendas = Object.keys(vendasPorMes).sort();
  const chavesEncerramentos = Object.keys(encerramentos).sort();

  graficoVendasInstance = new Chart(canvasVendas, {
    type: "line",
    data: {
      labels: chavesVendas.map((chave) => labelsPorChave[chave]),
      datasets: [
        {
          label: "Vendas",
          data: chavesVendas.map((chave) => vendasPorMes[chave]),
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#dce5f7"
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#8fa3c7"
          },
          grid: {
            color: "rgba(255,255,255,0.06)"
          }
        },
        y: {
          ticks: {
            color: "#8fa3c7",
            callback: function(value) {
              return formatarMoeda(value);
            }
          },
          grid: {
            color: "rgba(255,255,255,0.06)"
          }
        }
      }
    }
  });

  graficoEncerramentosInstance = new Chart(canvasEncerramentos, {
    type: "bar",
    data: {
      labels: chavesEncerramentos.map((chave) => labelsPorChave[chave]),
      datasets: [
        {
          label: "Encerramentos",
          data: chavesEncerramentos.map((chave) => encerramentos[chave])
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#dce5f7"
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#8fa3c7"
          },
          grid: {
            color: "rgba(255,255,255,0.06)"
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#8fa3c7",
            precision: 0
          },
          grid: {
            color: "rgba(255,255,255,0.06)"
          }
        }
      }
    }
  });
}

const btnAtualizar = document.getElementById("btnAtualizar");

if (btnAtualizar) {
  btnAtualizar.addEventListener("click", carregarDados);
}

function voltarPainel() {
  window.location.href = "/centralpainel.html";
}

carregarDados();
