// ============================================================
// 🂡 SUECA ONLINE - MAIN.JS
// ============================================================
// Controla a lógica principal do jogo: inicialização, jogadas,
// rondas, placar, fim de jogo e o novo modo de "Organizar Mão".
// ============================================================


// ======================= CONFIGURAÇÃO =======================
const naipes = ["♠", "♥", "♦", "♣"];
const valores = ["A", "7", "K", "J", "Q", "6", "5", "4", "3", "2"];
const playerIds = ["jogador1", "jogador2", "jogador3", "jogador4"];

// Estado principal do jogo
let hands = [[], [], [], []];
let cardsOnTable = [];
let trunfo = null;
let jogadorComTrunfo = null;
let currentTurn = 0;
let rondaAtual = 1;
let lixoEquipa1 = [];
let lixoEquipa2 = [];
let baralhadorAtual = 0;

// Configuração do modo de jogo
let modoJogo;
let tiposJogador = ["humano", "humano", "humano", "humano"];
let jogadorHumano = null;
let jogadoresComputador = [];
let onlineGame = false;   // distingue modo online
let meuIndex = null;      // índice do jogador local

// ======================= ORGANIZAR MÃO =======================
let orderMode = false;    // indica se o modo de ordenação está ativo
let selectedCard = null;  // guarda o índice da carta selecionada

const btnOrganizar = document.getElementById("btn-organizar-mao");
if (btnOrganizar) {
  btnOrganizar.addEventListener("click", () => {
    orderMode = !orderMode;
    selectedCard = null;

    btnOrganizar.classList.toggle("active", orderMode);
    document.getElementById("maos").classList.toggle("ordering", orderMode);

    console.log(orderMode ? "[JOGO] Modo de ordenação ativado" : "[JOGO] Modo de ordenação desativado");
    renderHands(); // atualiza eventos das cartas
  });
}


// ======================= ELEMENTOS DOM =======================
const pontos1El   = document.getElementById("pontos1");
const pontos2El   = document.getElementById("pontos2");
const lixo1CardsEl = document.getElementById("lixo1-cartas");
const lixo2CardsEl = document.getElementById("lixo2-cartas");
const rondaInfo   = document.getElementById("ronda-info");
const turnoInfo   = document.getElementById("turno-info");
const trunfoSlot  = document.getElementById("trunfo-slot");
const trunfoLabel = document.getElementById("trunfo-label");


// ============================================================
// 🔧 FUNÇÕES UTILITÁRIAS
// ============================================================

// Cria um baralho de 40 cartas (A–2 de cada naipe)
function criarBaralho() {
  const deck = [];
  for (const naipe of naipes)
    for (const valor of valores)
      deck.push({ valor, naipe });
  return deck;
}

// Embaralha um array (Fisher–Yates)
function embaralhar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Valor hierárquico das cartas
function valorCarta(c) {
  return valores.length - valores.indexOf(c.valor);
}

// Pontuação das cartas
function pontosCarta(c) {
  switch (c.valor) {
    case "A": return 11;
    case "7": return 10;
    case "K": return 4;
    case "J": return 3;
    case "Q": return 2;
    default: return 0;
  }
}

// Atualiza o texto do trunfo
function atualizarTrunfoLabel() {
  trunfoLabel.textContent = (jogadorComTrunfo !== null)
    ? `Trunfo (J${jogadorComTrunfo + 1})`
    : "";
}


// ============================================================
// 🚀 INÍCIO DO JOGO (evento vindo do menu ou socket)
// ============================================================
window.addEventListener("iniciarJogo", (e) => {
  const config = e.detail;

  if (config.modo === "online" && !config.hands) {
    console.log("Modo online escolhido, à espera do servidor...");
    return;
  }
  startGame(config);
});


