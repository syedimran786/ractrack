const { Schema, model } = require("mongoose");

const interviewSchema = new Schema(
  {
    interviewName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    announcedDate: {
      type: Date,
      required: true,
    },

    requiredCandidates: {
      type: Number,
      required: true,
      min: 1,
    },

    expectedDate: {
      type: Date,
      default: null, // N/A
    },

    status: {
      type: String,
      enum: ["scheduled", "not scheduled"],
      default: "not scheduled",
    },

    attendedCandidates: {
      type: Number,
      default: 0,
      min: 0,
    },

    feedback: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("Interview", interviewSchema);
