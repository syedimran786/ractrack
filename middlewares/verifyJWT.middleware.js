const jwt = require("jsonwebtoken");

const User = require("../models/user.model");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const verifyJWT = asyncHandler(
  async (req, res, next) => {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace(
        "Bearer ",
        ""
      );

    if (!token) {
      throw new ApiError(
        401,
        "Unauthorized request"
      );
    }

    let decodedToken;

    try {
      decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET
      );
    } catch (error) {
      throw new ApiError(
        401,
        "Invalid or expired token"
      );
    }

    const user =
      await User.findById(
        decodedToken.id
      ).select(
        "-password -refreshToken"
      );

    if (!user) {
      throw new ApiError(
        401,
        "User not found"
      );
    }

    if (user.isDeleted) {
      throw new ApiError(
        403,
        "Account has been deleted"
      );
    }

    if (!user.isActive) {
      throw new ApiError(
        403,
        "Account is inactive"
      );
    }

    req.user = user;

    next();
  }
);

module.exports = verifyJWT;