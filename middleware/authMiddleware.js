const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Akses ditolak, token tidak ditemukan atau format salah' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded; // Misalnya: { id: ..., role: ... }
    next();
  } catch (err) {
    console.error('❌ JWT Error:', err.message);
    return res.status(403).json({ message: 'Token tidak valid atau sudah kadaluarsa' });
  }
};

// Middleware untuk memeriksa role admin
const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Hanya admin yang boleh akses fitur ini' });
  }
  next();
};

module.exports = { verifyToken, verifyAdmin };
