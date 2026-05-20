const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Set up local uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100 MB limit
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Serve static assets
app.use(express.static(__dirname));

// Local upload API endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    res.json({ status: 'success', data: { url: fileUrl } });
});

// Background job to clean up files older than 60 minutes
setInterval(() => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err) return console.error('Error scanning uploads folder for cleanup:', err);
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                // 60 minutes = 3,600,000 milliseconds
                if (now - stats.mtimeMs > 3600000) {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error('Error deleting expired file:', filePath, err);
                        else console.log('Deleted expired upload:', file);
                    });
                }
            });
        });
    });
}, 15 * 60 * 1000); // Check every 15 minutes

// PostgreSQL Connection Pool
let pool = null;
if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    // Initialize database table
    const initDb = async () => {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS qr_history (
                    id SERIAL PRIMARY KEY,
                    qr_text TEXT NOT NULL,
                    fg_color VARCHAR(10),
                    bg_color VARCHAR(10),
                    logo VARCHAR(30),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('Database table qr_history initialized successfully.');
        } catch (err) {
            console.error('Error initializing database:', err);
        }
    };
    initDb();
} else {
    console.warn('DATABASE_URL environment variable is missing. Database functionality will not be active.');
}

// Get history
app.get('/api/qr', async (req, res) => {
    if (!pool) {
        return res.json([]);
    }
    try {
        const result = await pool.query('SELECT * FROM qr_history ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ error: 'Failed to fetch QR code history' });
    }
});

// Save to history
app.post('/api/qr', async (req, res) => {
    const { qr_text, fg_color, bg_color, logo } = req.body;
    if (!qr_text) {
        return res.status(400).json({ error: 'qr_text is required' });
    }
    if (!pool) {
        return res.json({ success: true, message: 'Saved locally (no database connected)' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO qr_history (qr_text, fg_color, bg_color, logo) VALUES ($1, $2, $3, $4) RETURNING *',
            [qr_text, fg_color, bg_color, logo]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error saving QR code:', err);
        res.status(500).json({ error: 'Failed to save QR code' });
    }
});

// Delete from history
app.delete('/api/qr/:id', async (req, res) => {
    const { id } = req.params;
    if (!pool) {
        return res.json({ success: true, message: 'Deleted locally (no database connected)' });
    }
    try {
        await pool.query('DELETE FROM qr_history WHERE id = $1', [id]);
        res.json({ success: true, message: 'QR code deleted successfully' });
    } catch (err) {
        console.error('Error deleting QR code:', err);
        res.status(500).json({ error: 'Failed to delete QR code' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
