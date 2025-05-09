const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken} = require('../middleware/authMiddleware');


// GET /api/user/me
router.get('/me', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error mengambil data user:', err);
    res.status(500).json({ message: 'Gagal mengambil data user' });
  }
});

module.exports = router;
