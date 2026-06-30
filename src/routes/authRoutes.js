const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { login, activateAccount, setPassword } = require("../controllers/authController");
const {
  loginValidator,
  activateAccountValidator,
  setPasswordValidator,
} = require("../validators/authValidators");
const { validationErrorHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.post("/login", loginValidator, validationErrorHandler, asyncHandler(login));
router.post(
  "/activate",
  activateAccountValidator,
  validationErrorHandler,
  asyncHandler(activateAccount)
);
router.post(
  "/set-password",
  setPasswordValidator,
  validationErrorHandler,
  asyncHandler(setPassword)
);

module.exports = router;
