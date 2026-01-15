require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

app.use(session({
  secret: process.env.SESSION_SECRET || "dev_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  }
}));

app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(express.static(path.join(__dirname, "public")));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${BASE_URL}/auth/google/callback`,
}, (accessToken, refreshToken, profile, done) => {
  return done(null, {
    id: profile.id,
    displayName: profile.displayName,
    email: profile.emails?.[0]?.value
  });
}));


app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, sameSite: "lax" }, // Render = HTTPS
  })
);

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
        googleId: profile.id,
        name: profile.displayName,
        email,
      };
      done(null, user);
    }
  )
);

// statické soubory (tvůj web)
app.use(express.static("public"));

// login
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => res.redirect("/")
);

// zjisti kdo je přihlášen
app.get("/api/me", (req, res) => {
  if (!req.user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, user: req.user });
});

// logout
app.get("/logout", (req, res) => {
  req.logout(() => res.redirect("/"));
});

app.listen(PORT, () => console.log("Server running on port", PORT));
