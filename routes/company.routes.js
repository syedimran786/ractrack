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

router.post("/add", multiFileUpload([{ name: "companyImage", maxCount: 1 }]), createCompany);
router.get("/", getCompanies);
router.get("/:id", getCompanyById);
router.put("/update/:id", multiFileUpload([{ name: "companyImage", maxCount: 1 }]), updateCompany);
router.patch("/soft-delete/:id", softDeleteCompany);
router.patch("/restore/:id", restoreCompany);
router.delete("/hard-delete/:id", deleteCompany);

module.exports = router;
