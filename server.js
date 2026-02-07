/**
 * Yaha Ho Backend - Main Server Entry Point
 * Production-ready security configuration (2025–2026 standards)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');               // better logging
const compression = require('compression');     // gzip
const hpp = require('hpp');                     // HTTP Parameter Pollution protection
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

require('dotenv').config();

const connectDB = require('./config/db');

// Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const feedRoutes = require('./routes/feed');
const postRoutes = require('./routes/post');
const talentRoutes = require('./routes/talent');
const notificationsRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ────────────────────────────────────────────────
// 1. Security Headers (Helmet)
// ────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // adjust if you use external scripts
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://ui-avatars.com'],
        connectSrc: ["'self'", 'https://*.vercel.app'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameAncestors: ["'none'"], // no clickjacking
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,           // 1 year
      includeSubDomains: true,
      preload: true,
    },
    crossOriginEmbedderPolicy: false, // allow if you need images from other domains
  })
);

// ────────────────────────────────────────────────
// 2. Trust proxy (critical behind Vercel, Cloudflare, Railway, etc.)
// ────────────────────────────────────────────────
app.set('trust proxy', 1);   // trust first proxy hop → correct req.ip

// ────────────────────────────────────────────────
// 3. Compression (reduces bandwidth & improves speed)
// ────────────────────────────────────────────────
app.use(compression());

// ────────────────────────────────────────────────
// 4. Global rate limiting (defense in depth)
// ────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,     // 15 minutes
  max: 400,                     // generous for normal usage
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please try again later' },
});

app.use(globalLimiter);

// ────────────────────────────────────────────────
// 5. CORS – strict & controlled
// ────────────────────────────────────────────────
const allowedOrigins = [
  'https://yahaho.vercel.app',
  'https://www.yahaho.com',
  'https://yahaho.com',
  'https://admin-yahaho.vercel.app',
  'http://localhost:5173',      // dev frontend
  'http://localhost:3000',      // dev tools / postman
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'], // if you use pagination headers
  maxAge: 86400, // 24 hours – reduces preflight requests
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// ────────────────────────────────────────────────
// 6. Body parsing + size limits (DoS protection)
// ────────────────────────────────────────────────
app.use(express.json({ limit: '6mb' }));           // reduced from 10mb
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// ────────────────────────────────────────────────
// 7. Security middlewares
// ────────────────────────────────────────────────
app.use(mongoSanitize());     // prevent NoSQL injection
app.use(xss());               // prevent XSS in body/query/params
app.use(hpp());               // prevent HTTP Parameter Pollution

// ────────────────────────────────────────────────
// 8. Logging (better than console.log)
// ────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ────────────────────────────────────────────────
// 9. Static files – uploads folder
// ────────────────────────────────────────────────
app.use('/uploads', express.static('uploads', {
  maxAge: '1d',               // cache static files 1 day
  etag: true,
}));

// ────────────────────────────────────────────────
// 10. Routes
// ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/post', postRoutes);
app.use('/api/talent', talentRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);

// Health check (public)
app.get(['/health', '/'], (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '2.0.0', // change to your actual version
  });
});

// ────────────────────────────────────────────────
// 11. 404 Handler
// ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// ────────────────────────────────────────────────
// 12. Global Error Handler (last middleware)
// ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ────────────────────────────────────────────────
// 13. Database & Server Start
// ────────────────────────────────────────────────
(async () => {
  try {
    await connectDB();
    console.log('MongoDB connected successfully');

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} | Env: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();