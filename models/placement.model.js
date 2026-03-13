const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const placementSchema = new Schema(
  {
    /* ===============================
       RELATIONS
    =============================== */

    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    /* ===============================
       SNAPSHOT FROM STUDENT
    =============================== */

    fullName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    ugStream: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    studentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    studentMobile: {
      type: String,
      required: true,
      trim: true,
    },

    studentImage: {
      type: String,
      required: true,
    },

    /* ===============================
       SNAPSHOT FROM COMPANY
    =============================== */

    companyName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    companyImageUrl: {
      type: String,
      required: true,
    },

    /* ===============================
       PLACEMENT DETAILS
    =============================== */

    companyDesignation: {
      type: String,
      required: true,
      trim: true,
    },

    /* ===============================
       REVIEW (Editable)
    =============================== */

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
      index: true,
    },

    review: {
      type: String,
      trim: true,
      default: null,
    },

    reviewSubmittedAt: {
      type: Date,
      default: null,
    },

    reviewUpdatedAt: {
      type: Date,
      default: null,
    },

    /* ===============================
       SOFT DELETE
    =============================== */

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

/* ===============================
   INDEXES
=============================== */

// Only ONE active placement per student
placementSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Text search
placementSchema.index({
  fullName: "text",
  companyName: "text",
  companyDesignation: "text",
});

// Dashboard sorting
placementSchema.index({ isDeleted: 1, createdAt: -1 });

// Main filter index
placementSchema.index({
  companyId: 1,
  ugStream: 1,
  createdAt: -1,
});

// ⭐ Review status optimization
placementSchema.index({
  rating: 1,
  isDeleted: 1,
  createdAt: -1,
});

module.exports = model("Placement", placementSchema);