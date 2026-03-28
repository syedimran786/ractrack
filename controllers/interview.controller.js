const Interview = require("../models/interview.model");
const Student = require("../models/student.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

/* ======================================================
   1️⃣ CREATE INTERVIEW
====================================================== */
const createInterview = asyncHandler(async (req, res) => {
  let { companyName, companyCode, requiredCandidates, expectedDate, criteria } = req.body;

  if (!companyName || !companyCode || !requiredCandidates) {
    throw new ApiError(400, "Required fields missing");
  }

  companyName = companyName.trim().toLowerCase();
  companyCode = companyCode.trim().toUpperCase();

  const exists = await Interview.findOne({ companyCode });
  if (exists) throw new ApiError(409, "Interview already exists");

  const interview = await Interview.create({
    companyName,
    companyCode,
    requiredCandidates,
    expectedDate,
    criteria,
  });

  res.json(new ApiResponse(201, interview, "Interview created"));
});

/* ======================================================
   2️⃣ GET ALL INTERVIEWS (LATEST + FILTERS)
====================================================== */
const getInterviews = asyncHandler(async (req, res) => {
  let {
    page = 1,
    limit = 10,
    status,
    isActive,
    search,
  } = req.query;

  // ✅ Convert to proper types
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const skip = (page - 1) * limit;

  const filter = {};

  // ✅ DEFAULT: latest + open + active
  if (!status) {
    filter.status = "open";
  } else {
    filter.status = status.toLowerCase();
  }

  if (isActive === undefined) {
    filter.isActive = true;
  } else {
    filter.isActive = isActive === "true";
  }

  // ✅ Search (companyName OR companyCode)
  if (search) {
    filter.$or = [
      { companyName: { $regex: search, $options: "i" } },
      { companyCode: { $regex: search, $options: "i" } },
    ];
  }

  // ✅ Query with pagination + latest first
  const [interviews, total] = await Promise.all([
    Interview.find(filter)
      .sort({ createdAt: -1 }) // latest
      .skip(skip)
      .limit(limit),

    Interview.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      interviews,
    })
  );
});

/* ======================================================
   3️⃣ GET SINGLE INTERVIEW
====================================================== */
const getInterviewByCode = asyncHandler(async (req, res) => {
  const { companyCode } = req.params;

  const interview = await Interview.findOne({
    companyCode: companyCode.toUpperCase(),
  });

  if (!interview) throw new ApiError(404, "Interview not found");

  res.json(new ApiResponse(200, interview));
});

/* ======================================================
   4️⃣ UPDATE INTERVIEW  //! Global Interviews status
====================================================== */
const updateInterview = asyncHandler(async (req, res) => {
  const { companyCode } = req.params;

  const interview = await Interview.findOne({
    companyCode: companyCode.toUpperCase(),
  });

  if (!interview) throw new ApiError(404, "Interview not found");

  //! Only these fields can be updated. if you send other fields it will be ignored
  const allowedFields = [
    "companyName",
    "requiredCandidates",
    "expectedDate",
    "status",
    "feedback",
    "isActive",
    "criteria",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      interview[field] = req.body[field];
    }
  });

  await interview.save();

  res.json(new ApiResponse(200, interview, "Interview updated"));
});

/* ======================================================
   5️⃣ GET ELIGIBLE STUDENTS (🔥 CORE LOGIC)
====================================================== */
const getEligibleStudents = asyncHandler(async (req, res) => {
  const companyCode = req.params.companyCode.trim().toUpperCase();

  const interview = await Interview.findOne({ companyCode });
  if (!interview) throw new ApiError(404, "Interview not found");

  const { criteria } = interview;

  const filter = {
    isDeleted: false, // ✅ IMPORTANT FIX
  };

  if (criteria.aggregate && criteria.aggregate !== "any") {
    filter.aggregate = { $gte: Number(criteria.aggregate) };
  }

  if (criteria.ugDegree) filter.ugDegree = criteria.ugDegree;
  if (criteria.ugStream) filter.ugStream = criteria.ugStream;
  if (criteria.ugYop) filter.ugYop = criteria.ugYop;

  if (criteria.pgDegree) filter.pgDegree = criteria.pgDegree;
  if (criteria.pgStream) filter.pgStream = criteria.pgStream;
  if (criteria.pgYop) filter.pgYop = criteria.pgYop;

  const students = await Student.find(filter);

  res.json(new ApiResponse(200, students));
});

