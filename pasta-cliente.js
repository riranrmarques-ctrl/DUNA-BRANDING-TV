const listaPontos = document.getElementById("listaPontos");
const resumoCliente = document.getElementById("resumoCliente");

let pontosData = {
  "0001": { nome: "Academia Centro" },
  "0002": { nome: "Praça Orla" },
  "0003": { nome: "Shopping Sala 1" },
  "0004": { nome: "Mercado Bairro" }
};

function obterSelecionados() {
  return Array.from(document.querySelectorAll('input[name="pontos"]:checked'))
    .map(i => i.value);
}

function atualizarResumo() {
  const pontos = obterSelecionados();
  resumoCliente.innerHTML = "PONTOS: " + (pontos.join(", ") || "nenhum");
}

function renderizarPontos() {
  listaPontos.innerHTML = "";

  let selecionados = obterSelecionados();

  let codigos = Object.keys(pontosData);

  codigos.sort((a,b)=>{
    return selecionados.includes(b) - selecionados.includes(a);
  });

  codigos.forEach(codigo=>{
    const ponto = pontosData[codigo];

    const item = document.createElement("div");
    item.className = "item-ponto";

    if(selecionados.includes(codigo)){
      item.classList.add("selecionado");
    }

    item.innerHTML = `
      <div class="ponto-esquerda">
        <input type="checkbox" class="ponto-checkbox" name="pontos" value="${codigo}" ${selecionados.includes(codigo) ? "checked":""}>
        <div class="ponto-info">
          <div class="ponto-nome">${ponto.nome}</div>
          <div class="ponto-codigo">${codigo}</div>
        </div>
      </div>
    `;

    item.addEventListener("click", (e)=>{
      if(e.target.tagName !== "INPUT"){
        const checkbox = item.querySelector("input");
        checkbox.checked = !checkbox.checked;
      }
      renderizarPontos();
      atualizarResumo();
    });

    listaPontos.appendChild(item);
  });
}

renderizarPontos();
