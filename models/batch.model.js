const { Schema, model } = require("mongoose");

const batchSchema = new Schema(
  {
    courseName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // 🔥 always lowercase
    },

    date: { type: Date, required: true },

    time: { type: String, required: true },

    duration: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // 🔥 always lowercase
    },

    mode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // 🔥 save as: online / offline / hybrid
      enum: ["online", "offline", "hybrid"],
    },

    trainerName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // 🔥 always lowercase
    },

    trainerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"], // basic email validation
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// 🔥 Optimized index for faster duplicate lookup
batchSchema.index({ date: 1, trainerEmail: 1, courseName: 1, time: 1 });

const Batch = model("Batch", batchSchema);

module.exports = Batch;
