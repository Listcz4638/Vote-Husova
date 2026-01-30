require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");

const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

const ADMIN_KEY = process.env.ADMIN_KEY || ""; // nastav na Renderu
const VOTES_FILE = path.join(__dirname, "votes.json");

// ---------- helpers: votes.json ----------
function readVotes() {
  try {
    const raw = fs.readFileSync(VOTES_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return []; // když soubor neexistuje / je prázdný
  }
}

function writeVotes(votesArr) {
  fs.writeFileSync(VOTES_FILE, JSON.stringify(votesArr, null, 2));
}

// ---------- middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "husova_vote_2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,            // Render (https) = true
      sameSite: isProd ? "none" : "lax",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ---------- passport ----------
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // https://vote-husova.onrender.com/auth/google/callback
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value || null;
      const user = {
        id: profile.id,
        displayName: profile.displayName,
        email,
      };
      done(null, user);
    }
  )
);

// ---------- auth guards ----------
function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ ok: false, error: "Not logged in" });
}

function requireAdmin(req, res, next) {
  const key = req.query.key || req.headers["x-admin-key"];
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  next();
}

// ---------- static ----------
app.use(express.static(path.join(__dirname, "public")));

// ---------- API ----------
app.get("/me", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ loggedIn: true, user: req.user });
  }
  res.json({ loggedIn: false });
});

// uložit hlas (chráněné loginem)
app.post("/api/vote", requireAuth, (req, res) => {
  const { name } = req.body; // pro koho
  if (!name) return res.status(400).json({ ok: false, error: "Missing name" });

  const votes = readVotes();

  // pokud chceš zakázat 2x hlas z jednoho emailu, odkomentuj:
  // const voter = req.user?.email || req.user?.id;
  // if (voter && votes.some(v => v.voter === voter)) {
  //   return res.status(409).json({ ok: false, error: "User already voted" });
  // }

  votes.push({
    name,
    voter: req.user?.email || req.user?.id || "unknown",
    time: new Date().toISOString(),
  });

  writeVotes(votes);

  res.json({ ok: true });
});

// výsledky (admin)
app.get("/api/results", requireAdmin, (req, res) => {
  const votes = readVotes();
  const results = {};

  for (const v of votes) {
    results[v.name] = (results[v.name] || 0) + 1;
  }

  res.json({
    ok: true,
    total: votes.length,
    results,
    votes, // tady uvidíš i "kdo hlasoval pro koho" (voter + time)
  });
});

// ---------- auth routes ----------
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => res.redirect("/")
);

app.get("/logout", (req, res) => {
  req.logout(() => {
    req.session?.destroy(() => res.redirect("/"));
  });
});

// fallback (Express 5 safe)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`✅ Server běží na portu ${PORT}`));