document.addEventListener("DOMContentLoaded", () => {
  iniciarDashboard();
});

function iniciarDashboard() {
  animarNumeros();
  atualizarDataTopo();
  iniciarAtualizacaoAutomatica();
}

function animarNumeros() {
  const numeros = document.querySelectorAll(".metric-card h2");

  numeros.forEach(el => {
    const texto = el.innerText.replace(/[^\d]/g, "");
    const valorFinal = parseInt(texto || 0);
    let atual = 0;
    const incremento = Math.ceil(valorFinal / 60);

    const animar = () => {
      atual += incremento;
      if (atual >= valorFinal) atual = valorFinal;

      el.innerHTML = formatarNumero(atual) + extrairSufixo(el.innerHTML);

      if (atual < valorFinal) requestAnimationFrame(animar);
    };

    animar();
  });
}

function extrairSufixo(html) {
  const match = html.match(/(<small>.*<\/small>)/);
  return match ? " " + match[1] : "";
}

function formatarNumero(num) {
  return num.toLocaleString("pt-BR");
}

function atualizarDataTopo() {
  const botao = document.querySelector(".date-filter");
  if (!botao) return;

  botao.addEventListener("click", () => {
    alert("Datepicker aqui depois");
  });
}

function iniciarAtualizacaoAutomatica() {
  setInterval(simularAtualizacao, 8000);
}

function simularAtualizacao() {
  atualizarCard(0, randomEntre(120000, 150000));
  atualizarCard(1, randomEntre(10000, 15000));
  atualizarCard(2, randomEntre(30, 45));

  const uptime = document.querySelectorAll(".metric-card h2")[3];
  if (uptime) {
    const valor = (Math.random() * 5 + 95).toFixed(1);
    uptime.innerHTML = valor.replace(".", ",") + "%";
  }
}

function atualizarCard(index, valor) {
  const el = document.querySelectorAll(".metric-card h2")[index];
  if (!el) return;

  const sufixo = extrairSufixo(el.innerHTML);
  el.innerHTML = formatarNumero(valor) + sufixo;
}

function randomEntre(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function atualizarStatusPontos() {
  const cards = document.querySelectorAll(".point-card");

  cards.forEach(card => {
    const statusEl = card.querySelector(".status");
    const progress = card.querySelector(".progress i");

    const r = Math.random();

    if (r < 0.7) {
      statusEl.className = "status active";
      statusEl.innerText = "● ATIVO";
      progress.style.width = randomEntre(90, 100) + "%";
    } else if (r < 0.85) {
      statusEl.className = "status warning";
      statusEl.innerText = "● SEM MATERIAL";
      progress.style.width = "10%";
    } else {
      statusEl.className = "status inactive";
      statusEl.innerText = "● INATIVO";
      progress.style.width = "2%";
    }
  });
}

setInterval(atualizarStatusPontos, 10000);

document.addEventListener("click", e => {
  const card = e.target.closest(".point-card");
  if (card) {
    const nome = card.querySelector("h4").innerText;
    alert("Abrir: " + nome);
  }
});

const filtro = document.querySelector("select");
if (filtro) {
  filtro.addEventListener("change", () => {
    console.log("Filtro:", filtro.value);
  });
}
