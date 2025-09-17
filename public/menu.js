document.addEventListener("DOMContentLoaded", () => {
  // Botões de escolha de modo
  const modoButtons = document.querySelectorAll("#modo-jogo button");
  const configs = document.querySelectorAll(".config-modo");

  // DIVs do jogo e menu
  const menuInicial = document.getElementById("menu-inicial");
  const gameDiv = document.getElementById("game");

  // Elementos singleplayer
  const btnStartSingle = document.getElementById("btn-start-single");
  const selectBaralhadorSingle = document.getElementById("select-baralhador-single");

  // Elementos local
  const btnStartLocal = document.getElementById("btn-start-local");
  const selectLocalPlayers = document.getElementById("select-local-players");

  // Elementos programador
  const btnStartDev = document.getElementById("btn-start-dev");

  // Botões de modo
  modoButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const modo = btn.dataset.modo;
      configs.forEach(c => c.style.display = "none"); // esconde todas configs
      // Mostra config correspondente
      if (modo === "single") document.getElementById("config-single").style.display = "block";
      else if (modo === "online") document.getElementById("config-online").style.display = "block";
      else if (modo === "local") document.getElementById("config-local").style.display = "block";
      else if (modo === "programador") document.getElementById("config-programador").style.display = "block";
    });
  });

  // Iniciar Singleplayer
  btnStartSingle.addEventListener("click", () => {
    const baralhador = Number(selectBaralhadorSingle.value);
    const tipos = ["humano", "computador", "computador", "computador"];
    iniciarJogo("single", tipos, baralhador);
  });

  // Iniciar Multiplayer Local
  btnStartLocal.addEventListener("click", () => {
    const numPlayers = Number(selectLocalPlayers.value);
    const tipos = [];
    for (let i = 0; i < 4; i++) {
      tipos.push(i < numPlayers ? "humano" : "computador");
    }
    iniciarJogo("local", tipos, 0); // 0 = baralhador padrão
  });

  // Iniciar Modo Programador
  btnStartDev.addEventListener("click", () => {
    const tipos = ["computador","computador","computador","computador"];
    iniciarJogo("programador", tipos, 0);
  });

  // Função comum para iniciar o jogo
  function iniciarJogo(modo, tipos, baralhador) {
    menuInicial.style.display = "none";
    gameDiv.style.display = "block";
    startGame(modo, tipos, baralhador); // função do main.js
  }
});
