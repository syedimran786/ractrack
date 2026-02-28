const express = require("express");
const router = express.Router();

const {
  getEligibleStudents,
  assignCompanyToStudent,
  updateInterviewStatus,
  getHRInterviews,
  getUpcomingInterviews,
  getStudentInterviewTimeline,
} = require("../controllers/hr.controller");

const protect = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize");

/* =========================
   MIDDLEWARE
========================= */
router.use(protect);
router.use(authorize("hr"));

/* =========================
   HR ROUTES
========================= */

// Get all eligible (non-placed) students
router.get("/eligible-students", getEligibleStudents);

// Assign company to student
router.post("/assign-company", assignCompanyToStudent);


// Update interview status + feedback
router.put("/interview/:interviewId/status", updateInterviewStatus);

// Get interviews created by logged-in HR
router.get("/interviews", getHRInterviews);

// Get upcoming interviews (next 7 days)
router.get("/interviews/upcoming", getUpcomingInterviews);

// Get interview timeline of a student (HR + Admin use-case)
router.get(
  "/student/:studentId/timeline",
  authorize("hr", "admin"),
  getStudentInterviewTimeline
);

module.exports = router;
