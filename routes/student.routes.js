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
  updateJoiningStatus, // ✅ added
} = require("../controllers/student.controller");

// Create student
router.post(
  "/add",
  multiFileUpload([{ name: "photo", maxCount: 1 }]),
  createStudent
);

// Get students
router.get("/", getStudents);
router.get("/:id", getStudentById);

// Update student
router.put(
  "/update/:id",
  multiFileUpload([{ name: "photo", maxCount: 1 }]),
  updateStudent
);

// Update joining status
router.patch("/joining-status/:studentId", updateJoiningStatus);

// Soft delete
router.patch("/soft-delete/:id", softDeleteStudent);

// Restore
router.patch("/restore/:id", restoreStudent);

// Hard delete
router.delete("/hard-delete/:id", deleteStudent);

module.exports = router;