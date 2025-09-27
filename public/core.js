// ===== CORE da Sueca =====

// Naipes e valores fixos da Sueca
window.naipes = ["♠", "♥", "♦", "♣"];
window.valores = ["A", "7", "K", "J", "Q", "6", "5", "4", "3", "2"];

// Criar baralho completo
window.criarBaralho = function () {
  const deck = [];
  for (const naipe of window.naipes) {
    for (const valor of window.valores) {
      deck.push({ valor, naipe });
    }
  }
  return deck;
};

// Embaralhar baralho (Fisher-Yates)
window.embaralhar = function (deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Distribuir cartas a partir de um baralhador
window.distribuirCartas = function (baralhadorAtual) {
  const deck = window.embaralhar(window.criarBaralho());

  // 10 cartas para cada jogador
  const hands = [
    deck.slice(0, 10),
    deck.slice(10, 20),
    deck.slice(20, 30),
    deck.slice(30, 40),
  ];

  // Primeira carta do baralho define o trunfo
  const trunfo = deck[0];

  // O jogador baralhador guarda a referência
  const jogadorComTrunfo = baralhadorAtual;

  return { hands, trunfo, jogadorComTrunfo };
};

// ===== Utilitárias de cartas =====
window.valorCarta = function (c) {
  return window.valores.length - window.valores.indexOf(c.valor);
};

window.pontosCarta = function (c) {
  switch (c.valor) {
    case "A": return 11;
    case "7": return 10;
    case "K": return 4;
    case "J": return 3;
    case "Q": return 2;
    default: return 0;
  }
};

// ===== Resolver ronda =====
// cardsOnTable: [{ player, card }]
// trunfo: {valor, naipe}
window.resolverRonda = function (cardsOnTable, trunfo) {
  if (!cardsOnTable || cardsOnTable.length === 0) {
    return null; // não há cartas para avaliar
  }

  const leadSuit = cardsOnTable[0].card.naipe;
  let winner = cardsOnTable[0].player;
  let winningCard = cardsOnTable[0].card;

  for (let i = 1; i < cardsOnTable.length; i++) {
    const { player, card } = cardsOnTable[i];

    // Se carta é trunfo
    if (card.naipe === trunfo.naipe) {
      if (
        winningCard.naipe !== trunfo.naipe ||
        window.valorCarta(card) > window.valorCarta(winningCard)
      ) {
        winner = player;
        winningCard = card;
      }
    }
    // Se carta é do naipe líder
    else if (card.naipe === leadSuit) {
      if (
        winningCard.naipe === leadSuit &&
        window.valorCarta(card) > window.valorCarta(winningCard)
      ) {
        winner = player;
        winningCard = card;
      }
    }
  }

  return { winner, winningCard };
};
