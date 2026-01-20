const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// PDF Storage Konfiguration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public/pdfs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// PDF API Endpoints
app.post('/api/save-pdf', upload.single('pdf'), (req, res) => {
  const { type, profName } = req.body;
  const pdfName = req.file.filename;
  
  // PDF-Metadaten speichern (in einer echten App würden wir eine Datenbank verwenden)
  const pdfsPath = path.join(__dirname, 'public/pdfs/pdfs.json');
  let pdfs = [];
  
  if (fs.existsSync(pdfsPath)) {
    pdfs = JSON.parse(fs.readFileSync(pdfsPath));
  }
  
  const newPdf = {
    id: Date.now(),
    name: pdfName,
    type,
    profName,
    semester: getCurrentSemester(),
    date: new Date().toLocaleDateString('de-DE'),
    size: `${Math.round(req.file.size / 1024)} KB`
  };
  
  pdfs.unshift(newPdf);
  fs.writeFileSync(pdfsPath, JSON.stringify(pdfs, null, 2));
  
  res.json({ success: true });
});

app.get('/api/pdfs', (req, res) => {
  const pdfsPath = path.join(__dirname, 'public/pdfs/pdfs.json');
  
  if (fs.existsSync(pdfsPath)) {
    const pdfs = JSON.parse(fs.readFileSync(pdfsPath));
    res.json(pdfs);
  } else {
    res.json([]);
  }
});

app.delete('/api/pdfs/:id', (req, res) => {
  const pdfsPath = path.join(__dirname, 'public/pdfs/pdfs.json');
  
  if (fs.existsSync(pdfsPath)) {
    let pdfs = JSON.parse(fs.readFileSync(pdfsPath));
    pdfs = pdfs.filter(pdf => pdf.id != req.params.id);
    fs.writeFileSync(pdfsPath, JSON.stringify(pdfs, null, 2));
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// Hilfsfunktion für aktuelles Semester
function getCurrentSemester() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  if (month >= 4 && month <= 9) {
    return `Sommersemester ${year}`;
  } else {
    return `Wintersemester ${year}/${year + 1}`;
  }
}

// Favicon ignorieren
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Start Server
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});