// ============================================================
// 🎴 RENDERIZAÇÃO DAS MÃOS
// ============================================================
function renderHands() {
  const maosDiv = document.getElementById("maos");
  maosDiv.style.flexDirection = "row";
  maosDiv.style.flexWrap = "wrap";

  for (let p = 0; p < 4; p++) {
    const container = document.getElementById(playerIds[p]);
    container.innerHTML = `<strong>J${p + 1}</strong>`;

    // Mostrar apenas as mãos visíveis
    const mostrarMao =
      (modoJogo === "local" || modoJogo === "programador") || (p === meuIndex);

    if (!mostrarMao) {
      container.style.display = "none";
      continue;
    }

    container.style.display = "flex";
    const leadingSuit = cardsOnTable.length > 0 ? cardsOnTable[0].card.naipe : null;
    const hasSuit = leadingSuit ? hands[p].some(c => c.naipe === leadingSuit) : false;

    // Renderização de cada carta
    for (let i = 0; i < hands[p].length; i++) {
      const c = hands[p][i];
      const d = document.createElement("div");
      d.className = "carta";
      d.textContent = `${c.valor}${c.naipe}`;
      if (["♥", "♦"].includes(c.naipe)) d.classList.add("red");

      // Lógica de interação
      if (p === meuIndex && tiposJogador[p] === "humano") {
        if (orderMode) {
          // ----- MODO ORGANIZAR -----
          d.onclick = () => onCardClick(i);
          d.classList.remove("disabled");
        } else if (p === currentTurn) {
          // ----- MODO NORMAL (JOGAR) -----
          if (!leadingSuit || c.naipe === leadingSuit || !hasSuit) {
            d.onclick = () => attemptPlayCard(p, i);
            d.classList.remove("disabled");
          } else {
            d.classList.add("disabled");
          }
        } else {
          d.classList.add("disabled");
        }
      } else {
        d.classList.add("disabled");
      }

      container.appendChild(d);
    }
  }

  updatePanel();
}


// ============================================================
// 🔄 ORGANIZAR CARTAS (modo click-swap)
// ============================================================
function onCardClick(index) {
  if (!orderMode) return;

  if (selectedCard === null) {
    selectedCard = index;
    highlightSelectedCard(index, true);
  } else {
    [hands[meuIndex][selectedCard], hands[meuIndex][index]] =
      [hands[meuIndex][index], hands[meuIndex][selectedCard]];
    selectedCard = null;
    renderHands();
  }
}

function highlightSelectedCard(index, active) {
  const container = document.getElementById(playerIds[meuIndex]);
  const cartas = container.querySelectorAll(".carta");
  cartas.forEach((c, i) => c.classList.toggle("selected", i === index && active));
}


// ============================================================
// 🂠 JOGAR CARTA
// ============================================================
function attemptPlayCard(playerIndex, cardIndex) {
  if (playerIndex !== currentTurn) return;
  jogarCartaLocal(playerIndex, cardIndex);
}

function jogarCartaLocal(playerIndex, cardIndex) {
  const leadingSuit = cardsOnTable.length > 0 ? cardsOnTable[0].card.naipe : null;
  const played = hands[playerIndex][cardIndex];

  // Valida se pode jogar
  if (leadingSuit) {
    const hasSuit = hands[playerIndex].some(c => c.naipe === leadingSuit);
    if (hasSuit && played.naipe !== leadingSuit) return;
  }

  // Remove da mão e coloca na mesa
  hands[playerIndex].splice(cardIndex, 1);
  const dom = document.createElement("div");
  dom.className = "carta carta-jogada";
  dom.textContent = `${played.valor}${played.naipe}`;
  if (["♥", "♦"].includes(played.naipe)) dom.classList.add("red");
  document.getElementById(`slot-j${playerIndex + 1}`).appendChild(dom);

  cardsOnTable.push({ player: playerIndex, card: played });

  if (cardsOnTable.length === 4) setTimeout(resolveRound, 300);
  else proximoTurno();
}


// ============================================================
// 🔁 PRÓXIMO TURNO
// ============================================================
function proximoTurno() {
  currentTurn = (currentTurn + 1) % 4;
  renderHands();

  if (tiposJogador[currentTurn] === "computador") {
    setTimeout(() => jogadaComputador(currentTurn), 500);
  }
}


