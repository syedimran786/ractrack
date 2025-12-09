const Placement = require("../models/placement.model");
const Student = require("../models/student.model");
const Company = require("../models/company.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../middlewares/asyncHandler");

/* ---------------------------------------------
   CREATE PLACEMENT
----------------------------------------------*/
const createPlacement = asyncHandler(async (req, res) => {
  const { mobile, email, companyId, companyDesignation, rating, review } = req.body;

  // Student lookup
  if (!mobile && !email)
    throw new ApiError(400, "Provide either mobile or email to identify student");

  const student = await Student.findOne({
    $or: [{ mobile }, { email }],
  });

  if (!student) throw new ApiError(404, "Student not found");

  // Company lookup
  const company = await Company.findById(companyId);
  if (!company) throw new ApiError(404, "Company not found");

  // Prevent duplicate placement
  const exists = await Placement.findOne({
    studentId: student._id,
    companyId: company._id,
  });

  if (exists) throw new ApiError(400, "Student already placed in this company");

  const placement = await Placement.create({
    studentId: student._id,
    companyId: company._id,

    fullName: student.studentName,
    department: student.ugStream,
    studentEmail: student.email,
    studentMobile: student.mobile,
    studentImage: student.photoUrl,

    companyName: company.companyName,
    companyImage: company.companyImageUrl,

    companyDesignation,
    rating,
    review,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, placement, "Placement created successfully"));
});

/* ---------------------------------------------
   GET ALL PLACEMENTS
----------------------------------------------*/
const getPlacements = asyncHandler(async (req, res) => {
  const { department, companyName } = req.query;

  const filter = { isDeleted: false };

  if (department) filter.department = department.toLowerCase();
  if (companyName) filter.companyName = companyName.toLowerCase();

  const placements = await Placement.find(filter).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, placements, "Placements fetched successfully"));
});

/* ---------------------------------------------
   GET SINGLE PLACEMENT
----------------------------------------------*/
const getPlacementById = asyncHandler(async (req, res) => {
  const placement = await Placement.findById(req.params.id);

  if (!placement) throw new ApiError(404, "Placement not found");

  return res
    .status(200)
    .json(new ApiResponse(200, placement, "Placement fetched successfully"));
});

/* ---------------------------------------------
   UPDATE PLACEMENT
----------------------------------------------*/
const updatePlacement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { companyDesignation, rating, review } = req.body;

  const placement = await Placement.findById(id);
  if (!placement) throw new ApiError(404, "Placement not found");

  placement.companyDesignation = companyDesignation ?? placement.companyDesignation;
  placement.rating = rating ?? placement.rating;
  placement.review = review ?? placement.review;

  await placement.save();

  return res
    .status(200)
    .json(new ApiResponse(200, placement, "Placement updated successfully"));
});

/* ---------------------------------------------
   SOFT DELETE
----------------------------------------------*/
const softDeletePlacement = asyncHandler(async (req, res) => {
  const placement = await Placement.findById(req.params.id);

  if (!placement) throw new ApiError(404, "Placement not found");

  placement.isDeleted = true;
  placement.deletedAt = new Date();

  await placement.save();

  return res
    .status(200)
    .json(new ApiResponse(200, placement, "Placement soft deleted"));
});

/* ---------------------------------------------
   RESTORE
----------------------------------------------*/
const restorePlacement = asyncHandler(async (req, res) => {
  const placement = await Placement.findById(req.params.id);

  if (!placement) throw new ApiError(404, "Placement not found");

  placement.isDeleted = false;
  placement.deletedAt = null;

  await placement.save();

  return res
    .status(200)
    .json(new ApiResponse(200, placement, "Placement restored successfully"));
});

/* ---------------------------------------------
   HARD DELETE
----------------------------------------------*/
const deletePlacement = asyncHandler(async (req, res) => {
  const placement = await Placement.findById(req.params.id);

  if (!placement) throw new ApiError(404, "Placement not found");

  await placement.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Placement permanently deleted"));
});

/* ---------------------------------------------
   GET ONLY REVIEWS
----------------------------------------------*/
const getReviewsOnly = asyncHandler(async (req, res) => {
  const reviews = await Placement.find(
    { isDeleted: false },
    {
      fullName: 1,
      companyName: 1,
      rating: 1,
      review: 1,
      studentImage: 1,
    }
  ).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, reviews, "Reviews fetched successfully"));
});

/* ---------------------------------------------
   GET ONLY PLACEMENTS (NO REVIEW)
----------------------------------------------*/
const getOnlyPlacements = asyncHandler(async (req, res) => {
  const data = await Placement.find(
    { isDeleted: false },
    {
      fullName: 1,
      department: 1,
      companyName: 1,
      companyDesignation: 1,
      studentImage: 1,
      companyImage: 1,
    }
  ).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, data, "Placements fetched successfully"));
});

module.exports = {
  createPlacement,
  getPlacements,
  getPlacementById,
  updatePlacement,
  softDeletePlacement,
  restorePlacement,
  deletePlacement,
  getReviewsOnly,
  getOnlyPlacements,
};
