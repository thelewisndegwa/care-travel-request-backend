const dotenv = require("dotenv");

dotenv.config();

function normalizeOrigin(url) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function addOriginPair(origins, url) {
  const origin = normalizeOrigin(url);

  if (!origin) {
    return;
  }

  origins.add(origin);

  if (origin.includes("://localhost")) {
    origins.add(origin.replace("://localhost", "://127.0.0.1"));
  }

  if (origin.includes("://127.0.0.1")) {
    origins.add(origin.replace("://127.0.0.1", "://localhost"));
  }
}

function buildCorsOrigins(frontendUrl) {
  const origins = new Set();

  addOriginPair(origins, frontendUrl);
  addOriginPair(origins, "http://localhost:5500");
  addOriginPair(origins, "http://localhost:3000");

  return Array.from(origins);
}

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5500";

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongodbUri:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/care-travel-request",
  jwtSecret: process.env.JWT_SECRET || "development-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  gmailUser: process.env.GMAIL_USER || "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",
  emailFrom: process.env.EMAIL_FROM || process.env.GMAIL_USER || "",
  frontendUrl,
  corsOrigins: buildCorsOrigins(frontendUrl),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
};

module.exports = env;
