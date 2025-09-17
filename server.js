const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve arquivos estáticos
app.use(express.static("public"));

// Porta
const PORT = process.env.PORT || 3000;

// Estrutura de salas de jogo
let salas = {}; // { salaId: { players: [], estadoDoJogo: {...} } }

io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Criar ou entrar numa sala
  socket.on("entrar-sala", ({ salaId, nome }) => {
    if (!salas[salaId]) salas[salaId] = { players: [], estadoDoJogo: {} };
    const sala = salas[salaId];

    if (sala.players.length >= 4) {
      socket.emit("erro-sala", "Sala cheia");
      return;
    }

    // Atribui índice de jogador (0 a 3)
    const jogadorIndex = sala.players.length;
    sala.players.push({ id: socket.id, nome, pronto: false, index: jogadorIndex });
    socket.join(salaId);

    console.log(`${nome} entrou na sala ${salaId} (J${jogadorIndex + 1})`);
    io.to(salaId).emit("atualizar-jogadores", sala.players);
  });

  // Jogador sinaliza que está pronto
  socket.on("pronto", ({ salaId }) => {
    const sala = salas[salaId];
    if (!sala) return;

    const player = sala.players.find(p => p.id === socket.id);
    if (player) player.pronto = true;

    io.to(salaId).emit("atualizar-jogadores", sala.players);

    // Inicia o jogo se todos estiverem prontos e pelo menos 2 jogadores
    if (sala.players.length >= 2 && sala.players.every(p => p.pronto)) {
      sala.estadoDoJogo = { turno: 0 };
      io.to(salaId).emit("iniciar-jogo", sala.players.map(p => p.nome));
    }
  });

  // Receber jogada de um jogador
  socket.on("jogada", ({ salaId, jogadorIndex, carta }) => {
    const sala = salas[salaId];
    if (!sala) return;

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

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
