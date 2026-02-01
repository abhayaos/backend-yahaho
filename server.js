const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
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
  'https://yahaho.c om'
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
// 📁 Ensure Uploads Directory Exists
// ===============================
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// ===============================
// 🧩 Middlewares
// ===============================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===============================
// 🖼️ Serve Uploads with Error Handling
// ===============================
app.use('/uploads', express.static('uploads', {
  fallthrough: false // Return 404 for missing files instead of next()
}));

// Handle missing upload files gracefully
app.use('/uploads/*', (req, res) => {
  console.log(`⚠️ Missing file requested: ${req.originalUrl}`);
  // Send a default placeholder image or 404
  res.status(404).json({
    success: false,
    message: 'File not found',
    placeholder: true
  });
});

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
