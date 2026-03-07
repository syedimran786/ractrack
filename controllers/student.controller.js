const Student = require("../models/student.model");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { optimizeImage } = require("../utils/imageProcessor");
const { uploadToCloudinary, deleteFromCloudinary } = require("../services/cloudinaryImageService");
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

  /* ================================
     Check duplicate email/mobile/aadhar/photo
  ================================= */

  const existingStudent = await Student.findOne({
    $or: [
      { email: email?.toLowerCase() },
      { mobile },
      { adharNumber },
      { photoHash: rawHash }
    ],
  }).lean();

  if (existingStudent) {

    if (existingStudent.email === email?.toLowerCase()) {
      throw new ApiError(409, "Student email already exists");
    }

    if (existingStudent.mobile === mobile) {
      throw new ApiError(409, "Mobile number already exists");
    }

    if (existingStudent.adharNumber === adharNumber) {
      throw new ApiError(409, "Aadhar number already exists");
    }

    if (existingStudent.photoHash === rawHash) {
      throw new ApiError(409, "Student photo already uploaded");
    }
  }

  /* ================================
     Image Optimization + Upload
  ================================= */

  const optimized = await optimizeImage(file.buffer);
  const uploaded = await uploadToCloudinary(optimized, "students");

  /* ================================
     Create Student
  ================================= */

  const student = await Student.create({
    ...req.body,
    email: email?.toLowerCase(),
    photoUrl: uploaded.secure_url,
    photoId: uploaded.public_id,
    photoHash: rawHash,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, student, "Student created successfully"));
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
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { id } = req.params;

      const {
        companiesAttended,
        isPlaced,
        placedCompany,
        mockRating,
        companyDesignation,
        rating,
        review,
      } = req.body;

      const student = await Student.findOne(
        { _id: id, isDeleted: false },
        null,
        { session }
      );

      if (!student) throw new ApiError(404, "Student not found");

      /* ===============================
         Update companiesAttended
      =============================== */

      if (Array.isArray(companiesAttended)) {
        student.companiesAttended = [...new Set(companiesAttended)];
      }

      /* ===============================
         Update mockRating
      =============================== */

      if (mockRating !== undefined) {
        const allowedRatings = [
          "excellent",
          "good",
          "average",
          "poor",
          "very poor",
        ];

        if (!allowedRatings.includes(mockRating.toLowerCase())) {
          throw new ApiError(400, "Invalid mock rating value");
        }

        student.mockRating = mockRating.toLowerCase();
      }

      /* ===============================
         Placement Handling
      =============================== */

      if (typeof isPlaced === "boolean") {
        if (isPlaced) {
          if (!placedCompany) {
            throw new ApiError(
              400,
              "placedCompany is required when marking student as placed"
            );
          }

          if (!mongoose.Types.ObjectId.isValid(placedCompany)) {
            throw new ApiError(400, "Invalid company id");
          }

          if (student.isPlaced) {
            throw new ApiError(400, "Student already placed");
          }

          const company = await Company.findOne(
            { _id: placedCompany, isDeleted: false },
            null,
            { session }
          );

          if (!company) {
            throw new ApiError(404, "Placed company not found");
          }

          const existingPlacement = await Placement.findOne(
            { studentId: student._id, isDeleted: false },
            null,
            { session }
          );

          if (existingPlacement) {
            throw new ApiError(
              400,
              "Student already has an active placement"
            );
          }

          await Placement.create(
            [
              {
                studentId: student._id,
                companyId: company._id,

                fullName: student.studentName,
                ugStream: student.ugStream,
                studentEmail: student.email,
                studentMobile: student.mobile,
                studentImage: student.photoUrl,

                companyName: company.companyName,
                companyImageUrl: company.companyImageUrl,

                companyDesignation,
                rating,
                review,
              },
            ],
            { session }
          );

          student.isPlaced = true;
          student.placedCompany = company._id;
        } else {
          await Placement.findOneAndUpdate(
            {
              studentId: student._id,
              companyId: student.placedCompany,
              isDeleted: false,
            },
            {
              isDeleted: true,
              deletedAt: new Date(),
            },
            { session }
          );

          student.isPlaced = false;
          student.placedCompany = null;
        }
      }

      await student.save({ session });
    });

    return res.json(
      new ApiResponse(200, null, "Placement details updated successfully")
    );
  } finally {
    session.endSession();
  }
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
