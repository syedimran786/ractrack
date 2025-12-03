// routes/company.routes.js
const express = require("express");
const router = express.Router();
const { multiFileUpload } = require("../middlewares/upload");

const {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  softDeleteCompany,
  restoreCompany,
  deleteCompany,
} = require("../controllers/company.controller");

/* ======================================================
   COMPANY ROUTES (REST STANDARD)
====================================================== */

// Create Company
router.post(
  "/add",
  multiFileUpload([{ name: "companyImage", maxCount: 1 }]),
  createCompany
);

// Get All Companies
router.get("/", getCompanies);

// Get Single Company
router.get("/:id", getCompanyById);

// Update Company
router.put(
  "/update/:id",
  multiFileUpload([{ name: "companyImage", maxCount: 1 }]),
  updateCompany
);

// Soft Delete
router.patch("/soft-delete/:id", softDeleteCompany);

// Restore Company
router.patch("/restore/:id", restoreCompany);

// Hard Delete
router.delete("/hard-delete/:id", deleteCompany);

module.exports = router;
  