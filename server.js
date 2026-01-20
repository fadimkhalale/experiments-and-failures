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
// original variable kept (lowercase 'data') — we will also support 'Data' (uppercase) as requested
const DATA_DIR_CANDIDATES = [
  path.join(__dirname, 'Data', 'Zuarbeitsblätter'), // preferred
  path.join(__dirname, 'data', 'Zuarbeitsblätter'),  // fallback
  path.join(__dirname, 'Data', 'Dozentenblätter'), // preferred
  path.join(__dirname, 'data', 'Dozentenblätter'),  // fallback
  path.join(__dirname, 'Data'), // fallback to root Data folder
  path.join(__dirname, 'data')  // fallback to root data folder
];

const CONFIG_PATH = path.join(__dirname, 'config.json');
const BCRYPT_COST = 12;

// Middlewares that are safe to apply immediately
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// We'll configure session middleware after loading config (so we can use session secret from config if provided)

// Helper: choose existing Data dir (returns first that exists or the first candidate if none exist)
function chooseDataDir() {
  for (const d of DATA_DIR_CANDIDATES) {
    if (fs.existsSync(d) && fs.statSync(d).isDirectory()) return d;
  }
  // if none exist, return the preferred path
  return DATA_DIR_CANDIDATES[0];
}
const DATA_DIR = chooseDataDir();
// Spezifische Unterordner-Pfade
const ZUARBEITSBLATT_DIR = path.join(DATA_DIR, 'Zuarbeitsblätter');
const DOZENTENBLATT_DIR = path.join(DATA_DIR, 'Dozentenblätter');

// Erstelle die Unterordner falls sie nicht existieren
async function ensureDirectories() {
  try {
    await fsPromises.mkdir(ZUARBEITSBLATT_DIR, { recursive: true });
    await fsPromises.mkdir(DOZENTENBLATT_DIR, { recursive: true });
    console.log('Unterordner sichergestellt:', ZUARBEITSBLATT_DIR, DOZENTENBLATT_DIR);
  } catch (err) {
    console.error('Fehler beim Erstellen der Unterordner:', err);
  }
}

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

// --- Neue Hilfsfunktionen für JSON-Dateien in DATA_DIR ---

// validate filename is a plain filename ending with .json and no traversal
function isJsonFile(filename) {
  if (typeof filename !== 'string') return false;
  if (!filename.toLowerCase().endsWith('.json')) return false;
  if (filename.includes('..') || path.isAbsolute(filename)) return false;
  return true;
}

// read JSON file from DATA_DIR safely (throws on error)
async function readJsonFileSafe(filename) {
  if (!isJsonFile(filename)) throw new Error('Ungültiger Dateiname');
  const filepath = path.join(DATA_DIR, filename);
  // ensure it still resides in DATA_DIR
  if (!filepath.startsWith(DATA_DIR)) throw new Error('Ungültiger Pfad');
  const raw = await fsPromises.readFile(filepath, 'utf8');
  return JSON.parse(raw);
}

