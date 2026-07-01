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
const authorizeRoles = require("../middlewares/authorizeRoles.middleware");

// Create student
router.post(
  "/add",
  multiFileUpload([{ name: "photo", maxCount: 1 }]),
  authorizeRoles("super admin", "admin", "student"),
  createStudent,
);

// Get students
router.get(
  "/",
  authorizeRoles("super admin", "admin", "counsellor"),
  getStudents,
);
router.get(
  "/:id",
  authorizeRoles("super admin", "admin", "counsellor"),
  getStudentById,
);

// Update student
router.put(
  "/update/:id",
  multiFileUpload([{ name: "photo", maxCount: 1 }]),
  authorizeRoles("super admin", "admin", "counsellor"),
  updateStudent,
);

// Update joining status
router.patch(
  "/joining-status/:studentId",
  authorizeRoles("super admin", "admin", "counsellor"),
  updateJoiningStatus,
);

// Soft delete
router.patch(
  "/soft-delete/:id",
  authorizeRoles("super admin", "admin"),
  softDeleteStudent,
);

// Restore
router.patch(
  "/restore/:id",
  authorizeRoles("super admin", "admin"),
  restoreStudent,
);

// Hard delete
router.delete(
  "/hard-delete/:id",
  authorizeRoles("super admin", "admin"),
  deleteStudent,
);

module.exports = router;
