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
let onlineEstado = null; // estado do jogo enviado pelo servidor

// Entrar na sala
btnEntrarSala.onclick = () => {
  meuNome = nomeInput.value.trim();
  minhaSala = salaInput.value.trim();

  if (!meuNome || !minhaSala) {
    alert("Preenche o teu nome e a sala.");
    return;
  }

  socket.emit("entrar-sala", { nome: meuNome, salaId: minhaSala });

  nomeInput.disabled = true;
  salaInput.disabled = true;
  btnEntrarSala.disabled = true;

  listaJogadores.innerHTML = "Aguardando outros jogadores...";
  btnPronto.disabled = false;
};

// ================= EVENTOS =================

// Atualiza lista de jogadores
socket.on("atualizar-jogadores", (jogadores) => {
  listaJogadores.innerHTML = "<strong>Jogadores na sala:</strong><br>" +
    jogadores.map(j => `${j.nome} ${j.pronto ? "(pronto)" : ""}`).join("<br>");

  const jogador = jogadores.find(j => j.nome === meuNome);
  if (jogador) meuIndex = jogador.index;
});

// Quando todos prontos, começar jogo
socket.on("iniciar-jogo", (nomesJogadores, estadoDoServidor) => {
  alert(`O jogo vai começar com: ${nomesJogadores.join(", ")}`);
  btnPronto.disabled = true;

  onlineEstado = estadoDoServidor;

  // Atualiza tiposJogador: jogadores conectados = humano
  tiposJogador = ["computador","computador","computador","computador"];
  nomesJogadores.forEach((nome,i)=>tiposJogador[i]="humano");

  // Sobrescreve hands, trunfo, turno do main.js
  hands = onlineEstado.hands;
  trunfo = onlineEstado.trunfo;
  jogadorComTrunfo = onlineEstado.jogadorComTrunfo;
  currentTurn = onlineEstado.currentTurn;
  baralhadorAtual = onlineEstado.baralhadorAtual;

  startGame("online", tiposJogador, baralhadorAtual);
});

// Recebe jogada de outro jogador
socket.on("atualizar-jogada", ({ jogadorIndex, carta }) => {
  if (jogadorIndex !== meuIndex) {
    attemptPlayCard(jogadorIndex, carta);
  }
});

// ================= FUNÇÕES =================

// Enviar jogada do jogador local
function enviarJogada(playerIndex, cardIndex) {
  socket.emit("jogada", { salaId: minhaSala, jogadorIndex: playerIndex, carta: cardIndex });
}

// Sinalizar que estou pronto
btnPronto.onclick = () => {
  socket.emit("pronto", { salaId: minhaSala });
  btnPronto.disabled = true;
};

// Substituir attemptPlayCard para multiplayer online
const attemptPlayCardOriginal = attemptPlayCard;
attemptPlayCard = function(playerIndex, cardIndex) {
  if (tiposJogador[playerIndex]==="humano" && playerIndex===meuIndex) {
    enviarJogada(playerIndex, cardIndex);
  }
  attemptPlayCardOriginal(playerIndex, cardIndex);
};