/* ======================================================
   6️⃣ ASSIGN INTERVIEW TO STUDENT
====================================================== */
const assignInterviewToStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  let { companyCode, interviewDate } = req.body;

  if (!companyCode) {
    throw new ApiError(400, "companyCode is required");
  }

  companyCode = companyCode.trim().toUpperCase();

  const student = await Student.findOne({
    _id: studentId,
    isDeleted: false,
  });

  if (!student) throw new ApiError(404, "Student not found");

  const interview = await Interview.findOne({ companyCode });
  if (!interview) throw new ApiError(404, "Interview not found");

  // ✅ Check if already exists
  const exists = student.companies.some(
    (c) => c.companyCode === companyCode
  );

  if (exists) {
    throw new ApiError(409, "Interview already assigned to student");
  }

  // ✅ Add to single array
  student.companies.push({
    companyName: interview.companyName,
    companyCode,
    interviewDate: interviewDate || null, // ✅ default null
    addedDate: new Date(),
    status: "not scheduled",
  });

  await student.save();

  res.json(new ApiResponse(200, student, "Interview assigned"));
});
/* ======================================================
   7️⃣ MARK AS ATTENDED
====================================================== */
const markAsAttended = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  let { companyCode } = req.body;

  companyCode = companyCode.trim().toUpperCase();

  const student = await Student.findOne({
    _id: studentId,
    isDeleted: false,
  });

  if (!student) throw new ApiError(404, "Student not found");

  const interview = student.companies.find(
    (c) => c.companyCode === companyCode
  );

  if (!interview) throw new ApiError(404, "Interview not found");

  // ✅ Just update status (no moving arrays)
  interview.status = "attended";

  await student.save();

  await Interview.updateOne(
    { companyCode },
    { $inc: { attendedCandidates: 1 } }
  );

  res.json(new ApiResponse(200, student, "Marked as attended"));
});

/* ======================================================
   8️⃣ UPDATE STATUS + FEEDBACK //! Student interview Status
====================================================== */
const updateInterviewStatus = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  let { companyCode, status, interviewFeedback, interviewDate } = req.body;

  if (!companyCode) {
    throw new ApiError(400, "companyCode is required");
  }

  companyCode = companyCode.trim().toUpperCase();

  const student = await Student.findOne({
    _id: studentId,
    isDeleted: false,
  });

  if (!student) throw new ApiError(404, "Student not found");

  const interview = student.companies.find(
    (c) => c.companyCode === companyCode
  );

  if (!interview) {
    throw new ApiError(404, "Interview not found for this student");
  }

  // ✅ Validate status
  if (
    status &&
    !["scheduled", "attended", "selected", "rejected", "not scheduled"].includes(
      status.toLowerCase()
    )
  ) {
    throw new ApiError(400, "Invalid status");
  }

  status = status?.toLowerCase();

  // =========================
  // 🔁 UPDATE FIELDS
  // =========================

  if (status) interview.status = status;

  if (interviewFeedback !== undefined) {
    interview.interviewFeedback = interviewFeedback.trim();
  }

  if (interviewDate) {
    interview.interviewDate = interviewDate;
  }

  // =========================
  // 🎯 FIXED PLACEMENT LOGIC
  // =========================

  if (status === "selected" && !student.isPlaced) {
    const company = await Company.findOne({ companyCode });

    if (!company) {
      throw new ApiError(404, "Company not found");
    }

    student.isPlaced = true;
    student.placedCompany = company._id; // ✅ FIXED
  }

  await student.save();

  res.json(
    new ApiResponse(200, student, "Interview updated successfully")
  );
});
/* ======================================================
   EXPORTS
====================================================== */
module.exports = {
  createInterview,
  getInterviews,
  getInterviewByCode,
  updateInterview,
  //! Give access to HR 
  getEligibleStudents,
  assignInterviewToStudent,
  markAsAttended,
  updateInterviewStatus,
};