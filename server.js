const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001;

// Statické soubory (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Hlavní stránka
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Backend běží na http://localhost:3001`);
});
