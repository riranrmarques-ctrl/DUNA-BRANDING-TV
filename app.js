const form = document.getElementById('codeForm');
const input = document.getElementById('codigo');
const mensagem = document.getElementById('mensagem');

const ULTIMO_CODIGO_KEY = 'duna_ultimo_codigo';
const TEMPO_ESPERA = 60000; // 1 minuto

async function carregarClientes() {
  const response = await fetch('clientes.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Erro ao carregar clientes.json');
  }
  return await response.json();
}

function abrirPlayer(codigo) {
  window.location.href = `player.html?codigo=${encodeURIComponent(codigo)}`;
}

async function validarCodigo(codigo) {
  const clientes = await carregarClientes();
  return clientes.find(item => item.codigo.toLowerCase() === codigo.toLowerCase());
}

if (form && input && mensagem) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const codigo = input.value.trim().toLowerCase();

    if (!codigo) {
      mensagem.textContent = 'Digite um código válido.';
      return;
    }

    try {
      const cliente = await validarCodigo(codigo);

      if (!cliente) {
        mensagem.textContent = 'Código não encontrado.';
        return;
      }

      localStorage.setItem(ULTIMO_CODIGO_KEY, codigo);
      abrirPlayer(codigo);
    } catch (error) {
      mensagem.textContent = 'Erro ao carregar os dados.';
      console.error(error);
    }
  });

  const ultimoCodigo = localStorage.getItem(ULTIMO_CODIGO_KEY);

  if (ultimoCodigo) {
    mensagem.textContent = 'Abrindo automaticamente em 1 minuto...';

    setTimeout(async () => {
      try {
        const cliente = await validarCodigo(ultimoCodigo);
        if (cliente) {
          abrirPlayer(ultimoCodigo);
        }
      } catch (error) {
        console.error(error);
      }
    }, TEMPO_ESPERA);
  }
}
