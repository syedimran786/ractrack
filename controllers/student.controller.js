const Student = require("../models/student.model");
const Company = require("../models/company.model");
const Placement = require("../models/placement.model");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { optimizeImage } = require("../utils/imageProcessor");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../services/cloudinaryImageService");
const buildStudentQuery = require("../utils/buildStudentQuery");

/* ======================================================
   CREATE STUDENT
====================================================== */
const createStudent = asyncHandler(async (req, res) => {
  const { email, mobile, adharNumber } = req.body;

  if (!req.files?.photo?.[0]) {
    throw new ApiError(400, "Student photo is required");
  }

  const file = req.files.photo[0];
  const rawHash = file.fileHash;

  const existingStudent = await Student.findOne({
    $or: [
      { email: email?.toLowerCase() },
      { mobile },
      { adharNumber },
      { photoHash: rawHash },
    ],
  }).lean();

  if (existingStudent) {
    if (existingStudent.email === email?.toLowerCase())
      throw new ApiError(409, "Student email already exists");

    if (existingStudent.mobile === mobile)
      throw new ApiError(409, "Mobile number already exists");

    if (existingStudent.adharNumber === adharNumber)
      throw new ApiError(409, "Aadhar number already exists");

    if (existingStudent.photoHash === rawHash)
      throw new ApiError(409, "Student photo already uploaded");
  }

  const optimized = await optimizeImage(file.buffer);
  const uploaded = await uploadToCloudinary(optimized, "students");

  const student = await Student.create({
    ...req.body,
    email: email?.toLowerCase(),
    photoUrl: uploaded.secure_url,
    photoId: uploaded.public_id,
    photoHash: rawHash,
  });

  res
    .status(201)
    .json(new ApiResponse(201, student, "Student created successfully"));
});

/* ======================================================
   GET ALL STUDENTS
====================================================== */
const getStudents = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = buildStudentQuery(req.query);

  let sort = { createdAt: -1 };

  if (req.query.sortByRating || req.query.sortByBatch) {
    sort = {};
    if (req.query.sortByRating) {
      sort.mockRating =
        req.query.sortByRating.toLowerCase() === "asc" ? 1 : -1;
    }
    if (req.query.sortByBatch) {
      sort.batch =
        req.query.sortByBatch.toLowerCase() === "asc" ? 1 : -1;
    }
  }

  const [students, total, stats] = await Promise.all([
    Student.find(query)
      .select("-photoHash -photoId -companies") // ✅ hide companies for list
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .lean(),

    Student.countDocuments(query),

    Student.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$isPlaced", count: { $sum: 1 } } },
    ]),
  ]);

  const placed = stats.find((s) => s._id === true)?.count || 0;
  const notPlaced = stats.find((s) => s._id === false)?.count || 0;

  res.json(
    new ApiResponse(200, {
      students,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      counts: { placed, notPlaced },
    })
  );
});

/* ======================================================
   GET STUDENT BY ID
====================================================== */
const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).lean();
  if (!student) throw new ApiError(404, "Student not found");

  res.json(new ApiResponse(200, student));
});

/* ======================================================
   UPDATE STUDENT (SAFE UPDATE)
====================================================== */
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const student = await Student.findById(id);
  if (!student) throw new ApiError(404, "Student not found");

  // ✅ Email uniqueness
  if (req.body.email) {
    const exists = await Student.findOne({
      email: req.body.email.toLowerCase(),
      _id: { $ne: id },
    });
    if (exists) throw new ApiError(409, "Email already exists");

    student.email = req.body.email.toLowerCase();
  }

  // ✅ Photo update
  if (req.files?.photo?.[0]) {
    const file = req.files.photo[0];
    const rawHash = file.fileHash;

    const duplicate = await Student.findOne({
      photoHash: rawHash,
      _id: { $ne: id },
    });

    if (duplicate)
      throw new ApiError(409, "Student photo already uploaded");

    if (student.photoId) await deleteFromCloudinary(student.photoId);

    const optimized = await optimizeImage(file.buffer);
    const uploaded = await uploadToCloudinary(optimized, "students");

    student.photoUrl = uploaded.secure_url;
    student.photoId = uploaded.public_id;
    student.photoHash = rawHash;
  }

  // ✅ SAFE FIELD UPDATE (NO companies overwrite)
  const allowedFields = [
    "studentName",
    "mobile",
    "adharNumber",
    "fatherName",
    "collegeName",
    "address",
    "tenthPercentage",
    "pucPercentage",
    "ugDegree",
    "ugStream",
    "ugPercentage",
    "ugYop",
    "pgDegree",
    "pgStream",
    "pgPercentage",
    "pgYop",
    "aggregate",
    "batch",
    "isJoined",
    "isPaid",
    "mockRating",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      student[field] = req.body[field];
    }
  });

  await student.save();

  res.json(new ApiResponse(200, student, "Student updated successfully"));
});

/* ======================================================
   DELETE / RESTORE
====================================================== */
const softDeleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, "Student not found");

  student.isDeleted = true;
  student.deletedAt = new Date();

  await student.save();

  res.json(new ApiResponse(200, null, "Student soft deleted"));
});

const restoreStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, "Student not found");

  student.isDeleted = false;
  student.deletedAt = null;

  await student.save();

  res.json(new ApiResponse(200, null, "Student restored"));
});

const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, "Student not found");

  if (student.photoId) await deleteFromCloudinary(student.photoId);

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