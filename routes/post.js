const express = require('express');
const DOMPurify = require('isomorphic-dompurify');
const authenticateToken = require('../middleware/auth'); // Auth middleware
const Post = require('../models/Post');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// ------------------ RATE LIMITER ------------------
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // max 60 requests per minute
  message: { success: false, message: 'Too many requests, try again later.' }
});
router.use(apiLimiter);

// ------------------ CREATE POST ------------------
router.post('/', authenticateToken, async (req, res) => {
  try {
    let { title, content, category, budget, duration, skills, location, whatsappNumber } = req.body;

    // Trim and sanitize input
    title = DOMPurify.sanitize((title || '').trim());
    content = DOMPurify.sanitize((content || '').trim());
    category = category ? DOMPurify.sanitize(category.trim()) : 'General';
    budget = budget ? DOMPurify.sanitize(budget.trim()) : 'रू 50,000 - 100,000';
    duration = duration ? DOMPurify.sanitize(duration.trim()) : '1-2 weeks';
    location = location ? DOMPurify.sanitize(location.trim()) : 'Nepal';
    whatsappNumber = whatsappNumber ? DOMPurify.sanitize(whatsappNumber.trim()) : '';
    skills = Array.isArray(skills) ? skills.map(s => DOMPurify.sanitize(s.trim())) : [];

    // Basic validation
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    // Verify user exists
    if (!req.user?.id) return res.status(403).json({ success: false, message: 'Invalid token data' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Create post
    const newPost = new Post({
      title,
      content,
      category,
      budget,
      duration,
      skills,
      location,
      whatsappNumber,
      postedBy: req.user.id,
      postedByName: user.name
    });

    const savedPost = await newPost.save();

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: savedPost
    });
  } catch (err) {
    console.error('Post creation error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ------------------ GET ALL POSTS ------------------
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find({})
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 });

    // Only expose safe fields
    const safePosts = posts.map(post => ({
      id: post._id,
      title: DOMPurify.sanitize(post.title),
      content: DOMPurify.sanitize(post.content),
      category: post.category,
      budget: post.budget,
      duration: post.duration,
      location: post.location,
      skills: post.skills,
      postedByName: post.postedBy?.name || post.postedByName,
      timestamp: post.createdAt
      // Exclude whatsappNumber unless you want it public
    }));

    res.json({ success: true, message: 'Posts retrieved successfully', posts: safePosts });
  } catch (err) {
    console.error('Get posts error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ------------------ GET POST BY ID ------------------
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('postedBy', 'name');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    res.json({
      success: true,
      message: 'Post retrieved successfully',
      post: {
        id: post._id,
        title: DOMPurify.sanitize(post.title),
        content: DOMPurify.sanitize(post.content),
        category: post.category,
        budget: post.budget,
        duration: post.duration,
        location: post.location,
        skills: post.skills,
        postedByName: post.postedBy?.name || post.postedByName,
        timestamp: post.createdAt
      }
    });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ------------------ DELETE POST ------------------
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (post.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own posts' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Post deletion error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
