const ApiError = require("../utils/ApiError");

const authorizeRoles =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized request");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, "Access denied");
    }

    next();
  };

module.exports = authorizeRoles;
