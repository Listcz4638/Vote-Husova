// ====== DATA ======
const participants = [
  { name:"Jan Trnovský - 9.A", img:"contestant1.jpg", video:"https://youtu.be/aHwUcmSC15M", category:"2" },
  { name:"Amálie Pekařová - 9.A", img:"contestant2.jpg", video:"https://youtu.be/XXXXX", category:"2" },

  { name:"Někdo - 3.A", img:"contestant7.jpg", video:"https://youtu.be/YYYYY", category:"1" },
  { name:"Někdo - 5.B", img:"contestant8.jpg", video:"https://youtu.be/ZZZZZ", category:"1" },
];

let selectedCategory = null; // "1" nebo "2"

// ====== HELPERS ======
function showLogin() {
  document.getElementById("loginSection")?.classList.remove("hidden");
  document.getElementById("voteSection")?.classList.add("hidden");
  document.getElementById("logoutBtn")?.classList.add("hidden");
}

function showVote(userText) {
  document.getElementById("loginSection")?.classList.add("hidden");
  document.getElementById("voteSection")?.classList.remove("hidden");
  document.getElementById("logoutBtn")?.classList.remove("hidden");
  document.getElementById("classInfo").innerText = userText || "";
}

function renderCards() {
  const voteGrid = document.getElementById("voteGrid");
  voteGrid.innerHTML = "";

  if (!selectedCategory) {
    voteGrid.innerHTML = `<p style="text-align:center;">Vyber kategorii (1. nebo 2. stupeň) 👆</p>`;
    return;
  }

  const filtered = participants.filter(p => p.category === selectedCategory);

  filtered.forEach(p => {
    const div = document.createElement("div");
    div.className = "vote-card";
    div.innerHTML = `
      <img src="${p.img}" alt="${p.name}" class="contestant-img">
      <h3>${p.name}</h3>

      <div class="card-actions">
        <a href="${p.video}" target="_blank" rel="noopener noreferrer">
          <button type="button" class="videoBtn">▶ Video</button>
        </a>
        <button type="button" class="voteBtn" data-name="${p.name}">Hlasovat</button>
      </div>
    `;
    voteGrid.appendChild(div);
  });

  // hlasování -> modal
  document.querySelectorAll(".voteBtn").forEach(btn => {
    btn.addEventListener("click", () => openVoteModal(btn.dataset.name, btn));
  });
}

function openVoteModal(name, btnEl) {
  const modal = document.getElementById("voteModal");
  const modalText = document.getElementById("modalText");
  modalText.textContent = `Chceš dát hlas soutěžícímu ${name}?`;
  modal.classList.remove("hidden");

  document.getElementById("confirmVote").onclick = async () => {
    await submitVote(name, btnEl);
    modal.classList.add("hidden");
  };

  document.getElementById("cancelVote").onclick = () => {
    modal.classList.add("hidden");
  };
}

async function submitVote(name, btnEl) {
  if (!selectedCategory) {
    alert("Nejdřív vyber kategorii (1. nebo 2. stupeň).");
    return;
  }

  try {
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, category: selectedCategory }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert("Hlas se neodeslal: " + (data.error || res.status));
      return;
    }

    // UI změna
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = "✅ Hlas odeslán";
    } else {
      alert("✅ Hlas odeslán!");
    }
  } catch (e) {
    alert("Chyba při odesílání hlasu.");
  }
}

// ====== LOGIN CHECK ======
async function checkLogin() {
  const res = await fetch("/me", { credentials: "include" });
  const data = await res.json();

  if (data.loggedIn) {
    showVote(`Přihlášen: ${data.user.displayName || data.user.email || "uživatel"}`);
    renderCards(); // zobrazí text “Vyber kategorii...”
  } else {
    showLogin();
  }
}

// ====== INIT ======
window.addEventListener("DOMContentLoaded", () => {
  // login tlačítko
  document.getElementById("loginBtn")?.addEventListener("click", () => {
    window.location.href = "/auth/google";
  });

  // logout tlačítko
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    window.location.href = "/logout";
  });

  // kategorie tlačítka
  document.querySelectorAll(".catBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedCategory = btn.dataset.cat; // "1" nebo "2"
      document.querySelectorAll(".catBtn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderCards();
    });
  });

  checkLogin();
});
