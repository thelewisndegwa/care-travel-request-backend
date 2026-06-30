const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireRole } = require("../middleware/authMiddleware");
const { getMe, listUsers, getMyTeam } = require("../controllers/userController");

const router = express.Router();

router.use(authenticate);

router.get("/me", asyncHandler(getMe));
router.get("/", requireRole("superadmin"), asyncHandler(listUsers));
router.get("/my-team", requireRole("admin"), asyncHandler(getMyTeam));

module.exports = router;
