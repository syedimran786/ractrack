const User = require("../models/user.model");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const { hashPassword, comparePassword } = require("../utils/passwordUtils");
const sendMail = require("../utils/sendMail");

const userCredentialsTemplate = require("../utils/emailTemplates/userCredentialsTemplate");
const resetPasswordTemplate = require("../utils/emailTemplates/resetPasswordTemplate");

const createUser = asyncHandler(async (req, res) => {
  const { fullname, email, password, role } = req.body;

  if (!fullname?.trim()) {
    throw new ApiError(400, "fullname is required");
  }

  if (!email?.trim()) {
    throw new ApiError(400, "email is required");
  }

  if (!password?.trim()) {
    throw new ApiError(400, "password is required");
  }

  if (!role) {
    throw new ApiError(400, "role is required");
  }

  const existingUser = await User.findOne({
    email: email.toLowerCase(),
    isDeleted: false,
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists with this email");
  }

  const hashedPassword = await hashPassword(password);

  const mustChangePassword = role === "student" ? false : true;

  const user = await User.create({
    fullname: fullname.trim(),
    email: email.toLowerCase(),
    password: hashedPassword,
    role,
    mustChangePassword
  });

  // Send Credentials Mail
  try {
    await sendMail({
      to: user.email,
      subject: "Your Account Credentials",

      html: userCredentialsTemplate({
        fullname: user.fullname,
        email: user.email,
        password,
        role: user.role,
      }),
    });
  } catch (error) {
    console.error("Email sending failed:", error.message);
  }

  const createdUser = await User.findById(user._id).select("-password");

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        createdUser,
        "User created successfully and credentials sent to email",
      ),
    );
});

const getUsers = asyncHandler(async (req, res) => {
  const { search, role, isActive, page = 1, limit = 10 } = req.query;

  const query = { isDeleted: false };

  // Search by fullname or email
  if (search?.trim()) {
    query.$or = [
      {
        fullname: {
          $regex: search.trim(),
          $options: "i",
        },
      },
      {
        email: {
          $regex: search.trim(),
          $options: "i",
        },
      },
    ];
  }

  // Filter by role
  if (role) {
    query.role = role;
  }

  // Filter by status
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  const pageNumber = Math.max(1, Number(page) || 1);

  const limitNumber = Math.max(1, Number(limit) || 10);

  const skip = (pageNumber - 1) * limitNumber;

  const [users, totalUsers] = await Promise.all([
    User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),

    User.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          totalUsers,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalUsers / limitNumber),
          limit: limitNumber,
        },
      },
      "Users fetched successfully",
    ),
  );
});

const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findOne({
    _id: id,
    isDeleted: false,
  })
    .select("-password")
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { fullname, email, role } = req.body;

  const user = await User.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (email && email.toLowerCase() !== user.email) {
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: id },
      isDeleted: false,
    });

    if (existingUser) {
      throw new ApiError(409, "Email already exists");
    }

    user.email = email.toLowerCase();
  }

  if (fullname?.trim()) {
    user.fullname = fullname.trim();
  }

  if (role) {
    user.role = role;
  }

  await user.save();

  const updatedUser = await User.findById(id).select("-password").lean();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User updated successfully"));
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "isActive must be true or false");
  }

  const user = await User.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false,
    },
    { isActive },
    {
      new: true,
      runValidators: true,
    },
  )
    .select("-password")
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        `User ${isActive ? "activated" : "deactivated"} successfully`,
      ),
    );
});

//! User
const changePassword = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword?.trim()) {
    throw new ApiError(400, "oldPassword is required");
  }

  if (!newPassword?.trim()) {
    throw new ApiError(400, "newPassword is required");
  }

  const user = await User.findById(id).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await comparePassword(oldPassword, user.password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = await hashPassword(newPassword);
  user.mustChangePassword = false; //!

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});

//! Super Admin or forgot password(after admin resets the password user has to change his own password by using changepassword controller --- user.mustChangePassword === true)
const resetPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword?.trim()) {
    throw new ApiError(400, "newPassword is required");
  }

  const user = await User.findById(id).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.password = await hashPassword(newPassword);

  // Force user to change password on next login
  user.mustChangePassword = true;

  await user.save();

  await resetPasswordTemplate({
    fullname: user.fullname,
    email: user.email,
    password: newPassword,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successfully"));
});

const softDeleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false,
    },
    {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false,
    },
    {
      new: true,
    },
  )
    .select("-password")
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User soft deleted successfully"));
});

const restoreUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findOneAndUpdate(
    {
      _id: id,
      isDeleted: true,
    },
    {
      isDeleted: false,
      deletedAt: null,
      isActive: true,
    },
    {
      new: true,
    },
  )
    .select("-password")
    .lean();

  if (!user) {
    throw new ApiError(404, "Deleted user not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User restored successfully"));
});

const hardDeleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "User permanently deleted"));
});

const resendCredentials = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Generate temporary password
  const temporaryPassword = Math.random().toString(36).slice(-8);

  // Update password
  user.password = await hashPassword(temporaryPassword);

  await user.save();

  // Send credentials email
  await sendMail({
    to: user.email,
    subject: "Your Student Management Account Credentials",

    html: userCredentialsTemplate({
      fullname: user.fullname,
      email: user.email,
      password: temporaryPassword,
      role: user.role,
    }),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Credentials resent successfully"));
});

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  changePassword,
  resetPassword,
  softDeleteUser,
  restoreUser,
  hardDeleteUser,
  resendCredentials,
};
