const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const PDFDocument = require('pdfkit');
const { WritableStreamBuffer } = require('stream-buffers');
const ExcelJS = require('exceljs');
const moment = require('moment-timezone');

// 🔹 Admin menambahkan peminjaman
rrouter.post('/tambah', verifyToken, verifyAdmin, async (req, res) => {
  const { id_barang, peminjam } = req.body;

  if (!id_barang || !peminjam) {
    return res.status(400).json({ message: 'id_barang dan peminjam wajib diisi' });
  }

  try {
    const barang = await pool.query('SELECT * FROM items WHERE id = $1', [id_barang]);

    if (barang.rows.length === 0) {
      return res.status(404).json({ message: 'Barang tidak ditemukan' });
    }

    if (barang.rows[0].stok < 1) {
      return res.status(400).json({ message: 'Stok barang habis' });
    }

    const tanggalPinjam = new Date().toISOString(); // UTC format

    const pinjam = await pool.query(
      `INSERT INTO peminjaman (id_barang, peminjam, status, tanggal_pinjam)
       VALUES ($1, $2, 'dipinjam', $3) RETURNING *`,
      [id_barang, peminjam, tanggalPinjam]
    );

    await pool.query('UPDATE items SET stok = stok - 1 WHERE id = $1', [id_barang]);

    res.status(201).json({ message: '✅ Peminjaman berhasil dicatat', data: pinjam.rows[0] });
  } catch (err) {
    console.error('❌ Gagal tambah peminjaman:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// 🔹 Mengembalikan barang
router.put('/kembalikan/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const tanggalKembali = new Date().toISOString(); // gunakan waktu UTC

  try {
    const check = await pool.query('SELECT * FROM peminjaman WHERE id = $1', [id]);

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Data peminjaman tidak ditemukan' });
    }

    const data = check.rows[0];

    if (data.status === 'dikembalikan') {
      return res.status(400).json({ message: 'Barang sudah dikembalikan' });
    }

    const update = await pool.query(
      `UPDATE peminjaman SET status = 'dikembalikan', tanggal_kembali = $1
       WHERE id = $2 RETURNING *`,
      [tanggalKembali, id]
    );

    await pool.query('UPDATE items SET stok = stok + 1 WHERE id = $1', [data.id_barang]);

    res.status(200).json({ message: 'Barang berhasil dikembalikan', data: update.rows[0] });
  } catch (err) {
    console.error('❌ Gagal kembalikan barang:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// 🔹 Riwayat peminjaman (dengan filter)
router.get('/riwayat', verifyToken, verifyAdmin, async (req, res) => {
  const { status, nama } = req.query;

  let query = `
    SELECT p.id, p.peminjam, p.status, p.tanggal_pinjam,
      CASE WHEN p.status = 'dipinjam' THEN NULL ELSE p.tanggal_kembali END AS tanggal_kembali,
      i.nama_barang
    FROM peminjaman p
    JOIN items i ON p.id_barang = i.id
  `;

  const conditions = [];
  const values = [];

  if (status === 'dipinjam' || status === 'dikembalikan') {
    conditions.push(`p.status = $${values.length + 1}`);
    values.push(status);
  }

  if (nama) {
    conditions.push(`p.peminjam ILIKE $${values.length + 1}`);
    values.push(`%${nama}%`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

  query += ' ORDER BY p.tanggal_pinjam DESC';

  try {
    const result = await pool.query(query, values);
    res.status(200).json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Laporan peminjaman 7 hari terakhir (JSON)
router.get('/laporan/mingguan', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, i.nama_barang, p.peminjam, p.tanggal_pinjam, p.status
      FROM peminjaman p
      JOIN items i ON p.id_barang = i.id
      WHERE p.tanggal_pinjam >= NOW() - INTERVAL '7 days'
      ORDER BY p.tanggal_pinjam DESC
    `);

    res.status(200).json({
      message: 'Laporan peminjaman 7 hari terakhir',
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 PDF laporan mingguan
router.get('/laporan/mingguan/pdf', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, i.nama_barang, p.peminjam, p.tanggal_pinjam, p.status
      FROM peminjaman p
      JOIN items i ON p.id_barang = i.id
      WHERE p.tanggal_pinjam >= NOW() - INTERVAL '7 days'
      ORDER BY p.tanggal_pinjam DESC
    `);

    const doc = new PDFDocument({ margin: 30 });
    const buffer = new WritableStreamBuffer();

    doc.pipe(buffer);

    doc.fontSize(18).text('Laporan Peminjaman Mingguan', { align: 'center' }).moveDown();

    result.rows.forEach((row, index) => {
      doc.fontSize(12).text(
        `${index + 1}. ${row.nama_barang} | ${row.peminjam} | ${moment(row.tanggal_pinjam).format('DD-MM-YYYY')} | ${row.status}`
      ).moveDown(0.5);
    });

    doc.end();

    buffer.on('finish', () => {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=laporan-mingguan-${moment().format('YYYYMMDD')}.pdf`
      });
      res.send(buffer.getContents());
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Excel laporan mingguan
router.get('/laporan/mingguan/excel', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, i.nama_barang, p.peminjam, p.tanggal_pinjam, p.status
      FROM peminjaman p
      JOIN items i ON p.id_barang = i.id
      WHERE p.tanggal_pinjam >= NOW() - INTERVAL '7 days'
      ORDER BY p.tanggal_pinjam DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Mingguan');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Nama Barang', key: 'nama_barang', width: 25 },
      { header: 'Peminjam', key: 'peminjam', width: 25 },
      { header: 'Tanggal Pinjam', key: 'tanggal_pinjam', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    result.rows.forEach((row, index) => {
      worksheet.addRow({
        no: index + 1,
        nama_barang: row.nama_barang,
        peminjam: row.peminjam,
        tanggal_pinjam: moment(row.tanggal_pinjam).format('DD-MM-YYYY'),
        status: row.status
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-mingguan-${moment().format('YYYYMMDD')}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Barang yang sedang dipinjam (opsional: filter nama & limit)
router.get('/barang-dipinjam', verifyToken, verifyAdmin, async (req, res) => {
  const { nama, limit } = req.query;

  let query = `
    SELECT p.id, p.peminjam, p.tanggal_pinjam, i.nama_barang, i.kategori
    FROM peminjaman p
    JOIN items i ON p.id_barang = i.id
    WHERE p.status = 'dipinjam'
  `;

  const values = [];

  if (nama) {
    values.push(`%${nama}%`);
    query += ` AND p.peminjam ILIKE $${values.length}`;
  }

  query += ' ORDER BY p.tanggal_pinjam DESC';

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
