const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Endpoint: GET /api/dashboard/ringkasan
router.get('/ringkasan', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [totalBarangRes, totalDipinjamRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM items WHERE is_deleted = false'),
      pool.query(`SELECT COUNT(*) FROM peminjaman WHERE status = 'dipinjam'`)
    ]);

    const total_barang = parseInt(totalBarangRes.rows[0].count, 10);
    const total_dipinjam = parseInt(totalDipinjamRes.rows[0].count, 10);

    res.status(200).json({
      message: 'Ringkasan data berhasil diambil',
      total_barang,
      total_dipinjam
    });
  } catch (err) {
    console.error('❌ Error saat mengambil ringkasan:', err.message);
    res.status(500).json({ message: 'Gagal mengambil data ringkasan', error: err.message });
  }
});


module.exports = router;
