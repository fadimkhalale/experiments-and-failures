const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

// Middlewares
app.use(express.static('public'));
app.use(express.json());

// PDF Upload konfigurieren
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/pdfs/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// POST /upload
app.post('/upload', upload.single('pdf'), (req, res) => {
  if (!req.file) return res.status(400).send('Keine Datei erhalten');
  res.send('PDF gespeichert');
});

// GET /list
app.get('/list', (req, res) => {
  const dir = path.join(__dirname, 'public/pdfs');
  fs.readdir(dir, (err, files) => {
    if (err) return res.status(500).send('Fehler beim Lesen der Dateien');

    const pdfs = files
      .filter(name => name.endsWith('.pdf'))
      .map(name => {
        const stat = fs.statSync(path.join(dir, name));
        const [_, dozent, semester] = name.match(/Dozentenblatt_(.+)_(Wintersemester|Sommersemester)\d{4}/) || [null, '', ''];
        return {
          name,
          date: stat.mtime.toISOString().split('T')[0],
          dozent,
          semester
        };
      });

    res.json(pdfs);
  });
});

// Server starten
app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));