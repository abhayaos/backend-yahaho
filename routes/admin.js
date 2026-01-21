const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Middleware to check if user is authenticated
const userAuth = async (req, res, next) => {
  try {
    // First, ensure the user is authenticated
    await auth(req, res, async () => {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      req.currentUser = user;
      next();
    });
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

// @route   POST api/admin/send-notification
// @desc    Send notification to all users
// @access  Private (Authenticated User)
router.post('/send-notification', userAuth, async (req, res) => {
  try {
    const { title, message, type } = req.body;

    // Validation
    if (!title || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and message are required' 
      });
    }

    // Get all users
    const users = await User.find({});

    // Create notification for each user
    const notifications = [];
    const successfulSends = [];

    for (const user of users) {
      try {
        const notification = new Notification({
          userId: user._id,
          title: title,
          message: message,
          type: type || 'general',
          isRead: false
        });

        const savedNotification = await notification.save();
        notifications.push(savedNotification);
        successfulSends.push(user._id);
      } catch (error) {
        console.error(`Failed to create notification for user ${user._id}:`, error);
        // Continue with other users
      }
    }

    res.json({
      success: true,
      message: 'Notifications sent successfully',
      sentCount: successfulSends.length,
      totalUsers: users.length,
      failedCount: users.length - successfulSends.length
    });

  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET api/admin/users
// @desc    Get all users
// @access  Private (Authenticated User)
router.get('/users', userAuth, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET api/admin/stats
// @desc    Get system statistics
// @access  Private (Authenticated User)
router.get('/stats', userAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const totalNotifications = await Notification.countDocuments({});
    const unreadNotifications = await Notification.countDocuments({ isRead: false });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalNotifications,
        unreadNotifications,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;