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
  { name:"František Škvor - 5.B", img:"contestant8.png", video:"https://youtu.be/Es-eDRNidU4", category:"2", song: "Jdem zpátky do lesů", artist: "Pavel Žalman Lohonka" },
  { name:"Antonín Fulka - 6.A", img:"contestant9.png", video:"https://youtu.be/xcDOwpogRT4", category:"2", song: "Cesta", artist: "Kryštof" },
  { name:"Anežka Hospodářová - 7.B", img:"contestant12.png", video:"https://youtu.be/QBrwBdnpM00", category:"2", song: "Větře větříčku", artist: "S Čerty nejsou žerty" },
  { name:"Bára Hladíková - 8.B", img:"contestant14.png", video:"https://youtu.be/LE6VWiZW0Sk", category:"2", song: "Cups (Pitch Perfect’s “When I’m Gone”)", artist: "Anna Kendrick" },
  { name:"Jakub Svoboda, Hynek Dolejš - 9.A", img:"contestant15.png", video:"https://youtu.be/GRnpKfQjzRQ", category:"2", song: "Pepa & Teta", artist: "Jakub Svoboda & Hynek Dolejš" },
  
  { name:"Bruno Kollmer - 1.B", img:"contestant2.png", video:"https://youtu.be/NxWaAOeuWJ4", category:"1", song: "Příšera", artist: "Trampské perly" },
  { name:"Roman Sobotka - 2.A", img:"contestant3.png", video:"https://www.youtube.com/watch?v=0y-Ul9RYTSY", category:"1", song: "Na ostří nože", artist: "Ewa Farna" },
  { name:"Viky Farská - 3.A", img:"contestant5.png", video:"https://youtu.be/NyZihcd-Yj0", category:"1", song: "Malý princ", artist: "Eva Burešová" },
  { name:"Jirka Šidlof - 3.B", img:"contestant6.png", video:"https://youtu.be/BnHfiDu_ZTQ", category:"1", song: "Mám styl Čendy", artist: "Karel Gott" },
  { name:"Andrea Maděrová - 4.B", img:"contestant7.png", video:"https://youtu.be/ZMAYXMeQ-Fo", category:"1", song: "Mám styl Čendy", artist: "Karel Gott" },
];

// ===== Minulí vítězové =====
// Nový ročník přidej úplně NAHORU (nejnovější první).
// category: "1" = 1. stupeň, "2" = 2. stupeň
// video: odkaz na YouTube (youtu.be/..., youtube.com/watch?v=...) – může zůstat prázdné ""
// !!! Níže jsou jen UKÁZKOVÉ řádky – přepiš je skutečnými vítězi.
const winners = [
  { year: "2025", category: "1", name: "Doplňte jméno – třída", song: "Doplňte název písně", video: "" },
  { year: "2025", category: "2", name: "Doplňte jméno – třída", song: "Doplňte název písně", video: "" },
];

function youtubeId(url) {
  const m = String(url || "").match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function renderWinnerVideos() {
  const box = qs("winnersVideos");
  if (!box) return;
  box.innerHTML = "";

  const withVideo = winners.filter(w => youtubeId(w.video));

  if (!withVideo.length) {
    box.innerHTML = `<div class="winners-video-empty">🎬 Videa vítězů doplníme</div>`;
    return;
  }

  withVideo.forEach(w => {
    const id = youtubeId(w.video);
    const caption = `${w.year} · ${w.category === "2" ? "2. stupeň" : "1. stupeň"} – ${w.name}`;

    const card = document.createElement("div");
    card.className = "winner-video";

    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "winner-video-thumb";
    thumb.setAttribute("aria-label", "Přehrát video: " + caption);
    thumb.style.backgroundImage = `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)`;
    thumb.innerHTML = `<span class="winner-play">▶</span>`;

    // klik = nahradí náhled přehrávačem (nic se nenačítá, dokud si to někdo nepustí)
    thumb.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.className = "winner-video-frame";
      iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
      iframe.title = caption;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      card.replaceChild(iframe, thumb);
    });

    const cap = document.createElement("div");
    cap.className = "winner-video-cap";
    cap.textContent = caption;

    card.append(thumb, cap);
    box.appendChild(card);
  });
}

function renderWinners() {
  renderWinnerVideos();

  const body = qs("winnersBody");
  if (!body) return;
  body.innerHTML = "";

  if (!winners.length) {
    body.innerHTML = `<tr><td colspan="4" style="text-align:center;">Zatím žádní vítězové.</td></tr>`;
    return;
  }

  winners.forEach(w => {
    const tr = document.createElement("tr");

    const tdYear = document.createElement("td");
    tdYear.className = "winners-year";
    tdYear.textContent = w.year;

    const tdCat = document.createElement("td");
    const tag = document.createElement("span");
    tag.className = "winners-tag " + (w.category === "2" ? "winners-tag-2" : "winners-tag-1");
    tag.textContent = w.category === "2" ? "2. stupeň" : "1. stupeň";
    tdCat.appendChild(tag);

    const tdName = document.createElement("td");
    tdName.className = "winners-name";
    tdName.textContent = "🏆 " + w.name;

    const tdSong = document.createElement("td");
    tdSong.textContent = w.song;

    tr.append(tdYear, tdCat, tdName, tdSong);
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
    voteGrid.innerHTML = `<p style="text-align:center; font-weight:600;">Vyber kategorii (1. nebo 2. stupeň).</p>`;
    return;
  }

  const filtered = participants.filter(p => p.category === selectedCategory);

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

  renderWinners();
  checkLogin();
});






