const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { comparePassword, hashPassword } = require("../utils/passwordUtils");

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim()) {
    throw new ApiError(400, "email is required");
  }

  if (!password?.trim()) {
    throw new ApiError(400, "password is required");
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    isDeleted: false,
  }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account is inactive");
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const accessToken = user.generateAccessToken();

  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;

  await user.save({
    validateBeforeSave: false,
  });

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          mustChangePassword: user.mustChangePassword,
        },
        "Login successful",
      ),
    );
});

const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: {
      refreshToken: 1,
    },
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, null, "Logout successful"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(decodedToken.id).select("+refreshToken");

  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token expired");
  }

  const accessToken = user.generateAccessToken();

  const newRefreshToken = user.generateRefreshToken();

  user.refreshToken = newRefreshToken;

  await user.save({
    validateBeforeSave: false,
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
        },
        "Access token refreshed",
      ),
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken",
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Current user fetched successfully"));
});

const changeFirstLoginPassword = asyncHandler(async (req, res) => {
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword?.trim()) {
    throw new ApiError(400, "newPassword is required");
  }

  if (!confirmPassword?.trim()) {
    throw new ApiError(400, "confirmPassword is required");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  const user = await User.findOne({
    _id: req.user._id,
    isDeleted: false,
  }).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.mustChangePassword) {
    throw new ApiError(400, "Password already changed");
  }

  user.password = await hashPassword(newPassword);

  user.mustChangePassword = false;

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password updated successfully"));
});

module.exports = {
  login,
  logout,
  refreshAccessToken,
  getCurrentUser,
  changeFirstLoginPassword,
};
