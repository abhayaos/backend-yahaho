const express = require('express');
const authenticateToken = require('../middleware/auth'); // Import auth middleware
const Post = require('../models/Post'); // Import Post model
const router = express.Router();

// Create a new post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content, category, budget, duration, skills, location, whatsappNumber } = req.body;
    
    // Basic validation
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }
    
    // Validate other fields
    if (category && typeof category !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Category must be a string'
      });
    }
    
    if (budget && typeof budget !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Budget must be a string'
      });
    }
    
    if (duration && typeof duration !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Duration must be a string'
      });
    }
    
    if (location && typeof location !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Location must be a string'
      });
    }
    
    if (skills && !Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        message: 'Skills must be an array'
      });
    }
    
    // Verify user data exists in token
    if (!req.user || !req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Invalid token data'
      });
    }
    
    // Get user details from database to ensure we have the name
    const User = require('../models/User');
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Create a new post in the database
    const newPost = new Post({
      title,
      content,
      category: category || 'General',
      budget: budget || 'रू 50,000 - 100,000',
      duration: duration || '1-2 weeks',
      skills: skills || [],
      location: location || 'Nepal',
      whatsappNumber: whatsappNumber || '',
      postedBy: req.user.userId, // User ID from the token
      postedByName: user.name // User name from the database
    });
    
    const savedPost = await newPost.save();
    
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: savedPost
    });
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all posts
router.get('/', async (req, res) => {
  try {
    // Fetch all posts from the database
    const posts = await Post.find({}).populate('postedBy', 'name').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      message: 'Posts retrieved successfully',
      posts: posts
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get a specific post by ID
router.get('/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    
    // Fetch the specific post from the database
    const post = await Post.findById(postId).populate('postedBy', 'name');
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Post retrieved successfully',
      post: post
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete a post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId; // Get user ID from token
    
    // Find the post by ID
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if the post belongs to the current user
    if (post.postedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts'
      });
    }
    
    // Delete the post
    await Post.findByIdAndDelete(postId);
    
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Post deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;