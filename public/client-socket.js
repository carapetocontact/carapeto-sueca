// ================= SOCKET CLIENT =================
const socket = io(); // conecta automaticamente ao servidor

// DOM
const btnEntrarSala = document.getElementById("btn-entrar-sala");
const btnPronto = document.getElementById("btn-pronto");
const nomeInput = document.getElementById("nome-jogador");
const salaInput = document.getElementById("sala-id");
const listaJogadores = document.getElementById("lista-jogadores");

// Variáveis
let minhaSala = "";
let meuNome = "";

meuIndex = null; // slot do jogador (0 a 3) já let no main.js

// Entrar na sala
btnEntrarSala.onclick = () => {
  meuNome = nomeInput.value.trim();
  minhaSala = salaInput.value.trim();

  if (!meuNome || !minhaSala) {
    alert("Preenche o teu nome e a sala.");
    return;
  }

  socket.emit("entrar-sala", { nome: meuNome, salaId: minhaSala });

  nomeInput.disabled = true;
  salaInput.disabled = true;
  btnEntrarSala.disabled = true;

  listaJogadores.innerHTML = "Aguardando outros jogadores...";
  btnPronto.disabled = false;
};

// ================= EVENTOS =================

// Atualiza lista de jogadores na sala
socket.on("atualizar-jogadores", (jogadores) => {
  listaJogadores.innerHTML = "<strong>Jogadores na sala:</strong><br>" +
    jogadores.map(j => {
      let tag = j.nome + (j.pronto ? " (pronto)" : "");
      if (j.nome === meuNome) tag += " ← Tu (J" + (j.index + 1) + ")";
      return tag;
    }).join("<br>");

  // Atualiza meuIndex
  const jogador = jogadores.find(j => j.nome === meuNome);
  if (jogador) meuIndex = jogador.index;
});

// Quando todos os jogadores estão prontos, iniciar jogo
socket.on("iniciar-jogo", (dados) => {
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
  if (eu) meuIndex = eu.index;

  window.dispatchEvent(new CustomEvent("iniciarJogo", { detail: config }));
});

// Recebe jogada de qualquer jogador (inclui bots e eu próprio)
socket.on("atualizar-jogada", ({ jogadorIndex, carta }) => {
  jogarCartaLocal(jogadorIndex, carta); // aplica sempre via eco
});

// ================= FUNÇÕES =================

// Enviar jogada do jogador local
function enviarJogada(playerIndex, cardIndex) {
  socket.emit("jogada", { salaId: minhaSala, jogadorIndex: playerIndex, carta: cardIndex });
}

// Sinalizar que estou pronto
btnPronto.onclick = () => {
  socket.emit("pronto", { salaId: minhaSala });
  btnPronto.disabled = true;
};
