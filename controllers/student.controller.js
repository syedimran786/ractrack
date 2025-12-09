const Student = require("../models/student.model");
const asyncHandler = require("../middlewares/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { optimizeImage } = require("../utils/imageProcessor");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../services/cloudinaryImageService");

/* ======================================================
   CREATE STUDENT
====================================================== */
const createStudent = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    throw new ApiError(400, "Student email is required");
  }

  // 1️⃣ Validate duplicate email
  const emailExists = await Student.findOne({ email: email.trim().toLowerCase() });
  if (emailExists) throw new ApiError(409, "Student email already exists");

  // 2️⃣ Validate photo presence
  if (!req.files?.photo?.[0]) {
    throw new ApiError(400, "Student photo is required");
  }

  const file = req.files.photo[0];
  const rawHash = file.fileHash;

  // 3️⃣ Reject duplicate image
  const existingPhoto = await Student.findOne({ photoHash: rawHash });
  if (existingPhoto) {
    throw new ApiError(409, "Student photo already uploaded");
  }

  // 4️⃣ Upload Photo
  const optimized = await optimizeImage(file.buffer);
  const uploaded = await uploadToCloudinary(optimized, "students");

  const student = await Student.create({
    ...req.body,
    photoUrl: uploaded.secure_url,
    photoId: uploaded.public_id,
    photoHash: rawHash,
  });

  res
    .status(201)
    .json(new ApiResponse(201, student, "Student created successfully"));
});

/* ======================================================
   UPDATE STUDENT
====================================================== */
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const student = await Student.findById(id);
  if (!student) throw new ApiError(404, "Student not found");

  const { email } = req.body;

  // 1️⃣ Validate email uniqueness
  if (email) {
    const emailExists = await Student.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: id },
    });

    if (emailExists) {
      throw new ApiError(409, "Another student already uses this email");
    }

    student.email = email;
  }

  // 2️⃣ Handle photo update
  if (req.files?.photo?.[0]) {
    const file = req.files.photo[0];
    const rawHash = file.fileHash;

    const existingPhoto = await Student.findOne({
      photoHash: rawHash,
      _id: { $ne: id },
    });

    if (existingPhoto) {
      throw new ApiError(409, "Student photo already uploaded");
    }

    // Delete old image
    if (student.photoId) {
      await deleteFromCloudinary(student.photoId);
    }

    const optimized = await optimizeImage(file.buffer);
    const uploaded = await uploadToCloudinary(optimized, "students");

    student.photoUrl = uploaded.secure_url;
    student.photoId = uploaded.public_id;
    student.photoHash = rawHash;
  }

  // 3️⃣ Update other fields
  Object.keys(req.body).forEach((key) => {
    if (req.body[key] !== undefined) student[key] = req.body[key];
  });

  await student.save();

  res.json(new ApiResponse(200, student, "Student updated successfully"));
});

/* ======================================================
   GET ALL STUDENTS
====================================================== */
const getStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({ isDeleted: false });
  res.json(new ApiResponse(200, students));
});

/* ======================================================
   GET STUDENT BY ID
====================================================== */
const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, "Student not found");
  res.json(new ApiResponse(200, student));
});

/* ======================================================
   SOFT DELETE
====================================================== */
const softDeleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, "Student not found");

  student.isDeleted = true;
  student.deletedAt = new Date();
  await student.save();

  res.json(new ApiResponse(200, student, "Student soft deleted"));
});

/* ======================================================
   RESTORE
====================================================== */
const restoreStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, "Student not found");

  student.isDeleted = false;
  student.deletedAt = null;
  await student.save();

  res.json(new ApiResponse(200, student, "Student restored"));
});

/* ======================================================
   HARD DELETE
====================================================== */
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, "Student not found");

  if (student.photoId) {
    await deleteFromCloudinary(student.photoId);
  }

  await student.deleteOne();

  res.json(new ApiResponse(200, null, "Student permanently deleted"));
});

/* ======================================================
   EXPORTS
====================================================== */
module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  softDeleteStudent,
  restoreStudent,
  deleteStudent,
};
