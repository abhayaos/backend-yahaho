const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route   GET api/talent
// @desc    Get all talents with complete profile information
// @access  Public
router.get('/', auth, async (req, res) => {
  try {
    // Fetch all users with role 'freelancer', profile fields are part of User model
    const users = await User.find({ role: 'freelancer' })
      .select('-password');
    
    // Format the response to ensure all profile data is properly structured
    const talents = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      profile: {
        bio: user.bio || '',
        location: user.location || '',
        rating: user.rating || 0,
        completedProjects: user.completedProjects || 0,
        successRate: user.successRate || '0%',
        responseTime: user.responseTime || 'Within 24 hours',
        skills: user.skills || [],
        portfolio: user.portfolio || [],
        reviews: user.reviews || [],
        avatar: user.avatar || '',
        website: user.website || '',
        hourlyRate: user.hourlyRate || '',
      }
    }));

    res.json({
      success: true,
      talents: talents
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   GET api/talent/:id
// @desc    Get a specific talent by ID with complete profile information
// @access  Public
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'profile',
        select: '-_id bio location rating completedProjects successRate responseTime skills portfolio reviews avatar website hourlyRate'
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const talent = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      profile: {
        bio: user.profile?.bio || user.bio || '',
        location: user.profile?.location || user.location || '',
        rating: user.profile?.rating || user.rating || 0,
        completedProjects: user.profile?.completedProjects || user.completedProjects || 0,
        successRate: user.profile?.successRate || user.successRate || '0%',
        responseTime: user.profile?.responseTime || user.responseTime || 'Within 24 hours',
        skills: user.profile?.skills || user.skills || [],
        portfolio: user.profile?.portfolio || user.portfolio || [],
        reviews: user.profile?.reviews || user.reviews || [],
        avatar: user.profile?.avatar || user.avatar || '',
        website: user.profile?.website || user.website || '',
        hourlyRate: user.profile?.hourlyRate || user.hourlyRate || '',
      }
    };

    res.json({
      success: true,
      talent: talent
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