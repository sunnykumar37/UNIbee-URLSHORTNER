const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  slug: { type: String },
  urlId: { type: mongoose.Schema.Types.ObjectId, ref: 'Link' },
  timestamp: { type: Date, default: Date.now },
  ip: { type: String },
  referrer: { type: String },
  deviceType: { type: String },
  userAgent: { type: String },
  country: { type: String },
  city: { type: String },
});

module.exports = mongoose.model('Analytics', AnalyticsSchema); 