document.getElementById('codeForm').addEventListener('submit', function(event) {
  event.preventDefault();
  const codigo = document.getElementById('codigo').value.trim().toLowerCase();

  if (codigo === 'abc123') {
    window.location.href = 'player.html';
  } else {
    document.getElementById('mensagem').textContent = 'Código não encontrado.';
  }
});