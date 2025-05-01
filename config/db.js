const { Pool } = require('pg');
require('dotenv').config();

// Cek apakah DATABASE_URL tersedia
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL tidak ditemukan di file .env');
  process.exit(1); // Hentikan proses jika tidak ada URL
}

// Cek apakah host-nya localhost
const isLocalhost = dbUrl.includes('localhost');

// Buat pool koneksi
const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocalhost ? false : { rejectUnauthorized: false }
});

// Coba koneksi dan set timezone ke Asia/Jakarta
pool.connect()
  .then(async (client) => {
    console.log('✅ Koneksi ke database berhasil!');

    try {
      await client.query(`SET TIME ZONE 'Asia/Jakarta'`);
    } catch (timezoneErr) {
      console.error('⚠️ Gagal set timezone:', timezoneErr.message);
    } finally {
      client.release(); // Penting: kembalikan koneksi ke pool
    }
  })
  .catch((err) => {
    console.error('❌ Gagal konek ke database:', err.message);
  });

module.exports = pool;
