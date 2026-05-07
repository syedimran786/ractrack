const mongoose = require("mongoose");
const Interview = require("../models/interview.model");
const Student = require("../models/student.model");
const Company = require("../models/company.model");

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

  const exists = await Interview.exists({ companyCode });
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
   2️⃣ GET ALL INTERVIEWS
====================================================== */
const getInterviews = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, status, isActive, search } = req.query;

  page = +page || 1;
  limit = +limit || 10;
  const skip = (page - 1) * limit;

  const filter = {};

  filter.status = status ? status.toLowerCase() : "open";
  filter.isActive = isActive !== undefined ? isActive === "true" : true;

  if (search) {
    filter.$or = [
      { companyName: { $regex: search, $options: "i" } },
      { companyCode: { $regex: search, $options: "i" } },
    ];
  }

  const [interviews, total] = await Promise.all([
    Interview.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

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
  const interview = await Interview.findOne({
    companyCode: req.params.companyCode.toUpperCase(),
  }).lean();

  if (!interview) throw new ApiError(404, "Interview not found");

  res.json(new ApiResponse(200, interview));
});

/* ======================================================
   4️⃣ UPDATE INTERVIEW
====================================================== */
const updateInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    companyCode: req.params.companyCode.toUpperCase(),
  });

  if (!interview) throw new ApiError(404, "Interview not found");

  const allowedFields = [
    "companyName",
    "requiredCandidates",
    "expectedDate",
    "status",
    "feedback",
    "isActive",
    "criteria",
  ];

  for (let field of allowedFields) {
    if (req.body[field] !== undefined) {
      interview[field] = req.body[field];
    }
  }

  await interview.save();

  res.json(new ApiResponse(200, interview, "Interview updated"));
});


 //! Access to HR
/* ======================================================
   5️⃣ GET ELIGIBLE STUDENTS
====================================================== */
const getEligibleStudents = asyncHandler(async (req, res) => {
  const companyCode = req.params.companyCode.toUpperCase();

  const interview = await Interview.findOne({ companyCode });
  if (!interview) throw new ApiError(404, "Interview not found");

  const { criteria } = interview;

  const filter = { isDeleted: false };

  if (criteria.aggregate && criteria.aggregate !== "any") {
    filter.aggregate = { $gte: Number(criteria.aggregate) };
  }

  ["ugDegree", "ugStream", "ugYop", "pgDegree", "pgStream", "pgYop"].forEach((field) => {
    if (criteria[field]) filter[field] = criteria[field];
  });

  const students = await Student.find(filter).lean();

  res.json(new ApiResponse(200, students));
});

/* ======================================================
   6️⃣ ASSIGN INTERVIEW TO STUDENT
====================================================== */
const assignInterviewToStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  let { companyCode, interviewDate } = req.body;

  if (!companyCode) throw new ApiError(400, "companyCode is required");

  companyCode = companyCode.trim().toUpperCase();

  const [student, interview] = await Promise.all([
    Student.findOne({ _id: studentId, isDeleted: false }),
    Interview.findOne({ companyCode }),
  ]);

  if (!student) throw new ApiError(404, "Student not found");
  if (!interview) throw new ApiError(404, "Interview not found");

  const exists = student.companies.some(c => c.companyCode === companyCode);
  if (exists) throw new ApiError(409, "Already assigned");

  student.companies.push({
    companyName: interview.companyName,
    companyCode,
    interviewDate: interviewDate || null,
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

  const student = await Student.findOne({ _id: studentId, isDeleted: false });
  if (!student) throw new ApiError(404, "Student not found");

  const interview = student.companies.find(c => c.companyCode === companyCode);
  if (!interview) throw new ApiError(404, "Interview not found");

  if (interview.status === "attended") {
    throw new ApiError(400, "Already marked attended");
  }

  interview.status = "attended";
  await student.save();

  await Interview.updateOne({ companyCode }, { $inc: { attendedCandidates: 1 } });

  res.json(new ApiResponse(200, student, "Marked attended"));
});

