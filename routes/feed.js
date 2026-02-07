const express = require('express');
const DOMPurify = require('isomorphic-dompurify');
const authenticateToken = require('../middleware/auth'); // Token middleware
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Models
const Post = require('../models/Post');
const User = require('../models/User');

// Rate limiter (optional, but recommended)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // max 60 requests per minute
  message: { success: false, message: 'Too many requests, try again later.' }
});

// Apply rate limiter to all routes
router.use(apiLimiter);

// ------------------ FEED ENDPOINT ------------------
// Public feed
router.get('/', async (req, res) => {
  try {
    const sortBy = req.query.sortBy || 'mostRecent';
    let sortOptions = {};

    switch (sortBy) {
      case 'mostRecent':
        sortOptions = { createdAt: -1 };
        break;
      case 'bestMatches':
        sortOptions = { responses: -1 };
        break;
      case 'all':
      default:
        sortOptions = { responses: -1 };
        break;
    }

    const posts = await Post.find({})
      .populate('postedBy', 'name profile.avatar')
      .sort(sortOptions);

    const feedItems = posts.map(post => ({
      id: post._id,
      title: DOMPurify.sanitize(post.title),
      content: DOMPurify.sanitize(post.content),
      timestamp: post.createdAt,
      postDate: formatDate(post.createdAt),
      rating: 0,
      location: post.location || 'Not specified',
      budget: post.budget || 'NPR 0',
      skills: post.skills || [],
      clientName: post.postedBy?.name || post.postedByName || 'Anonymous',
      clientAvatar: post.postedBy?.profile?.avatar
        ? `https://backend-yahaho.vercel.app${post.postedBy.profile.avatar}`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.postedByName || 'Anonymous')}&background=random`,
      projectType: ['Full-time', 'Part-time', 'Contract', 'Freelance'][Math.floor(Math.random() * 4)],
      experience: ['Entry-level', 'Mid-level', 'Expert'][Math.floor(Math.random() * 3)],
      responses: post.responses || 0,
      views: post.views || 0,
      whatsappNumber: post.whatsappNumber || ''
    }));

    res.json({
      success: true,
      message: 'Feed retrieved successfully',
      feed: feedItems
    });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ------------------ USERS ENDPOINT ------------------
// Only authenticated users can fetch user profiles
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}).select('-password -email'); // remove sensitive fields

    const userProfiles = users.map(user => ({
      id: user._id,
      name: user.name,
      role: user.role || 'Professional',
      location: user.profile?.location || user.profile?.city || user.profile?.country || 'Nepal',
      rating: user.profile?.rating || 0,
      completedProjects: user.profile?.completedProjects || 0,
      successRate: user.profile?.successRate || '0%',
      responseTime: user.profile?.responseTime || 'Within 24 hours',
      bio: DOMPurify.sanitize(user.profile?.bio || 'Available for work'),
      skills: user.profile?.skills || [],
      avatar: user.profile?.avatar
        ? `https://backend-yahaho.vercel.app${user.profile.avatar}`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
      portfolio: user.profile?.portfolio || [],
      reviews: user.profile?.reviews || [],
      hourlyRate: user.profile?.hourlyRate || 'NPR 0',
      availability: 'Available',
      memberSince: new Date(user.createdAt).getFullYear()
    }));

    res.json({
      success: true,
      message: 'User profiles retrieved successfully',
      users: userProfiles
    });
  } catch (err) {
    console.error('Users error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ------------------ HELPER FUNCTION ------------------
function formatDate(date) {
  const now = new Date();
  const postDate = new Date(date);
  const diffTime = Math.abs(now - postDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return postDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return postDate.toLocaleDateString();
}

module.exports = router;
