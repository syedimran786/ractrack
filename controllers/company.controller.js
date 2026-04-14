const Company = require("../models/company.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { optimizeImage } = require("../utils/imageProcessor");
const { uploadToCloudinary, deleteFromCloudinary } = require("../services/cloudinaryImageService");

/* ======================================================
   CREATE COMPANY (name validation → image validation)
====================================================== */
const createCompany = asyncHandler(async (req, res) => {
  const { companyName } = req.body;

  if (!companyName || !companyName.trim()) {
    throw new ApiError(400, "Company name is required");
  }

  // 1️⃣ Validate company name
  const nameExists = await Company.findOne({
    companyName: companyName.trim().toLowerCase(),
  });

  if (nameExists) {
    throw new ApiError(409, "Company name already exists");
  }

  // 2️⃣ Validate company image
  if (!req.files?.companyImage?.[0]) {
    throw new ApiError(400, "Company image is required");
  }

  const file = req.files.companyImage[0];
  const rawHash = file.fileHash;

  const existingImage = await Company.findOne({ companyImageHash: rawHash });
  if (existingImage) {
    throw new ApiError(409, "Company image already added");
  }

  // 3️⃣ Upload image
  const optimized = await optimizeImage(file.buffer);
  const uploaded = await uploadToCloudinary(optimized, "companies");
  const company = await Company.create({
    companyName,
    companyImageUrl: uploaded.secure_url,
    companyImageId: uploaded.public_id,
    companyImageHash: rawHash,
  });

  res
    .status(201)
    .json(new ApiResponse(201, company, "Company created successfully"));
});

/* ======================================================
   UPDATE COMPANY (name validation → image validation)
====================================================== */
const updateCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const company = await Company.findById(id);
  if (!company) throw new ApiError(404, "Company not found");

  const { companyName } = req.body;
console.log(companyName);

  // 1️⃣ Validate new company name (if provided)
  if (companyName) {
    const nameExists = await Company.findOne({
      companyName: companyName.trim().toLowerCase(),
      _id: { $ne: id }, // exclude current company
    });

    if (nameExists) {
      throw new ApiError(409, "Another company already uses this name");
    }

    company.companyName = companyName;
  }
  // 2️⃣ Handle image update
  if (req.files?.companyImage?.[0]) {
    const file = req.files.companyImage[0];
    const rawHash = file.fileHash;

    const existingImage = await Company.findOne({
      companyImageHash: rawHash,
      _id: { $ne: id },
    });

    if (existingImage) {
      throw new ApiError(409, "Company image already added");
    }

    // Delete old image in Cloudinary
    if (company.companyImageId) {
      await deleteFromCloudinary(company.companyImageId);
    }

    const optimized = await optimizeImage(file.buffer);
    const uploaded = await uploadToCloudinary(optimized, "companies");

    company.companyImageUrl = uploaded.secure_url;
    company.companyImageId = uploaded.public_id;
    company.companyImageHash = rawHash;
  }

  await company.save();

  res.json(new ApiResponse(200, company, "Company updated successfully"));
});

/* ======================================================
   GET ALL COMPANIES
====================================================== */
const getCompanies = asyncHandler(async (req, res) => {
  const companies = await Company.find({ isDeleted: false });
  res.json(new ApiResponse(200, companies));
});

/* ======================================================
   GET COMPANY BY ID
====================================================== */
const getCompanyById = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) throw new ApiError(404, "Company not found");
  res.json(new ApiResponse(200, company));
});

/* ======================================================
   SOFT DELETE
====================================================== */
const softDeleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) throw new ApiError(404, "Company not found");

  company.isDeleted = true;
  company.deletedAt = new Date();
  await company.save();

  res.json(new ApiResponse(200, company, "Company soft deleted"));
});

/* ======================================================
   RESTORE
====================================================== */
const restoreCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) throw new ApiError(404, "Company not found");

  company.isDeleted = false;
  company.deletedAt = null;
  await company.save();

  res.json(new ApiResponse(200, company, "Company restored"));
});

/* ======================================================
   HARD DELETE
====================================================== */
const deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) throw new ApiError(404, "Company not found");

  if (company.companyImageId) {
    await deleteFromCloudinary(company.companyImageId);
  }

  await company.deleteOne();

  res.json(new ApiResponse(200, null, "Company permanently deleted"));
});

/* ======================================================
   EXPORTS
====================================================== */
module.exports = {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  softDeleteCompany,
  restoreCompany,
  deleteCompany,
};
