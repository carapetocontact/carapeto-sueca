// ==========================
// SUECA ONLINE — SAVE 6
// Servidor Autoritativo
// ==========================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
const PORT = process.env.PORT || 3000;

// ====== Utilitárias do baralho ======
const naipes = ["♠", "♥", "♦", "♣"];
const valores = ["A", "7", "K", "J", "Q", "6", "5", "4", "3", "2"];

function criarDeckEmbaralhado() {
  const deck = [];
  for (const n of naipes)
    for (const v of valores) deck.push({ valor: v, naipe: n });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ====== Estrutura de salas ======
let salas = {}; // { salaId: { players: [], estadoDoJogo: {...}, baralhador: 0 } }

io.on("connection", (socket) => {
  console.log(`🟢 Cliente conectado: ${socket.id}`);

  // ====== Entrar ou criar sala ======
  socket.on("entrar-sala", ({ salaId, nome }) => {
    if (!salas[salaId])
      salas[salaId] = {
        players: [],
        estadoDoJogo: null,
        baralhador: Math.floor(Math.random() * 4),
      };

    const sala = salas[salaId];
    if (sala.players.length >= 4) {
      socket.emit("erro-sala", "Sala cheia");
      return;
    }

    const jogadorIndex = sala.players.length;
    sala.players.push({
      id: socket.id,
      nome,
      pronto: false,
      index: jogadorIndex,
      tipo: "humano",
    });
    socket.join(salaId);

    console.log(`${nome} entrou na sala ${salaId} (J${jogadorIndex + 1})`);
    io.to(salaId).emit("atualizar-jogadores", sala.players);
  });

  // ====== Jogador Pronto ======
  socket.on("pronto", ({ salaId }) => {
    const sala = salas[salaId];
    if (!sala) return;

    const player = sala.players.find((p) => p.id === socket.id);
    if (player) player.pronto = true;

    io.to(salaId).emit("atualizar-jogadores", sala.players);

    // Inicia jogo se todos estiverem prontos
    if (sala.players.length >= 2 && sala.players.every((p) => p.pronto)) {
      if (sala.players.length < 4) {
        for (let i = sala.players.length; i < 4; i++) {
          sala.players.push({
            id: "bot" + i,
            nome: "Bot" + (i + 1),
            pronto: true,
            index: i,
            tipo: "computador",
          });
        }
        io.to(salaId).emit("atualizar-jogadores", sala.players);
      }

      // ----- Baralhador e deck -----
      sala.baralhador =
        sala.baralhador === undefined ? 0 : (sala.baralhador + 1) % 4;
      const baralhador = sala.baralhador;

      const deck = criarDeckEmbaralhado();
      const trunfo = deck[0];

      // Distribuir mãos
      let hands = [
        deck.slice(0, 10),
        deck.slice(10, 20),
        deck.slice(20, 30),
        deck.slice(30, 40),
      ];
      hands = hands.slice(baralhador).concat(hands.slice(0, baralhador));

      // Estado inicial do jogo
      sala.estadoDoJogo = {
        turno: (baralhador + 3) % 4, // jogador à esquerda começa
        trunfo,
        jogadorComTrunfo: baralhador,
        hands,
        cardsOnTable: [],
        lixoEquipa1: [],
        lixoEquipa2: [],
        rondaAtual: 1,
      };

      console.log(
        `🃏 Nova partida na sala ${salaId} | Baralhador: J${
          baralhador + 1
        } | Trunfo: ${trunfo.valor}${trunfo.naipe}`
      );

      io.to(salaId).emit("iniciar-jogo", {
        jogadores: sala.players.map((p) => ({
          nome: p.nome,
          tipo: p.tipo,
          index: p.index,
        })),
        baralhador,
        hands: sala.estadoDoJogo.hands,
        trunfo: sala.estadoDoJogo.trunfo,
        jogadorComTrunfo: sala.estadoDoJogo.jogadorComTrunfo,
        turno: sala.estadoDoJogo.turno,
      });
    }
  });

  // ====== NOVA LÓGICA DE JOGADAS (SAVE 6) ======
  socket.on("jogada", ({ salaId, jogadorIndex, carta }) => {
    const sala = salas[salaId];
    if (!sala || !sala.estadoDoJogo) return;
    const jogo = sala.estadoDoJogo;

    // 🔒 Valida turno
    if (jogo.turno !== jogadorIndex) {
      socket.emit("erro-jogada", "Não é o teu turno!");
      return;
    }

    // 🔎 Remove carta da mão
    const hand = jogo.hands[jogadorIndex];
    const idx = hand.findIndex(
      (c) => c.valor === carta.valor && c.naipe === carta.naipe
    );
    if (idx === -1) {
      socket.emit("erro-jogada", "Carta não encontrada na tua mão!");
      return;
    }
    hand.splice(idx, 1);

    // 🃏 Coloca carta na mesa
    jogo.cardsOnTable.push({ jogadorIndex, carta });
    console.log(`[SYNC] J${jogadorIndex + 1} jogou ${carta.valor}${carta.naipe}`);

    // 🔁 Se 4 cartas, resolve rodada
    if (jogo.cardsOnTable.length === 4) {
      const vencedor = calcularVencedorDaRodada(
        jogo.cardsOnTable,
        jogo.trunfo
      );
      jogo.cardsOnTable = [];
      jogo.turno = vencedor;
      jogo.rondaAtual++;

      console.log(
        `[SERVER] Rodada terminada. Vencedor: J${vencedor + 1} | Próximo turno`
      );
      io.to(salaId).emit("syncState", jogo);
    } else {
      jogo.turno = (jogo.turno + 1) % 4;
      io.to(salaId).emit("syncState", jogo);
    }
  });

  // ====== Fim de jogo ======
  socket.on("gameEnded", ({ salaId, resultado }) => {
    const sala = salas[salaId];
    if (!sala) return;
    console.log(`🏁 Jogo terminado na sala ${salaId}`);
    io.to(salaId).emit("mostrar-fim", { resultado });
  });

  socket.on("restartGame", ({ salaId }) => {
    const sala = salas[salaId];
    if (!sala) return;
    console.log(`🔄 Reiniciando jogo na sala ${salaId}`);

    sala.players = sala.players.filter((p) => p.tipo !== "computador");
    sala.players.forEach((p) => (p.pronto = false));
    sala.estadoDoJogo = null;

    io.to(salaId).emit("voltar-para-sala");
  });

  // ====== Desconexão ======
  socket.on("disconnect", () => {
    console.log(`🔴 Cliente desconectado: ${socket.id}`);
    for (const salaId in salas) {
      const sala = salas[salaId];
      sala.players = sala.players.filter((p) => p.id !== socket.id);
      io.to(salaId).emit("atualizar-jogadores", sala.players);
      if (sala.players.length === 0) delete salas[salaId];
    }
  });
});

// ====== Função auxiliar ======
function calcularVencedorDaRodada(cartas, trunfo) {
  // Simplificação: trunfo mais alto vence, senão o primeiro da mesa
  const trunfos = cartas.filter(
    (c) => c.carta.naipe === trunfo.naipe
  );
  if (trunfos.length > 0) {
    return trunfos[0].jogadorIndex;
  }
  return cartas[0].jogadorIndex;
}

server.listen(PORT, () =>
  console.log(`🚀 Servidor ativo em http://localhost:${PORT}`)
);
