const express = require('express');
const router = express.Router();
const Link = require('../models/Link');
const Analytics = require('../models/Analytics');
const UAParser = require('ua-parser-js');
const fetch = require('node-fetch');

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

    // --- Analytics logging ---
    (async () => {
      try {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const referrer = req.headers.referer || null;
        const userAgent = req.headers['user-agent'] || '';
        const parser = new UAParser(userAgent);
        const deviceType = parser.getDevice().type || 'desktop';
        let country = '', city = '';
        try {
          const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
          const geo = await geoRes.json();
          country = geo.country_name || '';
          city = geo.city || '';
        } catch (geoErr) {}
        await Analytics.create({
          slug: req.params.code,
          urlId: link._id,
          timestamp: Date.now(),
          ip,
          referrer,
          deviceType,
          userAgent,
          country,
          city,
        });
      } catch (analyticsErr) {
        // Fail silently
      }
    })();
    // --- End analytics logging ---

    res.redirect(link.originalUrl);
  } catch (err) {
    console.error(err);
    res.redirect('http://localhost:3000/dashboard/links');
  }
});

module.exports = router; 