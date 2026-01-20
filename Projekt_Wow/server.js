const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middlewares
app.use(express.static('public'));
app.use(express.json());

// GET /list - Gibt die Liste der PDFs aus dem Downloads-Ordner zurück
app.get('/list', (req, res) => {
  const downloadsPath = path.join(require('os').homedir(), 'Downloads');
  
  fs.readdir(downloadsPath, (err, files) => {
    if (err) return res.status(500).send('Fehler beim Lesen der Dateien');

    const pdfs = files
      .filter(name => name.endsWith('.pdf'))
      .map(name => {
        const stat = fs.statSync(path.join(downloadsPath, name));
        const dozentenMatch = name.match(/Dozentenblatt_(.+)_(Wintersemester|Sommersemester)\d{4}/i);
        const zuarbeitMatch = name.match(/Zuarbeitsblatt_(.+)_(Wintersemester|Sommersemester)\d{4}/i);
        
        let dozent = '', semester = '';
        if (dozentenMatch) {
          [, dozent, semester] = dozentenMatch;
        } else if (zuarbeitMatch) {
          [, dozent, semester] = zuarbeitMatch;
        }

        return {
          name,
          path: path.join(downloadsPath, name),
          date: stat.mtime.toISOString().split('T')[0],
          dozent,
          semester,
          type: dozentenMatch ? 'Dozentenblatt' : zuarbeitMatch ? 'Zuarbeitsblatt' : 'other'
        };
      });

    res.json(pdfs);
  });
});

// GET /view - Zeigt eine PDF-Datei an
app.get('/view', (req, res) => {
  const filePath = req.query.path;
  
  if (!filePath) {
    return res.status(400).send('Dateipfad fehlt');
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Datei nicht gefunden');
  }

  if (!filePath.endsWith('.pdf')) {
    return res.status(400).send('Nur PDF-Dateien sind erlaubt');
  }

  res.sendFile(filePath);
});

// POST /rename - Benennt eine Datei um
app.post('/rename', (req, res) => {
  const { oldPath, newName } = req.body;
  
  if (!oldPath || !newName) {
    return res.status(400).json({ success: false, message: 'Alter Pfad und neuer Name erforderlich' });
  }

  if (!fs.existsSync(oldPath)) {
    return res.status(404).json({ success: false, message: 'Datei nicht gefunden' });
  }

  if (!newName.endsWith('.pdf')) {
    return res.status(400).json({ success: false, message: 'Neuer Name muss mit .pdf enden' });
  }

  const dir = path.dirname(oldPath);
  const newPath = path.join(dir, newName);

  try {
    fs.renameSync(oldPath, newPath);
    res.json({ success: true, newPath });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fehler beim Umbenennen: ' + err.message });
  }
});

// POST /delete - Löscht eine PDF-Datei
app.post('/delete', (req, res) => {
  const { path: filePath } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ success: false, message: 'Dateipfad fehlt' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Datei nicht gefunden' });
  }

  if (!filePath.endsWith('.pdf')) {
    return res.status(400).json({ success: false, message: 'Nur PDF-Dateien können gelöscht werden' });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fehler beim Löschen: ' + err.message });
  }
});

// Server starten
app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));