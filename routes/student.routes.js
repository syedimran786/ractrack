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

const { updatePlacementInfo } = require("../controllers/student.controller");

router.post("/add", multiFileUpload([{ name: "photo", maxCount: 1 }]), createStudent);

router.get("/", getStudents);
router.get("/:id", getStudentById);

router.put("/update/:id", multiFileUpload([{ name: "photo", maxCount: 1 }]), updateStudent);

router.patch("/soft-delete/:id", softDeleteStudent);
router.patch("/restore/:id", restoreStudent);
router.delete("/:id", deleteStudent);

/* 🔥 Placement / Company update */
router.patch("/placement/:id", updatePlacementInfo);

module.exports = router;
