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

  // Mostrar configs extra se existirem
  modoButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const modo = btn.dataset.modo;
      configs.forEach(c => c.style.display = "none"); // esconde todas configs

      if (modo === "single") document.getElementById("config-single").style.display = "block";
      else if (modo === "online") document.getElementById("config-online").style.display = "block";
      else if (modo === "local") document.getElementById("config-local").style.display = "block";
      else if (modo === "programador") document.getElementById("config-programador").style.display = "block";

      // Cria config logo ao clicar (1 clique só)
      let config = null;

      if (modo === "single") {
        config = {
          modo: "single",
          jogadores: [
            { tipo: "humano" },
            { tipo: "computador" },
            { tipo: "computador" },
            { tipo: "computador" }
          ],
          baralhador: 0
        };
      } else if (modo === "local") {
        config = {
          modo: "local",
          jogadores: [
            { tipo: "humano" },
            { tipo: "humano" },
            { tipo: "humano" },
            { tipo: "humano" }
          ],
          baralhador: 1
        };
      } else if (modo === "programador") {
        config = {
          modo: "programador",
          jogadores: [
            { tipo: "computador" },
            { tipo: "computador" },
            { tipo: "computador" },
            { tipo: "computador" }
          ],
          baralhador: 2
        };
      } else if (modo === "online") {
        config = { modo: "online" };
      }

      if (config) {
        window.dispatchEvent(new CustomEvent("iniciarJogo", { detail: config }));
      }
    });
  });
});
