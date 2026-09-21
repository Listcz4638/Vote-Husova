// ===== helpers =====
const qs = (id) => document.getElementById(id);

let selectedCategory = localStorage.getItem("selectedCategory") || null;
let votingOpen = false;

async function loadVotingStatus() {
  try {
    const res = await fetch("/api/voting-status");
    const data = await res.json();
    votingOpen = !!data.open;
  } catch (e) {
    votingOpen = false;
  }
}

function paintLoginBadge() {
  const badge = qs("votingStatusBadge");
  const text = qs("votingStatusText");
  if (!badge || !text) return;

  if (votingOpen) {
    badge.classList.remove("closed");
    text.textContent = "Hlasování je otevřené";
  } else {
    badge.classList.add("closed");
    text.textContent = "Hlasování je momentálně uzavřené";
  }
}

// ➤ Soutěžící (category: "1" = 1. stupeň, "2" = 2. stupeň)
const participants = [
  { name:"", img:"", video:"", category:"", song: "", artist: "" },
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
// zvýraznění aktivní kategorie
function highlightCategory() {
  document.querySelectorAll(".catBtn").forEach(b => {
    b.classList.toggle("active", b.dataset.cat === selectedCategory);
  });
}

function noContestantsMessage(text) {
  return `<p class="no-contestants" style="text-align:center; font-weight:600; grid-column:1 / -1;">${text}</p>`;
}

function renderCards() {
  const voteGrid = qs("voteGrid");
  voteGrid.innerHTML = "";

  // úplně bez soutěžících -> schováme výběr kategorie a ukážeme informaci
  const hasAny = participants.length > 0;
  const hint = qs("categoryHint");
  const catRow = document.querySelector(".category-row");
  if (hint) hint.style.display = hasAny ? "" : "none";
  if (catRow) catRow.style.display = hasAny ? "" : "none";

  if (!hasAny) {
    voteGrid.innerHTML = noContestantsMessage("Momentálně nejsou přihlášeni žádní soutěžící. 🎤");
    return;
  }

  if (!selectedCategory) {
    voteGrid.innerHTML = `<p style="text-align:center; font-weight:600;">Vyber kategorii (1. nebo 2. stupeň).</p>`;
    return;
  }

  const filtered = participants.filter(p => p.category === selectedCategory);

  // v této kategorii nikdo není
  if (filtered.length === 0) {
    highlightCategory();
    voteGrid.innerHTML = noContestantsMessage("V této kategorii momentálně nejsou žádní soutěžící.");
    return;
  }

  filtered.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "vote-card";
    div.style.animationDelay = `${i * 60}ms`;
    div.innerHTML = `
      <img src="${p.img}" alt="${p.name}" class="contestant-img">
      <h3>${p.name}</h3>

      <p class="song-title">🎵 ${p.song}</p>
<p class="song-artist">👤 ${p.artist}</p>

<div class="card-actions">
  <a href="${p.video}" target="_blank" rel="noopener noreferrer">
    <button class="videoBtn" type="button">▶ Video</button>
  </a>
</div>

${votingOpen
  ? `<button class="voteBtn" type="button" data-name="${p.name}">🗳 Hlasovat</button>`
  : `<div class="voting-closed">🔒 Hlasování bylo ukončeno</div>`
}
    `;
    voteGrid.appendChild(div);
  });

  // vote listeners (po renderu)
const voteButtons = voteGrid.querySelectorAll(".voteBtn");

if (voteButtons.length) {
  voteButtons.forEach(btn => {
    btn.addEventListener("click", () => openVoteModal(btn.dataset.name, btn));
  });
}

  highlightCategory();
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

  await loadVotingStatus();
  paintLoginBadge();

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
