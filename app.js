const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
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


