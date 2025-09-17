// ====== Configuração ======
const naipes = ["♠", "♥", "♦", "♣"];
const valores = ["A", "7", "K", "J", "Q", "6", "5", "4", "3", "2"];
const playerIds = ["jogador1", "jogador2", "jogador3", "jogador4"];

let hands = [[], [], [], []];
let cardsOnTable = [];
let trunfo = null;
let jogadorComTrunfo = null;
let currentTurn = 0;
let rondaAtual = 1;
let lixoEquipa1 = [];
let lixoEquipa2 = [];
let baralhadorAtual = 0;

let modoJogo;
let tiposJogador = ["humano", "humano", "humano", "humano"];
let jogadorHumano = null;
let jogadoresComputador = [];
let onlineGame = false; // 🚀 novo: distingue modo online
let meuIndex = null; // índice do jogador local


// DOM
const pontos1El = document.getElementById("pontos1");
const pontos2El = document.getElementById("pontos2");
const lixo1CardsEl = document.getElementById("lixo1-cartas");
const lixo2CardsEl = document.getElementById("lixo2-cartas");
const rondaInfo = document.getElementById("ronda-info");
const turnoInfo = document.getElementById("turno-info");
const trunfoSlot = document.getElementById("trunfo-slot");
const trunfoLabel = document.getElementById("trunfo-label");

// ---------- utilitárias ----------
function criarBaralho() {
  const deck = [];
  for (const naipe of naipes) for (const valor of valores) deck.push({ valor, naipe });
  return deck;
}

function embaralhar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function valorCarta(c) { return valores.length - valores.indexOf(c.valor); }
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

function atualizarTrunfoLabel() {
  if (jogadorComTrunfo !== null) {
    trunfoLabel.textContent = `Trunfo (J${jogadorComTrunfo + 1})`;
  } else {
    trunfoLabel.textContent = "";
  }
}

// ---------- render mãos ----------
function renderHands() {
  const maosContainer = document.getElementById('maos');
  maosContainer.style.flexDirection = 'row';

  for (let p = 0; p < 4; p++) {
    const container = document.getElementById(playerIds[p]);

    // Força horizontal
    container.style.display = "flex";
    container.style.flexDirection = "row";
    container.style.flexWrap = "wrap";

    // Mostrar apenas a mão do jogador local
    if (p === meuIndex) {
      container.style.display = "flex";  // mostrar
      container.innerHTML = `<strong>J${p + 1}</strong>`;

      const leadingSuit = cardsOnTable.length > 0 ? cardsOnTable[0].card.naipe : null;
      const hasSuit = leadingSuit ? hands[p].some(c => c.naipe === leadingSuit) : false;

      for (let i = 0; i < hands[p].length; i++) {
        const c = hands[p][i];
        const d = document.createElement("div");
        d.className = "carta";
        d.textContent = `${c.valor}${c.naipe}`;
        if (["♥","♦"].includes(c.naipe)) d.classList.add("red");

        let canClick = tiposJogador[p] === "humano" && p === currentTurn;
        if (canClick) {
          if (!leadingSuit || c.naipe === leadingSuit || !hasSuit) {
            d.onclick = () => attemptPlayCard(p, i);
            d.classList.remove("disabled");
          } else {
            d.classList.add("disabled");
          }
        } else {
          d.classList.add("disabled");
        }

        container.appendChild(d);
      }
    } else {
      container.style.display = "none"; // esconder os outros
    }
  }

  updatePanel();
}








// ---------- jogar carta ----------
function attemptPlayCard(playerIndex, cardIndex) {
  if (playerIndex !== currentTurn) return;

  if (onlineGame) {
    // 🚀 online: apenas envia jogada ao servidor
    enviarJogada(playerIndex, cardIndex);
    return;
  }

  // offline: lógica local
  jogarCartaLocal(playerIndex, cardIndex);
}

function jogarCartaLocal(playerIndex, cardIndex) {
  const leadingSuit = cardsOnTable.length > 0 ? cardsOnTable[0].card.naipe : null;
  const played = hands[playerIndex][cardIndex];

  if (leadingSuit) {
    const hasSuit = hands[playerIndex].some(c => c.naipe === leadingSuit);
    if (hasSuit && played.naipe !== leadingSuit) return;
  }

  hands[playerIndex].splice(cardIndex, 1);
  const dom = document.createElement("div");
  dom.className = "carta carta-jogada";
  dom.textContent = `${played.valor}${played.naipe}`;
  if (["♥","♦"].includes(played.naipe)) dom.classList.add("red");
  document.getElementById(`slot-j${playerIndex+1}`).appendChild(dom);

  cardsOnTable.push({ player: playerIndex, card: played });

  if (cardsOnTable.length === 4) setTimeout(resolveRound, 300);
  else proximoTurno();
}

