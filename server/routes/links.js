const express = require('express');
const router = express.Router();
const Link = require('../models/Link');
const { isAuthenticated } = require('../middleware/auth');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const QRCode = require('../models/QRCode');
const QRCodeLib = require('qrcode'); // Add this import for QR code generation
const { v2: cloudinary } = require('cloudinary');
const stream = require('stream');
const Analytics = require('../models/Analytics');
const fetch = require('node-fetch');

// Create a new shortened URL
router.post('/', isAuthenticated, async (req, res) => {
  try {
    console.log('Attempting to shorten URL...');
    const { originalUrl, title, customSlug } = req.body;
    console.log('Original URL:', originalUrl, 'Title:', title);
    console.log('User ID from token:', req.user);

    if (!originalUrl) {
      return res.status(400).json({ message: 'Original URL is required.' });
    }

    let shortCode;
    if (customSlug) {
      // Validate custom slug uniqueness
      const existing = await Link.findOne({ shortCode: customSlug });
      if (existing) {
        return res.status(400).json({ message: 'This slug is already taken.' });
      }
      shortCode = customSlug;
    } else {
      shortCode = Math.random().toString(36).substring(2, 8);
    }
    console.log('Generated short code:', shortCode);

    if (!process.env.BASE_URL) {
        console.error('BASE_URL environment variable is not set!');
        return res.status(500).json({ message: 'Server configuration error: BASE_URL is not set.' });
    }
    const shortenedUrl = `${process.env.BASE_URL}/s/${shortCode}`;
    console.log('Generated shortened URL:', shortenedUrl);

    // Generate QR code as base64 image
    let qrCodeBase64 = null;
    try {
      qrCodeBase64 = await QRCodeLib.toDataURL(shortenedUrl);
    } catch (qrErr) {
      console.error('Error generating QR code:', qrErr);
      // Continue without QR if it fails
    }

    const link = new Link({
      originalUrl,
      shortenedUrl,
      shortCode,
      title,
      user: req.user
      // No expiresAt field, so links never expire
    });
    console.log('Link object created:', link);

    await link.save();
    console.log('Link saved successfully.');

    // Also create a QR code entry for this short link (if not already exists)
    try {
      const existingQr = await QRCode.findOne({ text: shortenedUrl, user: req.user });
      if (!existingQr) {
        // Convert base64 QR code to buffer
        if (qrCodeBase64) {
          const base64Data = qrCodeBase64.replace(/^data:image\/png;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          // Upload to Cloudinary
          const uploadResult = await new Promise((resolve, reject) => {
            const passthrough = new stream.PassThrough();
            passthrough.end(buffer);
            cloudinary.uploader.upload_stream({ resource_type: 'image' }, (err, result) => {
              if (err) return reject(err);
              resolve(result);
            }).end(buffer);
          });
          await QRCode.create({ user: req.user, text: shortenedUrl, cloudinaryUrl: uploadResult.secure_url, createdAt: new Date() });
        } else {
          await QRCode.create({ user: req.user, text: shortenedUrl, cloudinaryUrl: '', createdAt: new Date() });
        }
      }
    } catch (qrSaveErr) {
      console.error('Error saving QR code for short link:', qrSaveErr);
    }

    res.json({ ...link.toObject(), qrCode: qrCodeBase64 }); // Return QR code in response
  } catch (err) {
    console.error('Error creating link:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Get all links for a user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    console.log('Fetching links for user:', req.user);
    const links = await Link.find({ user: req.user });
    // Generate QR code for each link
    const linksWithQr = await Promise.all(
      links.map(async (link) => {
        let qrCode = '';
        try {
          qrCode = await QRCodeLib.toDataURL(link.shortenedUrl);
        } catch (e) {}
        return { ...link.toObject(), qrCode };
      })
    );
    res.json(linksWithQr);
  } catch (err) {
    console.error('Error getting links:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Edit a link
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const { title, originalUrl, shortCode } = req.body;
    const link = await Link.findById(req.params.id);

    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Ensure user owns link
    if (link.user.toString() !== req.user) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // Check if new custom short code already exists for another link
    if (shortCode && shortCode !== link.shortCode) {
      const existingLink = await Link.findOne({ shortCode: shortCode });
      if (existingLink && existingLink._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'Custom short code already in use' });
      }
    }

    link.title = title || link.title;
    link.originalUrl = originalUrl || link.originalUrl;
    link.shortCode = shortCode || link.shortCode;
    link.shortenedUrl = `${process.env.BASE_URL}/s/${link.shortCode}`;

    await link.save();
    res.json(link);
  } catch (err) {
    console.error('Error updating link:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a link
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);

    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Ensure user owns link
    if (link.user.toString() !== req.user) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await Link.deleteOne({ _id: req.params.id });
    res.json({ message: 'Link removed' });
  } catch (err) {
    console.error('Error deleting link:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Redirect to original URL
router.get('/s/:shortCode', async (req, res) => {
  try {
    console.log('Redirect request received for short code:', req.params.shortCode);
    const link = await Link.findOne({ shortCode: req.params.shortCode });
    
    if (!link) {
      console.log('Link not found for short code:', req.params.shortCode);
      return res.status(404).json({ message: 'Link not found' });
    }

    if (link.isExpired()) {
      console.log('Link expired for short code:', req.params.shortCode);
      return res.status(410).json({ message: 'Link has expired' });
    }

    // --- Analytics logging ---
    (async () => {
      try {
        console.log('Analytics logging START for', req.params.shortCode);
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
        } catch (geoErr) {
          console.error('Geo lookup failed:', geoErr);
        }
        await Analytics.create({
          slug: req.params.shortCode,
          urlId: link._id,
          timestamp: Date.now(),
          ip,
          referrer,
          deviceType,
          userAgent,
          country,
          city,
        });
        console.log('Analytics logging SUCCESS for', req.params.shortCode);
      } catch (analyticsErr) {
        console.error('Analytics logging failed:', analyticsErr);
      }
    })();
    // --- End analytics logging ---

    // Record click analytics (legacy)
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const geo = geoip.lookup(ip);
    const ua = new UAParser(req.headers['user-agent']);
    const deviceTypeRaw = ua.getDevice().type;
    let deviceType;
    if (!deviceTypeRaw) deviceType = 'desktop';
    else if (['mobile', 'tablet', 'smarttv', 'wearable', 'embedded'].includes(deviceTypeRaw)) deviceType = deviceTypeRaw;
    else deviceType = 'unknown';
    link.clicks.push({
      timestamp: new Date(),
      deviceType,
      region: geo ? geo.country : 'unknown',
      userAgent: req.headers['user-agent']
    });

    await link.save();
    console.log('Redirecting to original URL:', link.originalUrl);
    res.redirect(link.originalUrl);
  } catch (err) {
    console.error('Error redirecting:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get analytics for a link
router.get('/:shortCode/analytics', isAuthenticated, async (req, res) => {
  try {
    console.log('Fetching analytics for short code:', req.params.shortCode, 'for user:', req.user);
    const link = await Link.findOne({ 
      shortCode: req.params.shortCode,
      user: req.user
    });

    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Ensure user owns link for analytics
    if (link.user.toString() !== req.user) {
      return res.status(401).json({ message: 'User not authorized to view analytics for this link' });
    }

    res.json(link.getAnalytics());
  } catch (err) {
    console.error('Error getting analytics:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Aggregate device analytics for all links of the user
router.get('/device-analytics', isAuthenticated, async (req, res) => {
  try {
    const links = await Link.find({ user: req.user });
    const deviceTypes = ['Desktop', 'Mobile', 'Tablet', 'Unknown'];
    const deviceCounts = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
    for (const link of links) {
      for (const click of link.clicks) {
        let type = click.deviceType || 'Unknown';
        if (type === 'desktop') type = 'Desktop';
        else if (type === 'mobile') type = 'Mobile';
        else if (type === 'tablet') type = 'Tablet';
        else type = 'Unknown';
        deviceCounts[type] = (deviceCounts[type] || 0) + 1;
      }
    }
    const result = deviceTypes.map(name => ({ name, value: deviceCounts[name] || 0 }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to aggregate device analytics' });
  }
});

// Aggregate clicks/scans over time for all links of the user
router.get('/over-time-analytics', isAuthenticated, async (req, res) => {
  try {
    const links = await Link.find({ user: req.user });
    const dateCounts = {};
    for (const link of links) {
      for (const click of link.clicks) {
        // Format date as YYYY-MM-DD
        const date = click.timestamp.toISOString().slice(0, 10);
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
    }
    // Convert to array sorted by date
    const overTime = Object.entries(dateCounts)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    // Find top performing date
    let top = { date: null, value: 0 };
    for (const entry of overTime) {
      if (entry.value > top.value) top = entry;
    }
    res.json({ overTime, top });
  } catch (err) {
    res.status(500).json({ message: 'Failed to aggregate over time analytics' });
  }
});

// Create a QR code
router.post('/qr', isAuthenticated, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'QR code text is required' });
    const qr = new QRCode({ user: req.user, text });
    await qr.save();
    res.json(qr);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create QR code' });
  }
});

// Get all QR codes for user
router.get('/qr', isAuthenticated, async (req, res) => {
  try {
    const qrs = await QRCode.find({ user: req.user });
    res.json(qrs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch QR codes' });
  }
});

// Update summary-analytics to count QR codes
router.get('/summary-analytics', isAuthenticated, async (req, res) => {
  try {
    // Count short links
    const links = await Link.find({ user: req.user });
    const shortLinksCount = links.length;
    // Count QR codes
    const qrCodesCount = await QRCode.countDocuments({ user: req.user });
    // Device analytics (reuse logic)
    const deviceTypes = ['Desktop', 'Mobile', 'Tablet', 'Unknown'];
    const deviceCounts = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
    for (const link of links) {
      for (const click of link.clicks) {
        let type = click.deviceType || 'Unknown';
        if (type === 'desktop') type = 'Desktop';
        else if (type === 'mobile') type = 'Mobile';
        else if (type === 'tablet') type = 'Tablet';
        else type = 'Unknown';
        deviceCounts[type] = (deviceCounts[type] || 0) + 1;
      }
    }
    const deviceData = deviceTypes.map(name => ({ name, value: deviceCounts[name] || 0 }));
    res.json({ shortLinksCount, qrCodesCount, deviceData });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get summary analytics' });
  }
});

module.exports = router; 