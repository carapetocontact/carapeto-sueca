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

  // --- Singleplayer ---
  document.querySelector("#btn-single").addEventListener("click", () => {
    const config = {
      modo: "single",
      jogadores: [
        { tipo: "humano" },
        { tipo: "computador" },
        { tipo: "computador" },
        { tipo: "computador" }
      ],
      baralhador: 0
    };

    window.dispatchEvent(new CustomEvent("iniciarJogo", { detail: config }));
  });

  // --- Local ---
  document.querySelector("#btn-local").addEventListener("click", () => {
    const config = {
      modo: "local",
      jogadores: [
        { tipo: "humano" },
        { tipo: "humano" },
        { tipo: "humano" },
        { tipo: "humano" }
      ],
      baralhador: 1
    };

    window.dispatchEvent(new CustomEvent("iniciarJogo", { detail: config }));
  });

  // --- Programador ---
  document.querySelector("#btn-programador").addEventListener("click", () => {
    const config = {
      modo: "programador",
      jogadores: [
        { tipo: "computador" },
        { tipo: "computador" },
        { tipo: "computador" },
        { tipo: "computador" }
      ],
      baralhador: 2
    };

    window.dispatchEvent(new CustomEvent("iniciarJogo", { detail: config }));
  });

  // --- Online ---
  document.querySelector("#btn-online").addEventListener("click", () => {
    const config = { modo: "online" };
    window.dispatchEvent(new CustomEvent("iniciarJogo", { detail: config }));
  });

});
