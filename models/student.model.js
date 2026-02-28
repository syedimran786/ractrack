const mongoose = require('mongoose');
const { Schema, model } = require("mongoose");

const studentSchema = new Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    mobile: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,

    },
    adharNumber: { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, lowercase: true },
    collegeName: { type: String, required: true, lowercase: true },
    address: { type: String, required: true },
    tenthPercentage: Number,
    pucPercentage: Number,
    ugDegree: String,
    ugStream: String,
    ugPercentage: Number,
    ugYop: Number,
    pgDegree: String,
    pgStream: String,
    pgPercentage: Number,
    pgYop: Number,
    aggregate: Number,

    // Business Fields
    isJoined: { type: Boolean, default: false, index: true },
    batch: { type: String, trim: true, lowercase: true, index: true },
    isPaid: { type: Boolean, default: false, index: true },

    // 🔥 New Enum Field
    mockRating: {
      type: String,
      enum: ["excellent", "good", "average", "poor", "very poor"],
      default: "average",
      lowercase: true,
    },
    companiesAttended: [
      {
        companyId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Company",
          required: true,
        },

        interviewId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "HRInterview",
          required: true,
        },

        status: {
          type: String,
          enum: ["scheduled", "attended", "selected", "rejected"],
          default: "scheduled",
        },

        interviewDate: Date,
      },
    ],

    isPlaced: {
      type: Boolean,
      default: false,
    },

    placedCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },

    // Photo
    photoUrl: String,
    photoId: String,
    photoHash: { type: String, index: true },

    // Soft Delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  { timestamps: true },
);

studentSchema.index({ "companiesAttended.interviewDate": 1 });
studentSchema.index({ isPlaced: 1 });


module.exports = model("Student", studentSchema);
