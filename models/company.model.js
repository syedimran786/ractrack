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

    // Cloudinary image fields
    companyImageUrl: { type: String, trim: true },
    companyImageId: { type: String, trim: true },
    companyImageHash: { type: String, trim: true },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index for fast lookup
companySchema.index({ companyName: 1 });

module.exports = model("Company", companySchema);
