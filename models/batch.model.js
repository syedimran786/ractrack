const { Schema, model } = require("mongoose");

const batchSchema = new Schema(
  {
    courseName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    date: {
      type: Date,
      required: true,
    },

    time: {
      type: String,
      required: true,
    },

    duration: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    mode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: ["online", "offline", "hybrid"],
    },

    // ✅ Proper relational reference
    trainer: {
      type: Schema.Types.ObjectId,
      ref: "Trainer",
      required: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ✅ Compound index for availability check
batchSchema.index({ date: 1, trainer: 1, time: 1 });

module.exports = model("Batch", batchSchema);
