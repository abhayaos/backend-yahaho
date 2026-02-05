const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const feedRoutes = require('./routes/feed');
const postRoutes = require('./routes/post');
const talentRoutes = require('./routes/talent');
const notificationsRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// 🔌 Connect Database
// ===============================
connectDB();

// ===============================
// 🌍 Allowed Origins
// ===============================
const allowedOrigins = [
  'https://backend-yahaho.vercel.app',
  'http://localhost:5173',
  'https://yahaho.vercel.app',
  'https://www.yahaho.com',
  'https://yahaho.com',
  'https://admin-yahaho.vercel.app'
];

// ===============================
// 🛡️ CORS (Mobile + Web Safe)
// ===============================
app.use(require("cors")());

// ===============================
// 🧠 Preflight Fix (IMPORTANT)
// ===============================
app.options('*', require("cors")());
 

// ===============================
// 🧩 Middlewares
// ===============================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// ===============================
// 🚏 Routes
// ===============================
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/post', postRoutes);
app.use('/api/talent', talentRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);

// ===============================
// ❤️ Health Check
// ===============================
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 Yaha Ho API Server is running smoothly'
  });
});

// ===============================
// ❌ Global Error Handler
// ===============================
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ===============================
// 🚀 Start Server
// ===============================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 Server running on port ${PORT}`);
});

// Handle port in use error
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is already in use.`);
    console.log(`💡 Try running: npx kill-port ${PORT} or taskkill /f /pid {process_id}`);
  }
});
