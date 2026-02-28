const { Schema, model } = require("mongoose");

const paymentSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

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
      index: true,
    },

    courseName: {
      type: String,
      enum: ["java fullstack", "mern stack", "python fullstack", "reactjs"],
      required: true,
      lowercase: true,
      index: true,
    },

    batchCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    totalFee: {
      type: Number,
      required: true,
      min: 0,
    },

    paidFee: {
      type: Number,
      required: true,
      min: 0,
    },

    cgst: {
      type: Number,
      required: true,
      min: 0,
    },

    sgst: {
      type: Number,
      required: true,
      min: 0,
    },

    balanceFee: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },

    companyGSTNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    receiptNumber: {
      type: String,
      unique: true,
      index: true,
    },

    paymentMode: {
      type: String,
      enum: ["cash", "upi", "card", "bank transfer"],
      required: true,
      lowercase: true,
    },

    transactionRef: {
      type: String,
      trim: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: Date,
  },
  { timestamps: true }
);

module.exports = model("Payment", paymentSchema);
