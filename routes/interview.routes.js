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
const authorizeRoles = require("../middlewares/authorizeRoles.middleware");

/* ======================================================
   📌 INTERVIEW MANAGEMENT
====================================================== */

// 1️⃣ Create Interview
router.post("/",authorizeRoles(
    "super admin",
    "bd"
  ), createInterview);

// 2️⃣ Get All Interviews (latest + filters)
router.get("/",authorizeRoles(
    "super admin",
    "bd"
  ), getInterviews);

/* ======================================================
   📌 ELIGIBILITY & CANDIDATES (⚠️ KEEP ABOVE :companyCode)
====================================================== */

// 3️⃣ Get Eligible Students
router.get("/:companyCode/eligible",authorizeRoles(
    "super admin",
    "hr"
  ), getEligibleStudents);


/* ======================================================
   📌 SINGLE INTERVIEW
====================================================== */


// 5️⃣ Get Single Interview
router.get("/:companyCode",authorizeRoles(
    "super admin",
    "bd"
  ), getInterviewByCode);

// 6️⃣ Update Interview
router.patch("/:companyCode",authorizeRoles(
    "super admin",
    "bd"
  ), updateInterview);

/* ======================================================
   📌 HR ACTIONS ON STUDENTS
====================================================== */
// 4️⃣ Get Candidates for Interview ✅ NEW
router.get("/:companyCode/candidates",authorizeRoles(
    "super admin",
    "bd",
    "hr"
  ), getInterviewCandidates);

// 7️⃣ Assign Interview to Student
router.post("/assign/:studentId",authorizeRoles(
    "super admin",
    "hr"
  ), assignInterviewToStudent);

// 9️⃣ Update Status + Feedback
router.patch("/status/:studentId",authorizeRoles(
    "super admin",
    "hr"
  ), updateInterviewStatus);

module.exports = router;