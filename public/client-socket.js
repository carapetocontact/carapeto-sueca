// ================= SOCKET CLIENT =================
const socket = io(); // conecta automaticamente ao servidor

// Debug helper
const DEBUG_SALA = true;
function debugLog(...args) {
  if (DEBUG_SALA) console.log("[SALA]", ...args);
}

// ====== DOM ELEMENTOS ======
const btnEntrarSala = document.getElementById("btn-entrar-sala");
const nomeInput = document.getElementById("nome-jogador");
const salaInput = document.getElementById("sala-id");

// Lobby
const salaDiv = document.getElementById("sala");
const salaNomeEl = document.getElementById("sala-nome");
const btnProntoLobby = document.getElementById("btn-pronto-lobby");
const btnVoltarMenu = document.getElementById("btn-voltar-menu");

const lobbyJogadores = {
  j1: document.getElementById("j1"),
  j2: document.getElementById("j2"),
  j3: document.getElementById("j3"),
  j4: document.getElementById("j4"),
};

// ====== VARIÁVEIS ======
let minhaSala = "";
let meuNome = "";
meuIndex = null; // já existe let no main.js

// ====== EVENTOS DOM ======

// Entrar na sala
btnEntrarSala.onclick = () => {
  meuNome = nomeInput.value.trim();
  minhaSala = salaInput.value.trim();

  if (!meuNome || !minhaSala) {
    alert("Preenche o teu nome e a sala.");
    return;
  }

  debugLog("Tentando entrar na sala", minhaSala, "com nome", meuNome);
  socket.emit("entrar-sala", { nome: meuNome, salaId: minhaSala });

  // Trocar UI: esconder config-online, mostrar lobby
  document.getElementById("config-online").style.display = "none";
  salaDiv.style.display = "block";
  salaNomeEl.textContent = "Sala: " + minhaSala;
};

// Botão PRONTO no lobby
btnProntoLobby.onclick = () => {
  debugLog("Jogador clicou PRONTO");
  socket.emit("pronto", { salaId: minhaSala });
  btnProntoLobby.disabled = true;
};

// Botão VOLTAR MENU
btnVoltarMenu.onclick = () => {
  debugLog("Jogador saiu para o menu");
  salaDiv.style.display = "none";
  document.getElementById("menu-inicial").style.display = "block";
  socket.disconnect(); // podes depois trocar por socket.emit("sair-sala")
};

// ====== EVENTOS SOCKET ======

// Atualiza lista de jogadores no lobby
socket.on("atualizar-jogadores", (jogadores) => {
  debugLog("Recebi atualizar-jogadores:", jogadores);

  // Reset dos slots
  lobbyJogadores.j1.textContent = "J1 - (vazio)";
  lobbyJogadores.j2.textContent = "J2 - (vazio)";
  lobbyJogadores.j3.textContent = "J3 - (vazio)";
  lobbyJogadores.j4.textContent = "J4 - (vazio)";

  jogadores.forEach(j => {
    const slotId = "j" + (j.index + 1);
    let texto = `J${j.index+1} - ${j.nome}`;
    if (j.nome === meuNome) texto += " (Tu)";
    if (j.pronto) texto += " ✅";
    lobbyJogadores[slotId].textContent = texto;
  });

  // Atualiza meuIndex
  const jogador = jogadores.find(j => j.nome === meuNome);
  if (jogador) {
    meuIndex = jogador.index;
    debugLog("Meu index atualizado:", meuIndex);
  }
});

// Quando todos estão prontos → iniciar jogo
socket.on("iniciar-jogo", (dados) => {
  debugLog("Recebi iniciar-jogo:", dados);

  const config = {
    modo: "online",
    jogadores: dados.jogadores,
    baralhador: dados.baralhador,
    hands: dados.hands,
    trunfo: dados.trunfo,
    jogadorComTrunfo: dados.jogadorComTrunfo,
    turno: dados.turno
  };

  // Recalcular meuIndex com lista final
  const eu = dados.jogadores.find(j => j.nome === meuNome);
  if (eu) {
    meuIndex = eu.index;
    debugLog("Meu index final:", meuIndex);
  }

  // Esconde lobby e mostra jogo
  salaDiv.style.display = "none";
  document.getElementById("game").style.display = "block";

  window.dispatchEvent(new CustomEvent("iniciarJogo", { detail: config }));
});

// Recebe jogada de outro jogador
socket.on("atualizar-jogada", ({ jogadorIndex, carta }) => {
  debugLog("Recebi jogada:", jogadorIndex, carta);
  if (jogadorIndex !== meuIndex) {
    jogarCartaLocal(jogadorIndex, carta);
  }
});

// ====== FUNÇÕES AUX ======

// Enviar jogada do jogador local
function enviarJogada(playerIndex, cardIndex) {
  debugLog("Enviei jogada:", playerIndex, cardIndex);
  socket.emit("jogada", { salaId: minhaSala, jogadorIndex: playerIndex, carta: cardIndex });
}

// 🚀 Override attemptPlayCard para multiplayer
const attemptPlayCardOriginal = attemptPlayCard;
attemptPlayCard = function(playerIndex, cardIndex) {
  if (tiposJogador[playerIndex] === "humano" && playerIndex === meuIndex) {
    enviarJogada(playerIndex, cardIndex);
  }
  attemptPlayCardOriginal(playerIndex, cardIndex);
};
