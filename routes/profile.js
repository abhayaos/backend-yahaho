/**
 * @fileoverview Secure Profile Router for Express.js Application
 * @description Handles user profile retrieval, updates, avatar uploads, favorites management.
 *              Implements strong security practices (2025–2026 standards):
 *              - Rate limiting with IPv6 safety
 *              - Input validation & sanitization
 *              - Hardened file uploads
 *              - No sensitive data leakage
 *              - Ownership checks
 *              - Secure filename generation
 * @version 2.3.0 (ipv6-rate-limit-fixed)
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const auth = require('../middleware/auth');

// ────────────────────────────────────────────────
// Security & Utility Dependencies
// ────────────────────────────────────────────────
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;           // Required for safe IPv6 handling
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const fileType = require('file-type');
const sanitizeHtml = require('sanitize-html');

// ────────────────────────────────────────────────
// Logging (replace with real logger in production)
// ────────────────────────────────────────────────
const logger = {
  info:  (...args) => console.log('[INFO ]', new Date().toISOString(), ...args),
  warn:  (...args) => console.warn('[WARN ]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[ERROR]', new Date().toISOString(), ...args),
};

// ────────────────────────────────────────────────
// Secure key generator – handles both auth & anonymous IPv6 users
// ────────────────────────────────────────────────
function secureKeyGenerator(req) {
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }

  // For anonymous users → apply subnet masking to prevent IPv6 bypass
  const SUBNET_BITS = 64;   // 64 = most common / safest, 56 = more grouping, 48 = stricter
  return ipKeyGenerator(req.ip, SUBNET_BITS);
}

// ────────────────────────────────────────────────
// Rate Limiters (IPv6-safe, no conflicting options)
// ────────────────────────────────────────────────
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — slow down' },
  keyGenerator: secureKeyGenerator,
});

const sensitiveLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Sensitive action rate limit exceeded' },
  keyGenerator: secureKeyGenerator,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 12,
  message: { success: false, message: 'Upload quota exceeded for this hour' },
  keyGenerator: secureKeyGenerator,
});

const favoritesLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 80,
  message: { success: false, message: 'Favorites action rate limit reached' },
  keyGenerator: secureKeyGenerator,
});

// Apply global limiter
router.use(globalApiLimiter);

// ────────────────────────────────────────────────
// Multer – Hardened file upload setup
// ────────────────────────────────────────────────
const ALLOWED_IMAGE_MIMES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
];

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MiB

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
    try {
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      logger.error('Cannot create upload directory', err);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${req.user.id}-${Date.now()}-${randomBytes}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  if (!allowed.includes(ext)) {
    return cb(new Error('Forbidden file extension'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// ────────────────────────────────────────────────
// Validate image after upload (magic bytes check)
// ────────────────────────────────────────────────
async function validateAndSecureImage(filePath) {
  try {
    const detected = await fileType.fromFile(filePath);
    if (!detected || !ALLOWED_IMAGE_MIMES.includes(detected.mime)) {
      return { valid: false, reason: 'Invalid or dangerous image content' };
    }

    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      return { valid: false, reason: 'File size exceeds limit after detection' };
    }

    return { valid: true, mime: detected.mime };
  } catch (err) {
    logger.error('Image validation failed', err);
    return { valid: false, reason: 'Server validation error' };
  }
}

// ────────────────────────────────────────────────
// Safe profile response (never leak passwords, tokens, etc.)
// ────────────────────────────────────────────────
function safeUserProfile(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    profile: {
      bio: user.bio || '',
      skills: Array.isArray(user.skills) ? user.skills : [],
      location: user.location || '',
      phone: user.phone || '',
      website: user.website || '',
      avatar: user.avatar || '',
      rating: Number(user.rating) || 0,
      earned: Number(user.earned) || 0,
      bids: Number(user.bids) || 0,
      country: user.country || 'Nepal',
      currency: user.currency || 'NPR',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      zipCode: user.zipCode || '',
      responseTime: user.responseTime || 'Within 24 hours',
      completedProjects: Number(user.completedProjects) || 0,
      successRate: user.successRate || '0%',
      portfolio: Array.isArray(user.portfolio) ? user.portfolio : [],
      reviews: Array.isArray(user.reviews) ? user.reviews : [],
      hourlyRate: user.hourlyRate || '',
    },
  };
}

// ────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────

router.get(
  '/',
  auth,
  sensitiveLimiter,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id)
        .select('-password -__v -resetPasswordToken -resetPasswordExpire -favorites -refreshTokens')
        .lean();

      if (!user) {
        return res.status(404).json({ success: false, message: 'Profile not found' });
      }

      res.json({ success: true, user: safeUserProfile(user) });
    } catch (err) {
      logger.error('GET /profile failed', { userId: req.user?.id, error: err.message });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

router.put(
  '/',
  auth,
  sensitiveLimiter,
  [
    body('bio').optional().trim().isLength({ max: 1200 }).customSanitizer(sanitizeHtml),
    body('skills').optional().isArray({ max: 40 }).custom(val => val.every(s => typeof s === 'string' && s.trim().length >= 1 && s.length <= 60)),
    body('location').optional().trim().isLength({ max: 180 }).escape(),
    body('phone').optional().trim().isMobilePhone(['ne-NP', 'any'], { strictMode: false }),
    body('website').optional().trim().isURL({ require_protocol: true, protocols: ['https'] }),
    body('responseTime').optional().trim().isLength({ max: 60 }).escape(),
    body('hourlyRate').optional().trim().isFloat({ min: 0, max: 9999 }).toFloat(),
    body('country').optional().trim().isLength({ min: 2, max: 2 }).isAlpha(),
    body('currency').optional().trim().isLength({ min: 3, max: 3 }).isAlpha(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const allowed = ['bio','skills','location','phone','website','responseTime','hourlyRate','country','currency'];
      const updateData = {};

      allowed.forEach(field => {
        if (req.body[field] !== undefined) updateData[field] = req.body[field];
      });

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields provided' });
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password -__v -favorites');

      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      res.json({ success: true, user: safeUserProfile(user) });
    } catch (err) {
      logger.error('PUT /profile failed', { userId: req.user?.id, error: err.message });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

router.post(
  '/upload',
  auth,
  uploadLimiter,
  upload.single('avatar'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No avatar file provided' });
      }

      const validation = await validateAndSecureImage(req.file.path);
      if (!validation.valid) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ success: false, message: validation.reason });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { avatar: avatarUrl },
        { new: true, runValidators: true }
      ).select('-password -__v');

      if (!user) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      logger.info('Avatar uploaded', { userId: req.user.id, file: req.file.filename });

      res.json({
        success: true,
        message: 'Avatar updated',
        avatar: avatarUrl,
        user: safeUserProfile(user),
      });
    } catch (err) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      logger.error('Avatar upload failed', { userId: req.user?.id, error: err.message });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

router.post(
  '/favorites/:postId',
  auth,
  favoritesLimiter,
  [param('postId').isMongoId()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const postId = req.params.postId;

      const [user, postExists] = await Promise.all([
        User.findById(req.user.id).select('favorites'),
        Post.exists({ _id: postId })
      ]);

      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      if (!postExists) return res.status(404).json({ success: false, message: 'Post does not exist' });

      if (user.favorites.includes(postId)) {
        return res.status(409).json({ success: false, message: 'Already in favorites' });
      }

      user.favorites.push(postId);
      await user.save();

      res.json({ success: true, message: 'Added to favorites', favoritesCount: user.favorites.length });
    } catch (err) {
      logger.error('Add favorite failed', { userId: req.user?.id, error: err.message });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

router.delete(
  '/favorites/:postId',
  auth,
  favoritesLimiter,
  [param('postId').isMongoId()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const postId = req.params.postId;
      const user = await User.findById(req.user.id).select('favorites');

      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const index = user.favorites.indexOf(postId);
      if (index === -1) return res.status(409).json({ success: false, message: 'Not in favorites' });

      user.favorites.splice(index, 1);
      await user.save();

      res.json({ success: true, message: 'Removed from favorites', favoritesCount: user.favorites.length });
    } catch (err) {
      logger.error('Remove favorite failed', { userId: req.user?.id, error: err.message });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

router.get(
  '/favorites',
  auth,
  sensitiveLimiter,
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('page').optional().isInt({ min: 1 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const limit = req.query.limit || 20;
      const page = req.query.page || 1;
      const skip = (page - 1) * limit;

      const user = await User.findById(req.user.id)
        .select('favorites')
        .populate({
          path: 'favorites',
          options: { limit, skip, sort: { createdAt: -1 } },
          select: 'title description content postedBy postedByName createdAt responses views',
          populate: { path: 'postedBy', select: 'name profile.avatar email' }
        });

      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const formatted = user.favorites.map(post => ({
        id: post._id.toString(),
        title: post.title || 'Untitled',
        description: post.description || post.content?.substring(0, 220) || '',
        clientName: post.postedByName || 'Unknown',
        clientAvatar: post.postedBy?.profile?.avatar || '',
        postedAt: post.createdAt,
        responses: post.responses || 0,
        views: post.views || 0,
      }));

      res.json({
        success: true,
        favorites: formatted,
        pagination: { page, limit, total: user.favorites.length }
      });
    } catch (err) {
      logger.error('GET favorites failed', { userId: req.user?.id, error: err.message });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

router.get(
  '/posts',
  auth,
  sensitiveLimiter,
  [
    query('limit').optional().isInt({ min: 5, max: 100 }).toInt(),
    query('page').optional().isInt({ min: 1 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const limit = req.query.limit || 20;
      const page = req.query.page || 1;
      const skip = (page - 1) * limit;

      const posts = await Post.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean();

      const total = await Post.countDocuments({ userId: req.user.id });

      res.json({
        success: true,
        posts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (err) {
      logger.error('GET user posts failed', { userId: req.user?.id, error: err.message });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// Optional health endpoint (remove/protect in production)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;