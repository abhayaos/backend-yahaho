const express = require('express');
const cors = require('cors');
const app = express();
// const port = process.env.PORT || 3000;

// ✅ Whitelisted URLs
const whitelist = [
  'http://localhost:5173', // e.g., your frontend dev URL
  'https://yahaho.vercel.app'     // your production URL
];

// ✅ CORS options
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow Postman, curl, etc.
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true); // allow whitelisted origin
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

// Apply CORS
app.use(cors(corsOptions));

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to Yahaho server!');
});

// Server condition route
app.get('/server-condition', (req, res) => {
  res.send(
    'I’m not part of frontend i came from backend.'
  );
});

// 404 handler must be last
app.get('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '404 Not Found'
  });
});

// app.listen(port, () => {
//   console.log(`🚀 Server is running on http://localhost:${port}`);
// });

module.exports = app;