document.addEventListener("DOMContentLoaded", () => {
  // Botões de escolha de modo
  const modoButtons = document.querySelectorAll("#modo-jogo button");
  const configs = document.querySelectorAll(".config-modo");

  // DIVs do jogo e menu
  const menuInicial = document.getElementById("menu-inicial");
  const gameDiv = document.getElementById("game");

  // Mostrar configs extra se existirem
  modoButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const modo = btn.dataset.modo;
      configs.forEach(c => c.style.display = "none"); // esconde todas configs

      if (modo === "single") {
        document.getElementById("config-single").style.display = "block";
        menuInicial.style.display = "none";

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

      } else if (modo === "local") {
        document.getElementById("config-local").style.display = "block";
        menuInicial.style.display = "none";

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

      } else if (modo === "programador") {
        document.getElementById("config-programador").style.display = "block";
        menuInicial.style.display = "none";

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

      } else if (modo === "online") {
        // 👉 fluxo especial do online
        document.getElementById("config-online").style.display = "block";
        menuInicial.style.display = "none";

        // NÃO chamamos iniciarJogo aqui!
        // O fluxo segue via client-socket.js (entrar-sala → pronto → iniciar-jogo)
      }
    });
  });
});
