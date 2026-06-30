const express = require("express");
const authRoutes = require("./authRoutes");
const adminRoutes = require("./adminRoutes");
const healthRoutes = require("./healthRoutes");
const notificationRoutes = require("./notificationRoutes");
const requestRoutes = require("./requestRoutes");
const userRoutes = require("./userRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/health", healthRoutes);
router.use("/notifications", notificationRoutes);
router.use("/requests", requestRoutes);
router.use("/users", userRoutes);

module.exports = router;
