const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// ====== Utilitárias do baralho ======
const naipes = ["♠","♥","♦","♣"];
const valores = ["A","7","K","J","Q","6","5","4","3","2"];

function criarDeckEmbaralhado() {
  const deck = [];
  for (const n of naipes) for (const v of valores) deck.push({ valor: v, naipe: n });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ====== Estrutura de salas ======
let salas = {}; // { salaId: { players: [], estadoDoJogo: {...}, baralhador: 0 } }

io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  
  console.log(`[SERVER] (connection) Cliente conectado: ${socket.id}`);

  socket.on("entrar-sala", ({ salaId, nome }) => {

    if (!salas[salaId]) {
      salas[salaId] = { players: [], estadoDoJogo: null, baralhador: Math.floor(Math.random() * 4) };
      console.log(`[ROOM] (create) Nova sala criada: ${salaId} | baralhador inicial = J${salas[salaId].baralhador + 1}`);
    }

    const sala = salas[salaId];

    if (sala.players.length >= 4) {
      console.log(`[ROOM] (entrar-sala) Sala cheia: ${salaId} | jogador ${nome} recusado`);
      socket.emit("erro-sala", "Sala cheia");
      return;
    }

    const jogadorIndex = sala.players.length;
    sala.players.push({ id: socket.id, nome, pronto: false, index: jogadorIndex, tipo: "humano" });
    socket.join(salaId);

    console.log(`[ROOM] (entrar-sala) ${nome} entrou na sala ${salaId} como J${jogadorIndex+1}`);
    console.log(`[ROOM] (entrar-sala) Jogadores na sala ${salaId}: ${sala.players.map(p => p.nome + "(J" + (p.index+1) + ")").join(", ")}`);

    io.to(salaId).emit("atualizar-jogadores", sala.players);
  });

  // ====== JOGADOR PRONTO ======
  socket.on("pronto", ({ salaId }) => {
    const sala = salas[salaId];
    if (!sala) {
      console.log(`[ERROR] (pronto) Sala inexistente: ${salaId} para socket ${socket.id}`);
      return;
    }

    const player = sala.players.find(p => p.id === socket.id);
    if (player) {
      player.pronto = true;
      console.log(`[ROOM] (pronto) Jogador pronto: ${player.nome} (J${player.index+1}) na sala ${salaId}`);
    } else {
      console.log(`[ERROR] (pronto) Jogador não encontrado na sala ${salaId} para socket ${socket.id}`);
    }

    io.to(salaId).emit("atualizar-jogadores", sala.players);

    if (sala.players.length >= 2 && sala.players.every(p => p.pronto)) {
      console.log(`[ROOM] (pronto) Todos prontos na sala ${salaId}. Iniciando jogo...`);

      // Completar com bots se necessário
      if (sala.players.length < 4) {
        for (let i = sala.players.length; i < 4; i++) {
          sala.players.push({
            id: "bot" + i,
            nome: "Bot" + (i + 1),
            pronto: true,
            index: i,
            tipo: "computador"
          });
          console.log(`[ROOM] (bots) Bot adicionado à sala ${salaId}: Bot${i+1} como J${i+1}`);
        }

        console.log(`[ROOM] (bots) Jogadores finais na sala ${salaId}: ${sala.players.map(p => p.nome + "(J" + (p.index+1) + ")").join(", ")}`);
        io.to(salaId).emit("atualizar-jogadores", sala.players);
      }

      // Atualizar baralhador
      const oldBaralhador = sala.baralhador;
      sala.baralhador = (sala.baralhador + 1) % 4;
      const baralhador = sala.baralhador;

      console.log(`[SERVER] (baralhador) Sala ${salaId}: anterior = J${oldBaralhador+1}, novo = J${baralhador+1}`);

      // Criar deck
      const deck = criarDeckEmbaralhado();
      const trunfo = deck[0];
      console.log(`[SERVER] (deck) Trunfo da sala ${salaId}: ${trunfo.valor}${trunfo.naipe}`);

      // Distribuir mãos
      let hands = [
        deck.slice(0,10),
        deck.slice(10,20),
        deck.slice(20,30),
        deck.slice(30,40)
      ];
      hands = hands.slice(baralhador).concat(hands.slice(0, baralhador));

      // Estado do jogo
      sala.estadoDoJogo = {
        turno: (baralhador + 3) % 4,
        trunfo,
        jogadorComTrunfo: baralhador,
        hands,
        cardsOnTable: [],
        lixoEquipa1: [],
        lixoEquipa2: [],
        rondaAtual: 1
      };

      console.log(`[SERVER] (estado) Sala ${salaId}: turno inicial = J${sala.estadoDoJogo.turno+1}`);
      console.log(`🃏 Baralhador: J${baralhador + 1} | Trunfo: ${trunfo.valor}${trunfo.naipe}`);
      console.log(`➡️  Começa: J${sala.estadoDoJogo.turno + 1}`);
      console.log(`[SYNC] (iniciar-jogo) Estado inicial enviado.`);

      io.to(salaId).emit("iniciar-jogo", {
        jogadores: sala.players.map(p => ({
          nome: p.nome,
          tipo: p.tipo,
          index: p.index
        })),
        baralhador,
        hands: sala.estadoDoJogo.hands,
        trunfo: sala.estadoDoJogo.trunfo,
        jogadorComTrunfo: sala.estadoDoJogo.jogadorComTrunfo,
        turno: sala.estadoDoJogo.turno
      });
    }
  });


  // Receber jogada e ecoar para todos
  socket.on("jogada", ({ salaId, jogadorIndex, carta }) => {
    const sala = salas[salaId];
    if (!sala || !sala.estadoDoJogo) {
      console.log(`[ERROR] (jogada) Sala inexistente ou estado não iniciado: sala=${salaId}, jogador=${jogadorIndex}`);
      return;
    }

    console.log(`[SERVER] (jogada) Sala ${salaId}: J${jogadorIndex+1} jogou ${carta.valor}${carta.naipe}`);

    io.to(salaId).emit("atualizar-jogada", { jogadorIndex, carta });

    console.log(`[SYNC] (jogada) Broadcast feito para sala ${salaId}`);
  });


  // ====== FIM DE JOGO E REINÍCIO ======
  socket.on("gameEnded", ({ salaId, resultado }) => {
    const sala = salas[salaId];
    if (!sala) {
      console.log(`[ERROR] (gameEnded) Sala inexistente: ${salaId}`);
      return;
    }

    console.log(`[SERVER] (gameEnded) Fim de jogo na sala ${salaId}. Resultado enviado.`);
    io.to(salaId).emit("mostrar-fim", { resultado });
  });


  socket.on("restartGame", ({ salaId }) => {
    const sala = salas[salaId];
    if (!sala) {
      console.log(`[ERROR] (restartGame) Sala inexistente: ${salaId}`);
      return;
    }

    console.log(`[SERVER] (restartGame) Reiniciando jogo na sala ${salaId}`);

    const antes = sala.players.length;
    sala.players = sala.players.filter(p => p.tipo !== "computador");
    const depois = sala.players.length;

    console.log(`[ROOM] (restartGame) Bots removidos: ${antes - depois}. Humanos restantes: ${depois}`);

    sala.players.forEach(p => (p.pronto = false));
    sala.estadoDoJogo = null;

    io.to(salaId).emit("voltar-para-sala");
  });


  // Desconexão
  socket.on("disconnect", () => {
    console.log(`[SERVER] (disconnect) Cliente desconectado: ${socket.id}`);

    for (const salaId in salas) {
      const sala = salas[salaId];
      const antes = sala.players.length;

      sala.players = sala.players.filter(p => p.id !== socket.id);

      if (sala.players.length !== antes) {
        console.log(`[ROOM] (disconnect) Jogador removido da sala ${salaId}. Agora: ${sala.players.length} jogadores`);
        io.to(salaId).emit("atualizar-jogadores", sala.players);
      }

      if (sala.players.length === 0) {
        console.log(`[ROOM] (cleanup) Sala ${salaId} apagada (vazia).`);
        delete salas[salaId];
      }
    }
  });
  
});


server.listen(PORT, () => {
  console.log(`[SERVER] (boot) Servidor rodando em http://localhost:${PORT}`);
});
