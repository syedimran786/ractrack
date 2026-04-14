const { Schema, model } = require("mongoose");

const enquirySchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    courseNeeded: {
      type: String,
      required: true,
      trim: true,
    },

    degree: {
      type: String,
      required: true,
      trim: true,
    },

    stream: {
      type: String,
      required: true,
      trim: true,
    },

    experience: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["new", "followup", "interested", "not_interested", "converted"],
      default: "new",
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["walkin", "website", "telephonic"],
      index: true,
    },

    isJoined: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 🔥 future-safe
    isConverted: {
      type: Boolean,
      default: false,
      index: true,
    },

    convertedToStudentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
    },

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* =========================================
   INDEXES
========================================= */

// ✅ Correct unique index (no duplicates unless deleted)
enquirySchema.index(
  { mobile: 1, courseNeeded: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

module.exports = model("Enquiry", enquirySchema);