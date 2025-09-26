// ================= SOCKET CLIENT =================
const socket = io(); // conecta automaticamente ao servidor

// DOM
const btnEntrarSala = document.getElementById("btn-entrar-sala");
const btnPronto = document.getElementById("btn-pronto");
const nomeInput = document.getElementById("nome-jogador");
const salaInput = document.getElementById("sala-id");
const listaJogadores = document.getElementById("lista-jogadores");
const btnReplay = document.getElementById("btn-replay"); // 🚀 botão do modal fim de jogo

// Variáveis
let minhaSala = "";
let meuNome = "";

meuIndex = null; // slot do jogador (0 a 3) já let no main.js

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

// Atualiza lista de jogadores na sala e no fim de jogo
socket.on("atualizar-jogadores", (jogadores) => {
  const html = "<strong>Jogadores na sala:</strong><br>" +
    jogadores.map(j => {
      let tags = j.nome;
      if (j.pronto) tags += " (pronto)";
      if (j.replay) tags += " (replay)";
      if (j.nome === meuNome) tags += " ← Tu (J" + (j.index + 1) + ")";
      return tags;
    }).join("<br>");

  // Atualiza no lobby
  listaJogadores.innerHTML = html;

  // Atualiza no modal de fim de jogo (se existir o elemento)
  const fimLista = document.getElementById("fim-lista-jogadores");
  if (fimLista) fimLista.innerHTML = html;

  // Atualiza meuIndex
  const jogador = jogadores.find(j => j.nome === meuNome);
  if (jogador) meuIndex = jogador.index;
});


// Quando todos os jogadores estão prontos ou pedem replay → iniciar jogo
socket.on("iniciar-jogo", ({ nomesJogadores, hands: serverHands, trunfo: serverTrunfo, jogadorComTrunfo: serverTrunfoPlayer, turno }) => {
  // Configura tipos de jogadores
  tiposJogador = ["computador","computador","computador","computador"];
  nomesJogadores.forEach((nome,i) => tiposJogador[i] = "humano");

  // Atualiza estado do jogo com dados do servidor
  hands = serverHands;
  trunfo = serverTrunfo;
  jogadorComTrunfo = serverTrunfoPlayer;
  currentTurn = turno;

  // Esconde modal de fim de jogo (se estava aberto)
  const modal = document.getElementById("fim-jogo-modal");
  if (modal) modal.classList.add("hidden");

  document.getElementById("game").style.display = "block";
  renderHands();
  atualizarTrunfoLabel();
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

// 🚀 Sinalizar que quero Replay
if (btnReplay) {
  btnReplay.onclick = () => {
    socket.emit("replay", { salaId: minhaSala });
    btnReplay.disabled = true; // evita clique duplo
  };
}

// Substituir attemptPlayCard para multiplayer online
const attemptPlayCardOriginal = attemptPlayCard;
attemptPlayCard = function(playerIndex, cardIndex) {
  if (tiposJogador[playerIndex] === "humano" && playerIndex === meuIndex) {
    enviarJogada(playerIndex, cardIndex);
  }
  attemptPlayCardOriginal(playerIndex, cardIndex);
};
