const ApiError = require("../utils/ApiError");

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (
      !roles.includes(req.user.role)
    ) {
      throw new ApiError(
        403,
        "Access denied"
      );
    }

    next();
  };
};

module.exports = authorizeRoles;