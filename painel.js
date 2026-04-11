function salvar() {
  const nome = document.getElementById("nome").value.trim();
  const codigo = document.getElementById("codigo").value.trim();
  const links = document.getElementById("links").value.trim();

  const mensagem = document.getElementById("mensagem");
  const jsonArea = document.getElementById("json");

  if (!codigo || !links) {
    mensagem.innerText = "Preencha código e links!";
    mensagem.style.color = "red";
    return;
  }

  let data = {};

  try {
    data = JSON.parse(jsonArea.value || "{}");
  } catch {
    mensagem.innerText = "JSON inválido!";
    mensagem.style.color = "red";
    return;
  }

  const playlist = links.split("\n").map(l => l.trim()).filter(l => l);

  data[codigo] = {
    nome: nome || codigo,
    playlist: playlist
  };

  jsonArea.value = JSON.stringify(data, null, 2);

  mensagem.innerText = "Salvo com sucesso!";
  mensagem.style.color = "lime";
}

function formatar() {
  const jsonArea = document.getElementById("json");

  try {
    const obj = JSON.parse(jsonArea.value);
    jsonArea.value = JSON.stringify(obj, null, 2);
  } catch {
    alert("JSON inválido!");
  }
}

function copiar() {
  const jsonArea = document.getElementById("json");

  jsonArea.select();
  document.execCommand("copy");

  alert("Copiado!");
}