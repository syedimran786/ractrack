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
  const { status, isActive = true } = req.query;

  const filter = {};

  if (status) filter.status = status;
  if (isActive !== undefined) filter.isActive = isActive;

  const interviews = await Interview.find(filter)
    .sort({ createdAt: -1 });

  res.json(new ApiResponse(200, interviews));
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
   4️⃣ UPDATE INTERVIEW
====================================================== */
const updateInterview = asyncHandler(async (req, res) => {
  const { companyCode } = req.params;

  const interview = await Interview.findOne({
    companyCode: companyCode.toUpperCase(),
  });

  if (!interview) throw new ApiError(404, "Interview not found");

  const allowedFields = [
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
    isDeleted: false, // ✅ FIX
  });

  if (!student) throw new ApiError(404, "Student not found");

  const interview = await Interview.findOne({ companyCode });
  if (!interview) throw new ApiError(404, "Interview not found");

  // ✅ CHECK IN BOTH ARRAYS (IMPORTANT)
  const existsInAdded = student.companiesAdded.some(
    (c) => c.companyCode === companyCode
  );

  const existsInAttended = student.companiesAttended.some(
    (c) => c.companyCode === companyCode
  );

  if (existsInAdded || existsInAttended) {
    throw new ApiError(409, "Interview already assigned to student");
  }

  student.companiesAdded.push({
    companyName: interview.companyName,
    companyCode,
    interviewDate,
    addedDate: new Date(),
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
    isDeleted: false, // ✅ FIX
  });

  if (!student) throw new ApiError(404, "Student not found");

  const index = student.companiesAdded.findIndex(
    (c) => c.companyCode === companyCode
  );

  if (index === -1) throw new ApiError(404, "Interview not found");

  const interviewData = student.companiesAdded[index];

  student.companiesAdded.splice(index, 1);

  student.companiesAttended.push({
    ...interviewData.toObject(),
    status: "attended",
  });

  await student.save();

  await Interview.updateOne(
    { companyCode },
    { $inc: { attendedCandidates: 1 } }
  );

  res.json(new ApiResponse(200, student, "Marked as attended"));
});

/* ======================================================
   8️⃣ UPDATE STATUS + FEEDBACK
====================================================== */
const updateInterviewStatus = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  let { companyCode, status, interviewFeedback } = req.body;

  companyCode = companyCode.trim().toUpperCase();

  const student = await Student.findOne({
    _id: studentId,
    isDeleted: false, // ✅ FIX
  });

  if (!student) throw new ApiError(404, "Student not found");

  const interview = student.companiesAttended.find(
    (c) => c.companyCode === companyCode
  );

  if (!interview) throw new ApiError(404, "Interview not found");

  if (status && !["selected", "rejected"].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  if (status) interview.status = status;

  if (interviewFeedback !== undefined) {
    interview.interviewFeedback = interviewFeedback.trim();
  }

  if (status === "selected" && !student.isPlaced) {
    student.isPlaced = true;
    student.placedCompany = interview.companyName;
  }

  await student.save();

  res.json(new ApiResponse(200, student, "Updated successfully"));
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