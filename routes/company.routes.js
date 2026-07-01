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
const authorizeRoles = require("../middlewares/authorizeRoles.middleware");
const verifyJWT = require("../middlewares/auth.middleware");
const checkPasswordChange = require("../middlewares/checkPasswordChange.middleware");

/* ======================================================
   COMPANY ROUTES (REST STANDARD)
====================================================== */

// Create Company
router.post(
  "/add",
   verifyJWT, checkPasswordChange,authorizeRoles(
    "super admin",
    "admin",
    "branding",
    "hr",
  ),
  multiFileUpload([{ name: "companyImage", maxCount: 1 }]),
  createCompany,
);

// Get All Companies
router.get("/", getCompanies);

// Get Single Company
router.get("/:id",verifyJWT, checkPasswordChange,authorizeRoles(
    "super admin",
    "admin",
    "branding",
    "hr",
  ), getCompanyById);

// Update Company
router.put(
  "/update/:id",
  verifyJWT,
  checkPasswordChange,
  authorizeRoles(
    "super admin",
    "admin",
    "branding",
    "hr"
  ),
  multiFileUpload([{ name: "companyImage", maxCount: 1 }]),
  updateCompany,
);

// Soft Delete
router.patch("/soft-delete/:id", verifyJWT, checkPasswordChange, authorizeRoles(
  "super admin",
  "admin"
), softDeleteCompany);

// Restore Company
router.patch("/restore/:id", verifyJWT, checkPasswordChange, authorizeRoles(
  "super admin",
  "admin"
), restoreCompany);

// Hard Delete
router.delete("/hard-delete/:id", verifyJWT, checkPasswordChange, authorizeRoles(
  "super admin",
  "admin"
), deleteCompany);

module.exports = router;
