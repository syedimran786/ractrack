const express = require("express");
const router = express.Router();

const { multiFileUpload } = require("../middlewares/upload");
const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  softDeleteStudent,
  restoreStudent,
  deleteStudent,
} = require("../controllers/student.controller");

// ----------------------
// Create Student
// ----------------------
router.post(
  "/addstudent",
  multiFileUpload([{ name: "photo", maxCount: 1 }]),
  createStudent
);

// ----------------------
// Get All Students
// ----------------------
router.get("/getstudents", getStudents);

// ----------------------
// Get Single Student
// ----------------------
router.get("/getstudent/:id", getStudentById);

// ----------------------
// Update Student
// ----------------------
router.put(
  "/updatestudent/:id",
  multiFileUpload([{ name: "photo", maxCount: 1 }]),
  updateStudent
);

// ----------------------
// Soft Delete Student
// ----------------------
router.patch("/soft-delete/:id", softDeleteStudent);

// ----------------------
// Restore Student
// ----------------------
router.patch("/restore/:id", restoreStudent);

// ----------------------
// Hard Delete Student
// ----------------------
router.delete("/hard-delete/:id", deleteStudent);

module.exports = router;