// ---------- próximo turno ----------
function proximoTurno() {
  currentTurn = (currentTurn + 1) % 4;
  renderHands();

  if (!onlineGame && tiposJogador[currentTurn] === "computador") {
    setTimeout(() => jogadaComputador(currentTurn), 500);
  }
}

// ---------- resolver ronda ----------
function resolveRound() {
  const leadSuit = cardsOnTable[0].card.naipe;
  let winner = cardsOnTable[0].player;
  let winningCard = cardsOnTable[0].card;

  for (let i = 1; i < cardsOnTable.length; i++) {
    const c = cardsOnTable[i].card;
    const p = cardsOnTable[i].player;
    if (c.naipe === trunfo.naipe) {
      if (winningCard.naipe !== trunfo.naipe || valorCarta(c) > valorCarta(winningCard)) {
        winner = p;
        winningCard = c;
      }
    } else if (c.naipe === leadSuit) {
      if (winningCard.naipe === leadSuit && valorCarta(c) > valorCarta(winningCard)) {
        winner = p;
        winningCard = c;
      }
    }
  }

  if ([0,2].includes(winner)) cardsOnTable.forEach(p => lixoEquipa1.push(p.card));
  else cardsOnTable.forEach(p => lixoEquipa2.push(p.card));

  document.querySelectorAll(".carta-jogada").forEach(c => c.remove());
  rondaAtual++;
  updatePointsUI();
  updatePanel();

  const roundWinnerDiv = document.getElementById("round-winner");
  const roundWinnerMsg = document.getElementById("round-winner-msg");
  const roundWinnerCard = document.getElementById("round-winner-card");

  roundWinnerMsg.textContent = `Jogador ${winner+1} ganhou!`;
  roundWinnerCard.innerHTML = "";
  const cartaVencedora = document.createElement("div");
  cartaVencedora.className = "carta";
  cartaVencedora.style.width = "100px";
  cartaVencedora.style.height = "150px";
  cartaVencedora.textContent = `${winningCard.valor}${winningCard.naipe}`;
  if (["♥","♦"].includes(winningCard.naipe)) cartaVencedora.classList.add("red");
  roundWinnerCard.appendChild(cartaVencedora);

  roundWinnerDiv.style.display = "block";

  function continueRound() {
    roundWinnerDiv.style.display = "none";
    cardsOnTable = [];
    currentTurn = winner;
    renderHands();

    if (!hands.some(h => h.length > 0)) {
      finalizarJogo();
      return;
    }

    if (!onlineGame && tiposJogador[currentTurn] === "computador") {
      setTimeout(() => jogadaComputador(currentTurn), 500);
    }
  }

  const timer = setTimeout(continueRound, 3000);
  document.getElementById("round-winner-btn").onclick = () => {
    clearTimeout(timer);
    continueRound();
  };
}

// ---------- atualizar painel e pontos ----------
function updatePanel() {
  rondaInfo.textContent = `Ronda ${Math.min(rondaAtual, 10)} / 10`;
  turnoInfo.textContent = tiposJogador[currentTurn] === "humano" ?
      "É a tua vez de jogar!" :
      `O computador (J${currentTurn+1}) está a jogar...`;

  if (trunfo) {
    trunfoSlot.textContent = `${trunfo.valor}${trunfo.naipe}`;
    trunfoSlot.classList.remove("red");
    if (["♥","♦"].includes(trunfo.naipe)) {
      trunfoSlot.classList.add("red");
    }
  }

  atualizarTrunfoLabel();

  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(playerIds[i]);
    if (!el) continue;
    el.classList.toggle("active", i === currentTurn);
  }

  lixo1CardsEl.innerHTML = "";
  lixoEquipa1.forEach(c => {
    const d = document.createElement("div");
    d.className = "carta";
    d.textContent = `${c.valor}${c.naipe}`;
    if (["♥","♦"].includes(c.naipe)) d.classList.add("red");
    lixo1CardsEl.appendChild(d);
  });

  lixo2CardsEl.innerHTML = "";
  lixoEquipa2.forEach(c => {
    const d = document.createElement("div");
    d.className = "carta";
    d.textContent = `${c.valor}${c.naipe}`;
    if (["♥","♦"].includes(c.naipe)) d.classList.add("red");
    lixo2CardsEl.appendChild(d);
  });
}

