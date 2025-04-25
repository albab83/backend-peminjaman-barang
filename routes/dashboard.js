const pool = require('../config/db'); // atau sesuaikan path sesuai tempat file db.js kamu
const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware'); // pastikan path sesuai

// Endpoint untuk mendapatkan ringkasan data
router.get('/ringkasan', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalBarang = await pool.query('SELECT COUNT(*) FROM items');
    const totalDipinjam = await pool.query(`SELECT COUNT(*) FROM peminjaman WHERE status = 'dipinjam'`);

    res.json({
      total_barang: parseInt(totalBarang.rows[0].count),
      total_dipinjam: parseInt(totalDipinjam.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
