const mongoose = require("mongoose");

const hrInterviewSchema = new mongoose.Schema(
  {
    hrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    interviewDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "attended", "selected", "rejected"],
      default: "scheduled",
    },

    feedback: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

hrInterviewSchema.index({ studentId: 1 });
hrInterviewSchema.index({ companyId: 1 });
hrInterviewSchema.index({ hrId: 1 });
hrInterviewSchema.index({ interviewDate: 1 });
hrInterviewSchema.index({ status: 1 });

module.exports = mongoose.model("HRInterview", hrInterviewSchema);
                                       