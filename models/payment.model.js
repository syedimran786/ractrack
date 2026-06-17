const { Schema, model } = require("mongoose");

const paymentSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
      index: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    studentName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    batch: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // GST Inclusive Fee
    courseFee: {
      type: Number,
      required: true,
      min: 0,
    },

    gstPercentage: {
      type: Number,
      default: 18,
      min: 0,
    },

    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    gstAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    pendingAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid"],
      default: "pending",
      index: true,
    },
    lastPaymentDate: {
    type: Date,
    default: null,
  },
    notes: {
      type: String,
      default: "",
      trim: true,
    },

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
  {
    timestamps: true,
  }
);

/* ==========================
   Indexes
========================== */

paymentSchema.index({
  mobile: 1,
  isDeleted: 1,
});

paymentSchema.index({
  paymentStatus: 1,
  isDeleted: 1,
});

paymentSchema.index({
  batch: 1,
  paymentStatus: 1,
});

paymentSchema.index({
  createdAt: -1,
});

module.exports = model("Payment", paymentSchema);