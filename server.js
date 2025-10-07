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

  // Entrar ou criar sala
  socket.on("entrar-sala", ({ salaId, nome }) => {
    // cria nova sala com baralhador inicial aleatório
    if (!salas[salaId]) salas[salaId] = { players: [], estadoDoJogo: null, baralhador: Math.floor(Math.random() * 4) };
    const sala = salas[salaId];

    if (sala.players.length >= 4) {
      socket.emit("erro-sala", "Sala cheia");
      return;
    }

    const jogadorIndex = sala.players.length;
    sala.players.push({ id: socket.id, nome, pronto: false, index: jogadorIndex, tipo: "humano" });
    socket.join(salaId);

    console.log(`${nome} entrou na sala ${salaId} (J${jogadorIndex+1})`);
    io.to(salaId).emit("atualizar-jogadores", sala.players);
  });

  // ====== JOGADOR PRONTO ======
  socket.on("pronto", ({ salaId }) => {
    const sala = salas[salaId];
    if (!sala) return;

    // Marca o jogador como pronto
    const player = sala.players.find(p => p.id === socket.id);
    if (player) player.pronto = true;

    // Atualiza todos os jogadores na sala
    io.to(salaId).emit("atualizar-jogadores", sala.players);

    // Se todos estão prontos (e há pelo menos 2 jogadores)
    if (sala.players.length >= 2 && sala.players.every(p => p.pronto)) {

      // ----- Completa com bots até 4 jogadores -----
      if (sala.players.length < 4) {
        for (let i = sala.players.length; i < 4; i++) {
          sala.players.push({
            id: "bot" + i,
            nome: "Bot" + (i + 1),
            pronto: true,
            index: i,
            tipo: "computador"
          });
        }
        io.to(salaId).emit("atualizar-jogadores", sala.players);
      }

      // ----- Atualiza o baralhador (antes de criar o deck) -----
      if (sala.baralhador === undefined) sala.baralhador = 0;
      else sala.baralhador = (sala.baralhador + 1) % 4;

      const baralhador = sala.baralhador;

      // ----- Cria o baralho -----
      const deck = criarDeckEmbaralhado();

      // O trunfo é sempre a primeira carta (pertence ao baralhador)
      const trunfo = deck[0];

      // ----- Distribui 10 cartas por jogador -----
      let hands = [
        deck.slice(0,10),
        deck.slice(10,20),
        deck.slice(20,30),
        deck.slice(30,40)
      ];

      // 👉 Rodar as mãos de forma que o baralhador receba o deck[0–9]
      hands = hands.slice(baralhador).concat(hands.slice(0, baralhador));

      // ----- Atualiza o estado da sala -----
      sala.estadoDoJogo = {
        turno: (baralhador + 3) % 4,     // jogador à esquerda do baralhador começa
        trunfo,
        jogadorComTrunfo: baralhador,     // guarda quem tem o trunfo
        hands,
        cardsOnTable: [],
        lixoEquipa1: [],
        lixoEquipa2: [],
        rondaAtual: 1
      };

      console.log(`Novo jogo na sala ${salaId}`);
      console.log(`🃏 Baralhador: J${baralhador + 1} | Trunfo: ${trunfo.valor}${trunfo.naipe}`);
      console.log(`➡️  Começa: J${(sala.estadoDoJogo.turno) + 1}`);

      // ----- Envia o estado do jogo a todos os jogadores -----
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
    if (!sala || !sala.estadoDoJogo) return;
    io.to(salaId).emit("atualizar-jogada", { jogadorIndex, carta });
  });

  // ====== FIM DE JOGO E REINÍCIO ======
  socket.on("gameEnded", ({ salaId, resultado }) => {
    const sala = salas[salaId];
    if (!sala) return;
    console.log(`Jogo terminou na sala ${salaId}`);
    io.to(salaId).emit("mostrar-fim", { resultado });
  });

  socket.on("restartGame", ({ salaId }) => {
    const sala = salas[salaId];
    if (!sala) return;
    console.log(`Reiniciando jogo na sala ${salaId}`);

    // Limpar bots e resetar estado
    sala.players = sala.players.filter(p => p.tipo !== "computador");
    sala.players.forEach(p => (p.pronto = false));
    sala.estadoDoJogo = null;

    // Envia os jogadores de volta ao lobby
    io.to(salaId).emit("voltar-para-sala");
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

server.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
