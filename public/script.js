// ===== helpers =====
const qs = (id) => document.getElementById(id);

let selectedCategory = localStorage.getItem("selectedCategory") || null;

// ➤ Soutěžící (category: "1" = 1. stupeň, "2" = 2. stupeň)
const participants = [
  { name:"Jan Trnovský - 9.A", img:"contestant1.jpg", video:"https://youtu.be/aHwUcmSC15M", category:"2" },
  { name:"Amálie Pekařová - 9.A", img:"contestant2.jpg", video:"https://youtu.be/VIDEO2", category:"2" },

  { name:"Bruno Kollmer - 1.B", img:"contestant7.jpg", video:"https://youtu.be/VIDEO7", category:"1" },
  { name:"Jakub - 2.B", img:"contestant8.jpg", video:"https://youtube.com/shorts/BmDKMQjjGvs", category:"1" },
];

// ===== UI show/hide =====
function showLogin() {
  qs("loginSection").classList.remove("hidden");
  qs("voteSection").classList.add("hidden");
  qs("logoutBtn")?.classList.add("hidden");
}

function showVote(userText) {
  qs("loginSection").classList.add("hidden");
  qs("voteSection").classList.remove("hidden");
  qs("logoutBtn")?.classList.remove("hidden");
  qs("classInfo").innerText = userText || "";
}

// ===== render =====
function renderCards() {
  const voteGrid = qs("voteGrid");
  voteGrid.innerHTML = "";

  if (!selectedCategory) {
    voteGrid.innerHTML = `<p style="text-align:center; font-weight:600;">Vyber kategorii (1. nebo 2. stupeň).</p>`;
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
          <button class="videoBtn" type="button">▶ Video</button>
        </a>
        <button class="voteBtn" type="button" data-name="${p.name}">Hlasovat</button>
      </div>
    `;
    voteGrid.appendChild(div);
  });

  // vote listeners (po renderu)
  voteGrid.querySelectorAll(".voteBtn").forEach(btn => {
    btn.addEventListener("click", () => openVoteModal(btn.dataset.name, btn));
  });

  // zvýraznění aktivní kategorie
  document.querySelectorAll(".catBtn").forEach(b => {
    b.classList.toggle("active", b.dataset.cat === selectedCategory);
  });
}

// ===== modal vote =====
function openVoteModal(name, buttonEl) {
  const modal = qs("voteModal");
  qs("modalText").textContent = `Chceš dát hlas soutěžícímu ${name}?`;
  modal.classList.remove("hidden");

  qs("confirmVote").onclick = async () => {
    try {
      const r = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, category: selectedCategory }),
      });

      const out = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert("Hlas se neodeslal: " + (out.error || r.status));
        return;
      }

      modal.classList.add("hidden");
      buttonEl.disabled = true;
      buttonEl.textContent = "✅ Hlas odeslán";
    } catch (e) {
      alert("Chyba při odesílání hlasu");
    }
  };

  qs("cancelVote").onclick = () => modal.classList.add("hidden");
}

// ===== login check =====
async function checkLogin() {
  const res = await fetch("/me", { credentials: "include" });
  const data = await res.json();

  if (data.loggedIn) {
    showVote(`Přihlášen: ${data.user.displayName || data.user.email || "uživatel"}`);
    renderCards();
  } else {
    showLogin();
  }
}

// ===== init =====
window.addEventListener("DOMContentLoaded", () => {
  // login
  qs("loginBtn").addEventListener("click", () => {
    window.location.href = "/auth/google";
  });

  // logout
  qs("logoutBtn")?.addEventListener("click", () => {
    window.location.href = "/logout";
  });

  // kategorie (musí existovat tlačítka .catBtn)
  document.querySelectorAll(".catBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedCategory = btn.dataset.cat; // "1" nebo "2"
      localStorage.setItem("selectedCategory", selectedCategory);
      renderCards();
    });
  });

  checkLogin();
});
