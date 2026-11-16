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

// ===== Novinky a změny (tabulka vpravo) =====
// Záznamy se načítají z databáze (/api/updates). Přidávají se v admin.html tlačítkem "Přidat změnu".

function formatDateCz(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : String(iso || "");
}

async function renderNews() {
  const body = qs("newsBody");
  if (!body) return;

  const message = (txt) => {
    body.innerHTML = "";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.style.textAlign = "center";
    td.textContent = txt;
    tr.appendChild(td);
    body.appendChild(tr);
  };

  let list = [];
  try {
    const res = await fetch("/api/updates");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    list = data.updates || [];
  } catch (e) {
    message("Novinky se nepodařilo načíst.");
    return;
  }

  if (!list.length) {
    message("Zatím žádné záznamy.");
    return;
  }

  body.innerHTML = "";
  list.forEach(u => {
    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.className = "news-date";
    tdDate.textContent = formatDateCz(u.update_date);

    const tdArea = document.createElement("td");
    const tag = document.createElement("span");
    tag.className = "news-tag " + (u.area === "soutez" ? "news-tag-soutez" : "news-tag-web");
    tag.textContent = u.area === "soutez" ? "Soutěž" : "Web";
    tdArea.appendChild(tag);

    const tdText = document.createElement("td");
    tdText.textContent = u.text;

    tr.append(tdDate, tdArea, tdText);
    body.appendChild(tr);
  });
}

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
    voteGrid.innerHTML = `<p class="empty-note">Vyber kategorii (1. nebo 2. stupeň).</p>`;
    return;
  }

  const filtered = participants.filter(p => p.category === selectedCategory);

  // v kategorii nikdo není -> místo prázdné plochy ukážeme text
  if (!filtered.length) {
    voteGrid.innerHTML = `<p class="empty-note">Zatím tu nejsou žádní soutěžící.</p>`;
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
let maintenanceOn = false;

async function loadMaintenance() {
  try {
    const res = await fetch("/api/maintenance");
    const data = await res.json();
    maintenanceOn = !!data.maintenance;
  } catch (e) {
    maintenanceOn = false;
  }
}

function showMaintenance() {
  qs("loginSection").classList.add("hidden");
  qs("voteSection").classList.add("hidden");
  qs("logoutBtn")?.classList.add("hidden");
  qs("maintenanceSection")?.classList.remove("hidden");
}

async function checkLogin() {
  await loadMaintenance();
  if (maintenanceOn) {
    showMaintenance();
    return;
  }

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

  renderNews();
  checkLogin();
});






