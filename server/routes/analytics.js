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

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Analytics.findByIdAndDelete(req.params.id);
    if (!deleted) {
      console.log('Analytics entry not found for id:', req.params.id);
      return res.status(404).json({ message: 'Analytics entry not found' });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Failed to delete analytics entry:', err);
    res.status(500).json({ message: 'Failed to delete' });
  }
});

module.exports = router; 