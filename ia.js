// ===== IA para Sueca =====
const DEBUG_IA = true; // muda para false para desligar logs

function debugLog(...args) {
  if (DEBUG_IA) console.log("[IA]", ...args);
}

// ---------- escolher carta IA ----------
function escolherCartaIA(playerIndex) {
  const hand = hands[playerIndex];
  const leadingSuit = cardsOnTable.length > 0 ? cardsOnTable[0].card.naipe : null;
  debugLog(`Jogador ${playerIndex+1} está a jogar. Mão:`, hand.map(c => c.valor+c.naipe).join(", "));

  // 1️⃣ Filtrar cartas válidas segundo regras
  let cartasValidas = hand.filter(c => {
    if (!leadingSuit) return true;
    const temLeadingSuit = hand.some(h => h.naipe === leadingSuit);
    return !temLeadingSuit || c.naipe === leadingSuit;
  });
  debugLog("Cartas válidas:", cartasValidas.map(c => c.valor+c.naipe).join(", "));

  // 1a️ Regra do Ás: abrir com Ás só se o naipe ainda não saiu e não for trunfo
  if (!leadingSuit) {
    cartasValidas = cartasValidas.map(c => {
      c._prioridade = 0;
      if (c.valor === "A" && c.naipe !== trunfo.naipe) {
        const saiuNaipe = [...cardsOnTable, ...lixoEquipa1, ...lixoEquipa2]
          .some(t => t.card?.naipe === c.naipe || t.naipe === c.naipe);
        if (!saiuNaipe) {
          c._prioridade = 2;
          debugLog(`Ás de ${c.naipe} marcado com prioridade porque ainda não saiu este naipe.`);
        }
      }
      return c;
    });
  }

  // 1b️ Regra do 7: não jogar 7 se o Ás desse naipe ainda não saiu (exceto última carta ou única jogável)
  cartasValidas = cartasValidas.map(c => {
    if (c.valor === "7") {
      const ultimaCarta = cardsOnTable.length === 3;
      const unicaCarta = cartasValidas.length === 1;

      // Verificar se o Ás já saiu
      const asSaiu = [...cardsOnTable, ...lixoEquipa1, ...lixoEquipa2]
        .some(x => x.card?.valor === "A" && x.card?.naipe === c.naipe || x.valor === "A" && x.naipe === c.naipe);

      if (!(ultimaCarta || unicaCarta || asSaiu)) {
        c._prioridade = -5; // desmotiva a escolha do 7
        debugLog(`Evitar jogar o 7 de ${c.naipe} porque o Ás ainda não saiu.`);
      }
    }
    return c;
  });

  // 2️⃣ Simular se ganha ou perde
  let cartasGanham = [];
  let cartasPerdem = [];

  for (const c of cartasValidas) {
    let winningCard = c;
    let winner = playerIndex;
    const simulatedTable = [...cardsOnTable, { player: playerIndex, card: c }];
    const leadSuit = simulatedTable[0].card.naipe;

    for (let i = 0; i < simulatedTable.length; i++) {
      const s = simulatedTable[i];
      const sc = s.card;
      const sp = s.player;

      if (sc.naipe === trunfo.naipe) {
        if (winningCard.naipe !== trunfo.naipe || valorCarta(sc) > valorCarta(winningCard)) {
          winner = sp;
          winningCard = sc;
        }
      } else if (sc.naipe === leadSuit) {
        if (winningCard.naipe === leadSuit && valorCarta(sc) > valorCarta(winningCard)) {
          winner = sp;
          winningCard = sc;
        }
      }
    }

    const equipa = [0,2].includes(playerIndex) ? 1 : 2;
    const equipaWinner = [0,2].includes(winner) ? 1 : 2;

    if (equipaWinner === equipa) {
      cartasGanham.push(c);
      debugLog(`Se jogar ${c.valor+c.naipe} => ganha a ronda`);
    } else {
      cartasPerdem.push(c);
      debugLog(`Se jogar ${c.valor+c.naipe} => perde a ronda`);
    }
  }

  // 3️⃣ Decidir carta
  let cartaEscolhida = null;

  if (cartasGanham.length > 0) {
    cartaEscolhida = cartasGanham.reduce((max, c) => {
      if ((c._prioridade || 0) > (max._prioridade || 0)) return c;
      return pontosCarta(c) > pontosCarta(max) ? c : max;
    }, cartasGanham[0]);

    // 🔹 Ajuste final para o 7
    if (cartaEscolhida.valor === "7" && (cartaEscolhida._prioridade || 0) < 0) {
      const alternativa = cartasGanham.filter(c => c.valor !== "7");
      if (alternativa.length > 0) {
        cartaEscolhida = alternativa.reduce((max, c) => pontosCarta(c) > pontosCarta(max) ? c : max, alternativa[0]);
        debugLog(`Substituiu 7 por ${cartaEscolhida.valor+cartaEscolhida.naipe} para evitar erro de principiante.`);
      }
    }

    debugLog("Decidiu jogar para GANHAR:", cartaEscolhida.valor+cartaEscolhida.naipe);
  } else {
    cartaEscolhida = cartasPerdem.reduce((min, c) => {
      if ((c._prioridade || 0) !== (min._prioridade || 0)) {
        return (c._prioridade || 0) > (min._prioridade || 0) ? c : min;
      }
      return pontosCarta(c) < pontosCarta(min) ? c : min;
    }, cartasPerdem[0]);
    debugLog("Decidiu jogar para PERDER:", cartaEscolhida.valor+cartaEscolhida.naipe);
  }

  return hand.indexOf(cartaEscolhida);
}

// ---------- jogada do computador ----------
function jogadaComputador(playerIndex) {
  const cardIndex = escolherCartaIA(playerIndex);
  attemptPlayCard(playerIndex, cardIndex);
}
