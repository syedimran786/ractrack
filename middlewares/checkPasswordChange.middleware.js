const ApiError = require("../utils/ApiError");

const checkPasswordChange = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized request");
  }

  if (req.user.mustChangePassword) {
    throw new ApiError(
      403,
      "Please change your password before accessing this resource",
    );
  }

  next();
};

module.exports = checkPasswordChange;
