const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongodbUri:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/care-travel-request",
  jwtSecret: process.env.JWT_SECRET || "development-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  gmailUser: process.env.GMAIL_USER || "lewiskanyi77@gmail.com",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "xnao ztph ucoo huey",
  emailFrom: process.env.EMAIL_FROM || process.env.GMAIL_USER || "lewiskanyi77@gmail.com",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};

module.exports = env;
