const express = require("express");
const router = express.Router();

const {
  createInterview,
  getInterviews,
  getInterviewByCode,
  updateInterview,
  getEligibleStudents,
  assignInterviewToStudent,
  markAsAttended,
  updateInterviewStatus,
  getInterviewCandidates, // ✅ NEW
} = require("../controllers/interview.controller");

/* ======================================================
   📌 INTERVIEW MANAGEMENT
====================================================== */

// 1️⃣ Create Interview
router.post("/", createInterview);

// 2️⃣ Get All Interviews (latest + filters)
router.get("/", getInterviews);

/* ======================================================
   📌 ELIGIBILITY & CANDIDATES (⚠️ KEEP ABOVE :companyCode)
====================================================== */

// 3️⃣ Get Eligible Students
router.get("/:companyCode/eligible", getEligibleStudents);

// 4️⃣ Get Candidates for Interview ✅ NEW
router.get("/:companyCode/candidates", getInterviewCandidates);

/* ======================================================
   📌 SINGLE INTERVIEW
====================================================== */


// 5️⃣ Get Single Interview
router.get("/:companyCode", getInterviewByCode);

// 6️⃣ Update Interview
router.patch("/:companyCode", updateInterview);

/* ======================================================
   📌 HR ACTIONS ON STUDENTS
====================================================== */

// 7️⃣ Assign Interview to Student
router.post("/assign/:studentId", assignInterviewToStudent);

// 8️⃣ Mark as Attended
router.patch("/attended/:studentId", markAsAttended);

// 9️⃣ Update Status + Feedback
router.patch("/status/:studentId", updateInterviewStatus);

module.exports = router;