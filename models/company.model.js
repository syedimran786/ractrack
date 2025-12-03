// models/company.model.js
const { Schema, model } = require("mongoose");

const companySchema = new Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },

    // Cloudinary Image Fields
    companyImageUrl: { type: String, trim: true },
    companyImageId: { type: String, trim: true },

    // Hash used to prevent duplicate image uploading
    companyImageHash: { type: String, trim: true, index: true },

    // Soft Delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* ======================================================
   INDEXES (Performance)
====================================================== */

// Unique company name
companySchema.index({ companyName: 1 }, { unique: true });

// Improve list query performance (find non-deleted companies)
companySchema.index({ isDeleted: 1, createdAt: -1 });

// Improve find-by-hash performance (avoid cloud duplicates)
companySchema.index({ companyImageHash: 1 });

/* ======================================================
   PRE-SAVE NORMALIZATION
====================================================== */
companySchema.pre("save", function (next) {
  if (this.companyName) {
    this.companyName = this.companyName.trim().toLowerCase();
  }
  next();
});

module.exports = model("Company", companySchema);
