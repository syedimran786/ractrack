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
} = require("../controllers/interview.controller");

/* ======================================================
   📌 INTERVIEW MANAGEMENT
====================================================== */

// 1️⃣ Create Interview
router.post("/", createInterview);

// 2️⃣ Get All Interviews (latest + filters)
router.get("/", getInterviews);

// 3️⃣ Get Single Interview
router.get("/:companyCode", getInterviewByCode);

// 4️⃣ Update Interview
router.patch("/:companyCode", updateInterview);

/* ======================================================
   📌 ELIGIBILITY
====================================================== */

// 5️⃣ Get Eligible Students
router.get("/:companyCode/eligible", getEligibleStudents);

/* ======================================================
   📌 HR ACTIONS ON STUDENTS
====================================================== */

// 6️⃣ Assign Interview to Student
router.post("/assign/:studentId", assignInterviewToStudent);

// 7️⃣ Mark as Attended
router.patch("/attended/:studentId", markAsAttended);

// 8️⃣ Update Status + Feedback
router.patch("/status/:studentId", updateInterviewStatus);

module.exports = router;