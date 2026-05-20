const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configure multer to store files in memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit
});

// Serve static assets with no-cache headers to prevent CDN caching issues
app.use(express.static(__dirname, {
    setHeaders: (res, path) => {
        if (path.endsWith('.html') || path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// PostgreSQL Connection Pool
let pool = null;
if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    // Initialize database tables
    const initDb = async () => {
        try {
            // QR History table
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
            
            // Uploaded Files table (persistent storage)
            await pool.query(`
                CREATE TABLE IF NOT EXISTS uploaded_files (
                    id SERIAL PRIMARY KEY,
                    filename TEXT UNIQUE NOT NULL,
                    mime_type TEXT NOT NULL,
                    file_data BYTEA NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('Database tables initialized successfully.');
        } catch (err) {
            console.error('Error initializing database:', err);
        }
    };
    initDb();
} else {
    console.warn('DATABASE_URL environment variable is missing. Database functionality will not be active.');
}

// Serve uploaded files directly from PostgreSQL (ensures durability on Render)
app.get('/uploads/:filename', async (req, res) => {
    if (!pool) {
        return res.status(404).send('Database not connected');
    }
    try {
        const result = await pool.query(
            'SELECT mime_type, file_data FROM uploaded_files WHERE filename = $1',
            [req.params.filename]
        );
        if (result.rows.length === 0) {
            return res.status(404).send('Fayl topilmadi / File not found');
        }
        const { mime_type, file_data } = result.rows[0];
        res.setHeader('Content-Type', mime_type);
        res.send(file_data);
    } catch (err) {
        console.error('Error retrieving file from DB:', err);
        res.status(500).send('Faylni yuklashda xatolik yuz berdi');
    }
});

// Persistent upload API endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!pool) {
        return res.status(500).json({ error: 'Database connection missing. Cannot save file.' });
    }
    try {
        const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(req.file.originalname);
        
        await pool.query(
            'INSERT INTO uploaded_files (filename, mime_type, file_data) VALUES ($1, $2, $3)',
            [filename, req.file.mimetype, req.file.buffer]
        );
        
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/uploads/${filename}`;
        
        res.json({ status: 'success', data: { url: fileUrl } });
    } catch (err) {
        console.error('Error saving file upload to DB:', err);
        res.status(500).json({ error: 'Faylni bazaga saqlashda xatolik' });
    }
});

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

// Delete from history (with linked file deletion)
app.delete('/api/qr/:id', async (req, res) => {
    const { id } = req.params;
    if (!pool) {
        return res.json({ success: true, message: 'Deleted locally (no database connected)' });
    }
    try {
        // Find if this QR contains a local uploaded file reference
        const qrResult = await pool.query('SELECT qr_text FROM qr_history WHERE id = $1', [id]);
        if (qrResult.rows.length > 0) {
            const qr_text = qrResult.rows[0].qr_text;
            if (qr_text.includes('/uploads/')) {
                const filename = qr_text.substring(qr_text.lastIndexOf('/') + 1);
                // Delete the associated file from database
                await pool.query('DELETE FROM uploaded_files WHERE filename = $1', [filename]);
                console.log('Associated file deleted from database:', filename);
            }
        }

        await pool.query('DELETE FROM qr_history WHERE id = $1', [id]);
        res.json({ success: true, message: 'QR code and file deleted successfully' });
    } catch (err) {
        console.error('Error deleting QR code and file:', err);
        res.status(500).json({ error: 'Failed to delete QR code' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
