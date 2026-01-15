document.getElementById("loginBtn").addEventListener("click", () => {
  alert("Přihlášení přes Gmail zatím testujeme ✅");

  const classes = ["1.A","1.B","2.A","2.B","3.A","3.B","4.A","4.B","5.A","5.B","6.A","6.B","7.A","7.B","8.A","8.B","8.C","9.A","9.B"];
  const userClass = classes[Math.floor(Math.random() * classes.length)];

  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("voteSection").classList.remove("hidden");
  document.getElementById("classInfo").innerText = `Přihlášená třída: ${userClass}`;

  const voteGrid = document.getElementById("voteGrid");
  voteGrid.innerHTML = "";

  // ➤ Pole objektů s jménem a cestou k fotce
  const participants = [
    { name: "Jan Trnovský - 9.A", img: "contestant1.jpg" },
    { name: "Amálie Pekařová - 9.A", img: "contestant2.jpg" },
    { name: "Vít Kožich - 9.A", img: "contestant3.jpg" },
    { name: "David Kostan - 9.A", img: "contestant4.jpg" },
    { name: "Luky Chalpníček - 9.A", img: "contestant5.jpg" }
  ];

  participants.forEach(p => {
    const div = document.createElement("div");
    div.className = "vote-card";
    div.innerHTML = `
      <img src="${p.img}" alt="${p.name}" class="contestant-img">
      <h3>${p.name}</h3>
      <button class="voteBtn" data-name="${p.name}">Hlasovat</button>
    `;
    voteGrid.appendChild(div);
  });

  // 🧩 Listener na tlačítka HLASOVAT s modalem
  document.querySelectorAll(".voteBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const jmeno = e.target.getAttribute("data-name");

      // 🔹 Zobrazíme modal
      const modal = document.getElementById("voteModal");
      const modalText = document.getElementById("modalText");
      modalText.textContent = `Chceš dát hlas soutěžícímu ${jmeno}?`;
      modal.classList.remove("hidden");

      // 🔹 Potvrzení hlasu
      document.getElementById("confirmVote").onclick = () => {
        modal.classList.add("hidden");
        e.target.disabled = true;
        e.target.textContent = "✅ Hlas odeslán";
        // fetch('/hlasuj', { method: 'POST', body: JSON.stringify({ jmeno }) })
      };

      // 🔹 Zrušení hlasování
      document.getElementById("cancelVote").onclick = () => {
        modal.classList.add("hidden");
      };
    });
  });
});
