#!/usr/bin/env node
// Korrigierte server.js — Admin-Login + Session-Schutz für Dozenten-RDF
const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_in_prod',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

// serve frontend static
app.use(express.static(path.join(__dirname, 'public')));

// Simple admin credentials (development).
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'adminpass';

// --- auth endpoints ---
app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false, message: 'Missing username/password'});

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
    res.json({ success: true });
  });
});

// helper
function ensureAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).send('Unauthorized');
}

// utility to split TTL file into docs by '@prefix ex:' occurrences
function findPrefixPositions(ttl) {
  const re = /^\s*@prefix\s+ex:/gm;
  const positions = [];
  let m;
  while ((m = re.exec(ttl)) !== null) positions.push(m.index);
  return positions;
}

// list available RDF entries
app.get('/rdfs/list', (req, res) => {
  const type = (req.query.type || 'all').toLowerCase();
  const isAdmin = !!(req.session && req.session.isAdmin);
  const fileMap = {
    dozent: 'dozentenblatt.ttl',
    zuarbeit: 'zuarbeitsblatt.ttl'
  };

  const filesToRead = (type === 'all') ? Object.values(fileMap) : (fileMap[type] ? [fileMap[type]] : []);
  const results = [];

  if (type === 'dozent' && !isAdmin) return res.status(401).send('Unauthorized');

  filesToRead.forEach(filename => {
    if (!isAdmin && filename.toLowerCase().includes('dozenten')) return; // hide dozenten when not admin (for 'all')
    const full = path.join(DATA_DIR, filename);
    if (!fs.existsSync(full)) return;
    try {
      const ttl = fs.readFileSync(full, 'utf8');
      const prefixPositions = findPrefixPositions(ttl);
      if (prefixPositions.length === 0) {
        results.push({ id: null, name: filename, file: filename, type: filename.toLowerCase().includes('dozenten') ? 'dozent' : 'zuarbeit' });
      } else {
        prefixPositions.forEach((pos, idx) => {
          const sliceStart = pos;
          const nextPos = (idx + 1 < prefixPositions.length) ? prefixPositions[idx+1] : ttl.length;
          const docText = ttl.slice(sliceStart, nextPos);
          const idMatch = docText.match(/\n\s*ex:([A-Za-z0-9_\-]+)/);
          // korrigierte Regex: suchen nach ex:... und dann einem Literal in Anführungszeichen
          const nameMatch = docText.match(/ex:.*?\n\s*\S+\s+"([^"]+)"/);
          const id = idMatch ? idMatch[1] : null;
          const name = nameMatch ? nameMatch[1] : (filename + '#' + idx);
          results.push({ id, name, file: filename + '::' + idx, type: filename.toLowerCase().includes('dozenten') ? 'dozent' : 'zuarbeit' });
        });
      }
    } catch (err) {
      console.error('Error reading', full, err.message);
    }
  });

  res.json(results);
});

// fetch a document by file::docIndex or by id (ex:ID)
app.get('/rdfs/get', (req, res) => {
  const fileParam = req.query.file || null;
  const id = req.query.id || null;

  try {
    if (fileParam) {
      const parts = fileParam.split('::');
      const baseFile = parts[0];
      const docIndexPart = parts.length > 1 ? parts[1] : undefined;
      const safeFile = path.basename(baseFile);
      const fullPath = path.join(DATA_DIR, safeFile);
      if (!fs.existsSync(fullPath)) return res.status(404).send('File not found');

      // block access to dozenten file unless admin
      if (safeFile.toLowerCase() === 'dozentenblatt.ttl' && !(req.session && req.session.isAdmin)) {
        return res.status(401).send('Unauthorized');
      }

      const ttl = fs.readFileSync(fullPath, 'utf8');
      const prefixPositions = findPrefixPositions(ttl);

      if (docIndexPart !== undefined && !isNaN(Number(docIndexPart))) {
        const docIndex = Number(docIndexPart);
        if (prefixPositions.length === 0) {
          return res.type('text/plain').send(ttl.trim() + '\n');
        }
        if (docIndex < 0 || docIndex >= prefixPositions.length) return res.status(404).send('Dokumentindex nicht vorhanden');
        const start = prefixPositions[docIndex];
        const end = (docIndex + 1 < prefixPositions.length) ? prefixPositions[docIndex+1] : ttl.length;
        const docText = ttl.slice(start, end).trim();
        return res.type('text/plain').send(docText + '\n');
      }

      return res.type('text/plain').send(ttl.trim() + '\n');
    }

    if (id) {
      const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.ttl'));
      for (const f of files) {
        const full = path.join(DATA_DIR, f);
        const ttl = fs.readFileSync(full, 'utf8');
        const idRe = new RegExp('(^|\\n)ex:' + id + '(?=\\s|\\.|;|\\[|$)', 'm');
        const im = idRe.exec(ttl);
        if (!im) continue;
        if (f.toLowerCase().includes('dozenten') && !(req.session && req.session.isAdmin)) {
          return res.status(401).send('Unauthorized');
        }
        const idPos = im.index + (im[1] ? im[1].length : 0);
        const prefixPositions = findPrefixPositions(ttl);
        let docStart = null;
        for (let i = prefixPositions.length - 1; i >= 0; i--) {
          if (prefixPositions[i] <= idPos) { docStart = prefixPositions[i]; break; }
        }
        if (docStart === null) {
          return res.type('text/plain').send(ttl.trim() + '\n');
        }
        let docEnd = ttl.length;
        for (let i = 0; i < prefixPositions.length; i++) {
          if (prefixPositions[i] > docStart) { docEnd = prefixPositions[i]; break; }
        }
        const docText = ttl.slice(docStart, docEnd).trim();
        return res.type('text/plain').send(docText + '\n');
      }
      return res.status(404).send('ID nicht gefunden');
    }

    return res.status(400).send('Bitte file oder id angeben');
  } catch (err) {
    console.error('rdfs/get error:', err);
    return res.status(500).send('Serverfehler beim Lesen der TTL-Datei');
  }
});

// health
app.get('/_health', (req, res) => res.json({ ok: true, admin: !!(req.session && req.session.isAdmin) }));

app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));
