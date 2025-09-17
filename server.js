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

// Quando um cliente se conecta
io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Criar ou entrar numa sala
  socket.on("entrar-sala", ({ salaId, nome }) => {
    if (!salas[salaId]) {
      salas[salaId] = { players: [], estadoDoJogo: {} };
    }

    const sala = salas[salaId];

    if (sala.players.length >= 4) {
      socket.emit("erro-sala", "Sala cheia");
      return;
    }

    sala.players.push({ id: socket.id, nome });
    socket.join(salaId);

    console.log(`${nome} entrou na sala ${salaId}`);
    io.to(salaId).emit("atualizar-jogadores", sala.players);

    // Se sala completa, inicia o jogo
    if (sala.players.length === 4) {
      io.to(salaId).emit("iniciar-jogo", sala.players.map(p => p.nome));
    }
  });

  // Receber jogada de um jogador
  socket.on("jogada", ({ salaId, jogadorIndex, carta }) => {
    const sala = salas[salaId];
    if (!sala) return;

    // Enviar jogada a todos os clientes na sala
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

// Inicia servidor
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
