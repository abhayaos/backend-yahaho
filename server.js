const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const feedRoutes = require('./routes/feed');
const postRoutes = require('./routes/post');
const talentRoutes = require('./routes/talent');

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
  'http://localhost:3000',
  'http://localhost:5173',
  'https://yahaho.vercel.app',
  'https://www.yahaho.com',
  'https://yahaho.com'
];

// ===============================
// 🛡️ CORS (Mobile + Web Safe)
// ===============================
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow exact matches from allowedOrigins array
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow all Vercel & Yahaho subdomains
    if (
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.yahaho.com')
    ) {
      return callback(null, true);
    }
    
    // Allow specific development origins
    if (origin && (origin === 'http://localhost:3000' || origin === 'http://localhost:5173' || origin === 'https://yahaho.vercel.app')) {
      return callback(null, true);
    }
    
    // For production, be more restrictive
    if (process.env.NODE_ENV === 'production') {
      // Allow common mobile origins
      const mobileOriginPatterns = [
        'capacitor://',
        'ionic://',
        'http://localhost',
        'https://localhost',
        'http://127.0.0.1',
        'https://127.0.0.1',
        'file://'
      ];
      
      if (mobileOriginPatterns.some(pattern => origin.startsWith(pattern))) {
        return callback(null, true);
      }
      
      // In production, reject unknown origins
      console.warn('⚠️ CORS blocked for:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
    
    // For non-production environments, allow everything
    console.warn('⚠️ CORS allowed for:', origin);
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// ===============================
// 🧠 Preflight Fix (IMPORTANT)
// ===============================
app.options('*', cors());

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
