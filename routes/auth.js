const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path as needed
require('dotenv').config();

const router = express.Router();

// @route   POST api/auth/register
// @desc    Register a new user with role
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  // Basic validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ 
      success: false,
      message: 'Please fill in all fields' 
    });
  }

  // Additional validations
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      message: 'Please include a valid email' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      success: false,
      message: 'Please enter a password with 6 or more characters' 
    });
  }

  if (!['freelancer', 'customer'].includes(role)) {
    return res.status(400).json({ 
      success: false,
      message: 'Role must be either freelancer or customer' 
    });
  }

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists' 
      });
    }

    // Create new user
    user = new User({
      name,
      email,
      password, // Password will be hashed in the pre-save hook or here
      role: role || 'customer' // Default to customer if no role provided
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    // Sign JWT
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback_jwt_secret',
      { expiresIn: '7d' }
    );
    
    // Return user data without password
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Please fill in all fields' 
    });
  }

  // Additional email validation
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      message: 'Please include a valid email' 
    });
  }

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    // Sign JWT
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback_jwt_secret',
      { expiresIn: '7d' }
    );
    
    // Return user data without password
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

module.exports = router;