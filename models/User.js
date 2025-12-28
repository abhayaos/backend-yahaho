const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['freelancer', 'customer'],
    default: 'customer'
  },
  // Profile fields
  bio: {
    type: String,
    default: ''
  },
  skills: [{
    type: String
  }],
  location: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 0
  },
  earned: {
    type: Number,
    default: 0
  },
  bids: {
    type: Number,
    default: 0
  },
  country: {
    type: String,
    default: 'Nepal'
  },
  currency: {
    type: String,
    default: 'NPR'
  },
  address: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  zipCode: {
    type: String,
    default: ''
  },
  responseTime: {
    type: String,
    default: 'Within 24 hours'
  },
  completedProjects: {
    type: Number,
    default: 0
  },
  successRate: {
    type: String,
    default: '0%'
  },
  portfolio: [{
    id: Number,
    title: String,
    category: String,
    url: String
  }],
  reviews: [{
    id: Number,
    client: String,
    rating: Number,
    comment: String,
    date: String
  }],
  hourlyRate: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// No middleware needed since password is hashed in the route

module.exports = mongoose.model('User', UserSchema);