// ============================================================
// 🏆 RESOLVER RONDA
// ============================================================
function resolveRound() {
  const leadSuit = cardsOnTable[0].card.naipe;
  let winner = cardsOnTable[0].player;
  let winningCard = cardsOnTable[0].card;

  for (let i = 1; i < cardsOnTable.length; i++) {
    const { card: c, player: p } = cardsOnTable[i];
    if (c.naipe === trunfo.naipe) {
      if (winningCard.naipe !== trunfo.naipe || valorCarta(c) > valorCarta(winningCard)) {
        winner = p; winningCard = c;
      }
    } else if (c.naipe === leadSuit && winningCard.naipe === leadSuit && valorCarta(c) > valorCarta(winningCard)) {
      winner = p; winningCard = c;
    }
  }

  // Distribui cartas para a equipa vencedora
  const destino = [0, 2].includes(winner) ? lixoEquipa1 : lixoEquipa2;
  cardsOnTable.forEach(p => destino.push(p.card));

  // Atualiza UI
  document.querySelectorAll(".carta-jogada").forEach(c => c.remove());
  rondaAtual++;
  updatePointsUI();
  updatePanel();

  // Mostra vencedor da ronda
  const roundWinnerDiv = document.getElementById("round-winner");
  const roundWinnerMsg = document.getElementById("round-winner-msg");
  const roundWinnerCard = document.getElementById("round-winner-card");

  roundWinnerMsg.textContent = `Jogador ${winner + 1} ganhou!`;
  roundWinnerCard.innerHTML = "";
  const cartaVencedora = document.createElement("div");
  cartaVencedora.className = "carta";
  cartaVencedora.style.width = "100px";
  cartaVencedora.style.height = "150px";
  cartaVencedora.textContent = `${winningCard.valor}${winningCard.naipe}`;
  if (["♥", "♦"].includes(winningCard.naipe)) cartaVencedora.classList.add("red");
  roundWinnerCard.appendChild(cartaVencedora);
  roundWinnerDiv.style.display = "block";

  // Avança para a próxima ronda
  const continueRound = () => {
    roundWinnerDiv.style.display = "none";
    cardsOnTable = [];
    currentTurn = winner;
    renderHands();

    if (!hands.some(h => h.length > 0)) return finalizarJogo();
    if (tiposJogador[currentTurn] === "computador")
      setTimeout(() => jogadaComputador(currentTurn), 500);
  };

  const timer = setTimeout(continueRound, 3000);
  document.getElementById("round-winner-btn").onclick = () => {
    clearTimeout(timer);
    continueRound();
  };
}


// ============================================================
// 📊 PAINEL E PONTOS
// ============================================================
function updatePanel() {
  rondaInfo.textContent = `Ronda ${Math.min(rondaAtual, 10)} / 10`;

  if (tiposJogador[currentTurn] === "humano") {
    turnoInfo.textContent = (currentTurn === meuIndex)
      ? "É a tua vez de jogar!"
      : `É a vez de J${currentTurn + 1} jogar`;
  } else {
    turnoInfo.textContent = `O computador (J${currentTurn + 1}) está a jogar...`;
  }

  // Atualiza trunfo
  if (trunfo) {
    trunfoSlot.textContent = `${trunfo.valor}${trunfo.naipe}`;
    trunfoSlot.classList.toggle("red", ["♥", "♦"].includes(trunfo.naipe));
  }
  atualizarTrunfoLabel();

  // Destaque no jogador ativo
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(playerIds[i]);
    if (el) el.classList.toggle("active", i === currentTurn);
  }

  // Atualiza lixos
  lixo1CardsEl.innerHTML = "";
  lixoEquipa1.forEach(c => {
    const d = document.createElement("div");
    d.className = "carta";
    d.textContent = `${c.valor}${c.naipe}`;
    if (["♥", "♦"].includes(c.naipe)) d.classList.add("red");
    lixo1CardsEl.appendChild(d);
  });

  lixo2CardsEl.innerHTML = "";
  lixoEquipa2.forEach(c => {
    const d = document.createElement("div");
    d.className = "carta";
    d.textContent = `${c.valor}${c.naipe}`;
    if (["♥", "♦"].includes(c.naipe)) d.classList.add("red");
    lixo2CardsEl.appendChild(d);
  });
}

function updatePointsUI() {
  const p1 = lixoEquipa1.reduce((s, c) => s + pontosCarta(c), 0);
  const p2 = lixoEquipa2.reduce((s, c) => s + pontosCarta(c), 0);
  pontos1El.textContent = `Pontos: ${p1}`;
  pontos2El.textContent = `Pontos: ${p2}`;
}


