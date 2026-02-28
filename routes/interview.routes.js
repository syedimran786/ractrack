const express = require("express");
const router = express.Router();

const {
  createInterview,
  getInterviews,
  getInterviewById,
  updateInterview,
  softDeleteInterview,
  restoreInterview,
} = require("../controllers/interview.controller");

const protect = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");



router.post(
  "/add",
  protect,
  authorize("admin", "hr"),
  createInterview
);


router.get("/", getInterviews);

router.get("/:id", getInterviewById);

router.put("/update/:id", updateInterview);

router.put("/delete/:id", softDeleteInterview);

router.put("/restore/:id", restoreInterview);

module.exports = router;
