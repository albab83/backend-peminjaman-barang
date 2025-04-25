const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak, token tidak ditemukan' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Simpan data user (id, role, dll) ke req
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token tidak valid atau kadaluarsa' });
  }
};

// Cek apakah user adalah admin
function verifyAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ message: 'Hanya admin yang boleh akses fitur ini' });
    }
  }
  
  module.exports = { verifyToken, verifyAdmin };
