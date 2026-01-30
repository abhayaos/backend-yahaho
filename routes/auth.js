const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path as needed
const OTP = require('../models/OTP'); // Import OTP model
const nodemailer = require('nodemailer');
require('dotenv').config();

const router = express.Router();

// @route   POST api/auth/register
// @desc    Register a new user with role
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  // Basic validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ 
      success: false,
      message: 'Please fill in all fields' 
    });
  }

  // Additional validations
  // Enhanced email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      message: 'Please include a valid email address' 
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

  // Validate phone number if provided
  if (phone) {
    const phoneRegex = /^\d{10}$/; // Exactly 10 digits
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide a valid 10-digit phone number' 
      });
    }
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
      phone,
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
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      message: 'Please include a valid email address' 
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

// @route   POST api/auth/send-otp
// @desc    Send OTP for email verification
// @access  Public
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  // Validate email
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      message: 'Please include a valid email address' 
    });
  }

  try {
    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Hash the OTP for secure storage
    const hashedOtp = await bcrypt.hash(otp, 10);
    
    // Set expiration time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Remove any existing unused OTPs for this email
    await OTP.deleteMany({ email, used: false });
    
    // Create new OTP record
    await OTP.create({
      email,
      otp: hashedOtp,
      expiresAt
    });
    
    // Create transporter for sending email
    const transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || 'abhayabikramshahiofficial@gmail.com',
        pass: process.env.EMAIL_PASS || 'abhaya@123'
      }
    });
    
    // Send OTP via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code - Yaha Ho Registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Hello,</p>
          <p>Your OTP code for verifying your email address is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5; background-color: #f0f9ff; padding: 15px 30px; border-radius: 10px; border: 2px dashed #4f46e5; display: inline-block;">
              ${otp}
            </span>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #777;">© 2025 Yaha Ho. All rights reserved.</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// @route   POST api/auth/verify-otp
// @desc    Verify OTP for email verification
// @access  Public
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const record = await OTP.findOne({ email, used: false });

    if (!record) {
      return res.status(400).json({ message: 'OTP not found' });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (record.attempts >= 3) {
      return res.status(400).json({ message: 'Too many attempts' });
    }

    const isValid = await bcrypt.compare(otp, record.otp);

    if (!isValid) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    record.used = true;
    await record.save();

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

module.exports = router;