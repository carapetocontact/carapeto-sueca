const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Estrutura de salas
let salas = {}; // { salaId: { players: [], estadoDoJogo: {...} } }

io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Entrar ou criar sala
  socket.on("entrar-sala", ({ salaId, nome }) => {
    if (!salas[salaId]) salas[salaId] = { players: [], estadoDoJogo: null };
    const sala = salas[salaId];

    if (sala.players.length >= 4) {
      socket.emit("erro-sala", "Sala cheia");
      return;
    }

    const jogadorIndex = sala.players.length;
    sala.players.push({ id: socket.id, nome, pronto: false, index: jogadorIndex });
    socket.join(salaId);

    console.log(`${nome} entrou na sala ${salaId} (J${jogadorIndex+1})`);
    io.to(salaId).emit("atualizar-jogadores", sala.players);
  });

  // Jogador pronto
  socket.on("pronto", ({ salaId }) => {
    const sala = salas[salaId];
    if (!sala) return;

    const player = sala.players.find(p => p.id === socket.id);
    if (player) player.pronto = true;

    io.to(salaId).emit("atualizar-jogadores", sala.players);

    // Se todos prontos e pelo menos 2 jogadores
    if (sala.players.length >= 2 && sala.players.every(p => p.pronto)) {
      // Inicializa estado do jogo
      const deck = criarDeckEmbaralhado();
      const hands = [[], [], [], []];
      for (let i = 0; i < 4; i++) hands[i] = deck.slice(i*10,(i+1)*10);

      sala.estadoDoJogo = {
        hands,
        trunfo: deck[0],
        jogadorComTrunfo: 0,
        currentTurn: 1,
        baralhadorAtual: 0,
      };

      io.to(salaId).emit(
        "iniciar-jogo",
        sala.players.map(p => p.nome),
        sala.estadoDoJogo
      );
    }
  });

  // Receber jogada
  socket.on("jogada", ({ salaId, jogadorIndex, carta }) => {
    const sala = salas[salaId];
    if (!sala || !sala.estadoDoJogo) return;

    io.to(salaId).emit("atualizar-jogada", { jogadorIndex, carta });
  });

  // Desconexão
  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    for (const salaId in salas) {
      const sala = salas[salaId];
      sala.players = sala.players.filter(p => p.id !== socket.id);
      io.to(salaId).emit("atualizar-jogadores", sala.players);
      if (sala.players.length === 0) delete salas[salaId];
    }
  });
});

// ---------- utilitário de deck ----------
function criarDeckEmbaralhado() {
  const naipes = ["♠","♥","♦","♣"];
  const valores = ["A","7","K","J","Q","6","5","4","3","2"];
  const deck = [];
  for (const n of naipes) for (const v of valores) deck.push({ valor: v, naipe: n });
  for (let i = deck.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]] = [deck[j],deck[i]];
  }
  return deck;
}

server.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
