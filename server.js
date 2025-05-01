const cors = require('cors');

const app = require('./app');
const PORT = process.env.PORT || 8000;

// CORS setup
const corsOptions = {
  origin: 'https://frontend-peminjaman-barang.vercel.app',  // Ganti dengan domain frontend Anda
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Metode yang diperbolehkan
  allowedHeaders: ['Content-Type', 'Authorization'],  // Header yang diizinkan
};

app.use(cors(corsOptions));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di http://0.0.0.0:${PORT}`);
});
