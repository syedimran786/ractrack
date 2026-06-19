// middlewares/password.middleware.js

const ApiError = require(
  "../utils/ApiError"
);

const requirePasswordChange = (
  req,
  res,
  next
) => {
  if (
    req.user.mustChangePassword
  ) {
    throw new ApiError(
      403,
      "Please change your password before continuing"
    );
  }

  next();
};

module.exports =
  requirePasswordChange;