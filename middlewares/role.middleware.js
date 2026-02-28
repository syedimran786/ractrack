const ApiError = require("../utils/ApiError");

/**
 * @param  {...string} roles - allowed user roles
 * @example authorize("admin", "hr")
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Not authenticated");
    }

    if (!roles.includes(req.user.type)) {
      throw new ApiError(
        403,
        `Access denied for role: ${req.user.type}`
      );
    }

    next();
  };
};

module.exports = authorize;
