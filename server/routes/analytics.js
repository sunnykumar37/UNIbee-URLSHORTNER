const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');

// Get all analytics (optionally filter by slug)
router.get('/', async (req, res) => {
  try {
    const { slug } = req.query;
    const query = slug ? { slug } : {};
    const analytics = await Analytics.find(query).sort({ timestamp: -1 }).limit(1000);
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

module.exports = router; 