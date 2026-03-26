const mongoose = require("mongoose");

const asyncHandler = require("express-async-handler");
const Placement = require("../models/placement.model");
const Company = require("../models/company.model");
const Student = require("../models/student.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

/* =====================================================
   1️⃣ GET ALL PLACEMENTS
===================================================== */
const getPlacements = asyncHandler(async (req, res) => {
  let {
    page = 1,
    limit = 10,
    reviewStatus,
    search,
    sortBy = "createdAt",
    order = "desc",
    fields,
    companyId,
    ugStream,
    startDate,
    endDate,
  } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const skip = (page - 1) * limit;

  /* ===============================
     MATCH (FILTERING)
  =============================== */

  const matchStage = {
    isDeleted: false,
    $and: [],
  };

  // 👉 Review status
  if (!reviewStatus || reviewStatus === "pending") {
    matchStage.$and.push({
      $or: [
        { companyDesignation: null },
        { companyDesignation: "" },
        { rating: null },
        { review: null },
        { review: "" },
      ],
    });
  }

  if (reviewStatus === "submitted") {
    matchStage.$and.push({
      companyDesignation: { $nin: [null, ""] },
      rating: { $ne: null },
      review: { $nin: [null, ""] },
    });
  }

  // 👉 Company filter
  if (companyId) {
    matchStage.$and.push({
      companyId: new mongoose.Types.ObjectId(companyId),
    });
  }

  // 👉 Stream filter
  if (ugStream) {
    matchStage.$and.push({
      ugStream: ugStream.toLowerCase(),
    });
  }

  // 👉 Date range
  if (startDate || endDate) {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    matchStage.$and.push({ createdAt: dateFilter });
  }

  // 👉 Search (TEXT INDEX)
  if (search) {
    matchStage.$text = { $search: search };
  }

  if (matchStage.$and.length === 0) {
    delete matchStage.$and;
  }

  /* ===============================
     SORTING
  =============================== */

  const sortOrder = order === "asc" ? 1 : -1;

  const sortStage = {};
  sortStage[sortBy] = sortOrder;

  // If using text search → add score
  if (search) {
    sortStage.score = { $meta: "textScore" };
  }

  /* ===============================
     PROJECTION (FIELDS)
  =============================== */

  const allowedFields = [
    "fullName",
    "ugStream",
    "studentImage",
    "companyName",
    "companyImageUrl",
    "companyDesignation",
    "rating",
    "review",
    "reviewSubmittedAt",
    "createdAt",
  ];

  let projection = {};

  if (fields) {
    fields.split(",").forEach((field) => {
      const f = field.trim();
      if (allowedFields.includes(f)) {
        projection[f] = 1;
      }
    });

    projection._id = 1;
  } else {
    // Default fields
    projection = {
      fullName: 1,
      ugStream: 1,
      studentImage: 1,
      companyName: 1,
      companyImageUrl: 1,
      companyDesignation: 1,
      rating: 1,
      review: 1,
      reviewSubmittedAt: 1,
      createdAt: 1,
    };
  }

  /* ===============================
     PIPELINE
  =============================== */

  const pipeline = [
    { $match: matchStage },

    // 👉 Text score support
    ...(search ? [{ $addFields: { score: { $meta: "textScore" } } }] : []),

    { $sort: sortStage },

    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          { $project: projection },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ];

  const result = await Placement.aggregate(pipeline);

  const placements = result[0].data;
  const total = result[0].totalCount[0]?.count || 0;

  return res.json(
    new ApiResponse(200, {
      totalRecords: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      placements,
    })
  );
});




/* =====================================================
   2️⃣ GET SINGLE PLACEMENT
===================================================== */

const getPlacementById = asyncHandler(async (req, res) => {
  const placement = await Placement.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!placement) throw new ApiError(404, "Placement not found");

  res.json(new ApiResponse(200, placement));
});

/* =====================================================
   3️⃣ SUBMIT / UPDATE REVIEW (Editable) //! Student
===================================================== */

const submitOrUpdateReview = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { rating, review } = req.body;

  if (!rating || !review)
    throw new ApiError(400, "Rating and review are required");

  if (rating < 1 || rating > 5)
    throw new ApiError(400, "Rating must be between 1 and 5");

  const placement = await Placement.findOne({
    studentId,
    isDeleted: false,
  });

  if (!placement)
    throw new ApiError(404, "Active placement not found");

  const isFirstSubmission = placement.reviewSubmittedAt === null;

  placement.rating = rating;
  placement.review = review.trim();

  if (isFirstSubmission) {
    placement.reviewSubmittedAt = new Date();
  } else {
    placement.reviewUpdatedAt = new Date();
  }

  await placement.save();

  res.json(new ApiResponse(200, placement, "Review saved successfully"));
});


