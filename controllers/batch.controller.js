const Batch = require("../models/batch.model");
const Trainer = require("../models/trainer.model");

const asyncHandler = require("../middlewares/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const batchTime = require("../helpers/batchTimeHelper");

// ---------------------------------------------------------
// CREATE BATCH
// ---------------------------------------------------------
const createBatch = asyncHandler(async (req, res) => {
  const { courseName, date, time: rawTime, duration, mode, trainerEmail } = req.body;

  // Normalize time
  const time = batchTime(rawTime);

  // 1️⃣ Check if trainer exists
  const trainer = await Trainer.findOne({ email: trainerEmail, isDeleted: false }).select(
    "trainerName email"
  );
  if (!trainer) {
    throw new ApiError(404, `Trainer with email "${trainerEmail}" not found`);
  }

  // 2️⃣ Check if trainer is busy at same date & time
  const existingBatch = await Batch.findOne({
    trainerEmail,
    date,
    time,
    isDeleted: false,
  }).select("_id courseName");

  if (existingBatch) {
    throw new ApiError(
      400,
      `Trainer "${trainer.trainerName}" is already assigned to course "${existingBatch.courseName}" at this date & time`
    );
  }

  // 3️⃣ Create batch with trainerName & trainerEmail
  const batch = await Batch.create({
    courseName,
    date,
    duration,
    mode,
    trainerName: trainer.trainerName,
    trainerEmail: trainer.email,
    time,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, batch, "Batch created successfully"));
});




// ---------------------------------------------------------
// GET ALL BATCHES (pagination + search by courseName, trainer, day)
// ---------------------------------------------------------
const getBatches = asyncHandler(async (req, res) => {
   const { page = 1, limit = 4, search = "" } = req.query;

  const query = { isDeleted: false };

  if (search) {
    query.$or = [
      { courseName: { $regex: search, $options: "i" } },
      { trainer: { $regex: search, $options: "i" } },
      { trainerEmail: { $regex: search, $options: "i" } },
      { mode: { $regex: search, $options: "i" } },
    ];
  }

  // Pagination
  const batches = await Batch.find(query)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });



    //! returns count based on query params if no query params returns total count
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

  if (!batch) {
    throw new ApiError(404, "Batch not found");
  }

  return res.json(new ApiResponse(200, batch, "Batch fetched successfully"));
});

// ---------------------------------------------------------
// UPDATE BATCH
// ---------------------------------------------------------
const updateBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { courseName, date, time: rawTime, duration, mode, trainerEmail } = req.body;

  // 1️⃣ Normalize time
  const time = batchTime(rawTime);

  // 2️⃣ Fetch trainer and validate
  const trainer = await Trainer.findOne({ email: trainerEmail, isDeleted: false }).select(
    "trainerName email"
  );
  if (!trainer) {
    throw new ApiError(404, `Trainer with email "${trainerEmail}" not found`);
  }

  // 3️⃣ Check if trainer already has another batch at the same date & time
  const existingBatch = await Batch.findOne({
    _id: { $ne: id }, // exclude current batch
    trainerEmail: trainer.email,
    date,
    time,
    isDeleted: false,
  }).select("courseName");

  if (existingBatch) {
    throw new ApiError(
      400,
      `Trainer "${trainer.trainerName}" is already assigned to course "${existingBatch.courseName}" at this date & time`
    );
  }

  // 4️⃣ Update batch explicitly
  const batch = await Batch.findOneAndUpdate(
    { _id: id, isDeleted: false },
    {
      courseName: courseName.toLowerCase().trim(),
      date,
      duration: duration.toLowerCase().trim(),
      mode: mode.toLowerCase().trim(),
      trainerName: trainer.trainerName.toLowerCase(),
      trainerEmail: trainer.email.toLowerCase(),
      time,
    },
    { new: true, runValidators: true }
  );

  if (!batch) throw new ApiError(404, "Batch not found");

  return res.status(200).json(new ApiResponse(200, batch, "Batch updated successfully"));
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

  if (!batch) {
    throw new ApiError(404, "Batch not found or already deleted");
  }

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

  if (!batch) {
    throw new ApiError(404, "Deleted batch not found");
  }

  return res.json(new ApiResponse(200, batch, "Batch restored successfully"));
});

// ---------------------------------------------------------
// HARD DELETE
// ---------------------------------------------------------
const hardDeleteBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findByIdAndDelete(req.params.id);

  if (!batch) {
    throw new ApiError(404, "Batch not found");
  }

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
