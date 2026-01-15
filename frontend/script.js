const voteButtons = document.querySelectorAll('.vote-btn'); // tvoje tlačítka "Hlasovat"
const modal = document.getElementById('voteConfirm');
const yesBtn = document.getElementById('confirmYes');
const noBtn = document.getElementById('confirmNo');

let selectedClass = null;

voteButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedClass = btn.dataset.class; // třeba data-class="9.A"
    modal.classList.remove('hidden');
  });
});

yesBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
  // tady pošleme hlas na backend
  fetch('/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ className: selectedClass })
  }).then(res => alert("Hlas zaznamenán!"));
});

noBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
});
const main = document.getElementById("main");

let user = null;

function renderLogin() {
  main.innerHTML = `
    <h2>Přihlášení</h2>
    <input id="username" placeholder="Zadej své jméno (testovací)" />
    <button onclick="login()">Přihlásit se</button>
  `;
}

async function login() {
  const username = document.getElementById("username").value;
  const res = await fetch("http://localhost:3001/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  user = await res.json();
  renderVote();
}

function renderVote() {
  main.innerHTML = `
    <h2>Vítej, ${user.name} (${user.class})</h2>
    <p>Vyber svého favorita:</p>
    <div id="contestants"></div>
  `;
  const contestants = ["Anna (5.A)", "Tomáš (7.B)", "Eliška (8.C)", "Adam (9.A)"];
  const div = document.getElementById("contestants");
  contestants.forEach(c => {
    const btn = document.createElement("button");
    btn.innerText = c;
    btn.onclick = () => vote(c);
    div.appendChild(btn);
  });
}

async function vote(contestant) {
  const res = await fetch("http://localhost:3001/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user.name, contestant }),
  });
  const data = await res.json();
  alert(data.message);
}
renderLogin();
