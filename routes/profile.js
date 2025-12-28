const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Adjust path as needed
const User = require('../models/User');
const Post = require('../models/Post'); // Adjust path as needed
const multer = require('multer');
const path = require('path');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    // Create unique filename with user ID and timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage, 
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// @route   GET api/profile
// @desc    Get current user profile
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // req.user.id comes from the auth middleware
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: {
          bio: user.bio || '',
          skills: user.skills || [],
          location: user.location || '',
          phone: user.phone || '',
          website: user.website || '',
          avatar: user.avatar || '',
          rating: user.rating || 0,
          earned: user.earned || 0,
          bids: user.bids || 0,
          country: user.country || 'Nepal',
          currency: user.currency || 'NPR',
          address: user.address || '',
          city: user.city || '',
          state: user.state || '',
          zipCode: user.zipCode || '',
          responseTime: user.responseTime || 'Within 24 hours',
          completedProjects: user.completedProjects || 0,
          successRate: user.successRate || '0%',
          portfolio: user.portfolio || [],
          reviews: user.reviews || [],
          hourlyRate: user.hourlyRate || ''
        },
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server Error' 
    });
  }
});

// @route   PUT api/profile
// @desc    Update user profile
// @access  Private
router.put('/', auth, async (req, res) => {
  const {
    bio,
    skills,
    location,
    phone,
    website,
    avatar,
    responseTime,
    hourlyRate
  } = req.body;

  try {
    // Build profile object
    const profileFields = {};
    if (bio) profileFields.bio = bio;
    if (skills) profileFields.skills = Array.isArray(skills) ? skills : skills.split(',').map(skill => skill.trim());
    if (location) profileFields.location = location;
    if (phone) profileFields.phone = phone;
    if (website) profileFields.website = website;
    if (avatar) profileFields.avatar = avatar;
    if (responseTime) profileFields.responseTime = responseTime;
    if (hourlyRate) profileFields.hourlyRate = hourlyRate;

    // Update profile fields in the user document
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: profileFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: {
          bio: user.bio || '',
          skills: user.skills || [],
          location: user.location || '',
          phone: user.phone || '',
          website: user.website || '',
          avatar: user.avatar || '',
          rating: user.rating || 0,
          earned: user.earned || 0,
          bids: user.bids || 0,
          country: user.country || 'Nepal',
          currency: user.currency || 'NPR',
          address: user.address || '',
          city: user.city || '',
          state: user.state || '',
          zipCode: user.zipCode || '',
          responseTime: user.responseTime || 'Within 24 hours',
          completedProjects: user.completedProjects || 0,
          successRate: user.successRate || '0%',
          portfolio: user.portfolio || [],
          reviews: user.reviews || [],
          hourlyRate: user.hourlyRate || ''
        },
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server Error' 
    });
  }
});

// @route   POST api/profile/upload
// @desc    Upload user avatar
// @access  Private
router.post('/upload', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }
    
    // Update user's avatar field with the file path
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: `/uploads/${req.file.filename}` }, // Store relative path
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server Error' 
    });
  }
});

// @route   GET api/profile/posts
// @desc    Get current user's posts
// @access  Private
router.get('/posts', auth, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user.id }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      posts: posts
    });
    
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server Error' 
    });
  }
});

module.exports = router;