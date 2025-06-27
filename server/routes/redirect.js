const express = require('express');
const router = express.Router();
const Link = require('../models/Link');

// @route   GET /:code
// @desc    Redirect to long/original URL
router.get('/:code', async (req, res) => {
  try {
    const link = await Link.findOne({ shortCode: req.params.code });
    console.log(`Attempting to redirect for shortCode: ${req.params.code}`);
    console.log(`Found link: ${link ? link.shortCode : 'None'}`);
    if (!link) {
      return res.redirect('http://localhost:3000/dashboard/links');
    }
    res.redirect(link.originalUrl);
  } catch (err) {
    console.error(err);
    res.redirect('http://localhost:3000/dashboard/links');
  }
});

module.exports = router; 