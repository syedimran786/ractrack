const Student = require("../models/student.model");
const asyncHandler = require("../middlewares/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { optimizeImage } = require("../utils/imageProcessor");
const { uploadToCloudinary, deleteFromCloudinary } = require("../services/cloudinaryImageService");
const buildStudentQuery = require("../utils/buildStudentQuery");

/* ======================================================
   CREATE STUDENT
====================================================== */
const createStudent = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email?.trim()) throw new ApiError(400, "Student email is required");

  const emailExists = await Student.findOne({ email: email.trim().toLowerCase() });
  if (emailExists) throw new ApiError(409, "Student email already exists");

  if (!req.files?.photo?.[0]) throw new ApiError(400, "Student photo is required");

  const file = req.files.photo[0];
  const rawHash = file.fileHash;

  const duplicatePhoto = await Student.findOne({ photoHash: rawHash });
  if (duplicatePhoto) throw new ApiError(409, "Student photo already uploaded");

  const optimized = await optimizeImage(file.buffer);
  const uploaded = await uploadToCloudinary(optimized, "students");

  const student = await Student.create({
    ...req.body,
    email: email.toLowerCase(),
    photoUrl: uploaded.secure_url,
    photoId: uploaded.public_id,
    photoHash: rawHash,
  });

  res.status(201).json(new ApiResponse(201, student, "Student created successfully"));
});

/* ======================================================
   GET ALL STUDENTS (PAGINATION + SEARCH + FILTERS + COUNTS)
====================================================== */
const getStudents = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = buildStudentQuery(req.query);

  // 🔀 Sorting
  let sort = { createdAt: -1 }; // default

  if (req.query.sortByRating || req.query.sortByBatch) {
    sort = {};
    if (req.query.sortByRating) {
      const order = req.query.sortByRating.toLowerCase() === "asc" ? 1 : -1;
      sort.mockRating = order;
    }
    if (req.query.sortByBatch) {
      const order = req.query.sortByBatch.toLowerCase() === "asc" ? 1 : -1;
      sort.batch = order;
    }
  }

  const [students, total, stats] = await Promise.all([
    Student.find(query)
      .select("-photoHash -photoId")
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
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
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
   UPDATE STUDENT
====================================================== */
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const student = await Student.findById(id);
  if (!student) throw new ApiError(404, "Student not found");

  if (req.body.email) {
    const exists = await Student.findOne({ email: req.body.email.toLowerCase(), _id: { $ne: id } });
    if (exists) throw new ApiError(409, "Another student already uses this email");
    student.email = req.body.email.toLowerCase();
  }

  if (req.files?.photo?.[0]) {
    const file = req.files.photo[0];
    const rawHash = file.fileHash;

    const duplicate = await Student.findOne({ photoHash: rawHash, _id: { $ne: id } });
    if (duplicate) throw new ApiError(409, "Student photo already uploaded");

    if (student.photoId) await deleteFromCloudinary(student.photoId);

    const optimized = await optimizeImage(file.buffer);
    const uploaded = await uploadToCloudinary(optimized, "students");

    student.photoUrl = uploaded.secure_url;
    student.photoId = uploaded.public_id;
    student.photoHash = rawHash;
  }

  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined) student[key] = req.body[key];
  });

  await student.save();

  res.json(new ApiResponse(200, student, "Student updated successfully"));
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

  if (student.photoId) await deleteFromCloudinary(student.photoId);

  await student.deleteOne();

  res.json(new ApiResponse(200, null, "Student permanently deleted"));
});



/* ======================================================
   UPDATE PLACEMENT INFO
====================================================== */
const updatePlacementInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { companiesAttended, isPlaced, placedCompany, mockRating } = req.body;

  const student = await Student.findById(id);
  if (!student) throw new ApiError(404, "Student not found");

  // Update fields only if provided
  if (companiesAttended !== undefined) student.companiesAttended = companiesAttended;
  if (typeof isPlaced === "boolean") student.isPlaced = isPlaced;
  if (placedCompany !== undefined) student.placedCompany = placedCompany;
  if (mockRating !== undefined) student.mockRating = mockRating.toLowerCase();

  await student.save();

  res.json(new ApiResponse(200, student, "Placement details updated successfully"));
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
  updatePlacementInfo
};
