const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const studentSchema = new Schema(
  {
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
      lowercase: true,
      index: true,
    },

    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
      unique: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10 digit mobile number"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    adharNumber: {
      type: String,
      required: [true, "Aadhar number is required"],
      trim: true,
      match: [/^\d{12}$/, "Aadhar number must be 12 digits"],
    },

    fatherName: {
      type: String,
      required: [true, "Father name is required"],
      lowercase: true,
      trim: true,
    },

    collegeName: {
      type: String,
      required: [true, "College name is required"],
      lowercase: true,
      trim: true,
    },

    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },

    tenthPercentage: {
      type: Number,
      required: [true, "10th percentage is required"],
    },

    pucPercentage: {
      type: Number,
      required: [true, "PUC percentage is required"],
    },

    ugDegree: {
      type: String,
      required: [true, "UG degree is required"],
    },

    ugStream: {
      type: String,
      required: [true, "UG stream is required"],
    },

    ugPercentage: {
      type: Number,
      required: [true, "UG percentage is required"],
    },

    ugYop: {
      type: Number,
      required: [true, "UG year of passing is required"],
    },

    pgDegree: String,
    pgStream: String,
    pgPercentage: Number,
    pgYop: Number,

    aggregate: {
      type: Number,
      required: [true, "Aggregate is required"],
    },

    /* ===============================
       Business Fields
    =============================== */

    isJoined: {
      type: Boolean,
      default: false,
      index: true,
    },

    batch: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      required: [true, "Batch is required"],
    },

    isPaid: {
      type: Boolean,
      default: false,
      index: true,
    },

    mockRating: {
      type: String,
      enum: ["excellent", "good", "average", "poor", "very poor"],
      default: "average",
      lowercase: true,
    },

    /* ===============================
       Placement & Interview Tracking
    =============================== */

  /* ===============================
   INTERVIEW TRACKING (UPDATED)
=============================== */

/* ===============================
   INTERVIEW TRACKING (SIMPLIFIED)
=============================== */

companies: [
  {
    companyName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    companyCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "not scheduled",
        "scheduled",
        "attended",
        "selected",
        "rejected",
      ],
      default: "not scheduled",
      lowercase: true,
    },

    addedDate: {
      type: Date,
      default: Date.now,
    },

    interviewDate: {
      type: Date,
      default: null, // ✅ instead of "N/A"
    },

    interviewFeedback: {
      type: String,
      default: "",
      trim: true,
    },
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

    /* ===============================
       Photo
    =============================== */

    photoUrl: {
      type: String,
      required: true,
    },

    photoId: {
      type: String,
      required: true,
    },

    photoHash: {
      type: String,
      index: true,
      required: true,
    },

    /* ===============================
       Soft Delete
    =============================== */

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: Date,
  },
  { timestamps: true }
);

/* ===============================
   Indexes
=============================== */

studentSchema.index({ "companiesAdded.companyCode": 1 });
studentSchema.index({ "companiesAttended.companyCode": 1 });
studentSchema.index({ isPlaced: 1 });
studentSchema.index({ email: 1 });
studentSchema.index({ mobile: 1 });
studentSchema.index({ photoHash: 1 });

module.exports = model("Student", studentSchema);