// ============================================================
// 🏁 FINAL DE JOGO
// ============================================================
function finalizarJogo() {
  const p1 = lixoEquipa1.reduce((s, c) => s + pontosCarta(c), 0);
  const p2 = lixoEquipa2.reduce((s, c) => s + pontosCarta(c), 0);
  const venceuE1 = p1 >= p2;

  document.getElementById("fim-jogo-titulo").style.color = venceuE1 ? "blue" : "red";
  document.getElementById("fim-jogo-mensagem").textContent =
    `🏆 Equipa ${venceuE1 ? 1 : 2} venceu! (${venceuE1 ? p1 : p2}-${venceuE1 ? p2 : p1})`;
  document.getElementById("fim-pontos1").textContent = `Equipa 1 & 3: ${p1} pontos`;
  document.getElementById("fim-pontos2").textContent = `Equipa 2 & 4: ${p2} pontos`;
  document.getElementById("fim-jogo-modal").classList.remove("hidden");

  // Botão "Jogar Novamente"
  document.getElementById("btn-replay").onclick = () => {
    document.getElementById("fim-jogo-modal").classList.add("hidden");

    if (onlineGame) {
      socket.emit("gameEnded", {
        salaId: minhaSala,
        resultado: {
          pontos: { e1: p1, e2: p2 }
        }
      });
      console.log("[ONLINE] Fim de jogo enviado ao servidor.");
      return;
    }
    iniciarNovoJogo();
  };

  // Botão "Menu"
  document.getElementById("btn-menu").onclick = () => {
    document.getElementById("fim-jogo-modal").classList.add("hidden");
    document.getElementById("game").style.display = "none";
    document.getElementById("menu-inicial").style.display = "block";
  };
}


// ============================================================
// 🕹️ INICIAR JOGO
// ============================================================
function startGame(config) {
  console.clear();
  console.log("=== Iniciando Jogo ===", config);

  // Troca para o ecrã do jogo
  document.getElementById("menu-inicial").style.display = "none";
  document.getElementById("game").style.display = "block";

  modoJogo = config.modo;
  tiposJogador = config.jogadores.map(j => j.tipo);
  baralhadorAtual = config.baralhador;
  onlineGame = (modoJogo === "online");

  if (modoJogo === "online") {
    // Reset local
    hands = [[], [], [], []];
    lixoEquipa1 = [];
    lixoEquipa2 = [];
    cardsOnTable = [];
    rondaAtual = 1;
    pontos1El.textContent = "Pontos: 0";
    pontos2El.textContent = "Pontos: 0";

    // Dados vindos do servidor
    hands = config.hands;
    trunfo = config.trunfo;
    jogadorComTrunfo = config.jogadorComTrunfo;
    currentTurn = config.turno;

    renderHands();
    atualizarTrunfoLabel();
    updatePointsUI();

    if (tiposJogador[currentTurn] === "computador")
      setTimeout(() => jogadaComputador(currentTurn), 800);

    return;
  }

  iniciarNovoJogo();
}


// ============================================================
// 🔁 NOVO JOGO (modo local/single)
// ============================================================
function iniciarNovoJogo() {
  if (modoJogo === "single") meuIndex = 0;

  baralhadorAtual = (baralhadorAtual) % 4;
  const deck = embaralhar(criarBaralho());

  hands = [[], [], [], []];
  lixoEquipa1 = [];
  lixoEquipa2 = [];
  cardsOnTable = [];
  rondaAtual = 1;

  trunfo = deck[0];
  jogadorComTrunfo = baralhadorAtual;

  const tempHands = [
    deck.slice(0, 10), deck.slice(10, 20),
    deck.slice(20, 30), deck.slice(30, 40)
  ];

  hands = tempHands.slice(baralhadorAtual).concat(tempHands.slice(0, baralhadorAtual));
  currentTurn = (baralhadorAtual + 3) % 4;

  renderHands();
  atualizarTrunfoLabel();
  updatePointsUI();

  if (tiposJogador[currentTurn] === "computador")
    setTimeout(() => jogadaComputador(currentTurn), 600);

  console.log(`🎴 Novo jogo iniciado`);
  console.log(`🃏 Baralhador: J${baralhadorAtual + 1} | Trunfo: ${trunfo.valor}${trunfo.naipe}`);
  console.log(`➡️  Começa: J${currentTurn + 1}`);

  baralhadorAtual = (baralhadorAtual + 1) % 4;
}
