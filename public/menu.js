document.addEventListener("DOMContentLoaded", () => {
  const selectModo = document.getElementById("select-modo");
  const playersContainer = document.getElementById("jogadores-box");
  const btnStart = document.getElementById("btn-start-game");

  // Inicializa seleção de jogadores
  function renderPlayerSelectors() {
    playersContainer.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      const div = document.createElement("div");
      div.className = "player-select";

      const label = document.createElement("label");
      label.textContent = `Jogador ${i+1}: `;

      const select = document.createElement("select");
      select.id = `select-jogador-${i}`;
      const optionHumano = document.createElement("option");
      optionHumano.value = "humano";
      optionHumano.textContent = "Humano";
      const optionPC = document.createElement("option");
      optionPC.value = "computador";
      optionPC.textContent = "Computador";

      select.appendChild(optionHumano);
      select.appendChild(optionPC);

      div.appendChild(label);
      div.appendChild(select);
      playersContainer.appendChild(div);
    }
  }

  // Mostra/esconde seleção de jogadores dependendo do modo
  selectModo.addEventListener("change", () => {
    const modo = selectModo.value;
    if (modo === "single") {
      // Só 1 humano
      playersContainer.style.display = "block";
      for (let i = 0; i < 4; i++) {
        const select = document.getElementById(`select-jogador-${i}`);
        select.value = i === 0 ? "humano" : "computador";
        select.disabled = i !== 0;
      }
    } else if (modo === "multi") {
      playersContainer.style.display = "block";
      for (let i = 0; i < 4; i++) {
        const select = document.getElementById(`select-jogador-${i}`);
        select.disabled = false;
        select.value = "humano"; // padrão
      }
    } else {
      playersContainer.style.display = "none";
    }
  });

  // Inicializa os selects
  renderPlayerSelectors();

  // Ao clicar em "Iniciar Jogo"
  btnStart.addEventListener("click", () => {
    const modo = selectModo.value;
    const baralhador = Number(document.getElementById("select-baralhador-menu").value);

    // Ler tipos de jogador
    const tipos = [];
    if (modo === "single") {
        tipos.push("humano");          // jogador 1 é humano
        tipos.push("computador");      // jogador 2 é computador
        tipos.push("computador");      // jogador 3 é computador
        tipos.push("computador");      // jogador 4 é computador
    } else {
        for (let i = 0; i < 4; i++) {
            const sel = document.getElementById(`select-jogador-${i}`);
            tipos.push(sel.value);
        }
    }

    
    // Esconde menu e mostra jogo
    document.getElementById("menu-inicial").style.display = "none";
    document.getElementById("game").style.display = "block";

    // Chama função do main.js
    startGame(modo, tipos, baralhador);
  });
});
