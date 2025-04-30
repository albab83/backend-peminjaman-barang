const { Pool } = require('pg');
require('dotenv').config();

const isLocalhost = process.env.DATABASE_URL.includes('localhost');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalhost ? false : { rejectUnauthorized: false }
});

// Setelah connect, set timezone Asia/Jakarta
pool.connect()
  .then(async (client) => {
    console.log('✅ Koneksi ke database berhasil!');

    client.release(); // Penting! balikin koneksi ke pool
  })
  .catch((err) => {
    console.error('❌ Gagal konek ke database:', err.message);
  });

module.exports = pool;
