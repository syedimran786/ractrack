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

  // ✅ Parallel duplicate check
  const existing = await Student.findOne({
    $or: [
      { email: email?.toLowerCase() },
      { mobile },
      { adharNumber },
      { photoHash: rawHash },
    ],
  }).lean();

  if (existing) {
    if (existing.email === email?.toLowerCase())
      throw new ApiError(409, "Email already exists");

    if (existing.mobile === mobile)
      throw new ApiError(409, "Mobile already exists");

    if (existing.adharNumber === adharNumber)
      throw new ApiError(409, "Aadhar already exists");

    if (existing.photoHash === rawHash)
      throw new ApiError(409, "Duplicate photo detected");
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

  res.status(201).json(
    new ApiResponse(201, student, "Student created successfully")
  );
});

/* ======================================================
   GET ALL STUDENTS
====================================================== */
const getStudents = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, search } = req.query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;
  const skip = (page - 1) * limit;

  const query = buildStudentQuery(req.query);

  // ✅ Always exclude deleted
  query.isDeleted = false;

  /* ======================================================
     🔍 GLOBAL SEARCH (name / email / mobile)
  ====================================================== */
  if (search) {
    const searchRegex = new RegExp(search.toLowerCase(), "i");

    const orConditions = [
      { studentName: searchRegex },
      { email: searchRegex },
    ];

    // ✅ If numeric → include mobile search
    if (!isNaN(search)) {
      orConditions.push({ mobile: search });
    }

    query.$or = orConditions;
  }

  /* ======================================================
     🔽 SORTING
  ====================================================== */
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

  /* ======================================================
     🚀 PARALLEL EXECUTION
  ====================================================== */
  const [students, total, stats] = await Promise.all([
    Student.find(query)
      .select("-photoHash -photoId -companies") // reduce payload
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .lean(),

    Student.countDocuments(query),

    // ✅ Stats should also respect filters (important fix)
    Student.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$isPlaced",
          count: { $sum: 1 },
        },
      },
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
  const student = await Student.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate("placedCompany", "companyName companyCode")
    .lean();

  if (!student) throw new ApiError(404, "Student not found");

  res.json(new ApiResponse(200, student));
});

/* ======================================================
   UPDATE STUDENT (SAFE UPDATE)
====================================================== */
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const student = await Student.findById(id);
  if (!student || student.isDeleted)
    throw new ApiError(404, "Student not found");

  // ✅ Email uniqueness
  if (req.body.email) {
    const exists = await Student.findOne({
      email: req.body.email.toLowerCase(),
      _id: { $ne: id },
    });

    if (exists) throw new ApiError(409, "Email already exists");

    student.email = req.body.email.toLowerCase();
  }

  // ✅ Mobile uniqueness
  if (req.body.mobile) {
    const exists = await Student.findOne({
      mobile: req.body.mobile,
      _id: { $ne: id },
    });

    if (exists) throw new ApiError(409, "Mobile already exists");

    student.mobile = req.body.mobile;
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
      throw new ApiError(409, "Duplicate photo detected");

    if (student.photoId) {
      await deleteFromCloudinary(student.photoId);
    }

    const optimized = await optimizeImage(file.buffer);
    const uploaded = await uploadToCloudinary(optimized, "students");

    student.photoUrl = uploaded.secure_url;
    student.photoId = uploaded.public_id;
    student.photoHash = rawHash;
  }

  // ✅ Allowed fields only
  const allowedFields = [
    "studentName",
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
    "isPaid",
    "mockRating",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      student[field] = req.body[field];
    }
  });

  await student.save();

  res.json(
    new ApiResponse(200, student, "Student updated successfully")
  );
});
/* ======================================================
   DELETE / RESTORE
====================================================== */
const softDeleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, "Student not found");

  if (student.isDeleted)
    throw new ApiError(400, "Already deleted");

  student.isDeleted = true;
  student.deletedAt = new Date();

  await student.save();

  res.json(new ApiResponse(200, null, "Student soft deleted"));
});

const restoreStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, "Student not found");

  if (!student.isDeleted)
    throw new ApiError(400, "Student is not deleted");

  student.isDeleted = false;
  student.deletedAt = null;

  await student.save();

  res.json(new ApiResponse(200, null, "Student restored"));
});

const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, "Student not found");

  if (student.photoId) {
    await deleteFromCloudinary(student.photoId);
  }

  await student.deleteOne();

  res.json(
    new ApiResponse(200, null, "Student permanently deleted")
  );
});


// //!------------ old
// const updateJoiningStatus = asyncHandler(async (req, res) => {
//   const { studentId } = req.params;

//   let { companyCode, isJoinedToCompany } = req.body;

//   // Validate companyCode
//   if (!companyCode || !companyCode.trim()) {
//     throw new ApiError(400, "companyCode is required");
//   }