function updatePointsUI() {
  const p1 = lixoEquipa1.reduce((s, c) => s + pontosCarta(c), 0);
  const p2 = lixoEquipa2.reduce((s, c) => s + pontosCarta(c), 0);
  pontos1El.textContent = `Pontos: ${p1}`;
  pontos2El.textContent = `Pontos: ${p2}`;
}

// ---------- finalizar jogo ----------
function finalizarJogo() {
  const p1 = lixoEquipa1.reduce((s, c) => s + pontosCarta(c), 0);
  const p2 = lixoEquipa2.reduce((s, c) => s + pontosCarta(c), 0);
  let resultado = "";
  let cor = "";

  if (p1 >= p2) { resultado = `🏆 Equipa 1 venceu! (${p1}-${p2})`; cor = "blue"; }
  else { resultado = `🏆 Equipa 2 venceu! (${p2}-${p1})`; cor = "red"; }

  document.getElementById("fim-jogo-titulo").style.color = cor;
  document.getElementById("fim-jogo-mensagem").textContent = resultado;
  document.getElementById("fim-pontos1").textContent = `Equipa 1 & 3: ${p1} pontos`;
  document.getElementById("fim-pontos2").textContent = `Equipa 2 & 4: ${p2} pontos`;
  document.getElementById("fim-jogo-modal").classList.remove("hidden");

  document.getElementById("btn-replay").onclick = () => {
    document.getElementById("fim-jogo-modal").classList.add("hidden");
    iniciarNovoJogo();
  };

  document.getElementById("btn-menu").onclick = () => {
    document.getElementById("fim-jogo-modal").classList.add("hidden");
    document.getElementById("game").style.display = "none";
    document.getElementById("menu-inicial").style.display = "block";
  };
}


// ---------- iniciar novo jogo ----------
function iniciarNovoJogo() {
  // Define índice do jogador local se singleplayer
  if (modoJogo === "singleplayer") meuIndex = 0;

  const deck = embaralhar(criarBaralho());

  hands = [[], [], [], []];
  lixoEquipa1 = [];
  lixoEquipa2 = [];
  cardsOnTable = [];
  rondaAtual = 1;

  currentTurn = (baralhadorAtual + 1) % 4;
  jogadorComTrunfo = baralhadorAtual;
  trunfo = deck[0];

  for (let i = 0; i < 4; i++) {
    hands[i] = deck.slice(i * 10, (i + 1) * 10);
  }

  // 🚀 Certifica-se de que meuIndex está definido antes de renderizar
  if (meuIndex === null) meuIndex = 0;

  renderHands();
  atualizarTrunfoLabel();

  if (!onlineGame && tiposJogador[currentTurn] === "computador") {
    setTimeout(() => jogadaComputador(currentTurn), 500);
  }

  baralhadorAtual = (baralhadorAtual + 1) % 4;
}

// ---------- start game ----------
function startGame(modo, tipos, baralhador, estadoServidor = null) {
  modoJogo = modo;
  tiposJogador = tipos;
  document.getElementById("game").style.display = "block";

  if (modoJogo === "singleplayer") {
    meuIndex = 0;
    onlineGame = false;
  } else if (modoJogo === "online") {
    onlineGame = true;
    // meuIndex será definido pelo servidor
  }

  jogadorHumano = tiposJogador.indexOf("humano");
  jogadoresComputador = tiposJogador
    .map((t, i) => (t === "computador" ? i : -1))
    .filter(i => i !== -1);

  if (modo === "online" && estadoServidor) {
    hands = estadoServidor.hands;
    trunfo = estadoServidor.trunfo;
    jogadorComTrunfo = estadoServidor.jogadorComTrunfo;
    currentTurn = estadoServidor.currentTurn;
    baralhadorAtual = estadoServidor.baralhadorAtual;
    lixoEquipa1 = [];
    lixoEquipa2 = [];
    cardsOnTable = [];

    // 🚀 Se meuIndex não foi setado, pega do estado do servidor
    if (meuIndex === null && estadoServidor.meuIndex !== undefined) {
      meuIndex = estadoServidor.meuIndex;
    }

    renderHands();
    atualizarTrunfoLabel();
  } else {
    baralhadorAtual = baralhador;
    iniciarNovoJogo();
  }
}





// ---------- eventos ----------
document.getElementById("btn-novo-jogo").onclick = iniciarNovoJogo;
