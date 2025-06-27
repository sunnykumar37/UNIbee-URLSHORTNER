const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');
const passport = require('passport');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists with this email' });

    user = await User.findOne({ username });
    if (user) return res.status(400).json({ message: 'Username already exists' });

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password should be at least 6 characters long' });
    }

    user = new User({ username, email, password: await bcrypt.hash(password, 10) });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get User Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change Password
router.put('/password', isAuthenticated, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long and contain uppercase, lowercase, and numbers' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password Change Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Google login start
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:3000/login', // frontend login
    session: false,
  }),
  (req, res) => {
    // 1. Create JWT token
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    // 2. Set cookie
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: false, // true in production with HTTPS
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // 3. Redirect to dashboard
    res.redirect('http://localhost:3000/dashboard/home');
  }
);



// Redirect to GitHub
// Start GitHub login
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// GitHub callback
router.get('/github/callback',
  passport.authenticate('github', {
    failureRedirect: 'http://localhost:3000/login',
    session: false
  }),
  (req, res) => {
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.redirect('http://localhost:3000/dashboard/home');
  }
);


router.post('/logout', (req, res) => {
  // Handle Passport-based (OAuth) logout
  if (req.isAuthenticated && req.isAuthenticated()) {
    req.logout(err => {
      if (err) return res.status(500).json({ message: 'Error during logout' });
      req.session.destroy(err => {
        if (err) return res.status(500).json({ message: 'Error clearing session' });

        res.clearCookie('connect.sid'); // if using express-session cookie
        res.clearCookie('accessToken'); // optional: if using JWT in cookie

        return res.status(200).json({success:true, message: 'Logged out (session)' });
      });
    });
  } else {
    // JWT logout (client should delete token OR server uses cookie to store JWT)
    res.clearCookie('accessToken'); // optional if you stored JWT in cookie

    // Optional: blacklist the token here if required (e.g. Redis)
    
    res.status(200).json({ success: true, message: 'Logged out (JWT)' });

  }
});


module.exports = router; 