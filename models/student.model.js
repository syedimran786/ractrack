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

    tenthPercentage: { type: Number, min: 0, max: 100, required: true },
    pucPercentage: { type: Number, min: 0, max: 100, required: true },

    ugDegree: { type: String, trim: true, lowercase: true, required: true },
    ugStream: { type: String, trim: true, lowercase: true, required: true },
    ugPercentage: { type: Number, min: 0, max: 100, required: true },
    ugYop: { type: Number, required: true },

    pgDegree: { type: String, trim: true, lowercase: true, required: true },
    pgStream: { type: String, trim: true, lowercase: true, required: true },
    pgPercentage: { type: Number, min: 0, max: 100, required: true },
    pgYop: { type: Number, required: true },

    aggregate: { type: Number, min: 0, max: 100, required: true },

    // Photo Fields (Company Style)
    photoUrl: { type: String, trim: true },
    photoId: { type: String, trim: true },
    photoHash: { type: String, trim: true, index: true },

    // Soft Delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index
studentSchema.index({ email: 1 });

module.exports = model("Student", studentSchema);
