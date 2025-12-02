const { Schema, model } = require("mongoose");

const studentSchema = new Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    adharNumber: {
      type: String,
      required: true,
      trim: true,
    },

    fatherName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    collegeName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    tenthPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    pucPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    ugDegree: {
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

    ugPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    ugYop: {
      type: Number,
      required: true,
    },

    pgDegree: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    pgStream: {
      type: String, 
      required: true,
      trim: true,
      lowercase: true,
    },

    pgPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    pgYop: {
      type: Number,
      required: true,
    },

    aggregate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // Cloudinary photo fields
    photoUrl: { type: String, trim: true },
    photoId: { type: String, trim: true },
    photoHash: { type: String, trim: true },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index for fast lookup
studentSchema.index({ email: 1 });

module.exports = model("Student", studentSchema);
