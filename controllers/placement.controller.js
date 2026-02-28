const asyncHandler = require("express-async-handler");
const Placement = require("../models/placement.model");
const Student = require("../models/student.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

/* =====================================================
   1️⃣ GET ALL PLACEMENTS
===================================================== */

const getPlacements = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    companyId,
    ugStream,
    fromDate,
    toDate,
  } = req.query;

  const query = { isDeleted: false };

  if (search) {
    query.$text = { $search: search };
  }

  if (companyId) query.companyId = companyId;

  if (ugStream) query.ugStream = ugStream.toLowerCase();

  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) query.createdAt.$lte = new Date(toDate);
  }

  const skip = (page - 1) * limit;

  const [placements, total] = await Promise.all([
    Placement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Placement.countDocuments(query),
  ]);

  res.json(
    new ApiResponse(200, {
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
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
   3️⃣ SUBMIT / UPDATE REVIEW (Editable)
===================================================== */

const submitOrUpdateReview = asyncHandler(async (req, res) => {
  const { studentId, rating, review } = req.body;

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
  deletePlacement,
  restorePlacement,
};