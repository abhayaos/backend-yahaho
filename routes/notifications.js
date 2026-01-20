const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/notifications - Get all notifications for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 }) // Sort by newest first
      .populate('userId', 'name email'); // Populate user info if needed
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/notifications/:id/read - Mark a specific notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/notifications/mark-all-read - Mark all notifications as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/notifications/:id - Delete a specific notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/notifications/clear-all - Clear all notifications for the user
router.delete('/clear-all', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });

    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;