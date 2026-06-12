const mongoose = require("mongoose");
const Interview = require("../models/interview.model");
const Student = require("../models/student.model");
const Company = require("../models/company.model");
const Placement = require("../models/placement.model");


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

/*  ========================= old=============================
   8️⃣ UPDATE INTERVIEW STATUS of Student
====================================================== */
// const updateInterviewStatus = asyncHandler(async (req, res) => {
//   const { studentId } = req.params;

//   let {
//     companyCode,
//     status,
//     interviewFeedback,
//     interviewDate,
//     companyDesignation,
//   } = req.body;

//   /* =========================================
//      VALIDATE COMPANY CODE
//   ========================================= */

//   if (!companyCode || !companyCode.trim()) {
//     throw new ApiError(400, "companyCode required");
//   }

//   companyCode = companyCode.trim().toUpperCase();

//   /* =========================================
//      NORMALIZE STATUS
//   ========================================= */

//   const normalizedStatus = status
//     ? status.trim().toLowerCase()
//     : undefined;

//   const allowedStatuses = [
//     "not scheduled",
//     "scheduled",
//     "attended",
//     "selected",
//     "rejected",
//   ];

//   if (
//     normalizedStatus &&
//     !allowedStatuses.includes(normalizedStatus)
//   ) {
//     throw new ApiError(400, "Invalid status");
//   }

//   /* =========================================
//      FIND STUDENT
//   ========================================= */

//   const student = await Student.findOne({
//     _id: studentId,
//     isDeleted: false,
//   });

//   if (!student) {
//     throw new ApiError(404, "Student not found");
//   }

//   /* =========================================
//      FIND INTERVIEW
//   ========================================= */

//   const interview = student.companies.find(
//     (c) => c.companyCode === companyCode
//   );

//   if (!interview) {
//     throw new ApiError(
//       404,
//       "Interview not found for this student"
//     );
//   }

//   let warningMessage = null;

//   /* =========================================
//      MULTIPLE SELECTION WARNING
//   ========================================= */

//   if (normalizedStatus === "selected") {
//     const alreadySelectedCompanies = student.companies.filter(
//       (c) =>
//         c.status === "selected" &&
//         c.companyCode !== companyCode
//     );

//     if (alreadySelectedCompanies.length > 0) {
//       warningMessage = `Student already selected in: ${alreadySelectedCompanies
//         .map((c) => c.companyCode)
//         .join(", ")}`;
//     }
//   }

//   /* =========================================
//      UPDATE INTERVIEW STATUS
//   ========================================= */

//   if (normalizedStatus) {
//     interview.status = normalizedStatus;
//   }

//   /* =========================================
//      UPDATE FEEDBACK
//   ========================================= */

//   if (interviewFeedback !== undefined) {
//     interview.interviewFeedback =
//       interviewFeedback.trim();
//   }

//   /* =========================================
//      UPDATE INTERVIEW DATE
//   ========================================= */

//   if (interviewDate) {
//     interview.interviewDate = interviewDate;
//   }

//   /* =========================================
//      GET ALL SELECTED COMPANIES
//   ========================================= */

//   const selectedCompanies = student.companies.filter(
//     (c) => c.status === "selected"
//   );

//   /* =========================================
//      HANDLE SELECTED CASE
//   ========================================= */

//   if (selectedCompanies.length > 0) {

//     /* =========================================
//        DETERMINE ACTIVE SELECTED COMPANY
//     ========================================= */

//     let latestSelectedCompany;

//     // current interview became selected
//     if (interview.status === "selected") {
//       latestSelectedCompany = interview;
//     }

//     // current interview changed from selected
//     // to attended/rejected, so fallback
//     else {
//       latestSelectedCompany =
//         selectedCompanies[selectedCompanies.length - 1];
//     }

//     /* =========================================
//        UPDATE STUDENT
//     ========================================= */

//     student.isPlaced = true;

//     student.placedCompany =
//       latestSelectedCompany.companyName;

//     /* =========================================
//        FIND COMPANY
//     ========================================= */

//     const company = await Company.findOne({
//       companyName:
//         latestSelectedCompany.companyName
//           .trim()
//           .toLowerCase(),
//       isDeleted: false,
//     });

//     if (!company) {
//       throw new ApiError(
//         404,
//         `Company '${latestSelectedCompany.companyName}' not found`
//       );
//     }

//     /* =========================================
//        FIND EXISTING PLACEMENT
//     ========================================= */

//     let placement = await Placement.findOne({
//       studentId: student._id,
//       isDeleted: false,
//     });

//     /* =========================================
//        CREATE NEW PLACEMENT
//     ========================================= */

//     if (!placement) {
//       placement = await Placement.create({
//         studentId: student._id,

//         /* ===============================
//            COMPANY DATA
//         =============================== */

//         companyId: company._id,

//         companyName:
//           latestSelectedCompany.companyName,

//         companyImageUrl:
//           company.companyImageUrl,

//         /* ===============================
//            STUDENT SNAPSHOT
//         =============================== */

//         fullName: student.studentName,

//         ugStream: student.ugStream,

//         studentEmail: student.email,

//         studentMobile: student.mobile,