//   // Validate isJoinedToCompany
//   if (typeof isJoinedToCompany !== "boolean") {
//     throw new ApiError(400, "isJoinedToCompany must be true or false");
//   }

//   // Normalize companyCode
//   companyCode = companyCode.trim().toUpperCase();

//   // Find student
//   const student = await Student.findOne({
//     _id: studentId,
//     isDeleted: false,
//   });

//   if (!student) {
//     throw new ApiError(404, "Student not found");
//   }

//   // Find company inside student companies
//   const company = student.companies.find(
//     (c) => c.companyCode === companyCode
//   );

//   if (!company) {
//     throw new ApiError(
//       404,
//       "Company interview not found for this student"
//     );
//   }

//   // Allow joining only if selected
//   if (company.status !== "selected") {
//     throw new ApiError(
//       400,
//       "Student can join only selected companies"
//     );
//   }

//   // Update joining status
//   student.isJoinedToCompany = isJoinedToCompany;

//   // Update placedCompany
//   student.placedCompany = isJoinedToCompany
//     ? company.companyName
//     : "N/A";

//   // Debug logs
//   console.log("Joining Status:", student.isJoinedToCompany);
//   console.log("Placed Company:", student.placedCompany);

//   // Save changes
//   await student.save();

//   res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         student,
//         joinedCompany: isJoinedToCompany
//           ? company.companyCode
//           : null,
//       },
//       "Joining status updated successfully"
//     )
//   );
// });
// //!------------
const updateJoiningStatus = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  let {
    companyCode,
    isJoinedToCompany,
    companyDesignation,
  } = req.body;

  /* =========================================
     VALIDATIONS
  ========================================= */

  if (!companyCode || !companyCode.trim()) {
    throw new ApiError(400, "companyCode is required");
  }

  if (typeof isJoinedToCompany !== "boolean") {
    throw new ApiError(
      400,
      "isJoinedToCompany must be true or false"
    );
  }

  if (
    isJoinedToCompany === true &&
    (!companyDesignation || !companyDesignation.trim())
  ) {
    throw new ApiError(
      400,
      "companyDesignation is required when joining"
    );
  }

  companyCode = companyCode.trim().toUpperCase();

  /* =========================================
     FIND STUDENT
  ========================================= */

  const student = await Student.findOne({
    _id: studentId,
    isDeleted: false,
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  /* =========================================
     FIND COMPANY IN STUDENT RECORD
  ========================================= */

  const company = student.companies.find(
    (c) => c.companyCode === companyCode
  );

  if (!company) {
    throw new ApiError(
      404,
      "Company interview not found for this student"
    );
  }

  /* =========================================
     ALLOW JOIN ONLY IF SELECTED
  ========================================= */

  if (company.status !== "selected") {
    throw new ApiError(
      400,
      "Student can join only selected companies"
    );
  }

  /* =========================================
     UPDATE JOINING STATUS
  ========================================= */

  student.isJoinedToCompany = isJoinedToCompany;

  student.placedCompany = isJoinedToCompany
    ? company.companyName
    : student.placedCompany;

  /* =========================================
     CREATE / UPDATE PLACEMENT
  ========================================= */

  if (isJoinedToCompany) {
    const companyDoc = await Company.findOne({
      companyName: company.companyName
        .trim()
        .toLowerCase(),
      isDeleted: false,
    });

    if (!companyDoc) {
      throw new ApiError(
        404,
        `Company '${company.companyName}' not found`
      );
    }

    let placement = await Placement.findOne({
      studentId: student._id,
      isDeleted: false,
    });

    if (!placement) {
      placement = await Placement.create({
        studentId: student._id,

        /* Company Snapshot */
        companyId: companyDoc._id,
        companyName: company.companyName,
        companyImageUrl:
          companyDoc.companyImageUrl,

        /* Student Snapshot */
        fullName: student.studentName,
        ugStream: student.ugStream,
        studentEmail: student.email,
        studentMobile: student.mobile,
        studentImage: student.photoUrl,

        /* Placement Data */
        companyDesignation:
          companyDesignation.trim(),
      });
    } else {
      placement.companyId = companyDoc._id;
      placement.companyName =
        company.companyName;
      placement.companyImageUrl =
        companyDoc.companyImageUrl;

      placement.companyDesignation =
        companyDesignation.trim();

      await placement.save();
    }
  }

  /* =========================================
     REMOVE PLACEMENT IF NOT JOINED
  ========================================= */

  else {
    await Placement.findOneAndDelete({
      studentId: student._id,
    });
  }

  /* =========================================
     SAVE STUDENT
  ========================================= */

  await student.save();

  /* =========================================
     RESPONSE
  ========================================= */

  res.status(200).json(
    new ApiResponse(
      200,
      {
        student,
        joinedCompany: isJoinedToCompany
          ? company.companyCode
          : null,
      },
      "Joining status updated successfully"
    )
  );
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
  updateJoiningStatus
};