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

/* ======================================================
   STUDENT ROUTES
====================================================== */

// Create Student
router.post(
  "/add",
  multiFileUpload([{ name: "photo", maxCount: 1 }]),
  createStudent
);

// Get All
router.get("/", getStudents);

// Get Single
router.get("/:id", getStudentById);

// Update
router.put(
  "/update/:id",
  multiFileUpload([{ name: "photo", maxCount: 1 }]),
  updateStudent
);

// Soft Delete
router.patch("/soft-delete/:id", softDeleteStudent);

// Restore
router.patch("/restore/:id", restoreStudent);

// Hard Delete
router.delete("/hard-delete/:id", deleteStudent);

module.exports = router;
