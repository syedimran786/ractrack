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

  if (
    !fullName ||
    !mobile ||
    !email ||
    !courseNeeded ||
    !degree ||
    !stream ||
    !experience ||
    !type
  ) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // Prevent duplicate enquiry
  const exists = await Enquiry.findOne({
    mobile,
    courseNeeded,
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
//! Website Enquiry
const createWebsiteEnquiry = asyncHandler(async (req, res) => {
  const {
    fullName,
    mobile,
    email,
    courseNeeded,
    degree,
    stream,
    experience,
  } = req.body;

  // ✅ validation
  if (
    !fullName ||
    !mobile ||
    !email ||
    !courseNeeded ||
    !degree ||
    !stream ||
    !experience
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // ✅ duplicate check
  const exists = await Enquiry.findOne({
    mobile,
    courseNeeded,
    isDeleted: false,
  });

  if (exists) {
    throw new ApiError(409, "Enquiry already exists for this course");
  }

  // ✅ create enquiry
  const enquiry = await Enquiry.create({
    fullName,
    mobile,
    email,
    courseNeeded,
    degree,
    stream,
    experience,

    // 🔥 controlled fields
    type: "website",
    // status will default to "new"
  });

  return res
    .status(201)
    .json(new ApiResponse(201, enquiry, "Website enquiry submitted"));
});
/* ======================================================
   GET ALL ENQUIRIES (FILTER + SEARCH + PAGINATION)
====================================================== */
const getEnquiries = asyncHandler(async (req, res) => {
  let { status, type, isJoined, search, page = 1, limit = 10 } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const skip = (page - 1) * limit;

  const filter = { isDeleted: false };

  if (status) filter.status = status;
  if (type) filter.type = type;
  if (isJoined !== undefined) filter.isJoined = isJoined === "true";

  // 🔥 search
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { mobile: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const enquiries = await Enquiry.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Enquiry.countDocuments(filter);

  return res.json(
    new ApiResponse(
      200,
      {
        total,
        page,
        limit,
        data: enquiries,
      },
      "Enquiries fetched successfully"
    )
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

  // 🔥 duplicate check
  if (mobile || courseNeeded) {
    const exists = await Enquiry.findOne({
      _id: { $ne: id },
      mobile: mobile ?? enquiry.mobile,
      courseNeeded: courseNeeded ?? enquiry.courseNeeded,
      isDeleted: false,
    });

    if (exists) {
      throw new ApiError(409, "Duplicate enquiry exists");
    }
  }

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

  return res.json(new ApiResponse(200, enquiry, "Enquiry soft deleted"));
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

module.exports = {
  createEnquiry,
  createWebsiteEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  softDeleteEnquiry,
  restoreEnquiry,
  deleteEnquiry,
};