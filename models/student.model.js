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
      unique: true, // ✅ added
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
    },

    ugStream: {
      type: String,
      required: true,
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

    pgDegree: String,
    pgStream: String,
    pgPercentage: Number,
    pgYop: Number,

    aggregate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    /* ===============================
       Business Fields
    =============================== */

    isJoinedToCourse: {
      type: Boolean,
      default: false,
      index: true,
    },

    batch: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      index: true,
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
       Interview Tracking
    =============================== */
     isJoinedToCompany: {
      type: Boolean,
      default: false,
      index: true,
    },
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
          default: null,
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
      index: true,
    },

    placedCompany: {
    type: String,
    default: null,
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
      required: true,
      index: true,
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
   Indexes (Optimized)
=============================== */

// ✅ Only add if you query by companyCode
studentSchema.index({ "companies.companyCode": 1 });

// ✅ Compound indexes (important)
studentSchema.index({ isDeleted: 1, createdAt: -1 });
studentSchema.index({ isDeleted: 1, batch: 1 });
studentSchema.index({ isDeleted: 1, isPlaced: 1 });

// ❌ removed wrong + duplicate indexes

module.exports = model("Student", studentSchema);