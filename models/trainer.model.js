// models/trainer.model.js
const { Schema, model } = require("mongoose");

const trainerSchema = new Schema(
  {
    trainerName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    // Cloudinary fields
    imageUrl: { type: String, trim: true },
    imageId: { type: String, trim: true },

    // Hash to avoid duplicate trainer image uploads
    imageHash: { type: String, trim: true },

    designation: { type: String, trim: true, lowercase: true },
    linkedin: { type: String, trim: true },
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },

    // Soft delete fields
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* ======================================================
   INDEXES (Performance)
====================================================== */

// Unique email
trainerSchema.index({ email: 1 }, { unique: true });

// Improve list queries for non-deleted trainers
trainerSchema.index({ isDeleted: 1, createdAt: -1 });

// Improve lookup for duplicate image hash
trainerSchema.index({ imageHash: 1 });

/* ======================================================
   PRE-SAVE NORMALIZATION
====================================================== */
trainerSchema.pre("save", function (next) {
  if (this.trainerName) {
    this.trainerName = this.trainerName.trim().toLowerCase();
  }
  if (this.email) {
    this.email = this.email.trim().toLowerCase();
  }
  if (this.designation) {
    this.designation = this.designation.trim().toLowerCase();
  }
  next();
});

module.exports = model("Trainer", trainerSchema);
