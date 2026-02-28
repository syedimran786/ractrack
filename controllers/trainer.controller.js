const Trainer = require("../models/trainer.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  processImageAndGenerateHash,
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../services/cloudinaryImageService");

/* ======================================================
   CREATE TRAINER
====================================================== */
const createTrainer = asyncHandler(async (req, res) => {

  const { trainerName, email, designation, linkedin, facebook, instagram } =
    req.body;

  // 1️⃣ Check email duplicate
  const existingTrainer = await Trainer.findOne({ email: email.toLowerCase() });
  if (existingTrainer) {
    throw new ApiError(400, "Trainer with this email already exists");
  }
  let imageUrl = null;
  let imageId = null;
  let imageHash = null;

  // 2️⃣ Process and Upload Image
  if (req.files?.trainerImage?.[0]) {
    const file = req.files.trainerImage[0]; 


    // Create hash for duplicate detection
    const { processedBuffer, hash } = await processImageAndGenerateHash(
      file.buffer
    );
    imageHash = hash;

    // Check if the same image already exists
    const existingHashTrainer = await Trainer.findOne({ imageHash });

    if (existingHashTrainer) {
      throw new ApiError(
        400,
        "Trainer image already exists. Please upload a different image"
      );
    }

    // Upload Unique Image to Cloudinary
    const upload = await uploadToCloudinary(processedBuffer, "trainers");
    imageUrl = upload.secure_url;
    imageId = upload.public_id;
  }

  const trainer = await Trainer.create({
    trainerName,
    email,
    designation,
    linkedin,
    facebook,
    instagram,
    imageUrl,
    imageId,
    imageHash,
  });

  res
    .status(201)
    .json(new ApiResponse(201, trainer, "Trainer created successfully"));
});

/* ======================================================
   GET ALL TRAINERS
====================================================== */
const getTrainers = asyncHandler(async (req, res) => {
  const trainers = await Trainer.find({ isDeleted: false }).sort({
    createdAt: -1,
  });

  res
    .status(200)
    .json(new ApiResponse(200, trainers, "Trainers fetched successfully"));
});

/* ======================================================
   GET SINGLE TRAINER
====================================================== */
const getTrainerById = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.params.id);

  if (!trainer) {
    throw new ApiError(404, "Trainer not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, trainer, "Trainer fetched successfully"));
});

/* ======================================================
   UPDATE TRAINER
====================================================== */
const updateTrainer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { trainerName, email, designation, linkedin, facebook, instagram } =
    req.body;

  const trainer = await Trainer.findById(id);
  if (!trainer) throw new ApiError(404, "Trainer not found");

  // 1️⃣ Validate email duplicate (ignore current user)
  if (email && email.toLowerCase() !== trainer.email) {
    const emailExists = await Trainer.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      throw new ApiError(400, "Trainer with this email already exists");
    }
  }

  // 2️⃣ Image update handling
  if (req.files?.trainerImage?.[0]) {
    const file = req.files.trainerImage[0];

  
    const { processedBuffer, hash } = await processImageAndGenerateHash(
      file.buffer
    );

    // Check duplicate hash
    const existingHash = await Trainer.findOne({
      imageHash: hash,
      _id: { $ne: id },
    });

    if (existingHash) {
      throw new ApiError(
        400,
        "Trainer image already exists. Upload another image."
      );
    }

    // Delete old image if exists
    if (trainer.imageId) {
      await deleteFromCloudinary(trainer.imageId);
    }

    // Upload new image
    const upload = await uploadToCloudinary(processedBuffer, "trainers");

    trainer.imageUrl = upload.secure_url;
    trainer.imageId = upload.public_id;
    trainer.imageHash = hash;
  }

  // 3️⃣ Update text fields
  trainer.trainerName = trainerName ?? trainer.trainerName;
  trainer.email = email ?? trainer.email;
  trainer.designation = designation ?? trainer.designation;
  trainer.linkedin = linkedin ?? trainer.linkedin;
  trainer.facebook = facebook ?? trainer.facebook;
  trainer.instagram = instagram ?? trainer.instagram;

  await trainer.save();

  res
    .status(200)
    .json(new ApiResponse(200, trainer, "Trainer updated successfully"));
});

/* ======================================================
   SOFT DELETE
====================================================== */
const softDeleteTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.params.id);
  if (!trainer) throw new ApiError(404, "Trainer not found");

  trainer.isDeleted = true;
  trainer.deletedAt = new Date();
  await trainer.save();

  res
    .status(200)
    .json(new ApiResponse(200, trainer, "Trainer soft deleted successfully"));
});

/* ======================================================
   RESTORE
====================================================== */
const restoreTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.params.id);
  if (!trainer) throw new ApiError(404, "Trainer not found");

  trainer.isDeleted = false;
  trainer.deletedAt = null;
  await trainer.save();

  res
    .status(200)
    .json(new ApiResponse(200, trainer, "Trainer restored successfully"));
});

/* ======================================================
   HARD DELETE
====================================================== */
const deleteTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.params.id);
  if (!trainer) throw new ApiError(404, "Trainer not found");

  // Delete Cloudinary image
  if (trainer.imageId) {
    await deleteFromCloudinary(trainer.imageId);
  }

  await Trainer.findByIdAndDelete(req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Trainer permanently deleted"));
});

/* ======================================================
   EXPORTS (ALL AT END)
====================================================== */
module.exports = {
  createTrainer,
  getTrainers,
  getTrainerById,
  updateTrainer,
  softDeleteTrainer,
  restoreTrainer,
  deleteTrainer,
};
