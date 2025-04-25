const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

// Register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  try {
    // Query untuk menambahkan user baru dengan role 'admin' default
    const user = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, hashed, 'admin'] // Default role admin
    );

    res.status(201).json({
      message: 'Registrasi berhasil',
      user: user.rows[0]
    });
  } catch (err) {
    // Menangani error jika email sudah terdaftar
    if (err.code === '23505') {
      res.status(400).json({ message: 'Email sudah terdaftar' });
    } else {
      res.status(500).json({ message: 'Terjadi kesalahan server', error: err.message });
    }
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) return res.status(401).json({ error: 'Email tidak ditemukan' });

    const match = await bcrypt.compare(password, user.rows[0].password);
    if (!match) return res.status(401).json({ error: 'Password salah' });

    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
