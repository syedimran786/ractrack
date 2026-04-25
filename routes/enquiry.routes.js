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
  createWebsiteEnquiry,
} = require("../controllers/enquiry.controller");

/* =========================================
   ENQUIRY ROUTES (REST STANDARD)
========================================= */

router.post("/create", createEnquiry);
router.post("/web", createWebsiteEnquiry);
router.get("/", getEnquiries);
router.get("/:id", getEnquiryById);
router.patch("/update/:id", updateEnquiry);

// soft delete & restore
router.patch("/soft-delete/:id", softDeleteEnquiry);
router.patch("/restore/:id", restoreEnquiry);

// hard delete
router.delete("/hard-delete/:id", deleteEnquiry);

module.exports = router;