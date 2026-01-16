async function checkLogin() {
  const res = await fetch("/me", { credentials: "include" });
  const data = await res.json();

  if (data.loggedIn) {
    // schovej login, ukaž voting
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("voteSection").classList.remove("hidden");
    document.getElementById("classInfo").innerText =
      `Přihlášen: ${data.user.displayName || data.user.email || "uživatel"}`;

    // tady zavolej vykreslení soutěžících (pokud máš)
    // renderParticipants();
  } else {
    document.getElementById("loginSection").classList.remove("hidden");
    document.getElementById("voteSection").classList.add("hidden");
    document.getElementById("logoutBtn").classList.remove("hidden");
  }
}

checkLogin();

document.getElementById("loginBtn").addEventListener("click", () => {
  window.location.href = "/auth/google";
});

window.addEventListener("DOMContentLoaded", () => {
  const login = document.getElementById("loginSection");
  const vote = document.getElementById("voteSection");

  // když některý element neexistuje, hned to řekneme
  if (!login || !vote) {
    console.error("Chybí loginSection nebo voteSection v HTML!");
    return;
  }

  // VŽDY start na loginu
  login.classList.remove("hidden");
  vote.classList.add("hidden");

  console.log("✅ Stránka načtena: zobrazují se přihlášení.");
});

document.getElementById("loginBtn").addEventListener("click", () => {
  window.location.href = "/auth/google";
});

  const classes = ["1.A","1.B","2.A","2.B","3.A","3.B","4.A","4.B","5.A","5.B","6.A","6.B","7.A","7.B","8.A","8.B","8.C","9.A","9.B"];
  const userClass = classes[Math.floor(Math.random() * classes.length)];
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("voteSection").classList.remove("hidden");
  document.getElementById("classInfo").innerText = `Přihlášená třída: ${userClass}`;

  const voteGrid = document.getElementById("voteGrid");
  voteGrid.innerHTML = "";

  // ➤ Pole objektů s jménem a cestou k fotce
const participants = [
  {
    name: "Jan Trnovský - 9.A",
    img: "contestant1.jpg",
    video: "https://www.youtube.com/watch?v=VIDEO_ID_1"
  },
  {
    name: "Amálie Pekařová - 9.A",
    img: "contestant2.jpg",
    video: "https://www.youtube.com/watch?v=VIDEO_ID_2"
  },
  {
    name: "Vít Kožich - 9.A",
    img: "contestant3.jpg",
    video: "https://www.youtube.com/watch?v=VIDEO_ID_3"
  },
  {
    name: "David Kostan - 9.A",
    img: "contestant4.jpg",
    video: "https://www.youtube.com/watch?v=VIDEO_ID_4"
  },
  {
    name: "Luky Chalpníček - 9.A",
    img: "contestant5.jpg",
    video: "https://www.youtube.com/watch?v=VIDEO_ID_5"
  },
  {
    name: "Jan Bernát - 9.B",
    img: "contestant6.jpg",
    video: "https://www.youtube.com/watch?v=VIDEO_ID_6"
  }
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
  });;
async function checkMe() {
  const res = await fetch("/api/me");
  const data = await res.json();

  if (data.loggedIn) {
    document.getElementById("classInfo").innerText =
      `Přihlášen: ${data.user.name} (${data.user.email || "bez emailu"})`;
    
    // tady zavolej svou funkci, co vykreslí soutěžící
    // nebo nech svůj současný kód na vykreslení karet
  }
}
checkMe();
const logoutBtn = document.getElementById("logoutBtn");

// klik na odhlášení
logoutBtn.addEventListener("click", () => {
  window.location.href = "/logout";
});

function showLogin() {
  qs("loginSection")?.classList.remove("hidden");
  qs("voteSection")?.classList.add("hidden");
  qs("logoutBtn")?.classList.add("hidden");
}

function showVote(userText) {
  qs("loginSection")?.classList.add("hidden");
  qs("voteSection")?.classList.remove("hidden");
  qs("logoutBtn")?.classList.remove("hidden");
  qs("classInfo").innerText = userText || "";
}