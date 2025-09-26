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
let minhaEquipa = "A"; // 🚀 por agora default A (podes ligar a um radio button depois)

meuIndex = null; // slot do jogador (0 a 3) já let no main.js

// Entrar na sala
btnEntrarSala.onclick = () => {
  meuNome = nomeInput.value.trim();
  minhaSala = salaInput.value.trim();

  if (!meuNome || !minhaSala) {
    alert("Preenche o teu nome e a sala.");
    return;
  }

  socket.emit("entrar-sala", { nome: meuNome, salaId: minhaSala, equipa: minhaEquipa });

  nomeInput.disabled = true;
  salaInput.disabled = true;
  btnEntrarSala.disabled = true;

  listaJogadores.innerHTML = "Aguardando outros jogadores...";
  btnPronto.disabled = false;
};

// ================= EVENTOS =================

// Atualiza lista de jogadores na sala
socket.on("atualizar-jogadores", (jogadores) => {
  listaJogadores.innerHTML = "<strong>Jogadores na sala:</strong><br>" +
    jogadores.map(j => {
      let tag = j.nome + (j.pronto ? " (pronto)" : "");
      if (j.nome === meuNome) tag += " ← Tu (J" + (j.index + 1) + ")";
      return tag + " [Equipa " + j.equipa + "]";
    }).join("<br>");

  // Atualiza meuIndex
  const jogador = jogadores.find(j => j.nome === meuNome);
  if (jogador) meuIndex = jogador.index;
});

// Quando todos os jogadores estão prontos, iniciar jogo
socket.on("iniciar-jogo", ({ nomesJogadores, hand, trunfo: serverTrunfo, jogadorComTrunfo: serverTrunfoPlayer, turno }) => {
  // Define todos como humano por agora (podes mudar a lógica depois)
  tiposJogador = ["computador","computador","computador","computador"];
  nomesJogadores.forEach((nome,i) => tiposJogador[i] = "humano");

  // Reset ao estado local
  hands = [[], [], [], []];
  lixoEquipa1 = [];
  lixoEquipa2 = [];
  cardsOnTable = [];
  rondaAtual = 1;

  // Só a nossa mão
  hands[meuIndex] = hand;

  trunfo = serverTrunfo;
  jogadorComTrunfo = serverTrunfoPlayer;
  currentTurn = turno;

  document.getElementById("game").style.display = "block";
  renderHands();
  atualizarTrunfoLabel();
});

// Recebe jogada de outro jogador
socket.on("atualizar-jogada", ({ jogadorIndex, carta }) => {
  if (jogadorIndex !== meuIndex) {
    aplicarJogadaRemota(jogadorIndex, carta);
  }
});

// ================= FUNÇÕES =================

// Enviar jogada do jogador local
function enviarJogada(playerIndex, cardIndex) {
  const carta = hands[playerIndex][cardIndex]; // objeto {valor,naipe}
  // remove da mão local já (renderHands trata da UI)
  hands[playerIndex].splice(cardIndex, 1);
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

  if (cardsOnTable.length === 4) setTimeout(resolveRound, 300);
  else {
    currentTurn = (currentTurn + 1) % 4;
    updatePanel();
  }
}

// Sinalizar que estou pronto
btnPronto.onclick = () => {
  socket.emit("pronto", { salaId: minhaSala });
  btnPronto.disabled = true;
};

// Reiniciar jogo (chamar no botão "Replay")
function novoJogo() {
  if (minhaSala) {
    socket.emit("novo-jogo", { salaId: minhaSala });
  }
}
