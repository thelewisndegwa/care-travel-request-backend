const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireRole } = require("../middleware/authMiddleware");
const {
  getMe,
  listUsers,
  listApprovers,
  listPassengers,
} = require("../controllers/userController");

const router = express.Router();

router.use(authenticate);

router.get("/me", asyncHandler(getMe));
router.get("/approvers", asyncHandler(listApprovers));
router.get("/passengers", asyncHandler(listPassengers));
router.get("/", requireRole("superadmin"), asyncHandler(listUsers));

module.exports = router;
