const Enquiry = require("../models/enquiry.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

/* ======================================================
   CREATE ENQUIRY
====================================================== */
const createEnquiry = asyncHandler(async (req, res) => {
  let {
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

  // 🔥 normalize
  if (email) email = email.toLowerCase().trim();

  // ✅ validation
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

  // 🔥 check existing person (mobile OR email)
  const existing = await Enquiry.findOne({
    $or: [{ mobile }, { email }],
    isDeleted: false,
  });

  // 🔥 CASE 1: Already exists → UPDATE instead of create
  if (existing) {
    existing.fullName = fullName ?? existing.fullName;
    existing.courseNeeded = courseNeeded; // 🔥 overwrite course
    existing.degree = degree ?? existing.degree;
    existing.stream = stream ?? existing.stream;
    existing.experience = experience ?? existing.experience;
    existing.status = status ?? existing.status;
    existing.type = type ?? existing.type;

    await existing.save();

    return res.json(
      new ApiResponse(200, existing, "Enquiry updated instead of creating new")
    );
  }

  // 🔥 CASE 2: New enquiry
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
  let {
    fullName,
    mobile,
    email,
    courseNeeded,
    degree,
    stream,
    experience,
  } = req.body;

  // 🔥 normalize
  if (email) email = email.toLowerCase().trim();

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

  // 🔥 check existing person
  const existing = await Enquiry.findOne({
    $or: [{ mobile }, { email }],
    isDeleted: false,
  });

  // 🔥 CASE 1: update existing
  if (existing) {
    existing.courseNeeded = courseNeeded; // overwrite
    existing.degree = degree ?? existing.degree;
    existing.stream = stream ?? existing.stream;
    existing.experience = experience ?? existing.experience;

    await existing.save();

    return res.json(
      new ApiResponse(200, existing, "Enquiry updated instead of new entry")
    );
  }

  // 🔥 CASE 2: create new
  const enquiry = await Enquiry.create({
    fullName,
    mobile,
    email,
    courseNeeded,
    degree,
    stream,
    experience,
    type: "website",
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

  // 🔥 search (added courseNeeded)
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { mobile: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { courseNeeded: { $regex: search, $options: "i" } }, // ✅ added
    ];
  }

  const [enquiries, total] = await Promise.all([
    Enquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Enquiry.countDocuments(filter),
  ]);

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

  const {
    fullName,
    mobile,
    email,
    courseNeeded,
    degree,
    stream,
    experience,
    status,
    isJoined,
  } = req.body;

  // 🔥 Step 1: Check if enquiry exists
  const existingEnquiry = await Enquiry.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!existingEnquiry) {
    throw new ApiError(404, "Enquiry not found");
  }

  // 🔥 Step 2: Duplicate check (fast)
  if (mobile || courseNeeded) {
    const duplicate = await Enquiry.exists({
      _id: { $ne: id },
      mobile: mobile ?? existingEnquiry.mobile,
      courseNeeded: courseNeeded ?? existingEnquiry.courseNeeded,
      isDeleted: false,
    });

    if (duplicate) {
      throw new ApiError(409, "Duplicate enquiry exists");
    }
  }

  // 🔥 Step 3: Build update object (only update provided fields)
  const updateFields = {};

  if (fullName !== undefined) updateFields.fullName = fullName;
  if (mobile !== undefined) updateFields.mobile = mobile;
  if (email !== undefined) updateFields.email = email;
  if (courseNeeded !== undefined) updateFields.courseNeeded = courseNeeded;
  if (degree !== undefined) updateFields.degree = degree;
  if (stream !== undefined) updateFields.stream = stream;
  if (experience !== undefined) updateFields.experience = experience;
  if (status !== undefined) updateFields.status = status;
  if (isJoined !== undefined) updateFields.isJoined = isJoined;

  // ❌ intentionally NOT allowing "type" update (controlled internally)

  // 🔥 Step 4: Update in single query
  const updatedEnquiry = await Enquiry.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: updateFields },
    {
      new: true,
      runValidators: true,
    }
  );

  return res.json(
    new ApiResponse(200, updatedEnquiry, "Enquiry updated successfully")
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