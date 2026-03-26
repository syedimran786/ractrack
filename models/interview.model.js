const mongoose  = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    companyCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
    },

    announcedDate: {
      type: Date,
      default: Date.now,
    },

    requiredCandidates: {
      type: Number,
      required: true,
    },

    expectedDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["open", "closed", "completed"],
      default: "open",
    },

    attendedCandidates: {
      type: Number,
      default: 0,
    },

    feedback: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    /* ===============================
       CRITERIA
    =============================== */
    criteria: {
      aggregate: {
        type: String, // "any" OR number
        default: "any",
      },

      ugDegree: String,
      ugStream: String,
      ugYop: Number,

      pgDegree: String,
      pgStream: String,
      pgYop: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Interview", interviewSchema);