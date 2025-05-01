const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// ✅ Tambah barang
router.post('/tambah-barang', verifyToken, verifyAdmin, async (req, res) => {
  const { nama_barang, kategori, stok } = req.body;

  if (!nama_barang || !kategori || isNaN(stok) || stok < 0) {
    return res.status(400).json({ message: 'Input tidak valid. Pastikan semua field terisi dan stok angka >= 0' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO items (nama_barang, kategori, stok, status)
       VALUES ($1, $2, $3, 'tersedia') RETURNING *`,
      [nama_barang, kategori, stok]
    );
    res.status(201).json({ message: 'Barang berhasil ditambahkan', data: result.rows[0] });
  } catch (err) {
    console.error('❌ Gagal tambah barang:', err.message);
    res.status(500).json({ message: 'Terjadi kesalahan saat menambah barang', error: err.message });
  }
});

// ✅ Ubah stok barang
router.put('/ubah-stok/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const { stok } = req.body;

  if (isNaN(stok) || stok < 0) {
    return res.status(400).json({ message: 'Stok harus berupa angka >= 0' });
  }

  try {
    const barang = await pool.query('SELECT * FROM items WHERE id = $1', [id]);

    if (barang.rows.length === 0) {
      return res.status(404).json({ message: 'Barang tidak ditemukan' });
    }

    const update = await pool.query(
      'UPDATE items SET stok = $1 WHERE id = $2 RETURNING *',
      [stok, id]
    );

    res.status(200).json({ message: 'Stok barang berhasil diperbarui', data: update.rows[0] });
  } catch (err) {
    console.error('❌ Gagal ubah stok:', err.message);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengubah stok', error: err.message });
  }
});

// ✅ Hapus barang
router.delete('/hapus/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Barang tidak ditemukan' });
    }

    res.status(200).json({ message: 'Barang berhasil dihapus', data: result.rows[0] });
  } catch (err) {
    console.error('❌ Gagal hapus barang:', err.message);
    res.status(500).json({ message: 'Terjadi kesalahan saat menghapus barang', error: err.message });
  }
});

// ✅ Ambil semua data barang
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY id DESC');
    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error('❌ Gagal ambil data barang:', err.message);
    res.status(500).json({ message: 'Gagal mengambil data barang', error: err.message });
  }
});

module.exports = router;
