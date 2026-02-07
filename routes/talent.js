/**
 * @fileoverview Talent Router - Public freelancer discovery endpoints
 * @routePrefix /api/talent
 * @description Secure public API to browse freelancers/talents
 * @version 2.0.0 - secure-public-2026
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { param, query, validationResult } = require('express-validator');
const User = require('../models/User');

// ────────────────────────────────────────────────
// Rate limiting configuration (protect against scraping / abuse)
// ────────────────────────────────────────────────
const { ipKeyGenerator } = rateLimit;

function talentKeyGenerator(req) {
  // If user is authenticated → use user ID
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }
  // Anonymous → safe IPv6 subnet handling
  const SUBNET_BITS = 64; // /64 - most common safe residential subnet size
  return ipKeyGenerator(req.ip, SUBNET_BITS);
}

const talentListLimiter = rateLimit({
  windowMs: 60 * 1000,           // 1 minute
  max: 45,                       // ~45 requests per minute per IP/user
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please try again later' },
  keyGenerator: talentKeyGenerator,
});

const talentSingleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,                      // more generous for single views
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please try again later' },
  keyGenerator: talentKeyGenerator,
});

// Apply rate limiting to all routes in this file
router.use(talentListLimiter);

// ────────────────────────────────────────────────
// Helper: Safe talent response object (no sensitive data)
// ────────────────────────────────────────────────
function safeTalent(userDoc) {
  return {
    id: userDoc._id.toString(),
    name: userDoc.name || 'Unknown',
    role: userDoc.role,
    createdAt: userDoc.createdAt,
    profile: {
      bio: userDoc.bio || '',
      location: userDoc.location || '',
      rating: Number(userDoc.rating) || 0,
      completedProjects: Number(userDoc.completedProjects) || 0,
      successRate: userDoc.successRate || '0%',
      responseTime: userDoc.responseTime || 'Within 24 hours',
      skills: Array.isArray(userDoc.skills) ? userDoc.skills : [],
      portfolio: Array.isArray(userDoc.portfolio) ? userDoc.portfolio : [],
      reviews: Array.isArray(userDoc.reviews) ? userDoc.reviews : [],
      avatar: userDoc.avatar || '',
      website: userDoc.website || '',
      hourlyRate: userDoc.hourlyRate || '',
      // email is intentionally NOT included in public responses
    },
  };
}

// ────────────────────────────────────────────────
// GET /api/talent
// List freelancers with pagination & filtering
// ────────────────────────────────────────────────
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 5, max: 60 }).toInt(),
    query('skills').optional().isString().trim(),
    query('location').optional().isString().trim().escape(),
    query('minRating').optional().isFloat({ min: 0, max: 5 }).toFloat(),
    query('maxHourlyRate').optional().isFloat({ min: 0 }).toFloat(),
    query('sort').optional().isIn(['rating', '-rating', 'projects', '-projects']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: errors.array(),
      });
    }

    try {
      const page = Math.max(1, req.query.page || 1);
      const limit = Math.min(60, Math.max(5, req.query.limit || 20));
      const skip = (page - 1) * limit;

      // Build safe MongoDB filter
      const filter = { role: 'freelancer' };

      // Skills filter (any match)
      if (req.query.skills) {
        const skillsList = req.query.skills
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        if (skillsList.length > 0) {
          filter.skills = { $in: skillsList };
        }
      }

      // Location (case-insensitive partial match)
      if (req.query.location) {
        filter.location = { $regex: req.query.location, $options: 'i' };
      }

      // Minimum rating
      if (req.query.minRating) {
        filter.rating = { ...filter.rating, $gte: req.query.minRating };
      }

      // Maximum hourly rate
      if (req.query.maxHourlyRate) {
        filter.hourlyRate = { ...filter.hourlyRate, $lte: req.query.maxHourlyRate };
      }

      // Sorting
      let sort = { rating: -1, completedProjects: -1 }; // default: best rated first
      if (req.query.sort === 'projects') sort = { completedProjects: 1 };
      if (req.query.sort === '-projects') sort = { completedProjects: -1 };
      if (req.query.sort === 'rating') sort = { rating: 1 };

      const [talents, totalCount] = await Promise.all([
        User.find(filter)
          .select(
            'name role createdAt bio location rating completedProjects successRate ' +
            'responseTime skills portfolio reviews avatar website hourlyRate'
          )
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(filter),
      ]);

      const safeResults = talents.map(safeTalent);

      res.json({
        success: true,
        talents: safeResults,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
          hasNext: skip + limit < totalCount,
          hasPrev: page > 1,
        },
      });
    } catch (err) {
      console.error('Talent list error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ────────────────────────────────────────────────
// GET /api/talent/:id
// Get single freelancer profile
// ────────────────────────────────────────────────
router.get(
  '/:id',
  talentSingleLimiter,
  [param('id').isMongoId().withMessage('Invalid talent ID')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid talent ID',
        errors: errors.array(),
      });
    }

    try {
      const user = await User.findOne({
        _id: req.params.id,
        role: 'freelancer',
      })
        .select(
          '-password -__v -resetPasswordToken -resetPasswordExpire -email ' +
          '-refreshTokens' // adjust based on your User model
        )
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Talent not found',
        });
      }

      res.json({
        success: true,
        talent: safeTalent(user),
      });
    } catch (err) {
      console.error('Single talent error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;