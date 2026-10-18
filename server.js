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

// ===== MAINTENANCE MODE =====
// Příznak "maintenance" je v Supabase tabulce "settings" (řádek id = 1).
// Když je zapnutý, veřejnost vidí stránku údržby (HTTP 503), ale admin dál funguje.
let maintenanceCache = { value: false, ts: 0 };
const MAINT_TTL_MS = 5000; // jak dlouho si pamatujeme stav, aby se DB nedotazovala při každém požadavku

async function getMaintenance() {
  if (!supabase) return false;
  if (Date.now() - maintenanceCache.ts < MAINT_TTL_MS) return maintenanceCache.value;

  const { data, error } = await supabase
    .from("settings")
    .select("maintenance")
    .eq("id", 1)
    .single();

  if (error) {
    // když se stav nepodaří zjistit, web radši NEzamykáme – necháme poslední známou hodnotu
    console.error("SUPABASE MAINTENANCE READ ERROR:", error);
    maintenanceCache.ts = Date.now();
    return maintenanceCache.value;
  }

  maintenanceCache = { value: !!data?.maintenance, ts: Date.now() };
  return maintenanceCache.value;
}

// cesty, které fungují i během údržby (admin + soubory pro stránku údržby)
const MAINT_ALLOWED = new Set([
  "/admin.html",
  "/api/results",
  "/api/maintenance",
  "/api/voting-status",
  "/udrzba.html",
  "/style.css",
  "/logo.png",
  "/tile.png",
  "/husovalogo.png",
  "/favicon.ico",
]);

app.use(async (req, res, next) => {
  try {
    if (MAINT_ALLOWED.has(req.path)) return next();
    if (!(await getMaintenance())) return next();

    res.set("Retry-After", "300");

    if (req.path.startsWith("/api/") || req.path === "/me") {
      return res.status(503).json({
        ok: false,
        maintenance: true,
        error: "Probíhá údržba, zkus to prosím za chvíli.",
      });
    }
    return res.status(503).sendFile(path.join(__dirname, "public", "udrzba.html"));
  } catch (e) {
    console.error("MAINTENANCE MIDDLEWARE ERROR:", e);
    return next();
  }
});

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

// ===== VOTING STATUS =====
// Stav hlasování je uložený v Supabase tabulce "settings" (jeden řádek, id = 1).
// SQL pro vytvoření tabulky je v poznámce na konci souboru.

async function getVotingOpen() {
  const { data, error } = await supabase
    .from("settings")
    .select("voting_open")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("SUPABASE STATUS READ ERROR:", error);
    return false; // pro jistotu radši "zavřeno", když se stav nepodaří zjistit
  }
  return !!data?.voting_open;
}

// veřejné – frontend potřebuje vědět, jestli má zobrazit tlačítko Hlasovat
app.get("/api/voting-status", async (req, res) => {
  const err = needSupabase(res);
  if (err) return;

  try {
    const open = await getVotingOpen();
    return res.json({ ok: true, open });
  } catch (e) {
    console.error("STATUS ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// jen admin – přepnutí stavu
app.post("/api/voting-status", requireAdmin, async (req, res) => {
  const err = needSupabase(res);
  if (err) return;

  const { open } = req.body;
  if (typeof open !== "boolean") {
    return res.status(400).json({ ok: false, error: "Missing boolean 'open' in body" });
  }

  try {
    const { error } = await supabase
      .from("settings")
      .update({ voting_open: open })
      .eq("id", 1);

    if (error) {
      console.error("SUPABASE STATUS UPDATE ERROR:", error);
      return res.status(500).json({ ok: false, error: "Database error" });
    }

    return res.json({ ok: true, open });
  } catch (e) {
    console.error("STATUS UPDATE ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ===== MAINTENANCE API =====
// veřejné – stránka údržby podle toho pozná, že se má sama obnovit
app.get("/api/maintenance", async (req, res) => {
  try {
    return res.json({ ok: true, maintenance: await getMaintenance() });
  } catch (e) {
    return res.json({ ok: true, maintenance: false });
  }
});

// jen admin – zapnutí/vypnutí údržby
app.post("/api/maintenance", requireAdmin, async (req, res) => {
  const err = needSupabase(res);
  if (err) return;

  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ ok: false, error: "Missing boolean 'enabled' in body" });
  }

  try {
    const { error } = await supabase
      .from("settings")
      .update({ maintenance: enabled })
      .eq("id", 1);

    if (error) {
      console.error("SUPABASE MAINTENANCE UPDATE ERROR:", error);
      return res.status(500).json({ ok: false, error: "Database error (je v tabulce settings sloupec 'maintenance'?)" });
    }

    maintenanceCache = { value: enabled, ts: Date.now() }; // projeví se hned
    return res.json({ ok: true, maintenance: enabled });
  } catch (e) {
    console.error("MAINTENANCE UPDATE ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

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

    const votingOpen = await getVotingOpen();
    if (!votingOpen) {
      return res.status(403).json({ ok: false, error: "Hlasování je momentálně uzavřené." });
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

    const votingOpen = await getVotingOpen();
    const maintenance = await getMaintenance();

    return res.json({ ok: true, total: data.length, results, votingOpen, maintenance });
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

/*
===== SQL MIGRACE (spusť jednou v Supabase → SQL editor) =====

create table if not exists settings (
  id smallint primary key,
  voting_open boolean not null default false
);

insert into settings (id, voting_open)
values (1, false)
on conflict (id) do nothing;

-- údržba (spusť taky jednou):
alter table settings add column if not exists maintenance boolean not null default false;

Server přistupuje k Supabase přes SERVICE ROLE klíč, takže obchází RLS –
žádné dodatečné policy pro tabulku "settings" není potřeba.
*/
