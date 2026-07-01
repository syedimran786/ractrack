const Batch = require("../models/batch.model");
const Trainer = require("../models/trainer.model");

const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const batchTime = require("../helpers/batchTimeHelper");

// ---------------------------------------------------------
// HELPER
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
  const {
    courseName,
    date,
    time: rawTime,
    duration,
    mode,
    trainerEmail,
  } = req.body;

  if (!rawTime) throw new ApiError(400, "Time is required");
  if (!trainerEmail) throw new ApiError(400, "Trainer email is required");

  const time = batchTime(rawTime);
  const normalizedDate = normalizeDate(date);
  const normalizedEmail = trainerEmail.trim().toLowerCase();

  // 1️⃣ Find trainer
  const trainer = await Trainer.findOne({
    email: normalizedEmail,
    isDeleted: false,
  }).select("_id trainerName email");

  if (!trainer) throw new ApiError(404, "Trainer not found");

  // 2️⃣ Conflict check
  const conflict = await Batch.findOne({
    trainer: trainer._id,
    date: normalizedDate,
    time,
    isDeleted: false,
  });
  console.log(trainer.trainerName);
  if (conflict) {
    throw new ApiError(
      400,
      `Trainer ${trainer.trainerName.toUpperCase()} already has a batch at this time or date`,
    );
  }

  // 3️⃣ Create batch
  const batch = await Batch.create({
    courseName,
    date: normalizedDate,
    duration,
    mode,
    time,
    trainer: trainer._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, batch, "Batch created successfully"));
});

// ---------------------------------------------------------
// GET ALL BATCHES (Pagination + Search)
// ---------------------------------------------------------
const getBatches = asyncHandler(async (req, res) => {
  const { page = 1, limit = 5, search = "" } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  const query = { isDeleted: false };

  if (search) {
    const trainers = await Trainer.find({
      trainerName: { $regex: search, $options: "i" },
      isDeleted: false,
    }).select("_id");

    query.$or = [
      { courseName: { $regex: search, $options: "i" } },
      { mode: { $regex: search, $options: "i" } },
      { trainer: { $in: trainers.map((t) => t._id) } },
    ];
  }

  const batches = await Batch.find(query)
    .populate("trainer", "trainerName email")
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .sort({ createdAt: -1 })
    .lean();

  const total = await Batch.countDocuments(query);

  return res.json(
    new ApiResponse(200, { total, batches }, "Batches fetched successfully"),
  );
});

// ---------------------------------------------------------
// GET SINGLE BATCH
// ---------------------------------------------------------
const getBatchById = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate("trainer", "trainerName email")
    .lean();

  if (!batch) throw new ApiError(404, "Batch not found");

  return res.json(new ApiResponse(200, batch, "Batch fetched successfully"));
});

// ---------------------------------------------------------
// UPDATE BATCH
// ---------------------------------------------------------
const updateBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    courseName,
    date,
    time: rawTime,
    duration,
    mode,
    trainerEmail,
  } = req.body;

  if (!rawTime) throw new ApiError(400, "Time is required");
  if (!trainerEmail) throw new ApiError(400, "Trainer email is required");

  const time = batchTime(rawTime);
  const normalizedDate = normalizeDate(date);
  const normalizedEmail = trainerEmail.trim().toLowerCase();

  // 1️⃣ Find trainer
  const trainer = await Trainer.findOne({
    email: normalizedEmail,
    isDeleted: false,
  }).select("_id trainerName email");

  if (!trainer) throw new ApiError(404, "Trainer not found");

  // 2️⃣ Conflict check
  const conflict = await Batch.findOne({
    _id: { $ne: id },
    trainer: trainer._id,
    date: normalizedDate,
    time,
    isDeleted: false,
  });

  if (conflict) {
    throw new ApiError(
      400,
      `Trainer "${trainer.trainerName}" already has a batch at this time`,
    );
  }

  // 3️⃣ Update batch
  const batch = await Batch.findOneAndUpdate(
    { _id: id, isDeleted: false },
    {
      courseName,
      date: normalizedDate,
      duration,
      mode,
      time,
      trainer: trainer._id,
    },
    { new: true, runValidators: true },
  ).populate("trainer", "trainerName email");

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
    { new: true },
  );

  if (!batch) throw new ApiError(404, "Batch not found");

  return res.json(
    new ApiResponse(200, batch, "Batch soft deleted successfully"),
  );
});

// ---------------------------------------------------------
// RESTORE
// ---------------------------------------------------------
const restoreBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOneAndUpdate(
    { _id: req.params.id, isDeleted: true },
    { isDeleted: false, deletedAt: null },
    { new: true },
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

module.exports = {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  softDeleteBatch,
  restoreBatch,
  hardDeleteBatch,
};
