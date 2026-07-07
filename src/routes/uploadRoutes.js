const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireRole } = require("../middleware/authMiddleware");
const { receiptUpload, uploadReceipt } = require("../controllers/uploadController");

const router = express.Router();

router.use(authenticate);

router.post(
  "/receipts",
  requireRole("user", "admin"),
  receiptUpload.single("file"),
  asyncHandler(uploadReceipt)
);

module.exports = router;
