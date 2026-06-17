const { Schema, model } = require("mongoose");

const paymentTransactionSchema = new Schema(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },

    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    amountPaid: {
      type: Number,
      required: true,
      min: 1,
    },

    paymentMode: {
      type: String,
      enum: [
        "cash",
        "upi",
        "card",
        "bank transfer",
        "cheque",
      ],
      required: true,
      lowercase: true,
      trim: true,
    },

    transactionId: {
      type: String,
      default: null,
      trim: true,
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
    },

    receiptPdfUrl: {
      type: String,
      default: null,
    },

    receiptPdfId: {
      type: String,
      default: null,
    },

    receivedBy: {
      type: String,
      default: "admin",
      trim: true,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
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

paymentTransactionSchema.index({
  paymentId: 1,
  paymentDate: -1,
});

paymentTransactionSchema.index({
  studentId: 1,
  paymentDate: -1,
});

paymentTransactionSchema.index({
  mobile: 1,
  paymentDate: -1,
});

paymentTransactionSchema.index({
  receiptNumber: 1,
});

module.exports = model(
  "PaymentTransaction",
  paymentTransactionSchema
);