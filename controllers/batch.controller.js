const Batch = require("../models/batch.model");
const Trainer = require("../models/trainer.model");

const asyncHandler = require("../middlewares/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const batchTime = require("../helpers/batchTimeHelper");

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------
const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ---------------------------------------------------------
// CREATE BATCH
// ---------------------------------------------------------
const createBatch = asyncHandler(async (req, res) => {
  const { courseName, date, time: rawTime, duration, mode, trainerEmail } = req.body;

  if (!rawTime) throw new ApiError(400, "Time is required");
  if (!trainerEmail) throw new ApiError(400, "Trainer email is required");

  const time = batchTime(rawTime);
  const normalizedDate = normalizeDate(date);
  const normalizedEmail = trainerEmail.toLowerCase().trim();

  // 1️⃣ Validate trainer
  const trainer = await Trainer.findOne({
    email: normalizedEmail,
    isDeleted: false,
  }).select("trainerName email");

  if (!trainer) {
    throw new ApiError(404, `Trainer with email "${normalizedEmail}" not found`);
  }

  // 2️⃣ Trainer availability check
  const existingBatch = await Batch.findOne({
    trainerEmail: normalizedEmail,
    date: normalizedDate,
    time,
    isDeleted: false,
  }).select("courseName");

  if (existingBatch) {
    throw new ApiError(
      400,
      `Trainer "${trainer.trainerName}" is already assigned to course "${existingBatch.courseName}" at this date & time`
    );
  }

  // 3️⃣ Create batch
  const batch = await Batch.create({
    courseName,
    date: normalizedDate,
    duration,
    mode,
    time,
    trainerName: trainer.trainerName,
    trainerEmail: trainer.email,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, batch, "Batch created successfully"));
});

// ---------------------------------------------------------
// GET ALL BATCHES (pagination + search)
// ---------------------------------------------------------
const getBatches = asyncHandler(async (req, res) => {
  const { page = 1, limit = 4, search = "" } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  const query = { isDeleted: false };

  if (search) {
    query.$or = [
      { courseName: { $regex: search, $options: "i" } },
      { trainerName: { $regex: search, $options: "i" } },
      { trainerEmail: { $regex: search, $options: "i" } },
      { mode: { $regex: search, $options: "i" } },
    ];
  }

  const batches = await Batch.find(query)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .sort({ createdAt: -1 });

  const total = await Batch.countDocuments(query);

  return res.json(
    new ApiResponse(200, { batches, total }, "Batches fetched successfully")
  );
});

// ---------------------------------------------------------
// GET SINGLE BATCH
// ---------------------------------------------------------
const getBatchById = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!batch) throw new ApiError(404, "Batch not found");

  return res.json(new ApiResponse(200, batch, "Batch fetched successfully"));
});

// ---------------------------------------------------------
// UPDATE BATCH
// ---------------------------------------------------------
const updateBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { courseName, date, time: rawTime, duration, mode, trainerEmail } = req.body;

  if (!rawTime) throw new ApiError(400, "Time is required");
  if (!trainerEmail) throw new ApiError(400, "Trainer email is required");

  const time = batchTime(rawTime);
  const normalizedDate = normalizeDate(date);
  const normalizedEmail = trainerEmail.toLowerCase().trim();

  // 1️⃣ Validate trainer
  const trainer = await Trainer.findOne({
    email: normalizedEmail,
    isDeleted: false,
  }).select("trainerName email");

  if (!trainer) {
    throw new ApiError(404, `Trainer with email "${normalizedEmail}" not found`);
  }

  // 2️⃣ Conflict check
  const existingBatch = await Batch.findOne({
    _id: { $ne: id },
    trainerEmail: normalizedEmail,
    date: normalizedDate,
    time,
    isDeleted: false,
  }).select("courseName");

  if (existingBatch) {
    throw new ApiError(
      400,
      `Trainer "${trainer.trainerName}" is already assigned to course "${existingBatch.courseName}" at this date & time`
    );
  }

  // 3️⃣ Update batch
  const batch = await Batch.findOneAndUpdate(
    { _id: id, isDeleted: false },
    {
      courseName: courseName.toLowerCase().trim(),
      date: normalizedDate,
      duration: duration.toLowerCase().trim(),
      mode: mode.toLowerCase().trim(),
      trainerName: trainer.trainerName.toLowerCase(),
      trainerEmail: trainer.email.toLowerCase(),
      time,
    },
    { new: true, runValidators: true }
  );

  if (!batch) throw new ApiError(404, "Batch not found");

  return res.json(new ApiResponse(200, batch, "Batch updated successfully"));
});

// ---------------------------------------------------------
// SOFT DELETE
// ---------------------------------------------------------
const softDeleteBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );

  if (!batch) throw new ApiError(404, "Batch not found or already deleted");

  return res.json(new ApiResponse(200, batch, "Batch soft deleted"));
});

// ---------------------------------------------------------
// RESTORE
// ---------------------------------------------------------
const restoreBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOneAndUpdate(
    { _id: req.params.id, isDeleted: true },
    { isDeleted: false, deletedAt: null },
    { new: true }
  );

  if (!batch) throw new ApiError(404, "Deleted batch not found");

  return res.json(new ApiResponse(200, batch, "Batch restored successfully"));
});

// ---------------------------------------------------------
// HARD DELETE
// ---------------------------------------------------------
const hardDeleteBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findByIdAndDelete(req.params.id);

  if (!batch) throw new ApiError(404, "Batch not found");

  return res.json(new ApiResponse(200, null, "Batch permanently deleted"));
});

// ---------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------
module.exports = {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  softDeleteBatch,
  restoreBatch,
  hardDeleteBatch,
};
