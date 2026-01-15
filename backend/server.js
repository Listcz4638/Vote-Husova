const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
const PORT = process.env.PORT || 3001;

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
