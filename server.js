// server.js — komplette Datei
// Starten mit: node server.js
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Benutzerdaten
const users = [
  { username: 'studiendekan', password: 'studiendekan123', role: 'Studiendekan' },
  { username: 'studienamt', password: 'studienamt123', role: 'Studienamt' },
  { username: 'dekan', password: 'dekan123', role: 'Dekan' }
];

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'geheimes_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 Stunden
}));

// Statische Dateien - nur öffentliche Dateien sind direkt zugänglich
app.use(express.static('public', {
  setHeaders: (res, path) => {
    // Nur HTML-Dateien benötigen Authentifizierung
    if (path.endsWith('.html') && !path.includes('login.html')) {
      // Für HTML-Dateien prüfen wir die Authentifizierung in der Route
      return;
    }
  }
}));

// Middleware zur Überprüfung der Authentifizierung
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  next();
};

// Login-Route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    req.session.user = user;
    res.redirect('/formulare.html');
  } else {
    res.redirect('/login.html?error=1');
  }
});

// Logout-Route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Fehler beim Abmelden');
    }
    res.redirect('/login.html?loggedout=1');
  });
});

// Geschützte Routen für HTML-Dateien
app.get('/formulare.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'formulare.html'));
});

app.get('/pdf-manager.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pdf-manager.html'));
});

