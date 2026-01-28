const express = require("express");
const router = express.Router();

const {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  softDeleteEnquiry,
  restoreEnquiry,
  deleteEnquiry,
} = require("../controllers/enquiry.controller");

/* =========================================
   ENQUIRY ROUTES
========================================= */

router.post("/add", createEnquiry);
router.get("/", getEnquiries);
router.get("/:id", getEnquiryById);
router.put("/update/:id", updateEnquiry);
router.patch("/soft-delete/:id", softDeleteEnquiry);
router.patch("/restore/:id", restoreEnquiry);
router.delete("/hard-delete/:id", deleteEnquiry);

module.exports = router;
