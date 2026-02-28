const Enquiry = require("../models/enquiry.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

/* ======================================================
   CREATE ENQUIRY
====================================================== */
const createEnquiry = asyncHandler(async (req, res) => {
  const {
    fullName,
    mobile,
    email,
    courseNeeded,
    degree,
    stream,
    experience,
    status,
    type,
  } = req.body;

  if (!fullName || !mobile || !email || !courseNeeded || !degree || !stream || !experience || !type) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // Prevent duplicate enquiry
  const exists = await Enquiry.findOne({
    mobile,
    courseNeeded: courseNeeded.toLowerCase(),
    isDeleted: false,
  });

  if (exists) {
    throw new ApiError(409, "Enquiry already exists for this course");
  }

  const enquiry = await Enquiry.create({
    fullName,
    mobile,
    email,
    courseNeeded,
    degree,
    stream,
    experience,
    status,
    type,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, enquiry, "Enquiry created successfully"));
});

/* ======================================================
   GET ALL ENQUIRIES (filter + pagination ready)
====================================================== */
const getEnquiries = asyncHandler(async (req, res) => {
  const { status, type, isJoined } = req.query;

  const filter = { isDeleted: false };

  if (status) filter.status = status;
  if (type) filter.type = type;
  if (isJoined !== undefined) filter.isJoined = isJoined === "true";

  const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 });

  return res.json(
    new ApiResponse(200, enquiries, "Enquiries fetched successfully")
  );
});

/* ======================================================
   GET SINGLE ENQUIRY
====================================================== */
const getEnquiryById = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!enquiry) throw new ApiError(404, "Enquiry not found");

  return res.json(new ApiResponse(200, enquiry, "Enquiry fetched successfully"));
});

/* ======================================================
   UPDATE ENQUIRY
====================================================== */
const updateEnquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const enquiry = await Enquiry.findOne({ _id: id, isDeleted: false });
  if (!enquiry) throw new ApiError(404, "Enquiry not found");

  const {
    fullName,
    mobile,
    email,
    courseNeeded,
    degree,
    stream,
    experience,
    status,
    type,
    isJoined,
  } = req.body;

  enquiry.fullName = fullName ?? enquiry.fullName;
  enquiry.mobile = mobile ?? enquiry.mobile;
  enquiry.email = email ?? enquiry.email;
  enquiry.courseNeeded = courseNeeded ?? enquiry.courseNeeded;
  enquiry.degree = degree ?? enquiry.degree;
  enquiry.stream = stream ?? enquiry.stream;
  enquiry.experience = experience ?? enquiry.experience;
  enquiry.status = status ?? enquiry.status;
  enquiry.type = type ?? enquiry.type;
  enquiry.isJoined = isJoined ?? enquiry.isJoined;

  await enquiry.save();

  return res.json(
    new ApiResponse(200, enquiry, "Enquiry updated successfully")
  );
});

/* ======================================================
   SOFT DELETE
====================================================== */
const softDeleteEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );

  if (!enquiry) throw new ApiError(404, "Enquiry not found");

  return res.json(
    new ApiResponse(200, enquiry, "Enquiry soft deleted")
  );
});

/* ======================================================
   RESTORE
====================================================== */
const restoreEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findOneAndUpdate(
    { _id: req.params.id, isDeleted: true },
    { isDeleted: false, deletedAt: null },
    { new: true }
  );

  if (!enquiry) throw new ApiError(404, "Deleted enquiry not found");

  return res.json(
    new ApiResponse(200, enquiry, "Enquiry restored successfully")
  );
});

/* ======================================================
   HARD DELETE
====================================================== */
const deleteEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw new ApiError(404, "Enquiry not found");

  await enquiry.deleteOne();

  return res.json(
    new ApiResponse(200, null, "Enquiry permanently deleted")
  );
});

/* ======================================================
   EXPORTS
====================================================== */
module.exports = {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  softDeleteEnquiry,
  restoreEnquiry,
  deleteEnquiry,
};
