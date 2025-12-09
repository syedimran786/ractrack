const mongoose = require("mongoose");

const placementSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Auto-filled from Student
    fullName: { type: String, required: true },
    department: { type: String, required: true },
    studentEmail: { type: String, required: true },
    studentMobile: { type: String, required: true },
    studentImage: { type: String, required: true },

    // Auto-filled from Company
    companyName: { type: String, required: true },
    companyImage: { type: String, required: true },

    // Entered manually
    companyDesignation: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Text index for searching placement by names
placementSchema.index({ fullName: "text", companyName: "text" });

module.exports = mongoose.model("Placement", placementSchema);
