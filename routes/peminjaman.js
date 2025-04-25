const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const PDFDocument = require('pdfkit');
const { WritableStreamBuffer } = require('stream-buffers');
const ExcelJS = require('exceljs');


// Admin input data peminjaman
router.post('/tambah', verifyToken, verifyAdmin, async (req, res) => {
    const { id_barang, peminjam } = req.body;
  
    try {
      const barang = await pool.query('SELECT * FROM items WHERE id = $1', [id_barang]);
  
      if (barang.rows.length === 0) {
        return res.status(404).json({ message: 'Barang tidak ditemukan' });
      }
  
      if (barang.rows[0].stok < 1) {
        return res.status(400).json({ message: 'Stok barang habis' });
      }
  
      const pinjam = await pool.query(
        `INSERT INTO peminjaman 
          (id_barang, peminjam, status) 
         VALUES ($1, $2, $3) RETURNING *`,
        [id_barang, peminjam, 'dipinjam']
      );
      
      
      
  
      await pool.query('UPDATE items SET stok = stok - 1 WHERE id = $1', [id_barang]);
  
      res.status(201).json({ message: 'Peminjaman berhasil dicatat', data: pinjam.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/kembalikan/:id', verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const now = new Date();

  
    try {
      // Cek dulu data peminjaman-nya
      const check = await pool.query('SELECT * FROM peminjaman WHERE id = $1', [id]);
  
      if (check.rows.length === 0) {
        return res.status(404).json({ message: 'Data peminjaman tidak ditemukan' });
      }
  
      const data = check.rows[0];
  
      if (data.status === 'dikembalikan') {
        return res.status(400).json({ message: 'Barang sudah dikembalikan sebelumnya' });
      }
  
      // Update status + tanggal_kembali
      const update = await pool.query(
        `UPDATE peminjaman 
         SET status = $1, tanggal_kembali = $2 
         WHERE id = $3 RETURNING *`,
        ['dikembalikan', now, id]
      );
  
      // Tambah stok barang kembali
      await pool.query(
        `UPDATE items 
         SET stok = stok + 1 
         WHERE id = $1`,
        [data.id_barang]
      );
  
      res.status(200).json({ message: 'Barang berhasil dikembalikan', data: update.rows[0] });
  
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/riwayat', verifyToken, verifyAdmin, async (req, res) => {
    const { status, nama } = req.query;

    let query = `
      SELECT 
        p.id, 
        p.peminjam,
        p.status,
        p.tanggal_pinjam,
        p.tanggal_kembali,
        i.nama_barang
      FROM peminjaman p
      JOIN items i ON p.id_barang = i.id
    `;
    
    let whereClauses = [];
    let values = [];
  
    if (status === 'dipinjam' || status === 'dikembalikan') {
      values.push(status);
      whereClauses.push(`p.status = $${values.length}`);
    }
  
    if (nama) {
      values.push(`%${nama}%`);
      whereClauses.push(`p.peminjam ILIKE $${values.length}`);
    }
  
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }
  
    query += ' ORDER BY p.tanggal_pinjam DESC';
  
    try {
      const result = await pool.query(query, values);
      res.status(200).json({ data: result.rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  
  });

  router.get('/laporan/mingguan', verifyToken, verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
           p.id, 
           i.nama_barang, 
           p.peminjam, 
           p.tanggal_pinjam, 
           p.status
         FROM peminjaman p
         JOIN items i ON p.id_barang = i.id
         WHERE p.tanggal_pinjam >= NOW() - INTERVAL '7 days'
         ORDER BY p.tanggal_pinjam DESC`
      );
  
      res.status(200).json({
        message: 'Laporan peminjaman 7 hari terakhir',
        data: result.rows
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/laporan/mingguan/pdf', verifyToken, verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          p.id, i.nama_barang, p.peminjam, 
          p.tanggal_pinjam, p.status
        FROM peminjaman p
        JOIN items i ON p.id_barang = i.id
        WHERE p.tanggal_pinjam >= NOW() - INTERVAL '7 days'
        ORDER BY p.tanggal_pinjam DESC
      `);
  
      const doc = new PDFDocument({ margin: 30 });
      const buffer = new WritableStreamBuffer();
  
      doc.pipe(buffer);
  
      doc.fontSize(18).text('Laporan Peminjaman Mingguan', { align: 'center' });
      doc.moveDown();
  
      result.rows.forEach((row, index) => {
        doc.fontSize(12).text(
          `${index + 1}. Barang: ${row.nama_barang} | Peminjam: ${row.peminjam} | Tgl: ${new Date(row.tanggal_pinjam).toLocaleDateString()} | Status: ${row.status}`
        );
        doc.moveDown(0.5);
      });
  
      doc.end();
  
      buffer.on('finish', () => {
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename=laporan-mingguan.pdf',
        });
        res.send(buffer.getContents());
      });
  
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/laporan/mingguan/excel', verifyToken, verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          p.id, i.nama_barang, p.peminjam, 
          p.tanggal_pinjam, p.status
        FROM peminjaman p
        JOIN items i ON p.id_barang = i.id
        WHERE p.tanggal_pinjam >= NOW() - INTERVAL '7 days'
        ORDER BY p.tanggal_pinjam DESC
      `);
  
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan Mingguan');
  
      // Header kolom
      worksheet.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Nama Barang', key: 'nama_barang', width: 25 },
        { header: 'Peminjam', key: 'peminjam', width: 25 },
        { header: 'Tanggal Pinjam', key: 'tanggal_pinjam', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
      ];
  
      // Data baris
      result.rows.forEach((row, index) => {
        worksheet.addRow({
          no: index + 1,
          nama_barang: row.nama_barang,
          peminjam: row.peminjam,
          tanggal_pinjam: new Date(row.tanggal_pinjam).toLocaleDateString(),
          status: row.status
        });
      });
  
      // Kirim sebagai file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=laporan-mingguan.xlsx');
  
      await workbook.xlsx.write(res);
      res.end();
  
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/barang-dipinjam', verifyToken, verifyAdmin, async (req, res) => {
    const { nama, limit } = req.query;
  
    let query = `
      SELECT 
        p.id,
        p.peminjam,
        p.tanggal_pinjam,
        i.nama_barang,
        i.kategori
      FROM peminjaman p
      JOIN items i ON p.id_barang = i.id
      WHERE p.status = 'dipinjam'
    `;
  
    const values = [];
  
    if (nama) {
      values.push(`%${nama}%`);
      query += ` AND p.peminjam ILIKE $${values.length}`;
    }
  
    query += ` ORDER BY p.tanggal_pinjam DESC`;
    
    if (limit) {
      values.push(limit);
      query += ` LIMIT $${values.length}`;
    }
  
    try {
      const result = await pool.query(query, values);
      res.status(200).json({ data: result.rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  
  
  module.exports = router;  
