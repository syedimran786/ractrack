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
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    // Cloudinary fields
    imageUrl: { type: String, trim: true },
    imageId: { type: String, trim: true },

    designation: { type: String, trim: true, lowercase: true },
    linkedin: { type: String, trim: true },
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index for fast lookup
trainerSchema.index({ email: 1 });

module.exports = model("Trainer", trainerSchema);
