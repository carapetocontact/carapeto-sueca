// ================= SOCKET CLIENT =================
const socket = io(); // conecta automaticamente ao servidor

// DOM
const btnEntrarSala = document.getElementById("btn-entrar-sala");
const nomeInput = document.getElementById("nome-jogador");
const salaInput = document.getElementById("sala-id");
const listaJogadores = document.getElementById("lista-jogadores");

// Variáveis
let minhaSala = "";
let meuNome = "";

// Entrar na sala
btnEntrarSala.onclick = () => {
  meuNome = nomeInput.value.trim();
  minhaSala = salaInput.value.trim();

  if (!meuNome || !minhaSala) {
    alert("Por favor, preenche o teu nome e a sala.");
    return;
  }

  // envia evento para servidor
  socket.emit("entrarSala", { nome: meuNome, sala: minhaSala });

  // Desativa inputs para evitar mudanças
  nomeInput.disabled = true;
  salaInput.disabled = true;
  btnEntrarSala.disabled = true;

  listaJogadores.innerHTML = "Aguardando outros jogadores...";
};

// ================= EVENTOS RECEBIDOS =================

// Atualiza lista de jogadores na sala
socket.on("atualizarJogadores", (jogadores) => {
  listaJogadores.innerHTML = "<strong>Jogadores na sala:</strong><br>" +
    jogadores.map(j => j.nome).join("<br>");
});

// Quando todos os jogadores estão prontos, começar jogo
socket.on("iniciarJogo", (data) => {
  alert(`Todos jogadores entraram! O jogo vai começar.`);
  // Aqui podemos iniciar o startGame do main.js
  // startGame(data.modo, data.tipos, data.baralhador);
});

// Recebe jogada de outro jogador
socket.on("jogada", ({ jogador, cartaIndex }) => {
  console.log(`Recebido jogada do jogador ${jogador + 1}: carta ${cartaIndex}`);
  // Aqui podemos chamar attemptPlayCard se for multiplayer
});

// ================= FUNÇÕES =================

// Função para enviar a jogada
function enviarJogada(playerIndex, cardIndex) {
  socket.emit("jogada", { sala: minhaSala, jogador: playerIndex, cartaIndex });
}
