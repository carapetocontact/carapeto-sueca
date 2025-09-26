// ================= SOCKET CLIENT =================
const socket = io(); // conecta automaticamente ao servidor

// DOM
const btnEntrarSala = document.getElementById("btn-entrar-sala");
const btnPronto = document.getElementById("btn-pronto");
const nomeInput = document.getElementById("nome-jogador");
const salaInput = document.getElementById("sala-id");
const posicaoInput = document.getElementById("posicao-jogador"); // 🚀 novo
const listaJogadores = document.getElementById("lista-jogadores");

// Variáveis
let minhaSala = "";
let meuNome = "";

meuIndex = null; // slot do jogador (0 a 3) já let no main.js

// ================= ENTRAR NA SALA =================
btnEntrarSala.onclick = () => {
  meuNome = nomeInput.value.trim();
  minhaSala = salaInput.value.trim();
  const posicao = parseInt(posicaoInput.value, 10);

  if (!meuNome || !minhaSala) {
    alert("Preenche o teu nome e a sala.");
    return;
  }

  socket.emit("entrar-sala", { nome: meuNome, salaId: minhaSala, index: posicao });

  nomeInput.disabled = true;
  salaInput.disabled = true;
  posicaoInput.disabled = true;
  btnEntrarSala.disabled = true;

  listaJogadores.innerHTML = "Aguardando outros jogadores...";
  btnPronto.disabled = false;
};

// ================= EVENTOS DO SERVIDOR =================

// Atualizar lista de jogadores
socket.on("atualizar-jogadores", (jogadores) => {
  listaJogadores.innerHTML = "<strong>Jogadores na sala:</strong><br>" +
    jogadores.map(j => {
      let tag = j.nome + (j.pronto ? " (pronto)" : "");
      if (j.id === socket.id) tag += " ← Tu (J" + (j.index + 1) + ")";
      return tag;
    }).join("<br>");

  // ✅ Define o meuIndex pelo socket.id
  const eu = jogadores.find(j => j.id === socket.id);
  if (eu) meuIndex = eu.index;
});

// Início do jogo
socket.on("iniciar-jogo", ({ nomesJogadores, hand, trunfo: serverTrunfo, jogadorComTrunfo: serverTrunfoPlayer, turno }) => {
  onlineGame = true;

  // Reset estado local
  hands = [[], [], [], []];
  lixoEquipa1 = [];
  lixoEquipa2 = [];
  cardsOnTable = [];
  rondaAtual = 1;

  // Só a minha mão
  if (meuIndex === null) meuIndex = 0; // fallback
  hands[meuIndex] = hand || [];

  trunfo = serverTrunfo;
  jogadorComTrunfo = serverTrunfoPlayer;
  currentTurn = turno;

  document.getElementById("game").style.display = "block";
  renderHands();
  atualizarTrunfoLabel();
});

// Jogada de outro jogador
socket.on("atualizar-jogada", ({ jogadorIndex, carta }) => {
  if (jogadorIndex !== meuIndex) {
    aplicarJogadaRemota(jogadorIndex, carta);
  }
});

// ================= FUNÇÕES AUXILIARES =================

// Enviar jogada do jogador local
function enviarJogada(playerIndex, cardIndex) {
  const carta = hands[playerIndex][cardIndex]; // objeto {valor, naipe}
  socket.emit("jogada", { salaId: minhaSala, jogadorIndex: playerIndex, carta });
}

// Jogada remota: desenhar carta na mesa
function aplicarJogadaRemota(playerIndex, carta) {
  const dom = document.createElement("div");
  dom.className = "carta carta-jogada";
  dom.textContent = `${carta.valor}${carta.naipe}`;
  if (["♥","♦"].includes(carta.naipe)) dom.classList.add("red");
  document.getElementById(`slot-j${playerIndex+1}`).appendChild(dom);

  cardsOnTable.push({ player: playerIndex, card: carta });

  if (cardsOnTable.length === 4) {
    setTimeout(resolveRound, 300);
  } else {
    currentTurn = (currentTurn + 1) % 4;
    updatePanel();
  }
}

// ================= BOTÕES =================

// Marcar como pronto
btnPronto.onclick = () => {
  socket.emit("pronto", { salaId: minhaSala });
  btnPronto.disabled = true;
};

// Replay → pedir novo jogo ao servidor
function novoJogo() {
  if (minhaSala) {
    socket.emit("novo-jogo", { salaId: minhaSala });
  }
}

// ================= MONKEY PATCH =================
// Substituir attemptPlayCard para multiplayer online
const attemptPlayCardOriginal = attemptPlayCard;
attemptPlayCard = function(playerIndex, cardIndex) {
  if (tiposJogador[playerIndex] === "humano" && playerIndex === meuIndex) {
    enviarJogada(playerIndex, cardIndex);
  }
  attemptPlayCardOriginal(playerIndex, cardIndex);
};
