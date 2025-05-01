const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ Setup CORS dengan konfigurasi aman
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://frontend-peminjaman-barang.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // untuk preflight semua rute

// ✅ Middleware parsing JSON
app.use(express.json());

// ✅ Routing
app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/peminjaman', require('./routes/peminjaman'));
app.use('/api/dashboard', require('./routes/dashboard'));

// ✅ Fallback untuk rute yang tidak ditemukan
app.use((req, res, next) => {
  res.status(404).json({ message: 'Rute tidak ditemukan' });
});

// ✅ Jalankan server jika file ini dijalankan langsung
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
  });
}

module.exports = app;
