const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static assets
app.use(express.static(__dirname));

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
