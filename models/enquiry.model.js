const { Schema, model } = require("mongoose");

const enquirySchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
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
      lowercase: true,
    },

    degree: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    stream: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    experience: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    status: {
      type: String,
      required: true,
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

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* =========================================
   INDEXES
========================================= */

// Prevent duplicate enquiries (same mobile + course)
enquirySchema.index({ mobile: 1, courseNeeded: 1, isDeleted: 1 });

module.exports = model("Enquiry", enquirySchema);