/* ======================================================
   8️⃣ UPDATE INTERVIEW STATUS
====================================================== */
const updateInterviewStatus = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  let {
    companyCode,
    status,
    interviewFeedback,
    interviewDate,
  } = req.body;

  // Validate companyCode
  if (!companyCode || !companyCode.trim()) {
    throw new ApiError(400, "companyCode required");
  }

  // Normalize companyCode
  companyCode = companyCode.trim().toUpperCase();

  // Normalize status
  const normalizedStatus = status
    ? status.trim().toLowerCase()
    : undefined;

  // Allowed statuses
  const allowedStatuses = [
    "not scheduled",
    "scheduled",
    "attended",
    "selected",
    "rejected",
  ];

  // Validate status
  if (
    normalizedStatus &&
    !allowedStatuses.includes(normalizedStatus)
  ) {
    throw new ApiError(400, "Invalid status");
  }

  // Find student
  const student = await Student.findOne({
    _id: studentId,
    isDeleted: false,
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  // Find company interview inside student
  const interview = student.companies.find(
    (c) => c.companyCode === companyCode
  );

  if (!interview) {
    throw new ApiError(
      404,
      "Interview not found for this student"
    );
  }

  // Debug logs
  console.log("Incoming Status:", normalizedStatus);
  console.log("Before isPlaced:", student.isPlaced);

  // Warning message holder
  let warningMessage = null;

  // Check if already selected in other companies
  if (normalizedStatus === "selected") {
    const alreadySelectedCompanies = student.companies.filter(
      (c) =>
        c.status === "selected" &&
        c.companyCode !== companyCode
    );

    if (alreadySelectedCompanies.length > 0) {
      warningMessage = `Student already selected in: ${alreadySelectedCompanies
        .map((c) => c.companyCode)
        .join(", ")}`;
    }
  }

  // Update status
  if (normalizedStatus) {
    interview.status = normalizedStatus;
  }

  // Update feedback
  if (interviewFeedback !== undefined) {
    interview.interviewFeedback = interviewFeedback.trim();
  }

  // Update interview date
  if (interviewDate) {
    interview.interviewDate = interviewDate;
  }

  // If current company selected, update placedCompany
  if (normalizedStatus === "selected") {
    const interviewDoc = await Interview.findOne({
      companyCode,
    });

    if (!interviewDoc) {
      throw new ApiError(
        404,
        "Interview not found in master collection"
      );
    }

    student.placedCompany = interviewDoc._id;
  }

  // Check whether student has ANY selected company
  const selectedCompanies = student.companies.filter(
    (c) => c.status === "selected"
  );

  // Update placement status
  student.isPlaced = selectedCompanies.length > 0;

  // Remove placedCompany if no company selected
  if (selectedCompanies.length === 0) {
    student.placedCompany = null;
  }

  console.log("After isPlaced:", student.isPlaced);

  // Save changes
  await student.save();

  // Response
  res.status(200).json(
    new ApiResponse(
      200,
      {
        student,
        warning: warningMessage,
        selectedCompanies: selectedCompanies.map(
          (c) => c.companyName
        ),
      },
      "Interview status updated successfully"
    )
  );
});
/* ======================================================
   9️⃣ GET INTERVIEW CANDIDATES (🔥 ADVANCED)
====================================================== */
const getInterviewCandidates = asyncHandler(async (req, res) => {
  let { companyCode } = req.params;
  let { page = 1, limit = 10, status, search } = req.query;

  companyCode = companyCode.trim().toUpperCase();

  const exists = await Interview.exists({ companyCode });
  if (!exists) throw new ApiError(404, "Interview not found");

  page = +page || 1;
  limit = +limit || 10;
  const skip = (page - 1) * limit;

  const pipeline = [
    {
      $match: {
        isDeleted: false,
        "companies.companyCode": companyCode,
      },
    },

    { $unwind: "$companies" },

    {
      $match: {
        "companies.companyCode": companyCode,
        ...(status && { "companies.status": status.toLowerCase() }),
      },
    },

    ...(search
      ? [{
          $match: {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
              { phone: { $regex: search, $options: "i" } },
            ],
          },
        }]
      : []),

    {
      $project: {
        name: 1,
        email: 1,
        phone: 1,
        isPlaced: 1,
        interview: "$companies",
      },
    },

    { $sort: { "interview.addedDate": -1 } },
    { $skip: skip },
    { $limit: limit },
  ];

  const [candidates, countResult] = await Promise.all([
    Student.aggregate(pipeline),
    Student.aggregate([
      { $match: { isDeleted: false, "companies.companyCode": companyCode } },
      { $unwind: "$companies" },
      { $match: { "companies.companyCode": companyCode } },
      { $count: "total" },
    ]),
  ]);

  const total = countResult[0]?.total || 0;

  res.json(
    new ApiResponse(200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      candidates,
    })
  );
});

/* ======================================================
   EXPORTS
====================================================== */
module.exports = {

  //! Access to BD
  createInterview,
  getInterviews,
  getInterviewByCode,
  updateInterview,

  //! Access to HR
  getEligibleStudents,
  assignInterviewToStudent,
  markAsAttended,
  updateInterviewStatus,
  getInterviewCandidates,
};