// Geschützte API-Routen
app.get('/list', requireAuth, (req, res) => {
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

app.get('/view', requireAuth, (req, res) => {
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

app.post('/rename', requireAuth, (req, res) => {
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

app.post('/delete', requireAuth, (req, res) => {
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

/**
 * Split a TTL file string into "documents" that start at lines with "@prefix ... ex:"
 * If no such prefix is found, the whole file is returned as a single document.
 * Returns array of document strings (trimmed).
 */
function splitDocsByPrefixEx(ttl) {
  const prefixRe = /^\s*@prefix\s+ex:/gm;
  const positions = [];
  let m;
  while ((m = prefixRe.exec(ttl)) !== null) positions.push(m.index);
  if (positions.length === 0) return [ttl.trim()];
  const docs = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = (i + 1 < positions.length) ? positions[i + 1] : ttl.length;
    docs.push(ttl.slice(start, end).trim());
  }
  return docs;
}

/**
 * Extract subject blocks (ex:ID ...) from a single TTL document string.
 * If the same ex:ID appears multiple times, their segments are concatenated in file order.
 * Returns array of { id, name, block }.
 * Display name rules (with _ID appended):
 *  - ex:nachname -> Nachname_ID
 *  - ex:modulname -> Modulname_ID
 *  - ex:name -> Name_ID
 *  - else -> ID
 */
function extractEntriesFromDoc(doc) {
  const blocks = [];
  const prefixRegex = /@prefix ex:/g;
  let prefixMatches = [...doc.matchAll(prefixRegex)];

  if (prefixMatches.length === 0) {
    // Fallback: ein Block mit gesamtem Inhalt
    return [{ id: 'default', name: 'default', block: doc, displayName: 'default' }];
  }

  for (let i = 0; i < prefixMatches.length; i++) {
    const start = prefixMatches[i].index;
    const end = (i + 1 < prefixMatches.length) ? prefixMatches[i + 1].index : doc.length;
    const block = doc.slice(start, end).trim();

    // ID bestimmen
    const idMatch = block.match(/ex:([A-Za-z0-9_\-]+)/);
    const id = idMatch ? idMatch[1] : `block_${i}`;

    // Nachname oder Modulname extrahieren
    const mNach = block.match(/ex:nachname\s+"([^"]+)"/);
    const mMod = block.match(/ex:modulname\s+"([^"]+)"/);

    let displayName;
    if (mNach) displayName = `${id} ${mNach[1]}`;
    else if (mMod) displayName = `${id} ${mMod[1]}`;
    else displayName = id;

    blocks.push({ id, name: displayName, block, displayName });
  }
  return blocks;
}

// ---------------- rdfs endpoints ----------------

/**
 * GET /rdfs/list?type=dozent|zuarbeit|all
 * - reads TTL files defined for dozent/zuarbeit
 * - splits into documents by '@prefix ex:'
 * - extracts entries per document
 * - returns items with file set to "<filename>::<docIndex>" so the client can request a specific doc
 */
app.get('/rdfs/list', requireAuth, (req, res) => {
  const type = req.query.type || 'all';
  const map = { dozent: 'dozentenblatt.ttl', zuarbeit: 'zuarbeitsblatt.ttl' };
  const filesToRead = (type === 'all') ? Object.values(map) : (map[type] ? [map[type]] : []);
  const results = [];

  filesToRead.forEach(filename => {
    const full = path.join(DATA_DIR, filename);
    if (!fs.existsSync(full)) return;
    try {
      const ttl = fs.readFileSync(full, 'utf8');
      const docs = splitDocsByPrefixEx(ttl); // array of document strings
      docs.forEach((doc, docIndex) => {
        const entries = extractEntriesFromDoc(doc, filename);
        const typeKey = filename.toLowerCase().includes('dozenten') ? 'dozent' : 'zuarbeit';
        entries.forEach(e => {
          results.push({ id: e.id, name: e.name, file: `${filename}::${docIndex}`, type: typeKey });
        });
      });
    } catch (err) {
      console.error(`Fehler beim Lesen von ${filename}:`, err.message);
    }
  });

  res.json(results);
});

/**
 * GET /rdfs/get?file=<filename>::<docIndex>&id=...
 * Behavior:
 * - if file includes ::docIndex, return that exact document (from @prefix ex: to before next @prefix ex:)
 * - otherwise find the document that contains the requested id and return exactly that document
 * The returned text starts with the @prefix ex: line and contains only the single document.
 */
app.get('/rdfs/get', requireAuth, (req, res) => {
  const { file, id } = req.query;
  if (!file || !id) return res.status(400).send('file und id erforderlich');

  const safeFile = path.basename(file.split('::')[0]);
  const docIndexPart = (file.includes('::')) ? Number(file.split('::')[1]) : null;
  const fullPath = path.join(DATA_DIR, safeFile);
  if (!fs.existsSync(fullPath)) return res.status(404).send('Datei nicht gefunden');

  try {
    const ttl = fs.readFileSync(fullPath, 'utf8');

    // collect positions of lines that start a doc: "@prefix ... ex:"
    const prefixRe = /^\s*@prefix\s+ex:/gm;
    const prefixPositions = [];
    let pm;
    while ((pm = prefixRe.exec(ttl)) !== null) prefixPositions.push(pm.index);

    // if docIndex specified, return that doc
    if (docIndexPart !== null && Number.isInteger(docIndexPart)) {
      if (prefixPositions.length === 0) {
        return res.type('text/plain').send(ttl.trim() + '\n');
      }
      if (docIndexPart < 0 || docIndexPart >= prefixPositions.length) {
        return res.status(404).send('Dokumentindex nicht vorhanden');
      }
      const start = prefixPositions[docIndexPart];
      const end = (docIndexPart + 1 < prefixPositions.length) ? prefixPositions[docIndexPart + 1] : ttl.length;
      const docText = ttl.slice(start, end).trim();
      return res.type('text/plain').send(docText + '\n');
    }

    // otherwise find the position of the requested ex:ID
    const idRe = new RegExp('(^|\\n)ex:' + id + '(?=\\s|\\.|;|\\[|$)', 'm');
    const im = idRe.exec(ttl);
    if (!im) return res.status(404).send('ID nicht gefunden');

    const idPos = im.index + (im[1] ? im[1].length : 0);

    // find previous prefix position <= idPos
    let docStart = null;
    for (let i = prefixPositions.length - 1; i >= 0; i--) {
      if (prefixPositions[i] <= idPos) { docStart = prefixPositions[i]; break; }
    }
    // if no prefix before ID, fallback to entire file
    if (docStart === null) return res.type('text/plain').send(ttl.trim() + '\n');

    // find next prefix after docStart (or file end)
    let docEnd = ttl.length;
    for (let i = 0; i < prefixPositions.length; i++) {
      if (prefixPositions[i] > docStart) { docEnd = prefixPositions[i]; break; }
    }

    const docText = ttl.slice(docStart, docEnd).trim();
    return res.type('text/plain').send(docText + '\n');
  } catch (err) {
    console.error('rdfs/get error:', err);
    return res.status(500).send('Serverfehler beim Lesen der TTL-Datei');
  }
});

// ---------------- start server ----------------
app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));