const mongoose = require("mongoose");

const placementSchema = new mongoose.Schema(
  {
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

    // Auto-filled from Student Schema
    fullName: { type: String, required: true },
    department: { type: String, required: true },
    studentemail: { type: String, required: true },
    studentmobile: { type: String, required: true },
    studentImage: { type: String, required: true },

    // Auto-filled from Company Schema
    companyName: { type: String, required: true },
    companyImage: { type: String, required: true },

    // Manually entered
    companyDesignation: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Placement", placementSchema);
