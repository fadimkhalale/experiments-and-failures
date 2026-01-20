const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const app = express();

// PDF Storage Setup
const PDF_STORAGE = path.join(__dirname, 'pdf-storage');
if (!fs.existsSync(PDF_STORAGE)) {
    fs.mkdirSync(PDF_STORAGE);
}

// Database Setup
const DB_FILE = path.join(__dirname, 'pdf-database.json');
let pdfDatabase = [];

// Load database on startup
try {
    pdfDatabase = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) || [];
} catch (e) {
    console.log('Neue Datenbank wird erstellt');
}

// Function to save database
function saveDatabase() {
    fs.writeFileSync(DB_FILE, JSON.stringify(pdfDatabase, null, 2));
}

// Multer Configuration
const upload = multer({
    dest: 'temp-uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet({
    contentSecurityPolicy: false,
}));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoints
app.post('/api/save-pdf', upload.single('pdf'), (req, res) => {
    try {
        const { type, profName } = req.body;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ error: 'No PDF file received' });
        }

        // Clean professor name for filename
        const cleanName = profName.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_');
        const newFilename = `${type}_${cleanName}_${Date.now()}.pdf`;
        const newPath = path.join(PDF_STORAGE, newFilename);

        // Move from temp to permanent storage
        fs.renameSync(file.path, newPath);

        const newPdf = {
            id: Date.now().toString(),
            name: newFilename,
            originalName: file.originalname,
            type,
            profName,
            semester: 'Wintersemester 2025/26', // Should be dynamic
            date: new Date().toISOString(),
            size: `${(file.size / 1024).toFixed(0)} KB`,
            path: newPath
        };

        // Add to database
        pdfDatabase.push(newPdf);
        saveDatabase();

        res.status(201).json(newPdf);
    } catch (error) {
        console.error('PDF Upload Error:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Error saving PDF: ' + error.message });
    }
});

app.get('/api/get-pdfs', (req, res) => {
    // Filtering options
    const { type, profName, semester } = req.query;
    let filtered = [...pdfDatabase];

    if (type && type !== 'all') {
        filtered = filtered.filter(pdf => pdf.type === type);
    }

    if (profName) {
        const searchTerm = profName.toLowerCase();
        filtered = filtered.filter(pdf => 
            pdf.profName.toLowerCase().includes(searchTerm) ||
            pdf.originalName.toLowerCase().includes(searchTerm)
        );
    }

    if (semester && semester !== 'all') {
        filtered = filtered.filter(pdf => pdf.semester === semester);
    }

    res.json(filtered);
});

app.get('/api/view-pdf/:id', (req, res) => {
    const { id } = req.params;
    const pdf = pdfDatabase.find(p => p.id === id);

    if (!pdf) {
        return res.status(404).json({ error: 'PDF not found' });
    }

    res.sendFile(pdf.path);
});

app.get('/api/download-pdf/:id', (req, res) => {
    const { id } = req.params;
    const pdf = pdfDatabase.find(p => p.id === id);

    if (!pdf) {
        return res.status(404).json({ error: 'PDF not found' });
    }

    res.download(pdf.path, pdf.originalName);
});

app.delete('/api/delete-pdf/:id', (req, res) => {
    const { id } = req.params;
    const index = pdfDatabase.findIndex(p => p.id === id);

    if (index === -1) {
        return res.status(404).json({ error: 'PDF not found' });
    }

    const [deletedPdf] = pdfDatabase.splice(index, 1);
    saveDatabase();
    
    try {
        fs.unlinkSync(deletedPdf.path);
        res.json({ message: 'PDF deleted successfully' });
    } catch (err) {
        console.error('Error deleting file:', err);
        res.status(500).json({ error: 'Error deleting PDF file' });
    }
});

// Cleanup temp files on server start
fs.readdir('temp-uploads/', (err, files) => {
    if (err) return;
    files.forEach(file => {
        fs.unlinkSync(path.join('temp-uploads/', file));
    });
});

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('PDF storage directory:', PDF_STORAGE);
    console.log('Database file:', DB_FILE);
});