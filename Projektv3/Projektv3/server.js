const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Alle statischen Dateien aus dem Ordner "public" bereitstellen
app.use(express.static(path.join(__dirname, 'public')));

// favicon.ico ignorieren (unterdrückt CSP-Warnung im Browser)
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
