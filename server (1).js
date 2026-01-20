
// server.js — erweitert: sicheres Login mit Hashing (automatisch, Backups, keine Löschung)
// Starten mit: node server.js
// Hinweis: Dieses Script erweitert dein bestehendes server.js Verhalten.
// - Beim Start: erstellt ein Backup von config.json, wandelt Klartext-Passwörter zu bcrypt-Hashes um (password -> passwordHash)
// - Die Datei config.json wird mit restriktiven Rechten (0o600) zurückgeschrieben.
// - Login vergleicht eingegebenes Passwort mit passwordHash (bcrypt.compare).
// - Es werden keine originalen Dateien gelöscht; Backups bleiben erhalten.

const express = require('express');
const session = require('express-session');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_PATH = path.join(__dirname, 'config.json');
const BCRYPT_COST = 12;

// Middlewares that are safe to apply immediately
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// We'll configure session middleware after loading config (so we can use session secret from config if provided)

// Helper: create timestamped backup of config.json
async function backupConfigIfExists(configPath) {
  if (!fs.existsSync(configPath)) return null;
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const bakName = `${configPath}.bak.${now}`;
  await fsPromises.copyFile(configPath, bakName);
  try { await fsPromises.chmod(bakName, 0o600); } catch (e) { /* ignore */ }
  console.log(`Backup erstellt: ${bakName}`);
  return bakName;
}

// Helper: read json safely
async function readJson(filePath) {
  const raw = await fsPromises.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

// Helper: write json safely with restrictive perms
async function writeJsonSecure(filePath, obj) {
  const s = JSON.stringify(obj, null, 2);
  await fsPromises.writeFile(filePath, s, { mode: 0o600 });
  try { await fsPromises.chmod(filePath, 0o600); } catch (e) { /* ignore */ }
}

// Ensure passwords hashed in config.users; if any plaintext found, backup file and rewrite with hashes
async function ensureHashesInConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`config.json nicht gefunden unter ${configPath}`);
  }
  const cfg = await readJson(configPath);
  if (!Array.isArray(cfg.users)) {
    cfg.users = [];
  }

  // detect any plaintext password fields
  const usersWithPlain = cfg.users.filter(u => u.password && !u.passwordHash);
  if (usersWithPlain.length === 0) {
    console.log('Keine Klartext-Passwörter gefunden in config.json.');
    return cfg;
  }

  // create backup first
  await backupConfigIfExists(configPath);

  // hash each plaintext password and remove `password` field
  for (const u of usersWithPlain) {
    try {
      const plain = String(u.password);
      const hash = await bcrypt.hash(plain, BCRYPT_COST);
      u.passwordHash = hash;
      delete u.password; // remove plaintext from saved config
      console.log(`Gehashed: ${u.username}`);
    } catch (err) {
      console.error('Fehler beim Hashen von', u.username, err);
      // continue with other users
    }
  }

  // write updated config back to disk
  await writeJsonSecure(configPath, cfg);
  console.log('config.json mit Passwort-Hashes aktualisiert (perms 600).');
  return cfg;
}

// Utility: simple HTML escape
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// The functions for TTL/RDFS handling (kept from original implementation)
function splitDocsByPrefixEx(ttl) {
  const prefixRe = /^\\s*@prefix\\s+ex:/gm;
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

function extractEntriesFromDoc(doc) {
  const blocks = [];
  const prefixRegex = /@prefix ex:/g;
  let prefixMatches = [...doc.matchAll(prefixRegex)];

  if (prefixMatches.length === 0) {
    return [{ id: 'default', name: 'default', block: doc, displayName: 'default' }];
  }

  for (let i = 0; i < prefixMatches.length; i++) {
    const start = prefixMatches[i].index;
    const end = (i + 1 < prefixMatches.length) ? prefixMatches[i + 1].index : doc.length;
    const block = doc.slice(start, end).trim();

    const idMatch = block.match(/ex:([A-Za-z0-9_\\-]+)/);
    const id = idMatch ? idMatch[1] : `block_${i}`;

    const mNach = block.match(/ex:nachname\\s+"([^"]+)"/);
    const mMod = block.match(/ex:modulname\\s+"([^"]+)"/);

    let displayName;
    if (mNach) displayName = `${id} ${mNach[1]}`;
    else if (mMod) displayName = `${id} ${mMod[1]}`;
    else displayName = id;

    blocks.push({ id, name: displayName, block, displayName });
  }
  return blocks;
}

