// ================= SOCKET CLIENT =================
const socket = io(); // conecta automaticamente ao servidor

// DOM
const btnEntrarSala = document.getElementById("btn-entrar-sala");
const btnPronto = document.getElementById("btn-pronto"); // botão novo
const nomeInput = document.getElementById("nome-jogador");
const salaInput = document.getElementById("sala-id");
const listaJogadores = document.getElementById("lista-jogadores");

// Variáveis
let minhaSala = "";
let meuNome = "";

// Entrar na sala
btnEntrarSala.onclick = () => {
  meuNome = nomeInput.value.trim();
  minhaSala = salaInput.value.trim();

  if (!meuNome || !minhaSala) {
    alert("Por favor, preenche o teu nome e a sala.");
    return;
  }

  // envia evento para servidor (novo nome de evento compatível)
  socket.emit("entrar-sala", { nome: meuNome, salaId: minhaSala });

  // Desativa inputs para evitar mudanças
  nomeInput.disabled = true;
  salaInput.disabled = true;
  btnEntrarSala.disabled = true;

  listaJogadores.innerHTML = "Aguardando outros jogadores...";
  btnPronto.disabled = false; // habilita botão pronto
};

// ================= EVENTOS RECEBIDOS =================

// Atualiza lista de jogadores na sala
socket.on("atualizar-jogadores", (jogadores) => {
  listaJogadores.innerHTML = "<strong>Jogadores na sala:</strong><br>" +
    jogadores.map(j => `${j.nome} ${j.pronto ? "(pronto)" : ""}`).join("<br>");
});

// Quando todos os jogadores estão prontos, começar jogo
socket.on("iniciar-jogo", (nomesJogadores) => {
  alert(`O jogo vai começar com: ${nomesJogadores.join(", ")}`);
  btnPronto.disabled = true;
});

// Recebe jogada de outro jogador
socket.on("atualizar-jogada", ({ jogadorIndex, carta }) => {
  console.log(`Recebido jogada do jogador ${jogadorIndex + 1}: carta ${carta}`);
  // Aqui podemos chamar attemptPlayCard se for multiplayer
});

// ================= FUNÇÕES =================

// Função para enviar a jogada
function enviarJogada(playerIndex, cardIndex) {
  socket.emit("jogada", { salaId: minhaSala, jogadorIndex: playerIndex, carta: cardIndex });
}

// ================= NOVO =================

// Sinalizar que estou pronto
btnPronto.onclick = () => {
  socket.emit("pronto", { salaId: minhaSala });
  btnPronto.disabled = true; // desativa botão após sinalizar pronto
};
