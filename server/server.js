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
const app = express();
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
router.post("/", upload.single("qrImage"), async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;
    const { text } = req.body;

    // Upload to Cloudinary from buffer
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ resource_type: "image" }, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }).end(fileBuffer);
    });

    const newQR = new QRCode({
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

// 🌐 Serve React Frontend
app.use(express.static(path.join(__dirname, "../client/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});

//don
