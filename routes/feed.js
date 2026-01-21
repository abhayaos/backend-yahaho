const express = require('express');
const authenticateToken = require('../middleware/auth'); // Import auth middleware
const router = express.Router();

// Feed endpoint (public - no authentication required)
router.get('/', async (req, res) => {
  try {
    // In a real application, you would fetch feed data from the database
    // based on user preferences, location, skills, etc.
    
    const Post = require('../models/Post'); // Import Post model
    
    // Get sort option from query params
    const sortBy = req.query.sortBy || 'mostRecent'; // Default to most recent
    
    let sortOptions = {};
    
    switch(sortBy) {
      case 'mostRecent':
        sortOptions = { createdAt: -1 };
        break;
      case 'bestMatches':
        // For best matches, we can sort by responses (more responses = better match)
        sortOptions = { responses: -1 };
        break;
      case 'all':
      default:
        // For 'all', we can sort by responses to show popular posts first
        sortOptions = { responses: -1 };
        break;
    }
    
    // Fetch all posts from the database with user data populated
    const posts = await Post.find({}).populate('postedBy', 'name profile.avatar').sort(sortOptions);
    
    // Transform posts into feed items format
    const feedItems = posts.map(post => ({
      id: post._id,
      postDate: `${Math.floor((Date.now() - post.createdAt) / (1000 * 60 * 60 * 24)) + 1} day(s) ago`,
      title: post.title,
      content: post.content,
      timestamp: post.createdAt,
      rating: 0,
      location: post.location,
      budget: post.budget,
      skills: post.skills,
      client: post.postedByName,
      description: post.content,
      category: post.category,
      duration: post.duration,
      formattedDate: formatDate(post.createdAt),
      clientAvatar: post.postedBy && post.postedBy.profile && post.postedBy.profile.avatar ? 
        `https://backend-yahaho.vercel.app${post.postedBy.profile.avatar}` : 
        `https://ui-avatars.com/api/?name=${post.postedByName}&background=random`,
      clientName: post.postedByName,
      projectType: ['Full-time', 'Part-time', 'Contract', 'Freelance'][Math.floor(Math.random() * 4)],
      experience: ['Entry-level', 'Mid-level', 'Expert'][Math.floor(Math.random() * 3)],
      responses: post.responses,
      views: post.views,
      whatsappNumber: post.whatsappNumber
    }));
    
    res.json({ 
      success: true, 
      message: 'Feed retrieved successfully',
      feed: feedItems
    });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Helper function to format dates
function formatDate(date) {
  const now = new Date();
  const postDate = new Date(date);
  
  // Calculate difference in days
  const diffTime = Math.abs(now - postDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // If less than 1 day, show time
  if (diffDays <= 1) {
    return postDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  // If less than 7 days, show number of days
  else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  // Otherwise, show the date
  else {
    return postDate.toLocaleDateString();
  }
}

// Users endpoint (for users looking for work)

// Users endpoint (for users looking for work)
router.get('/users', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Fetch all users from the database
    const users = await User.find({}).select('-password');
    
    // Transform users into profile items format
    const userProfiles = users.map((user, index) => ({
      id: user._id,
      name: user.name,
      role: user.role || 'Professional',
      location: user.profile.location || user.profile.city || user.profile.country || 'Nepal',
      rating: user.profile.rating || 0,
      completedProjects: user.profile.completedProjects || 0,
      successRate: user.profile.successRate || '0%',
      responseTime: user.profile.responseTime || 'Within 24 hours',
      bio: user.profile.bio || 'Available for work',
      skills: user.profile.skills || [],
      avatar: user.profile.avatar ? `https://backend-yahaho.vercel.app${user.profile.avatar}` : `https://ui-avatars.com/api/?name=${user.name}&background=random`,
      portfolio: user.profile.portfolio || [],
      reviews: user.profile.reviews || [],
      hourlyRate: user.profile.hourlyRate || 'NPR 0',
      availability: 'Available',
      memberSince: new Date(user.createdAt).getFullYear()
    }));
    
    res.json({ 
      success: true, 
      message: 'User profiles retrieved successfully',
      users: userProfiles
    });
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

module.exports = router;