/* ======================================================
   4️⃣ FINAL PLACEMENT UPDATE (TRANSACTION SAFE) //! HR
====================================================== */

const updatePlacementByHR = asyncHandler(async (req, res) => {
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
      } = req.body;

      const student = await Student.findOne(
        { _id: id, isDeleted: false },
        null,
        { session }
      );

      if (!student) throw new ApiError(404, "Student not found");

      /* ===============================
         UPDATE companiesAttended (optional override)
      =============================== */
      if (companiesAttended !== undefined) {
        if (!Array.isArray(companiesAttended)) {
          throw new ApiError(400, "companiesAttended must be an array");
        }

        student.companiesAttended = companiesAttended;
      }

      /* ===============================
         UPDATE mockRating
      =============================== */
      if (mockRating !== undefined) {
        const allowed = [
          "excellent",
          "good",
          "average",
          "poor",
          "very poor",
        ];

        const normalized = mockRating.toLowerCase().trim();

        if (!allowed.includes(normalized)) {
          throw new ApiError(400, "Invalid mock rating");
        }

        student.mockRating = normalized;
      }

      /* ===============================
         PLACEMENT LOGIC
      =============================== */
      if (typeof isPlaced === "boolean") {
        if (isPlaced) {
          if (!placedCompany) {
            throw new ApiError(400, "placedCompany required");
          }

          const company = await Company.findById(placedCompany).session(session);
          if (!company) throw new ApiError(404, "Company not found");

          if (!student.isPlaced) {
            // CREATE
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
                },
              ],
              { session }
            );

            student.isPlaced = true;
            student.placedCompany = company._id;
          } else {
            // UPDATE
            const placement = await Placement.findOne(
              { studentId: student._id, isDeleted: false },
              null,
              { session }
            );

            if (!placement) throw new ApiError(404, "Placement not found");

            placement.companyId = company._id;
            placement.companyName = company.companyName;
            placement.companyImageUrl = company.companyImageUrl;

            if (companyDesignation !== undefined) {
              placement.companyDesignation = companyDesignation;
            }

            await placement.save({ session });

            student.placedCompany = company._id;
          }
        } else {
          // REMOVE
          await Placement.findOneAndUpdate(
            { studentId: student._id, isDeleted: false },
            { isDeleted: true, deletedAt: new Date() },
            { session }
          );

          student.isPlaced = false;
          student.placedCompany = null;
        }
      }

      /* ===============================
         ONLY DESIGNATION UPDATE
      =============================== */
      if (
        companyDesignation !== undefined &&
        student.isPlaced &&
        isPlaced === undefined
      ) {
        const placement = await Placement.findOne(
          { studentId: student._id, isDeleted: false },
          null,
          { session }
        );

        if (!placement) throw new ApiError(404, "Placement not found");

        placement.companyDesignation = companyDesignation;
        await placement.save({ session });
      }

      await student.save({ session });
    });

    res.json(
      new ApiResponse(200, null, "Placement updated successfully")
    );
  } finally {
    session.endSession();
  }
});
/* =====================================================
   4️⃣ SOFT DELETE PLACEMENT
===================================================== */

const deletePlacement = asyncHandler(async (req, res) => {
  const placement = await Placement.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!placement) throw new ApiError(404, "Placement not found");

  placement.isDeleted = true;
  placement.deletedAt = new Date();
  await placement.save();

  await Student.findByIdAndUpdate(placement.studentId, {
    isPlaced: false,
    placedCompany: null,
  });

  res.json(new ApiResponse(200, null, "Placement deleted successfully"));
});

/* =====================================================
   5️⃣ RESTORE PLACEMENT
===================================================== */

const restorePlacement = asyncHandler(async (req, res) => {
  const placement = await Placement.findOne({
    _id: req.params.id,
    isDeleted: true,
  });

  if (!placement) throw new ApiError(404, "Placement not found");

  placement.isDeleted = false;
  placement.deletedAt = null;
  await placement.save();

  await Student.findByIdAndUpdate(placement.studentId, {
    isPlaced: true,
    placedCompany: placement.companyId,
  });

  res.json(new ApiResponse(200, placement, "Placement restored successfully"));
});

module.exports = {
  getPlacements,
  getPlacementById,
  submitOrUpdateReview,
  updatePlacementByHR,
  deletePlacement,
  restorePlacement,
};