// Main init: ensure config hashed, then register routes that depend on config/session
async function init() {
  try {
    // Ensure config has passwordHash fields and is updated if necessary
    const cfg = await ensureHashesInConfig(CONFIG_PATH);

    // Load the (possibly updated) config synchronously for the rest of the app
    let config = {};
    try {
      config = require(CONFIG_PATH);
    } catch (err) {
      console.error('Fehler beim Laden der config.json nach Hashing:', err);
      process.exit(1);
    }

    // session setup (uses sessionSecret from config if provided)
    app.use(session({
      secret: config.sessionSecret || 'geheimes_session_secret_ändern_in_produktion',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 Stunden; set secure:true in production with HTTPS
    }));

    // Now we can access users from config
    const users = config.users || [];

    // Middleware: requireAuth (keeps original behavior)
    function requireAuth(req, res, next) {
      if (!req.session.user) {
        if (req.accepts('html')) {
          return res.redirect('/login.html');
        } else {
          return res.status(401).json({ error: 'Nicht autorisiert' });
        }
      }
      next();
    }

    // GET / - Root-Route zur Login-Umleitung
    app.get('/', (req, res) => {
      res.redirect('/login.html');
    });

    // GET /list - Gibt die Liste der PDFs aus dem Downloads-Ordner zurück
    app.get('/list', requireAuth, (req, res) => {
      const downloadsPath = path.join(require('os').homedir(), 'Downloads');
      
      fs.readdir(downloadsPath, (err, files) => {
        if (err) return res.status(500).send('Fehler beim Lesen der Dateien');

        const pdfs = files
          .filter(name => name.endsWith('.pdf'))
          .map(name => {
            const stat = fs.statSync(path.join(downloadsPath, name));
            const dozentenMatch = name.match(/Dozentenblatt_(.+)_(Wintersemester|Sommersemester)\\d{4}/i);
            const zuarbeitMatch = name.match(/Zuarbeitsblatt_(.+)_(Wintersemester|Sommersemester)\\d{4}/i);
            
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

    // POST /rename - Benennt eine Datei um
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

    // POST /delete - Löscht eine PDF-Datei
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

    // Login-Route (angepasst: nutzt bcrypt.compare gegen passwordHash)
    app.post('/login', async (req, res) => {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.redirect('/login.html?error=1');
      }
      const user = users.find(u => u.username === username);
      if (!user) {
        // leichte Verzögerung gegen Enumeration
        await new Promise(r => setTimeout(r, 200));
        return res.redirect('/login.html?error=1');
      }

      // If config still had plaintext password (shouldn't after init), handle gracefully:
      if (user.password && !user.passwordHash) {
        if (user.password === password) {
          // authenticate but warn in logs (should be rare, as we hashed on startup)
          console.warn('Authentifiziert gegen Klartext-Passwort (config nicht geupdated).');
          req.session.user = user;
          return res.redirect('/formulare.html');
        } else {
          return res.redirect('/login.html?error=1');
        }
      }

      if (!user.passwordHash) {
        // no credential available
        await new Promise(r => setTimeout(r, 200));
        return res.redirect('/login.html?error=1');
      }

      try {
        const ok = await bcrypt.compare(String(password), String(user.passwordHash));
        if (ok) {
          req.session.user = { username: user.username, role: user.role || null };
          return res.redirect('/formulare.html');
        } else {
          return res.redirect('/login.html?error=1');
        }
      } catch (err) {
        console.error('Login-Fehler beim Vergleichen der Hashes:', err);
        return res.redirect('/login.html?error=1');
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

    // Auth-Check Route
    app.get('/check-auth', (req, res) => {
      if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
      } else {
        res.json({ authenticated: false });
      }
    });

    // Geschützte Routen
    app.get('/formulare.html', requireAuth, (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'formulare.html'));
    });

    app.get('/pdf-manager.html', requireAuth, (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'pdf-manager.html'));
    });

    // rdfs endpoints (kept from original)
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

    app.get('/rdfs/get', requireAuth, (req, res) => {
      const { file, id } = req.query;
      if (!file || !id) return res.status(400).send('file und id erforderlich');

      const safeFile = path.basename(file.split('::')[0]);
      const docIndexPart = (file.includes('::')) ? Number(file.split('::')[1]) : null;
      const fullPath = path.join(DATA_DIR, safeFile);
      if (!fs.existsSync(fullPath)) return res.status(404).send('Datei nicht gefunden');

      try {
        const ttl = fs.readFileSync(fullPath, 'utf8');

        const prefixRe = /^\\s*@prefix\\s+ex:/gm;
        const prefixPositions = [];
        let pm;
        while ((pm = prefixRe.exec(ttl)) !== null) prefixPositions.push(pm.index);

        if (docIndexPart !== null && Number.isInteger(docIndexPart)) {
          if (prefixPositions.length === 0) {
            return res.type('text/plain').send(ttl.trim() + '\\n');
          }
          if (docIndexPart < 0 || docIndexPart >= prefixPositions.length) {
            return res.status(404).send('Dokumentindex nicht vorhanden');
          }
          const start = prefixPositions[docIndexPart];
          const end = (docIndexPart + 1 < prefixPositions.length) ? prefixPositions[docIndexPart + 1] : ttl.length;
          const docText = ttl.slice(start, end).trim();
          return res.type('text/plain').send(docText + '\\n');
        }

        const idRe = new RegExp('(^|\\\\n)ex:' + id + '(?=\\\\s|\\\\.|;|\\\\[|$)', 'm');
        const im = idRe.exec(ttl);
        if (!im) return res.status(404).send('ID nicht gefunden');

        const idPos = im.index + (im[1] ? im[1].length : 0);

        let docStart = null;
        for (let i = prefixPositions.length - 1; i >= 0; i--) {
          if (prefixPositions[i] <= idPos) { docStart = prefixPositions[i]; break; }
        }
        if (docStart === null) return res.type('text/plain').send(ttl.trim() + '\\n');

        let docEnd = ttl.length;
        for (let i = 0; i < prefixPositions.length; i++) {
          if (prefixPositions[i] > docStart) { docEnd = prefixPositions[i]; break; }
        }

        const docText = ttl.slice(docStart, docEnd).trim();
        return res.type('text/plain').send(docText + '\\n');
      } catch (err) {
        console.error('rdfs/get error:', err);
        return res.status(500).send('Serverfehler beim Lesen der TTL-Datei');
      }
    });

    // start server
    app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));
  } catch (err) {
    console.error('Initialisierungsfehler:', err);
    process.exit(1);
  }
}

init();
