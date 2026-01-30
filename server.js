require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// ===== SUPABASE =====
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1); // Render proxy (secure cookies)

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== SESSION =====
const isProd = process.env.NODE_ENV === "production";
app.use(
  session({
    secret: process.env.SESSION_SECRET || "husova_vote_2026_change_me",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      // do května – dejme třeba 200 dní
      maxAge: 1000 * 60 * 60 * 24 * 200,
    },
  })
);

// ===== PASSPORT =====
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // např. https://vote-husova.onrender.com/auth/google/callback
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

// ===== STATIC =====
app.use(express.static(path.join(__dirname, "public")));

// ===== AUTH ROUTES =====
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

// ===== API =====
app.get("/me", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ loggedIn: true, user: req.user });
  }
  return res.json({ loggedIn: false });
});

function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ ok: false, error: "Not logged in" });
}

function requireAdmin(req, res, next) {
  const ADMIN_KEY = process.env.ADMIN_KEY;
  const key = req.query.key || req.headers["x-admin-key"]; // ✔ správný header

  if (!ADMIN_KEY) return res.status(500).json({ ok: false, error: "ADMIN_KEY not set" });
  if (key !== ADMIN_KEY) return res.status(403).json({ ok: false, error: "Forbidden" });
  next();
}

// ===== HELPERS =====
function needSupabase(res) {
  if (!supabase) {
    return res.status(500).json({
      ok: false,
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Render.",
    });
  }
  return null;
}

// ===== VOTE =====
// 1 email = 1 hlas v kategorii (řeší DB unique index)
app.post("/api/vote", requireAuth, async (req, res) => {
  const err = needSupabase(res);
  if (err) return;

  try {
    const { name, category } = req.body;

    if (!name || !category) {
      return res.status(400).json({ ok: false, error: "Missing name or category" });
    }
    if (!["1", "2"].includes(String(category))) {
      return res.status(400).json({ ok: false, error: "Bad category" });
    }

    const voterEmail = req.user?.email;
    const voterName = req.user?.displayName || null;

    if (!voterEmail) {
      return res.status(400).json({ ok: false, error: "Missing voter email" });
    }

    const { error } = await supabase.from("votes").insert({
      voter_email: voterEmail,
      voter_name: voterName,
      category: String(category),
      contestant_name: name,
    });

    if (error) {
      // duplicitní hlas (unique index)
      if (String(error.code) === "23505") {
        return res.status(409).json({ ok: false, error: "Už jsi v této kategorii hlasoval/a." });
      }
      console.error("SUPABASE INSERT ERROR:", error);
      return res.status(500).json({ ok: false, error: "Database error" });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("VOTE ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ===== RESULTS =====
// vrací výsledky rozdělené na 1 a 2 stupeň
app.get("/api/results", requireAdmin, async (req, res) => {
  const err = needSupabase(res);
  if (err) return;

  try {
    const { data, error } = await supabase.from("votes").select("category, contestant_name");

    if (error) {
      console.error("SUPABASE SELECT ERROR:", error);
      return res.status(500).json({ ok: false, error: "Database error" });
    }

    const results = { "1": {}, "2": {} };

    for (const v of data) {
      const cat = v.category;
      const name = v.contestant_name;
      if (!results[cat]) results[cat] = {};
      results[cat][name] = (results[cat][name] || 0) + 1;
    }

    return res.json({ ok: true, total: data.length, results });
  } catch (e) {
    console.error("RESULTS ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ===== FALLBACK =====
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`✅ Server běží na portu ${PORT}`));
