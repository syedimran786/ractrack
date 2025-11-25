const ApiError = require("../utils/ApiError");

const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err);

  const statusCode = err.statusCode || 500;
  const message =
    err.message || "Internal Server Error";

  // If validation error (mongoose)
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  // If CastError (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  // If using ApiError
  if (err instanceof ApiError) {
    return res.status(statusCode).json({
      success: false,
      message: message,
      errors: err.errors || [],
    });
  }

  // Default fallback
  return res.status(500).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
