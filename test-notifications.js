const mongoose = require('mongoose');
const Notification = require('./models/Notification');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yahaho')
  .then(() => console.log('Connected to MongoDB for testing'))
  .catch(err => console.error('MongoDB connection error:', err));

// Sample user ID (replace with an actual user ID from your database)
const sampleUserId = '66b4c0c5d5e8f1d5c2a1b4c5'; // This is a placeholder - you'll need to use a real user ID

// Sample notifications
const sampleNotifications = [
  {
    userId: sampleUserId,
    title: "Welcome to Yahaho",
    message: "Your account has been successfully created.",
    type: "info",
    read: false
  },
  {
    userId: sampleUserId,
    title: "Profile Updated",
    message: "Your profile information was updated successfully.",
    type: "success",
    read: false
  },
  {
    userId: sampleUserId,
    title: "New Message",
    message: "You have received a new message from a client.",
    type: "info",
    read: true
  },
  {
    userId: sampleUserId,
    title: "Project Deadline",
    message: "Your project deadline is approaching. Please submit your work soon.",
    type: "warning",
    read: false
  }
];

async function createSampleNotifications() {
  try {
    // Clear existing notifications for the test user (optional)
    await Notification.deleteMany({ userId: sampleUserId });
    
    // Create new sample notifications
    await Notification.insertMany(sampleNotifications);
    
    console.log('Sample notifications created successfully!');
    console.log(`Created ${sampleNotifications.length} notifications`);
    
    // Close the connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error creating sample notifications:', error);
    mongoose.connection.close();
  }
}

// Run the function
createSampleNotifications();