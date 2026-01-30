const fs = require("fs");
const path = require("path");

const VOTES_FILE = path.join(__dirname, "votes.json");

function readVotes() {
  try {
    return JSON.parse(fs.readFileSync(VOTES_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeVotes(votes) {
  fs.writeFileSync(VOTES_FILE, JSON.stringify(votes, null, 2));
}

app.use(express.json());

require("dotenv").config();

const votes = {}; // { "Jméno": počet }
const app = express();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";
const ADMIN_KEY = process.env.ADMIN_KEY;
// middleware – admin ochrana
function requireAdmin(req, res, next) {
  const key = req.query.key || req.headers["x-admin-key"];
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  next();
}

// --- TADY MUSÍŠ MÍT ULOŽENÉ HLASY ---
// minimálně do paměti (lepší je Sheets, ale i tohle ti rozchodí admin stránku)

// ukládání hlasu
app.post("/api/vote", (req, res) => {
  const { name, email } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Missing name" });
  }

  const votes = readVotes();

  votes.push({
    name,
    email: email || "nezjištěno",
    time: new Date().toISOString()
  });

  writeVotes(votes);

  res.json({ ok: true });
});

// výsledky pro admina
app.get("/api/results", (req, res) => {
  const key = req.query.key;

  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const votes = readVotes();
  const results = {};

  for (const v of votes) {
    results[v.name] = (results[v.name] || 0) + 1;
  }

  res.json({
    ok: true,
    total: votes.length,
    results
  });
});

// --- SESSION (důležité pro Render/HTTPS) ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd, // Render = true, localhost = false
      sameSite: isProd ? "none" : "lax",
    },
  })
);

// --- PASSPORT ---
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// --- GOOGLE STRATEGY ---
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, 
      // napr: https://vote-husova.onrender.com/auth/google/callback
    },
    (accessToken, refreshToken, profile, done) => {
      // Sem si uložíš jen co chceš (email, jméno)
      const email = profile.emails?.[0]?.value || null;
      const user = {
        id: profile.id,
        displayName: profile.displayName,
        email,
      };
      return done(null, user);
    }
  )
);

// --- STATIC FRONTEND ---
app.use(express.static(path.join(__dirname, "public")));

// --- API: login status ---
app.get("/me", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ loggedIn: true, user: req.user });
  }
  res.json({ loggedIn: false });
});

// --- AUTH ROUTES ---
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Po úspěchu zpátky na stránku, frontend si sám načte /me
    res.redirect("/");
  }
);

app.get("/logout", (req, res) => {
  req.logout(() => {
    req.session?.destroy(() => res.redirect("/"));
  });
});

// fallback pro refresh / přímé URL (Express 5 safe)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server běží na portu ${PORT}`);
});

// musíš mít přihlášení v session (passport)
function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Not logged in" });
}

// hlasování
app.post("/api/vote", requireAuth, express.json(), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Missing name" });

  votes[name] = (votes[name] || 0) + 1;
  return res.json({ ok: true, votes: votes[name] });
});

// výsledky (zamkneme “admin klíčem”)
app.get("/api/results", (req, res) => {
  const key = req.query.key;

  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({ error: "ADMIN_KEY not set on server" });
  }

  if (key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json(votes);
});


// Výsledky hlasování (admin)
app.get("/api/results", (req, res) => {
  // jednoduchá ochrana klíčem (na Renderu nastav ADMIN_KEY)
  const key = req.query.key;
  if (process.env.ADMIN_KEY && key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // TODO: sem dáme čtení z databáze / souboru
  // Zatím jen ukázka (prázdné výsledky):
  return res.json({ ok: true, results: {} });
});
app.use(express.json());

app.post("/api/vote", (req, res) => {
  // dočasně bez loginu pro test:
  // (až bude fungovat, tak přidej ochranu)
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Missing name" });

  votes[name] = (votes[name] || 0) + 1;
  res.json({ ok: true, votes });
});
