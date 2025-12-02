const asyncHandler = require("../middlewares/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const Student = require("../models/student.model");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { uploadImageService, deleteImageService } = require("../services/cloudinaryImageService");

// Validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Hash generator
const hashBuffer = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

// Reusable image processor
const processImage = async (file, oldId, oldHash, folder = "students") => {
  const newBuffer = file.buffer;
  const newHash = hashBuffer(newBuffer);

  if (newHash === oldHash) {
    return { url: null, public_id: null, hash: oldHash, changed: false };
  }

  if (oldId) await deleteImageService(oldId);

  const uploaded = await uploadImageService(newBuffer, folder);

  return {
    url: uploaded.url,
    public_id: uploaded.public_id,
    hash: newHash,
    changed: true,
  };
};

/* =====================================================
   CREATE STUDENT
===================================================== */
const createStudent = asyncHandler(async (req, res) => {
  const {
    studentName,
    mobile,
    email,
    adharNumber,
    fatherName,
    collegeName,
    address,
    tenthPercentage,
    pucPercentage,
    ugDegree,
    ugStream,
    ugPercentage,
    ugYop,
    pgDegree,
    pgStream,
    pgPercentage,
    pgYop,
    aggregate,
  } = req.body;

  const existing = await Student.findOne({ email });
  if (existing) throw new ApiError(409, "Student with this email already exists");

  let photoData = {};

  if (req.files?.photo) {
    const buffer = req.files.photo[0].buffer;
    const uploaded = await uploadImageService(buffer, "students");
    photoData = {
      photoUrl: uploaded.url,
      photoId: uploaded.public_id,
      photoHash: hashBuffer(buffer),
    };
  }

  const student = await Student.create({
    studentName,
    mobile,
    email,
    adharNumber,
    fatherName,
    collegeName,
    address,
    tenthPercentage,
    pucPercentage,
    ugDegree,
    ugStream,
    ugPercentage,
    ugYop,
    pgDegree,
    pgStream,
    pgPercentage,
    pgYop,
    aggregate,
    ...photoData,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, student, "Student created successfully"));
});

/* =====================================================
   GET ALL STUDENTS
===================================================== */
const getStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({ isDeleted: false }).sort({
    createdAt: -1,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, students, "All students fetched successfully"));
});

/* =====================================================
   GET SINGLE STUDENT
===================================================== */
const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Student ID");

  const student = await Student.findById(id);
  if (!student) throw new ApiError(404, "Student not found");

  return res
    .status(200)
    .json(new ApiResponse(200, student, "Student fetched successfully"));
});

/* =====================================================
   UPDATE STUDENT
===================================================== */
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Student ID");

  const existing = await Student.findById(id);
  if (!existing) throw new ApiError(404, "Student not found");

  const {
    studentName,
    mobile,
    email,
    adharNumber,
    fatherName,
    collegeName,
    address,
    tenthPercentage,
    pucPercentage,
    ugDegree,
    ugStream,
    ugPercentage,
    ugYop,
    pgDegree,
    pgStream,
    pgPercentage,
    pgYop,
    aggregate,
  } = req.body;

  const emailOwner = await Student.findOne({ email, _id: { $ne: id } });
  if (emailOwner)
    throw new ApiError(409, "Student with this email already exists");

  let updatedData = {
    studentName,
    mobile,
    email,
    adharNumber,
    fatherName,
    collegeName,
    address,
    tenthPercentage,
    pucPercentage,
    ugDegree,
    ugStream,
    ugPercentage,
    ugYop,
    pgDegree,
    pgStream,
    pgPercentage,
    pgYop,
    aggregate,
  };

  // Remove undefined fields
  Object.keys(updatedData).forEach(
    (key) => updatedData[key] === undefined && delete updatedData[key]
  );

  // Process image
  if (req.files?.photo) {
    const result = await processImage(
      req.files.photo[0],
      existing.photoId,
      existing.photoHash
    );
    if (result.changed) {
      updatedData.photoUrl = result.url;
      updatedData.photoId = result.public_id;
      updatedData.photoHash = result.hash;
    }
  }

  const updatedStudent = await Student.findByIdAndUpdate(id, updatedData, {
    new: true,
    runValidators: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedStudent, "Student updated successfully"));
});

/* =====================================================
   SOFT DELETE STUDENT
===================================================== */
const softDeleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Student ID");

  const student = await Student.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );

  if (!student) throw new ApiError(404, "Student not found");

  return res
    .status(200)
    .json(new ApiResponse(200, student, "Student soft-deleted"));
});

/* =====================================================
   RESTORE STUDENT
===================================================== */
const restoreStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Student ID");

  const student = await Student.findByIdAndUpdate(
    id,
    { isDeleted: false, deletedAt: null },
    { new: true }
  );

  if (!student) throw new ApiError(404, "Student not found");

  return res
    .status(200)
    .json(new ApiResponse(200, student, "Student restored successfully"));
});

/* =====================================================
   HARD DELETE STUDENT
===================================================== */
const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Student ID");

  const student = await Student.findById(id);
  if (!student) throw new ApiError(404, "Student not found");

  if (student.photoId) await deleteImageService(student.photoId);

  await Student.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Student permanently deleted"));
});

/* =====================================================
   EXPORTS
===================================================== */
module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  softDeleteStudent,
  restoreStudent,
  deleteStudent,
};
