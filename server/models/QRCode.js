const mongoose = require("mongoose");

const qrCodeSchema = new mongoose.Schema({
  text: { type: String, required: true },
  cloudinaryUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.QRCode || mongoose.model("QRCode", qrCodeSchema);
