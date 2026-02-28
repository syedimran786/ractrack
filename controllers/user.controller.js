const User = require("../models/user.model");
const asyncHandler = require("../middlewares/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { hashPassword, comparePassword } = require("../utils/passwordUtils");
const { generateToken } = require("../utils/tokenUtils");

/* ======================================================
   ADD USER
====================================================== */
const createUser = asyncHandler(async (req, res) => {
  const { username, email, password, type } = req.body;

  if (!username || !email || !password || !type) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new ApiError(409, "User already exists");

  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password: hashedPassword,
    type,
  });

  res.status(201).json(
    new ApiResponse(201, user, "User created successfully")
  );
});

/* ======================================================
   LOGIN USER
====================================================== */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    isActive: true,
  }).select("+password");

  // ❌ User not found
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isMatch = await comparePassword(password, user.password);

  // ❌ Password mismatch
  if (!isMatch) {
    throw new ApiError(401, "Incorrect password");
  }

  const token = generateToken(user);

  res
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    })
    .json(new ApiResponse(200, user, "Login successful"));
});

/* ======================================================
   LOGOUT USER
====================================================== */
const logoutUser = asyncHandler(async (req, res) => {
  res
    .clearCookie("token")
    .json(new ApiResponse(200, null, "Logged out successfully"));
});

/* ======================================================
   GET ALL USERS
====================================================== */
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.json(new ApiResponse(200, users));
});

/* ======================================================
   GET USER BY ID
====================================================== */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw new ApiError(404, "User not found");

  res.json(new ApiResponse(200, user));
});

/* ======================================================
   UPDATE USER
====================================================== */
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  Object.keys(req.body).forEach((key) => {
    if (req.body[key] !== undefined && key !== "password") {
      user[key] = req.body[key];
    }
  });

  await user.save();
  res.json(new ApiResponse(200, user, "User updated successfully"));
});

/* ======================================================
   SOFT DELETE USER
====================================================== */
const softDeleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  user.isActive = false;
  await user.save();

  res.json(new ApiResponse(200, user, "User deactivated"));
});

/* ======================================================
   EXPORTS
====================================================== */
module.exports = {
  createUser,
  loginUser,
  logoutUser,
  getUsers,
  getUserById,
  updateUser,
  softDeleteUser,
};
