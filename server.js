require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();

const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

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

// --- fallback pro SPA / refresh ---
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server běží na portu ${PORT}`);
});