// list all .json files in DATA_DIR and extract an ID for each (tries several keys)
// *** Updated to detect singular 'dozent' and singular 'modul' as well as plural forms ***
async function listJsonFilesWithIds(folderType = 'all') {
  const foldersToScan = [];
  
  if (folderType === 'all' || folderType === 'zuarbeit') {
    if (fs.existsSync(ZUARBEITSBLATT_DIR)) {
      foldersToScan.push({ path: ZUARBEITSBLATT_DIR, type: 'zuarbeit' });
    }
  }
  
  if (folderType === 'all' || folderType === 'dozent') {
    if (fs.existsSync(DOZENTENBLATT_DIR)) {
      foldersToScan.push({ path: DOZENTENBLATT_DIR, type: 'dozent' });
    }
  }
  
  // Falls keine spezifischen Ordner existieren, scanne das Hauptverzeichnis
  if (foldersToScan.length === 0 && fs.existsSync(DATA_DIR)) {
    foldersToScan.push({ path: DATA_DIR, type: 'all' });
  }

  const results = [];
  
  for (const folder of foldersToScan) {
    if (!fs.existsSync(folder.path)) continue;
    
    const files = await fsPromises.readdir(folder.path);
    const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));
    
    for (const f of jsonFiles) {
      try {
        const fullPath = path.join(folder.path, f);
        const contentRaw = await fsPromises.readFile(fullPath, 'utf8');
        const content = JSON.parse(contentRaw);
        let id = null;
        
        // check common places for ID (top-level ID/id)
        if (content && (content.ID || content.id)) id = content.ID || content.id;
        // check singular 'dozent'
        else if (content && content.dozent && (content.dozent.ID || content.dozent.id)) id = content.dozent.ID || content.dozent.id;
        // check plural 'dozenten' array first entry
        else if (content && content.dozenten && Array.isArray(content.dozenten) && content.dozenten.length > 0 && (content.dozenten[0].ID || content.dozenten[0].id)) {
          id = content.dozenten[0].ID || content.dozenten[0].id;
        }
        // check singular 'modul'
        else if (content && content.modul && (content.modul.ID || content.modul.id)) id = content.modul.ID || content.modul.id;
        // check plural 'module' array first entry
        else if (content && content.module && Array.isArray(content.module) && content.module.length > 0 && (content.module[0].ID || content.module[0].id || content.module[0].modulnr)) {
          id = content.module[0].ID || content.module[0].id || content.module[0].modulnr;
        }
        // fallback: filename without extension
        if (!id) id = path.basename(f, '.json');
        
        // Relativer Pfad für API-Zugriffe
        let relativePath = f;
        if (folder.type !== 'all') {
          relativePath = path.join(folder.type === 'zuarbeit' ? 'Zuarbeitsblätter' : 'Dozentenblätter', f);
        }
        
        results.push({ 
          id: String(id), 
          filename: relativePath,
          fullPath: fullPath,
          type: folder.type
        });
      } catch (err) {
        // skip broken JSON but still include filename fallback id
        let relativePath = f;
        if (folder.type !== 'all') {
          relativePath = path.join(folder.type === 'zuarbeit' ? 'Zuarbeitsblätter' : 'Dozentenblätter', f);
        }
        
        results.push({ 
          id: path.basename(f, '.json'), 
          filename: relativePath,
          fullPath: path.join(folder.path, f),
          type: folder.type,
          _error: 'invalid json' 
        });
      }
    }
  }
  
  // sort by id for nicer UX
  results.sort((a,b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  return results;
}


// Ändere readJsonFileSafe um mit relativen Pfaden zu arbeiten
async function readJsonFileSafe(filename) {
  if (typeof filename !== 'string') throw new Error('Ungültiger Dateiname');
  if (!filename.toLowerCase().endsWith('.json')) throw new Error('Ungültiger Dateiname');
  if (filename.includes('..') || path.isAbsolute(filename)) throw new Error('Ungültiger Pfad');
  
  // Bestimme den vollständigen Pfad basierend auf dem Unterordner
  let filepath;
  if (filename.includes('Zuarbeitsblätter')) {
    filepath = path.join(DATA_DIR, filename);
  } else if (filename.includes('Dozentenblätter')) {
    filepath = path.join(DATA_DIR, filename);
  } else {
    // Fallback: versuche in beiden Ordnern
    const path1 = path.join(ZUARBEITSBLATT_DIR, filename);
    const path2 = path.join(DOZENTENBLATT_DIR, filename);
    
    if (fs.existsSync(path1)) {
      filepath = path1;
    } else if (fs.existsSync(path2)) {
      filepath = path2;
    } else {
      filepath = path.join(DATA_DIR, filename);
    }
  }
  
  // ensure it still resides in DATA_DIR or subdirectories
  if (!filepath.startsWith(DATA_DIR)) throw new Error('Ungültiger Pfad');
  
  const raw = await fsPromises.readFile(filepath, 'utf8');
  return JSON.parse(raw);
}

// helper: backup data file before modifying
async function backupDataFile(filename) {
  try {
    if (!isJsonFile(filename)) return null;
    const src = path.join(DATA_DIR, filename);
    if (!fs.existsSync(src)) return null;
    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const bak = `${src}.bak.${now}`;
    await fsPromises.copyFile(src, bak);
    try { await fsPromises.chmod(bak, 0o600); } catch (e) { /* ignore */ }
    console.log(`Data backup erstellt: ${bak}`);
    return bak;
  } catch (err) {
    console.error('backupDataFile error', err);
    return null;
  }
}

// --- Main init: ensure config hashed, then register routes that depend on config/session ---
async function init() {
  try {
    await ensureDirectories();
    // Ensure config has passwordHash fields and is updated if necessary
    const cfg = await ensureHashesInConfig(CONFIG_PATH);

    // Load the (possibly updated) config synchronously for the rest of the app
    let config = {};
    try {
      // require caches; that's OK because file has been updated on disk already
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
    // Middleware: Check if user has permission to modify approvals
function checkApprovalPermission(req, res, next) {
  const userRole = req.session.user?.role;
  const allowedRoles = ['Dekan', 'Studienamt', 'Studiendekan'];
  
  if (!userRole || !allowedRoles.includes(userRole)) {
    return res.status(403).json({ error: 'Unzureichende Berechtigung' });
  }
  
  // User can only modify their own role's approval
  const { approvals } = req.body || {};
  if (approvals) {
    // Create a new approvals object with only the user's role
    const filteredApprovals = {};
    filteredApprovals[userRole] = approvals[userRole] === 'ja' ? 'ja' : 'nein';
    
    // Keep existing approvals for other roles (will be preserved on server side)
    req.body.approvals = filteredApprovals;
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

    // JSON endpoints 
    app.get('/json/list', requireAuth, (req, res) => {
      const type = req.query.type || 'all';
      const map = { dozent: 'dozentenblatt.json', zuarbeit: 'zuarbeitsblatt.json' };
      const filesToRead = (type === 'all') ? Object.values(map) : (map[type] ? [map[type]] : []);
      const results = [];

      filesToRead.forEach(filename => {
        const full = path.join(DATA_DIR, filename);
        if (!fs.existsSync(full)) return;
        try {
          const jsonData = JSON.parse(fs.readFileSync(full, 'utf8'));
          
          // Handle different JSON structures: plural and singular forms
          if (filename === 'dozentenblatt.json') {
            if (jsonData.dozenten && Array.isArray(jsonData.dozenten)) {
              jsonData.dozenten.forEach(dozent => {
                results.push({
                  id: dozent.id || dozent.ID || dozent.nachname,
                  name: `${dozent.titel || ''} ${dozent.vorname || ''} ${dozent.nachname || ''}`.trim(),
                  file: filename,
                  type: 'dozent'
                });
              });
            } else if (jsonData.dozent && typeof jsonData.dozent === 'object') {
              const d = jsonData.dozent;
              results.push({
                id: d.id || d.ID || d.nachname,
                name: `${d.titel || ''} ${d.vorname || ''} ${d.nachname || ''}`.trim(),
                file: filename,
                type: 'dozent'
              });
            }
          } else if (filename === 'zuarbeitsblatt.json') {
            if (jsonData.module && Array.isArray(jsonData.module)) {
              jsonData.module.forEach(modul => {
                results.push({
                  id: modul.id || modul.ID || modul.modulnr,
                  name: `${modul.modulnr || ''} ${modul.modulname || ''}`.trim(),
                  file: filename,
                  type: 'zuarbeit'
                });
              });
            } else if (jsonData.modul && typeof jsonData.modul === 'object') {
              const m = jsonData.modul;
              results.push({
                id: m.id || m.ID || m.modulnr,
                name: `${m.modulnr || ''} ${m.modulname || ''}`.trim(),
                file: filename,
                type: 'zuarbeit'
              });
            }
          }
        } catch (err) {
          console.error(`Fehler beim Lesen von ${filename}:`, err.message);
        }
      });

      res.json(results);
    });

    app.get('/json/get', requireAuth, (req, res) => {
      const { file, id } = req.query;
      if (!file || !id) return res.status(400).send('file und id erforderlich');

      const safeFile = path.basename(file);
      const fullPath = path.join(DATA_DIR, safeFile);
      if (!fs.existsSync(fullPath)) return res.status(404).send('Datei nicht gefunden');

      try {
        const jsonData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        
        let result = null;
        if (safeFile === 'dozentenblatt.json') {
          if (jsonData.dozenten && Array.isArray(jsonData.dozenten)) {
            result = jsonData.dozenten.find(d => (d.id === id) || (d.ID === id) || (d.nachname === id));
          } else if (jsonData.dozent && typeof jsonData.dozent === 'object') {
            const d = jsonData.dozent;
            if ((d.id && d.id === id) || (d.ID && d.ID === id) || (d.nachname && d.nachname === id)) result = d;
          }
        } else if (safeFile === 'zuarbeitsblatt.json') {
          if (jsonData.module && Array.isArray(jsonData.module)) {
            result = jsonData.module.find(m => (m.id === id) || (m.ID === id) || (m.modulnr === id));
          } else if (jsonData.modul && typeof jsonData.modul === 'object') {
            const m = jsonData.modul;
            if ((m.id && m.id === id) || (m.ID && m.ID === id) || (m.modulnr && m.modulnr === id)) result = m;
          }
        }

        if (!result) return res.status(404).send('Eintrag nicht gefunden');
        res.json(result);
      } catch (err) {
        console.error('json/get error:', err);
        return res.status(500).send('Serverfehler beim Lesen der JSON-Datei');
      }
    });

    // --- NEUE ENDPOINTS: Liste aller JSON-Dateien im Data-Ordner und Laden per Filename / ID ---
    // GET /api/json-list
   app.get('/api/json-list', requireAuth, async (req, res) => {
  try {
    const type = req.query.type || 'all'; // 'zuarbeit', 'dozent', or 'all'
    const list = await listJsonFilesWithIds(type);
    res.json(list);
  } catch (err) {
    console.error('Error listing JSON files', err);
    res.status(500).json({ error: 'Failed to list JSON files' });
  }
});

    // GET /api/json-file/:filename  (loads raw json by filename)
    app.get('/api/json-file/:filename', requireAuth, async (req, res) => {
      try {
        const filename = req.params.filename;
        if (!isJsonFile(filename)) return res.status(400).json({ error: 'Invalid filename' });

        const filepath = path.join(DATA_DIR, filename);
        if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'File not found' });

        const raw = await fsPromises.readFile(filepath, 'utf8');
        // return raw JSON
        res.type('application/json').send(raw);
      } catch (err) {
        console.error('Error reading json-file', err);
        res.status(500).json({ error: 'Failed to read file' });
      }
    });

    // GET /api/json-by-id/:id  (searches all json files and returns the first that matches the ID)
    app.get('/api/json-by-id/:id', requireAuth, async (req, res) => {
      try {
        const idQuery = String(req.params.id).trim();
        if (!idQuery) return res.status(400).json({ error: 'Missing id' });

        if (!fs.existsSync(DATA_DIR)) return res.status(404).json({ error: 'Data directory not found' });

        const files = await fsPromises.readdir(DATA_DIR);
        const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));

        for (const f of jsonFiles) {
          try {
            const content = await readJsonFileSafe(f);
            // collect candidates for matching (strings)
            const candidates = [];
            if (content && (content.ID || content.id)) candidates.push(String(content.ID || content.id));
            // singular dozent
            if (content && content.dozent && (content.dozent.ID || content.dozent.id)) candidates.push(String(content.dozent.ID || content.dozent.id));
            // plural dozenten array
            if (content && content.dozenten && Array.isArray(content.dozenten)) {
              for (const d of content.dozenten) {
                if (d && (d.ID || d.id || d.nachname)) candidates.push(String(d.ID || d.id || d.nachname));
              }
            }
            // singular modul
            if (content && content.modul && (content.modul.ID || content.modul.id || content.modul.modulnr)) {
              candidates.push(String(content.modul.ID || content.modul.id || content.modul.modulnr));
            }
            // plural module array
            if (content && content.module && Array.isArray(content.module)) {
              for (const m of content.module) {
                if (m && (m.ID || m.id || m.modulnr)) candidates.push(String(m.ID || m.id || m.modulnr));
              }
            }
            // also include top-level id properties inside nested structures
            if (Array.isArray(content)) {
              for (const entry of content) {
                if (entry && (entry.ID || entry.id)) candidates.push(String(entry.ID || entry.id));
              }
            }

            // always include filename (without ext) as candidate
            candidates.push(path.basename(f, '.json'));

            for (const cand of candidates) {
              if (!cand) continue;
              if (cand.toString().trim() === idQuery) {
                // return both filename and parsed data
                return res.json({ filename: f, data: content });
              }
            }
          } catch (err) {
            // skip parse errors
            continue;
          }
        }

        return res.status(404).json({ error: 'No JSON found with given ID' });
      } catch (err) {
        console.error('Error searching json by id', err);
        res.status(500).json({ error: 'Failed to search files' });
      }
    });

    // --- NEUER ENDPOINT: Save approval (Speichert die Checkbox-Auswahl in die JSON-Datei) ---
    // POST /api/save-approval
    // payload: { filename?: string, id?: string, approvals: { Dekan:'ja'|'nein', Studienamt:'ja'|'nein', Studiendekan:'ja'|'nein' } }
   // POST /api/save-approval - mit Berechtigungsprüfung
app.post('/api/save-approval', requireAuth, checkApprovalPermission, async (req, res) => {
  try {
    const { filename, id, approvals } = req.body || {};
    if (!approvals || typeof approvals !== 'object') return res.status(400).json({ error: 'approvals required' });

    // Die approvals wurden bereits durch die Middleware gefiltert
    const clean = approvals;

    // Bestimme Ziel-Datei (existierender Code bleibt gleich)
    let targetFile = null;

    if (filename && isJsonFile(filename)) {
      const safe = path.basename(filename);
      const full = path.join(DATA_DIR, safe);
      if (fs.existsSync(full)) targetFile = safe;
      else return res.status(404).json({ error: 'Datei nicht gefunden' });
    }

    // Wenn filename nicht angegeben, versuche Lookup by id (existierender Code)
    if (!targetFile && id) {
      if (!fs.existsSync(DATA_DIR)) return res.status(404).json({ error: 'Data directory not found' });
      const files = await fsPromises.readdir(DATA_DIR);
      const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));
      for (const f of jsonFiles) {
        try {
          const content = await readJsonFileSafe(f);
          const candidates = [];
          if (content && (content.ID || content.id)) candidates.push(String(content.ID || content.id));
          if (content && content.dozent && (content.dozent.ID || content.dozent.id || content.dozent.nachname)) candidates.push(String(content.dozent.ID || content.dozent.id || content.dozent.nachname));
          if (content && content.dozenten && Array.isArray(content.dozenten)) {
            for (const d of content.dozenten) {
              if (d && (d.ID || d.id || d.nachname)) candidates.push(String(d.ID || d.id || d.nachname));
            }
          }
          if (content && content.modul && (content.modul.ID || content.modul.id || content.modul.modulnr)) candidates.push(String(content.modul.ID || content.modul.id || content.modul.modulnr));
          if (content && content.module && Array.isArray(content.module)) {
            for (const m of content.module) {
              if (m && (m.ID || m.id || m.modulnr)) candidates.push(String(m.ID || m.id || m.modulnr));
            }
          }
          candidates.push(path.basename(f, '.json'));

          for (const cand of candidates) {
            if (!cand) continue;
            if (String(cand).trim() === String(id).trim()) {
              targetFile = f;
              break;
            }
          }
          if (targetFile) break;
        } catch (err) {
          continue;
        }
      }
    }

    if (!targetFile) {
      return res.status(400).json({ error: 'Konnte Zieldatei nicht bestimmen. Bitte filename oder id angeben.' });
    }

    // Backup file before modifying
    await backupDataFile(targetFile);

    // Read content, update approvals
    const content = await readJsonFileSafe(targetFile);

    let written = false;
    const userRole = req.session.user.role;
    
    // If id provided, try to find matching nested entry and set approvals there
    if (id && content) {
      // dozenten array
      if (!written && content.dozenten && Array.isArray(content.dozenten)) {
        for (let d of content.dozenten) {
          if (d && (String(d.ID) === String(id) || String(d.id) === String(id) || String(d.nachname) === String(id))) {
            if (!d.approvals) d.approvals = {};
            d.approvals[userRole] = clean[userRole];
            written = true;
            break;
          }
        }
      }
      // singular dozent
      if (!written && content.dozent && typeof content.dozent === 'object') {
        const d = content.dozent;
        if (d && (String(d.ID) === String(id) || String(d.id) === String(id) || String(d.nachname) === String(id))) {
          if (!content.dozent.approvals) content.dozent.approvals = {};
          content.dozent.approvals[userRole] = clean[userRole];
          written = true;
        }
      }
      // module array
      if (!written && content.module && Array.isArray(content.module)) {
        for (let m of content.module) {
          if (m && (String(m.ID) === String(id) || String(m.id) === String(id) || String(m.modulnr) === String(id))) {
            if (!m.approvals) m.approvals = {};
            m.approvals[userRole] = clean[userRole];
            written = true;
            break;
          }
        }
      }
      // singular modul
      if (!written && content.modul && typeof content.modul === 'object') {
        const m = content.modul;
        if (m && (String(m.ID) === String(id) || String(m.id) === String(id) || String(m.modulnr) === String(id))) {
          if (!content.modul.approvals) content.modul.approvals = {};
          content.modul.approvals[userRole] = clean[userRole];
          written = true;
        }
      }
    }

    // Fallback: write top-level approvals if nothing matched
    if (!written) {
      if (!content.approvals) content.approvals = {};
      content.approvals[userRole] = clean[userRole];
    }

    // Write back to disk
    const fullPath = path.join(DATA_DIR, targetFile);
    await writeJsonSecure(fullPath, content);

    res.json({ success: true, file: targetFile, role: userRole });
  } catch (err) {
    console.error('save-approval error', err);
    res.status(500).json({ error: 'Fehler beim Speichern' });
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
