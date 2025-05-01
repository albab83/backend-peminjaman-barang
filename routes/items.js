const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.post('/tambah-barang', verifyToken, verifyAdmin, async (req, res) => {
  const { nama_barang, kategori, stok } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO items (nama_barang, kategori, stok, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [nama_barang, kategori, stok, 'tersedia']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//ubah stok

router.put('/ubah-stok/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const { stok } = req.body;  // Ambil stok yang ingin diubah dari request body

  // Validasi stok apakah merupakan angka dan lebih besar dari 0
  if (isNaN(stok) || stok < 0) {
    return res.status(400).json({ message: 'Stok harus berupa angka positif' });
  }

  try {
    // Cek apakah barang dengan id tersebut ada
    const barang = await pool.query('SELECT * FROM items WHERE id = $1', [id]);

    if (barang.rows.length === 0) {
      return res.status(404).json({ message: 'Barang tidak ditemukan' });
    }

    // Update stok barang
    const update = await pool.query(
      'UPDATE items SET stok = $1 WHERE id = $2 RETURNING *',
      [stok, id]
    );

    res.status(200).json({
      message: 'Stok barang berhasil diperbarui',
      data: update.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//hapus items

router.delete('/hapus/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Barang tidak ditemukan' });
    }
    res.json({ message: 'Barang berhasil dihapus', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Misalnya di routes/items.js
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY id DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
