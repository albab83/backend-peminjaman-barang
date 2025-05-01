const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS setup dengan opsi spesifik
const corsOptions = {
  origin: 'https://frontend-peminjaman-barang.vercel.app',  // Ganti dengan domain frontend Anda
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Metode yang diperbolehkan
  allowedHeaders: ['Content-Type', 'Authorization'],  // Header yang diizinkan
};

// Gunakan CORS untuk semua rute dengan opsi yang ditentukan
app.use(cors(corsOptions));

// Middleware lainnya
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const itemRoutes = require('./routes/items');
app.use('/api/items', itemRoutes);

const pinjamRoutes = require('./routes/peminjaman');
app.use('/api/peminjaman', pinjamRoutes);

const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

module.exports = app;
