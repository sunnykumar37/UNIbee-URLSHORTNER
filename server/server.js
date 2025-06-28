require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const useragent = require("express-useragent");
const geoip = require("geoip-lite");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const Link = require("./models/Link");
const passport = require("passport");
const QrCode = require("./models/QrCode");
const { isAuthenticated } = require("./middleware/auth");
const app = express();
const router = express.Router();

app.use(cookieParser());
app.use(passport.initialize());
// 🛠 Middlewares
app.use(express.json());
app.use(useragent.express());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// 🔌 MongoDB Connection
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI missing in .env");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  });

// 🔐 Auth & Link Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/links", require("./routes/links"));

const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔧 Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ POST /api/upload-qr
app.post("/api/upload-qr", upload.single("qrImage"), async (req, res) => {
  try {
    // Handle authentication from FormData token
    const token = req.body.token;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify token and get user ID (matching isAuthenticated middleware)
    const jwt = require('jsonwebtoken');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded.id; // Set to user ID like isAuthenticated does
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    console.log('Creating QR code for user:', req.user);
    const fileBuffer = req.file.buffer;
    const { text } = req.body;

    // Upload to Cloudinary from buffer
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ resource_type: "image" }, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }).end(fileBuffer);
    });

    // Debug log before saving
    console.log('Saving QR code:', { user: req.user, text, cloudinaryUrl: result.secure_url });
    const newQR = new QrCode({
      user: req.user,
      text,
      cloudinaryUrl: result.secure_url,
    });
    await newQR.save();

    res.json(newQR);
  } catch (err) {
    console.error("❌ Upload Error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

// 🔁 Redirect Handler (/s/:shortCode)
app.get("/s/:shortCode", async (req, res) => {
  const shortCode = req.params.shortCode;
  console.log("📩 Incoming request for:", shortCode);

  try {
    const link = await Link.findOne({ shortCode });

    if (!link) {
      console.error("❌ Link not found");
      return res.status(404).send("Short URL not found");
    }

    if (!link.isActive || link.isExpired()) {
      console.warn("⚠️ Link is expired or inactive");
      return res.status(410).send("This link has expired or is inactive");
    }

    const deviceType = req.useragent.isMobile ? "mobile" : "desktop";
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const geo = geoip.lookup(ip);
    const region = geo?.region || "unknown";

    link.clicks.push({
      deviceType,
      region,
      userAgent: req.headers["user-agent"],
    });

    await link.save();

    console.log("🔁 Redirecting to:", link.originalUrl);
    return res.redirect(link.originalUrl);
  } catch (err) {
    console.error("🔥 Redirect error:", err);
    return res.status(500).send("Internal Server Error");
  }
});

// ✅ GET /api/qrcodes - fetch all QR codes
app.get('/api/qrcodes', async (req, res) => {
  try {
    const qrcodes = await QrCode.find();
    res.json(qrcodes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch QR codes' });
  }
});

// ✅ DELETE /api/qrcodes/:id - delete a QR code by ID
app.delete('/api/qrcodes/:id', async (req, res) => {
  try {
    const deleted = await QrCode.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'QR code not found' });
    res.json({ message: 'QR code deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete QR code' });
  }
});

// 🌐 Serve React Frontend (should be last)
app.use(express.static(path.join(__dirname, "../client/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});

//don
