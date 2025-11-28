const asyncHandler = require("../middlewares/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const Trainer = require("../models/trainer.model");
const mongoose = require("mongoose");

// Cloudinary services (using memory buffer)
const {
  uploadImageService,
  deleteImageService,
} = require("../services/cloudinaryImageService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ============================================
   CREATE TRAINER
============================================ */
const createTrainer = asyncHandler(async (req, res) => {
  const { trainerName, email, designation, linkedin, facebook, instagram } =
    req.body;

  // Check duplicate email
  const existing = await Trainer.findOne({ email });
  if (existing) throw new ApiError(409, "Trainer with this email already exists");

  let upload = null;

  // Upload image if file exists (multer-memory)
  if (req.file) {
    upload = await uploadImageService(req.file.buffer, "trainers");
  }

  const trainer = await Trainer.create({
    trainerName,
    email,
    designation,
    linkedin,
    facebook,
    instagram,
    imageUrl: upload?.url || null,
    imageId: upload?.public_id || null,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, trainer, "Trainer created successfully"));
});

/* ============================================
   GET ALL TRAINERS
============================================ */
const getTrainers = asyncHandler(async (req, res) => {
  const trainers = await Trainer.find({ isDeleted: false }).sort({
    createdAt: 1,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, trainers, "All trainers fetched successfully"));
});

/* ============================================
   GET SINGLE TRAINER
============================================ */
const getTrainerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Trainer ID");

  const trainer = await Trainer.findById(id);
  if (!trainer) throw new ApiError(404, "Trainer not found");

  return res
    .status(200)
    .json(new ApiResponse(200, trainer, "Trainer fetched successfully"));
});

/* ============================================
   UPDATE TRAINER
============================================ */
const updateTrainer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Trainer ID");

  const existing = await Trainer.findById(id);
  if (!existing) throw new ApiError(404, "Trainer not found");

  const {
    trainerName,
    email,
    designation,
    linkedin,
    facebook,
    instagram,
  } = req.body;

  // Check email duplication
  const emailOwner = await Trainer.findOne({ email, _id: { $ne: id } });
  if (emailOwner)
    throw new ApiError(409, "Trainer with this email already exists");

  let newUpload = null;
  let newImageUrl = existing.imageUrl;
  let newImageId = existing.imageId;

  // If new image is uploaded
  if (req.file) {
    // delete old image
    if (existing.imageId) {
      await deleteImageService(existing.imageId);
    }

    newUpload = await uploadImageService(req.file.buffer, "trainers");
    newImageUrl = newUpload.url;
    newImageId = newUpload.public_id;
  }

  const updatedTrainer = await Trainer.findByIdAndUpdate(
    id,
    {
      trainerName,
      email,
      designation,
      linkedin,
      facebook,
      instagram,
      imageUrl: newImageUrl,
      imageId: newImageId,
    },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTrainer, "Trainer updated successfully"));
});

/* ============================================
   SOFT DELETE TRAINER
============================================ */
const softDeleteTrainer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Trainer ID");

  const trainer = await Trainer.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );

  if (!trainer) throw new ApiError(404, "Trainer not found");

  return res
    .status(200)
    .json(new ApiResponse(200, trainer, "Trainer soft-deleted"));
});

/* ============================================
   RESTORE TRAINER
============================================ */
const restoreTrainer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Trainer ID");

  const trainer = await Trainer.findByIdAndUpdate(
    id,
    { isDeleted: false, deletedAt: null },
    { new: true }
  );

  if (!trainer) throw new ApiError(404, "Trainer not found");

  return res
    .status(200)
    .json(new ApiResponse(200, trainer, "Trainer restored successfully"));
});

/* ============================================
   HARD DELETE TRAINER
============================================ */
const deleteTrainer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid Trainer ID");

  const trainer = await Trainer.findById(id);
  if (!trainer) throw new ApiError(404, "Trainer not found");

  // Delete Cloudinary image
  if (trainer.imageId) {
    await deleteImageService(trainer.imageId);
  }

  await Trainer.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Trainer permanently deleted"));
});

/* ============================================
   EXPORTS
============================================ */
module.exports = {
  createTrainer,
  getTrainers,
  getTrainerById,
  updateTrainer,
  softDeleteTrainer,
  restoreTrainer,
  deleteTrainer,
};
