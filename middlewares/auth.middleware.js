const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const User = require("../models/user.model");

const protect = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw new ApiError(401, "User is inactive or does not exist");
    }

    req.user = user; // 🔥 attach logged-in user
    next();
  } catch (error) {
    throw new ApiError(401, "Authentication failed");
  }
};

module.exports = protect;
