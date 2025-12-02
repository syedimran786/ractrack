const asyncHandler = require("../middlewares/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const Company = require("../models/company.model");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { uploadImageService, deleteImageService } = require("../services/cloudinaryImageService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const hashBuffer = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

const processImage = async (file, oldId, oldHash, folder = "companies") => {
  const newBuffer = file.buffer;
  const newHash = hashBuffer(newBuffer);

  if (newHash === oldHash) return { url: null, public_id: null, hash: oldHash, changed: false };

  if (oldId) await deleteImageService(oldId);

  const uploaded = await uploadImageService(newBuffer, folder);
  return { url: uploaded.url, public_id: uploaded.public_id, hash: newHash, changed: true };
};

/* CREATE COMPANY */
const createCompany = asyncHandler(async (req, res) => {
  const { companyName } = req.body;
  const existing = await Company.findOne({ companyName });
  if (existing) throw new ApiError(409, "Company with this name already exists");

  let companyImage = {};
  if (req.files?.companyImage) {
    const buffer = req.files.companyImage[0].buffer;
    const uploaded = await uploadImageService(buffer, "companies");
    companyImage = {
      companyImageUrl: uploaded.url,
      companyImageId: uploaded.public_id,
      companyImageHash: hashBuffer(buffer),
    };
  }

  const company = await Company.create({ companyName, ...companyImage });
  return res.status(201).json(new ApiResponse(201, company, "Company created successfully"));
});

/* GET ALL COMPANIES */
const getCompanies = asyncHandler(async (req, res) => {
  const companies = await Company.find({ isDeleted: false }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, companies, "All companies fetched successfully"));
});

/* GET SINGLE COMPANY */
const getCompanyById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Company ID");

  const company = await Company.findOne({ _id: id, isDeleted: false });
  if (!company) throw new ApiError(404, "Company not found");

  return res.status(200).json(new ApiResponse(200, company, "Company fetched successfully"));
});

/* UPDATE COMPANY */
const updateCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { companyName } = req.body;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Company ID");

  const existing = await Company.findById(id);
  if (!existing) throw new ApiError(404, "Company not found");

  const nameOwner = await Company.findOne({ companyName, _id: { $ne: id } });
  if (nameOwner) throw new ApiError(409, "Company with this name already exists");

  let updatedData = { companyName };
  if (req.files?.companyImage) {
    const result = await processImage(req.files.companyImage[0], existing.companyImageId, existing.companyImageHash);
    if (result.changed) {
      updatedData.companyImageUrl = result.url;
      updatedData.companyImageId = result.public_id;
      updatedData.companyImageHash = result.hash;
    }
  }

  const updated = await Company.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
  return res.status(200).json(new ApiResponse(200, updated, "Company updated successfully"));
});

/* SOFT DELETE COMPANY */
const softDeleteCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Company ID");

  const company = await Company.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
  if (!company) throw new ApiError(404, "Company not found");

  return res.status(200).json(new ApiResponse(200, company, "Company soft-deleted"));
});

/* RESTORE COMPANY */
const restoreCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Company ID");

  const company = await Company.findByIdAndUpdate(id, { isDeleted: false, deletedAt: null }, { new: true });
  if (!company) throw new ApiError(404, "Company not found");

  return res.status(200).json(new ApiResponse(200, company, "Company restored successfully"));
});

/* HARD DELETE COMPANY */
const deleteCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Company ID");

  const company = await Company.findById(id);
  if (!company) throw new ApiError(404, "Company not found");

  if (company.companyImageId) await deleteImageService(company.companyImageId);
  await Company.findByIdAndDelete(id);

  return res.status(200).json(new ApiResponse(200, {}, "Company permanently deleted"));
});

/* EXPORTS */
module.exports = {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  softDeleteCompany,
  restoreCompany,
  deleteCompany,
};
