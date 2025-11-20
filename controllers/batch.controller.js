const Batch = require("../models/batch.model");
const asyncHandler = require("../middlewares/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");

// ---------------------------------------------------------
// CREATE BATCH
// ---------------------------------------------------------
const createBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.create(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, batch, "Batch created successfully"));
});

// ---------------------------------------------------------
// GET ALL BATCHES (pagination + search by courseName, trainer, day)
// ---------------------------------------------------------
const getBatches = asyncHandler(async (req, res) => {
  const { page = 1, limit = 4, search = "" } = req.query;

  const query = {
    isDeleted: false,
  };

  if (search) {
    query.$or = [
      { courseName: { $regex: search, $options: "i" } },
      { trainer: { $regex: search, $options: "i" } },
      { day: { $regex: search, $options: "i" } },
      { mode: { $regex: search, $options: "i" } },
    ];
  }

  //! Retuning 4 documents
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
  const batch = await Batch.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    req.body,
    { new: true }
  );

  if (!batch) {
    throw new ApiError(404, "Batch not found");
  }

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
