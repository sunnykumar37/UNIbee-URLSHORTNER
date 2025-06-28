const mongoose = require('mongoose');

const ClickSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet', 'smarttv', 'wearable', 'embedded', 'unknown'] },
  region: { type: String },
  userAgent: { type: String }
});

const LinkSchema = new mongoose.Schema({
  title: { type: String },
  originalUrl: { type: String, required: true },
  shortenedUrl: { type: String, required: true, unique: true },
  shortCode: { type: String, required: true, unique: true },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
    // No default, so links never expire unless set
  },
  clicks: [ClickSchema],
  isActive: {
    type: Boolean,
    default: true
  }
});

// Add method to check if link is expired
LinkSchema.methods.isExpired = function() {
  return Date.now() > this.expiresAt;
};

// Add method to get analytics
LinkSchema.methods.getAnalytics = function() {
  return {
    totalClicks: this.clicks.length,
    mobileClicks: this.clicks.filter(click => click.deviceType === 'mobile').length,
    desktopClicks: this.clicks.filter(click => click.deviceType === 'desktop').length,
    regionalData: this.clicks.reduce((acc, click) => {
      acc[click.region] = (acc[click.region] || 0) + 1;
      return acc;
    }, {})
  };
};

module.exports = mongoose.model('Link', LinkSchema); 