//         studentImage: student.photoUrl,

//         /* ===============================
//            PLACEMENT DATA
//         =============================== */

//         companyDesignation:
//           companyDesignation?.trim() ||
//           "not assigned",
//       });
//     }

//     /* =========================================
//        UPDATE EXISTING PLACEMENT
//     ========================================= */

//     else {
//       placement.companyId = company._id;

//       placement.companyName =
//         latestSelectedCompany.companyName;

//       placement.companyImageUrl =
//         company.companyImageUrl;

//       placement.companyDesignation =
//         companyDesignation?.trim() ||
//         placement.companyDesignation;

//       await placement.save();
//     }
//   }

//   /* =========================================
//      NO SELECTED COMPANY
//   ========================================= */

//   else {
//     student.isPlaced = false;

//     student.placedCompany = null;

//     /* =========================================
//        DELETE PLACEMENT
//     ========================================= */

//     await Placement.findOneAndDelete({
//       studentId: student._id,
//     });
//   }

//   /* =========================================
//      SAVE STUDENT
//   ========================================= */

//   await student.save();

//   /* =========================================
//      RESPONSE
//   ========================================= */

//   res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         student,
//         warning: warningMessage,
//         selectedCompanies: selectedCompanies.map(
//           (c) => c.companyName
//         ),
//       },
//       "Interview status updated successfully"
//     )
//   );
// });
//!-----------------------------------
const updateInterviewStatus = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  let {
    companyCode,
    status,
    interviewFeedback,
    interviewDate,
  } = req.body;

  if (!companyCode || !companyCode.trim()) {
    throw new ApiError(400, "companyCode required");
  }

  companyCode = companyCode.trim().toUpperCase();

  const normalizedStatus = status
    ? status.trim().toLowerCase()
    : undefined;

  const allowedStatuses = [
    "not scheduled",
    "scheduled",
    "attended",
    "selected",
    "rejected",
  ];

  if (
    normalizedStatus &&
    !allowedStatuses.includes(normalizedStatus)
  ) {
    throw new ApiError(400, "Invalid status");
  }

  const student = await Student.findOne({
    _id: studentId,
    isDeleted: false,
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  const interview = student.companies.find(
    (c) => c.companyCode === companyCode
  );

  if (!interview) {
    throw new ApiError(
      404,
      "Interview not found for this student"
    );
  }

  let warningMessage = null;

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

  if (normalizedStatus) {
    interview.status = normalizedStatus;
  }

  if (interviewFeedback !== undefined) {
    interview.interviewFeedback =
      interviewFeedback?.trim();
  }

  if (interviewDate) {
    interview.interviewDate = interviewDate;
  }

  const selectedCompanies = student.companies.filter(
    (c) => c.status === "selected"
  );

  if (selectedCompanies.length > 0) {
    let latestSelectedCompany;

    if (interview.status === "selected") {
      latestSelectedCompany = interview;
    } else {
      latestSelectedCompany =
        selectedCompanies[selectedCompanies.length - 1];
    }

    student.isPlaced = true;
    student.placedCompany =
      latestSelectedCompany.companyName;
  } else {
    student.isPlaced = false;
    student.placedCompany = null;

    // reset joining if no selected company exists
    student.isJoinedToCompany = false;
  }

  await student.save();

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
  console.log("getInterviewCandidates");

  let { companyCode } = req.params;
  let { page = 1, limit = 10, status, search } = req.query;

  companyCode = companyCode.trim().toUpperCase();

  const exists = await Interview.exists({ companyCode });

  if (!exists) {
    throw new ApiError(404, "Interview not found");
  }

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const skip = (page - 1) * limit;

  const basePipeline = [
    {
      $match: {
        isDeleted: false,
        "companies.companyCode": companyCode,
      },
    },

    {
      $unwind: "$companies",
    },

    {
      $match: {
        "companies.companyCode": companyCode,
        ...(status && {
          "companies.status": status.trim().toLowerCase(),
        }),
      },
    },

    ...(search
      ? [
          {
            $match: {
              $or: [
                {
                  studentName: {
                    $regex: search.trim(),
                    $options: "i",
                  },
                },
                {
                  email: {
                    $regex: search.trim(),
                    $options: "i",
                  },
                },
                {
                  mobile: {
                    $regex: search.trim(),
                    $options: "i",
                  },
                },
              ],
            },
          },
        ]
      : []),
  ];

  const candidatesPipeline = [
    ...basePipeline,

    {
      $project: {
        studentName: 1,
        mobile: 1,
        email: 1,
        isPlaced: 1,
        interview: "$companies",
      },
    },

    {
      $sort: {
        "interview.addedDate": -1,
      },
    },

    {
      $skip: skip,
    },

    {
      $limit: limit,
    },
  ];

  const countPipeline = [
    ...basePipeline,

    {
      $count: "total",
    },
  ];

  const [candidates, countResult] = await Promise.all([
    Student.aggregate(candidatesPipeline),
    Student.aggregate(countPipeline),
  ]);

  const total = countResult[0]?.total || 0;

  res.status(200).json(
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
  updateInterviewStatus,
  getInterviewCandidates,
};