const { Schema, model } = require("mongoose");

const batchSchema = new Schema(
  {
    courseName: {
      type: String,
      required: true,
      trim: true,
    },

    date: { type: Date, required: true }, // Batch start date
    // day: { type: String, required: true }, // e.g., Monday, Weekend
    time: { type: String, required: true }, // e.g., "6:00 PM - 8:00 PM"
    duration: { type: String, required: true }, // e.g., "3 months"
    mode: {
      type: String,
      enum: ["Online", "Offline", "Hybrid"],
      required: true,
    },
    trainer: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// optimization for queries
batchSchema.index({ date: 1, trainer: 1, courseName: 1 });

const Batch = model("Batch", batchSchema);

module.exports = Batch;
