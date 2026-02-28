const Interview = require("../models/interview.model");
const asyncHandler = require("../middlewares/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

/* ======================================================
   CREATE INTERVIEW
====================================================== */
const createInterview = asyncHandler(async (req, res) => {
  const { interviewName, announcedDate, requiredCandidates } = req.body;

  if (!interviewName?.trim()) throw new ApiError(400, "Interview name is required");
  if (!announcedDate) throw new ApiError(400, "Announced date is required");
  if (!requiredCandidates) throw new ApiError(400, "Required candidates is required");

  const interview = await Interview.create({
    ...req.body,
    interviewName: interviewName.toLowerCase(),
  });

  res.status(201).json(
    new ApiResponse(201, interview, "Interview created successfully")
  );
});

/* ======================================================
   GET ALL INTERVIEWS (SEARCH)
====================================================== */
const getInterviews = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const query = { isActive: true };

  if (search) {
    query.interviewName = {
      $regex: search,
      $options: "i",
    };
  }

  const interviews = await Interview.find(query)
    .sort({ createdAt: -1 })
    .lean();

  res.json(
    new ApiResponse(200, {
      count: interviews.length,
      interviews,
    })
  );
});

/* ======================================================
   GET INTERVIEW BY ID
====================================================== */
const getInterviewById = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    isActive: true,
  }).lean();

  if (!interview) throw new ApiError(404, "Interview not found");

  res.json(new ApiResponse(200, interview));
});

/* ======================================================
   UPDATE INTERVIEW
====================================================== */
const updateInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new ApiError(404, "Interview not found");

  Object.keys(req.body).forEach((key) => {
    if (req.body[key] !== undefined) {
      interview[key] =
        key === "interviewName"
          ? req.body[key].toLowerCase()
          : req.body[key];
    }
  });

  await interview.save();

  res.json(
    new ApiResponse(200, interview, "Interview updated successfully")
  );
});

/* ======================================================
   SOFT DELETE INTERVIEW
====================================================== */
const softDeleteInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new ApiError(404, "Interview not found");

  interview.isActive = false;
  await interview.save();

  res.json(
    new ApiResponse(200, interview, "Interview soft deleted successfully")
  );
});

/* ======================================================
   RESTORE INTERVIEW
====================================================== */
const restoreInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new ApiError(404, "Interview not found");

  interview.isActive = true;
  await interview.save();

  res.json(
    new ApiResponse(200, interview, "Interview restored successfully")
  );
});

/* ======================================================
   EXPORTS
====================================================== */
module.exports = {
  createInterview,
  getInterviews,
  getInterviewById,
  updateInterview,
  softDeleteInterview,
  restoreInterview,
};
