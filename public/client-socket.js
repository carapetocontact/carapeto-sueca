// ================= SOCKET CLIENT =================
const socket = io(); // conecta automaticamente ao servidor

// DOM
const btnEntrarSala = document.getElementById("btn-entrar-sala");
const btnPronto = document.getElementById("btn-pronto");
const nomeInput = document.getElementById("nome-jogador");
const salaInput = document.getElementById("sala-id");
const listaJogadores = document.getElementById("lista-jogadores");

// Variáveis
let minhaSala = "";
let meuNome = "";
let meuIndex = null; // slot do jogador (0 a 3)

// Entrar na sala
btnEntrarSala.onclick = () => {
  meuNome = nomeInput.value.trim();
  minhaSala = salaInput.value.trim();

  if (!meuNome || !minhaSala) {
    alert("Por favor, preenche o teu nome e a sala.");
    return;
  }

  // envia evento para servidor
  socket.emit("entrar-sala", { nome: meuNome, salaId: minhaSala });

  // Desativa inputs para evitar mudanças
  nomeInput.disabled = true;
  salaInput.disabled = true;
  btnEntrarSala.disabled = true;

  listaJogadores.innerHTML = "Aguardando outros jogadores...";
  btnPronto.disabled = false;
};

// ================= EVENTOS RECEBIDOS =================

// Atualiza lista de jogadores na sala
socket.on("atualizar-jogadores", (jogadores) => {
  listaJogadores.innerHTML = "<strong>Jogadores na sala:</strong><br>" +
    jogadores.map(j => `${j.nome} ${j.pronto ? "(pronto)" : ""}`).join("<br>");

  // Descobre o índice do jogador atual
  const jogador = jogadores.find(j => j.nome === meuNome);
  if (jogador) meuIndex = jogador.index;
});

// Quando todos os jogadores estão prontos, começar jogo
socket.on("iniciar-jogo", (nomesJogadores) => {
  alert(`O jogo vai começar com: ${nomesJogadores.join(", ")}`);
  btnPronto.disabled = true;

  // Atualiza tiposJogador: humanos = jogadores conectados, restante = computador
  tiposJogador = ["computador", "computador", "computador", "computador"];
  nomesJogadores.forEach((nome, i) => {
    tiposJogador[i] = "humano";
  });

  startGame("online", tiposJogador, 0); // baralhador padrão
});

// Recebe jogada de outro jogador
socket.on("atualizar-jogada", ({ jogadorIndex, carta }) => {
  console.log(`Recebido jogada do jogador ${jogadorIndex + 1}: carta ${carta}`);
  // Chama attemptPlayCard do main.js simulando jogada remota
  if (jogadorIndex !== meuIndex) {
    attemptPlayCard(jogadorIndex, carta);
  }
});

// ================= FUNÇÕES =================

// Enviar jogada do jogador local
function enviarJogada(playerIndex, cardIndex) {
  socket.emit("jogada", { salaId: minhaSala, jogadorIndex: playerIndex, carta: cardIndex });
}

// ================= NOVO =================

// Sinalizar que estou pronto
btnPronto.onclick = () => {
  socket.emit("pronto", { salaId: minhaSala });
  btnPronto.disabled = true;
};

// Substituir attemptPlayCard para enviar jogada ao servidor se for online
const attemptPlayCardOriginal = attemptPlayCard;
attemptPlayCard = function(playerIndex, cardIndex) {
  if (tiposJogador[playerIndex] === "humano" && playerIndex === meuIndex) {
    // envia ao servidor
    enviarJogada(playerIndex, cardIndex);
  }
  // Chama função original para atualizar UI local
  attemptPlayCardOriginal(playerIndex, cardIndex);
};
