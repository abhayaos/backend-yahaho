const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'General'
  },
  budget: {
    type: String,
    default: 'रू 50,000 - 100,000'
  },
  duration: {
    type: String,
    default: '1-2 weeks'
  },
  skills: [{
    type: String
  }],
  location: {
    type: String,
    default: 'Nepal'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postedByName: {
    type: String,
    required: true
  },
  postedAt: {
    type: Date,
    default: Date.now
  },
  responses: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Post', postSchema);