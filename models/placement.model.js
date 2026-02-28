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
    },

    studentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
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

// 🔥 One active placement per student
placementSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Text search
placementSchema.index({
  fullName: "text",
  companyName: "text",
});

// Dashboard performance
placementSchema.index({ isDeleted: 1, createdAt: -1 });

module.exports = model("Placement", placementSchema);