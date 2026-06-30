const { validationResult } = require("express-validator");

function validationErrorHandler(req, res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    message: "Validation failed",
    errors: result.array(),
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ message: "Route not found" });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    message: error.message || "Internal server error",
    details: error.details || undefined,
  });
}

module.exports = {
  validationErrorHandler,
  notFoundHandler,
  errorHandler,
};
