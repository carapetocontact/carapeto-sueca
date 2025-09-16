// ===== IA para Sueca com debug aprimorado =====
const DEBUG_IA = true;

function debugLog(...args) {
  if (DEBUG_IA) console.log("[IA]", ...args);
}

// ---------- escolher carta IA ----------
function escolherCartaIA(playerIndex) {
  const hand = hands[playerIndex];
  const leadingSuit = cardsOnTable.length > 0 ? cardsOnTable[0].card.naipe : null;

  debugLog(`Jogador ${playerIndex+1} está a jogar. Mão:`, hand.map(c => c.valor+c.naipe).join(", "));
  debugLog("Mesa antes da jogada:", cardsOnTable.map(c => c.card.valor+c.card.naipe).join(", "));

  // 1️⃣ Determinar se tem que assistir ou pode cortar
  const temLeadingSuit = hand.some(c => c.naipe === leadingSuit);
  let cartasValidas;

  if (temLeadingSuit) {
    // Só pode jogar cartas do naipe líder
    cartasValidas = hand.filter(c => c.naipe === leadingSuit);
  } else if (leadingSuit) {
    // Não tem naipe líder: pode jogar qualquer carta (trunfo ou outra)
    cartasValidas = [...hand];
  } else {
    // Primeira carta da rodada: qualquer carta válida
    cartasValidas = [...hand];
  }

  // Debug: “tem que assistir” e “pode cortar”
  let temQueAssistir = [];
  let podeCortar = [];

  if (temLeadingSuit) {
    temQueAssistir = cartasValidas.map(c => c.valor+c.naipe);
    debugLog(`Jogador ${playerIndex+1} tem que assistir com: [${temQueAssistir.join(", ")}]`);
  } else if (leadingSuit) {
    podeCortar = hand.filter(c => c.naipe === trunfo.naipe).map(c => c.valor+c.naipe);
    if (podeCortar.length > 0)
      debugLog(`Jogador ${playerIndex+1} pode cortar com: [${podeCortar.join(", ")}]`);
  }

  debugLog("Cartas válidas:", cartasValidas.map(c => c.valor+c.naipe).join(", "));

  // 2️⃣ Prioridade Ás
  cartasValidas = cartasValidas.map(c => {
    c._prioridade = 0;
    if (!leadingSuit && c.valor === "A" && c.naipe !== trunfo.naipe) {
      const saiuNaipe = [...cardsOnTable, ...lixoEquipa1, ...lixoEquipa2]
        .some(t => (t.card?.naipe === c.naipe) || (t.naipe === c.naipe));
      if (!saiuNaipe) {
        c._prioridade = 2;
        debugLog(`Ás de ${c.naipe} marcado com prioridade porque ainda não saiu este naipe.`);
      }
    }
    return c;
  });

  // 3️⃣ Prioridade 7
  cartasValidas = cartasValidas.map(c => {
    if (c.valor === "7") {
      const ultimaCarta = cardsOnTable.length === 3;
      const unicaCarta = cartasValidas.length === 1;
      const asSaiu = [...cardsOnTable, ...lixoEquipa1, ...lixoEquipa2]
        .some(x => (x.card?.valor === "A" && x.card?.naipe === c.naipe) || (x.valor === "A" && x.naipe === c.naipe));

      if (!(ultimaCarta || unicaCarta || asSaiu)) {
        c._prioridade = -5; // desmotiva a escolha do 7
        debugLog(`Evitar jogar o 7 de ${c.naipe} porque o Ás ainda não saiu.`);
      }
    }
    return c;
  });

  // 4️⃣ Simular cada carta
  let cartasGanham = [];
  let cartasPerdem = [];

  for (const c of cartasValidas) {
    const simulatedTable = [...cardsOnTable, { player: playerIndex, card: c }];
    const leadSuit = simulatedTable[0].card.naipe;

    let winnerCard = simulatedTable[0].card;
    let winnerPlayer = simulatedTable[0].player;

    for (let i = 1; i < simulatedTable.length; i++) {
      const s = simulatedTable[i];
      if (!s || !s.card) continue; // segurança
      const sc = s.card;
      const sp = s.player;

      // Cartas que não seguem naipe líder e não são trunfo não podem ganhar
      if (sc.naipe !== leadSuit && sc.naipe !== trunfo.naipe) continue;

      // Se carta é trunfo
      if (sc.naipe === trunfo.naipe) {
        if (winnerCard.naipe !== trunfo.naipe || valorCarta(sc) > valorCarta(winnerCard)) {
          winnerCard = sc;
          winnerPlayer = sp;
        }
      }
      // Se carta é do naipe líder
      else if (sc.naipe === leadSuit) {
        if (winnerCard.naipe === leadSuit && valorCarta(sc) > valorCarta(winnerCard)) {
          winnerCard = sc;
          winnerPlayer = sp;
        }
      }
    }

    const equipa = [0,2].includes(playerIndex) ? 1 : 2;
    const equipaWinner = [0,2].includes(winnerPlayer) ? 1 : 2;

    if (equipaWinner === equipa) {
      cartasGanham.push(c);
      debugLog(`Se jogar ${c.valor+c.naipe} => GANHA`);
    } else {
      cartasPerdem.push(c);
      debugLog(`Se jogar ${c.valor+c.naipe} => PERDE`);
    }
  }

  // 5️⃣ Escolha final
  let cartaEscolhida = null;

  if (cartasGanham.length > 0) {
    cartaEscolhida = cartasGanham.reduce((max, c) => {
      if ((c._prioridade || 0) > (max._prioridade || 0)) return c;
      return pontosCarta(c) > pontosCarta(max) ? c : max;
    }, cartasGanham[0]);
  } else {
    cartaEscolhida = cartasPerdem.reduce((min, c) => {
      if ((c._prioridade || 0) !== (min._prioridade || 0)) {
        return (c._prioridade || 0) > (min._prioridade || 0) ? c : min;
      }
      return pontosCarta(c) < pontosCarta(min) ? c : min;
    }, cartasPerdem[0]);
  }

  debugLog("Carta escolhida:", cartaEscolhida.valor+cartaEscolhida.naipe);
  return hand.indexOf(cartaEscolhida);
}

// ---------- jogada do computador ----------
function jogadaComputador(playerIndex) {
  const cardIndex = escolherCartaIA(playerIndex);
  attemptPlayCard(playerIndex, cardIndex);
}
