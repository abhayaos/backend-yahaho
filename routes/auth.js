/**
 * @fileoverview Authentication Routes
 * @routePrefix /api/auth
 * @security  bcrypt hashing, JWT, secure cookies, rate limiting, input validation
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

require('dotenv').config();

const router = express.Router();

// ────────────────────────────────────────────────
// Rate limiting (protect against brute-force & enumeration)
// ────────────────────────────────────────────────
const { ipKeyGenerator } = rateLimit;

function authKeyGenerator(req) {
  // Prefer user ID if already authenticated
  if (req.user?.id) return `user:${req.user.id}`;
  // Anonymous → safe IPv6 subnet
  const SUBNET_BITS = 64;
  return ipKeyGenerator(req.ip, SUBNET_BITS);
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 8,                     // very strict for login/register
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
  keyGenerator: authKeyGenerator,
});

// Apply to all auth routes
router.use(authLimiter);

// ────────────────────────────────────────────────
// Token generation helper
// ────────────────────────────────────────────────
const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

// Optional: longer-lived refresh token (store in DB or httpOnly cookie)
const signRefreshToken = (user) =>
  jwt.sign(
    { id: user._id.toString() },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

/* ---------------- REGISTER ---------------- */

router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters'),
    body('email')
      .trim()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/\d/).withMessage('Password must contain at least one number')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter'),
    body('phone').optional().trim().isMobilePhone(['any']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, email, password, phone } = req.body;

    try {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use',
        });
      }

      // Create user – password will be hashed by pre-save hook in model
      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? phone.trim() : undefined,
        passwordHash: password,           // ← model hashes it
        role: 'customer',                 // never trust client role
      });

      const accessToken = signAccessToken(user);
      // Optional: const refreshToken = signRefreshToken(user);

      res
        .cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000, // 15 minutes
        })
        // .cookie('refreshToken', refreshToken, { ... }) // if using refresh tokens
        .status(201)
        .json({
          success: true,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/* ---------------- LOGIN ---------------- */

router.post(
  '/login',
  [
    body('email').trim().isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input',
      });
    }

    const { email, password } = req.body;

    try {
      // Select passwordHash explicitly (because select: false in schema)
      const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const accessToken = signAccessToken(user);
      // Optional: const refreshToken = signRefreshToken(user);

      res
        .cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000,
        })
        // .cookie('refreshToken', refreshToken, { ... })
        .json({
          success: true,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/* ---------------- LOGOUT ---------------- */

router.post('/logout', (req, res) => {
  // Clear access token cookie
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  // If using refresh tokens:
  // res.clearCookie('refreshToken', { ... });

  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;