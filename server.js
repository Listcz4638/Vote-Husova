require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");

const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
const PORT = process.env.PORT || 3001;

// Render je za proxy → nutné pro secure cookies
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====== VOTES STORAGE ======
// Doporučení: na Renderu dej Persistent Disk a používej /var/data
const DATA_DIR = process.env.DATA_DIR || __dirname; // např. "/var/data"
const VOTES_FILE = path.join(DATA_DIR, "votes.json");

function readVotes() {
  try {
    return JSON.parse(fs.readFileSync(VOTES_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeVotes(votesArr) {
  fs.writeFileSync(VOTES_FILE, JSON.stringify(votesArr, null, 2));
}

// ====== SESSION ======
const isProd = process.env.NODE_ENV === "production";

app.use(
  session({
    secret: process.env.SESSION_SECRET || "husova_vote_2026",
    resave: false,
    saveUninitialized: false,
    proxy: true, // důležité na Renderu
    cookie: {
      secure: isProd,              // https
      sameSite: isProd ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 den
    },
  })
);

// ====== PASSPORT ======
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, 
    },
    (accessToken, refreshToken, profile, done) => {
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

// ====== STATIC ======
app.use(express.static(path.join(__dirname, "public")));

// ====== AUTH ROUTES ======
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/"); // frontend pak zavolá /me
  }
);

app.get("/logout", (req, res) => {
  req.logout(() => {
    req.session?.destroy(() => res.redirect("/"));
  });
});

// ====== API ======
app.get("/me", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ loggedIn: true, user: req.user });
  }
  res.json({ loggedIn: false });
});

function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ ok: false, error: "Not logged in" });
}

function requireAdmin(req, res, next) {
  const ADMIN_KEY = process.env.ADMIN_KEY;
  const key = req.query.key || req.headers["husovaadmin"];
  if (!ADMIN_KEY) return res.status(500).json({ ok: false, error: "ADMIN_KEY not set" });
  if (key !== ADMIN_KEY) return res.status(403).json({ ok: false, error: "Forbidden" });
  next();
}

// uložit hlas (jen přihlášený)
app.post("/api/vote", requireAuth, (req, res) => {
  const { name } = req.body;
  const email = req.user?.email || "nezjištěno";

  if (!name) return res.status(400).json({ ok: false, error: "Missing name" });

  const votes = readVotes();
  votes.push({ name, category, email, time: new Date().toISOString() });
  writeVotes(votes);

  res.json({ ok: true });
});

// admin výsledky
app.get("/api/results", requireAdmin, (req, res) => {
  const votes = readVotes();
  const results = { "1": {}, "2": {} };

for (const v of votes) {
  const cat = v.category || "unknown";
  if (!results[cat]) results[cat] = {};
  results[cat][v.name] = (results[cat][v.name] || 0) + 1;
}

res.json({ ok:true, total:votes.length, results });
});

// fallback
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`✅ Server běží na portu ${PORT}`));