const mongoose = require("mongoose");

const Payment = require("../models/payment.model");
const PaymentTransaction = require("../models/paymentTransaction.model");
const Student = require("../models/student.model");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const fs = require("fs");
const generateReceiptPdf = require("../utils/generateReceiptPdf");
const uploadPdfToCloudinary = require( "../utils/uploadPdfToCloudinary");

//!------------------------------------------

const generateReceiptNumber = () => {
  const now = new Date();

  const date =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `REC-${date}-${random}`;
};

const addPaymentTransaction = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let uploadedPdf = null;

  try {
    session.startTransaction();

    const {
      studentId,
      amountPaid,
      paymentMode,
      transactionId,
      remarks,
      receivedBy,
    } = req.body;

    if (!studentId) {
      throw new ApiError(400, "studentId is required");
    }

    if (!amountPaid || amountPaid <= 0) {
      throw new ApiError(
        400,
        "Valid amountPaid is required"
      );
    }

    const payment = await Payment.findOne({
      studentId,
      isDeleted: false,
    }).session(session);

    if (!payment) {
      throw new ApiError(
        404,
        "Payment record not found"
      );
    }

    if (payment.paymentStatus === "paid") {
      throw new ApiError(
        400,
        "Student has already completed payment"
      );
    }

    if (amountPaid > payment.pendingAmount) {
      throw new ApiError(
        400,
        `Payment exceeds pending amount (${payment.pendingAmount})`
      );
    }

    const student = await Student.findById(
      studentId
    ).session(session);

    if (!student) {
      throw new ApiError(
        404,
        "Student not found"
      );
    }

    const receiptNumber =
      generateReceiptNumber();

    const [transaction] =
      await PaymentTransaction.create(
        [
          {
            paymentId: payment._id,
            studentId,
            mobile: payment.mobile,

            receiptNumber,

            amountPaid,
            paymentMode,
            transactionId,
            remarks,

            receivedBy,
          },
        ],
        { session }
      );

    payment.amountPaid += amountPaid;
    payment.pendingAmount -= amountPaid;

    payment.paymentStatus =
      payment.pendingAmount === 0
        ? "paid"
        : "partial";

    payment.lastPaymentDate = new Date();

    await payment.save({ session });

    // ==========================
    // Generate Receipt PDF
    // ==========================

    const { filePath } =
      await generateReceiptPdf({
        student,
        payment,
        transaction,
      });

     uploadedPdf =
      await uploadPdfToCloudinary(filePath);

    transaction.receiptPdfUrl =
      uploadedPdf.secure_url;

    transaction.receiptPdfId =
      uploadedPdf.public_id;

    await transaction.save({ session });

    // Delete local pdf
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (payment.pendingAmount === 0) {
     await Student.findByIdAndUpdate(
  studentId,
  {
    $set: { isPaid: true },
  },
  { session, new: true }
);
    }

    await session.commitTransaction();
console.log({uploadedPdf});
    return res.status(201).json(
      new ApiResponse(
        201,
        {
          transaction,
          paymentSummary: {
            amountPaid: payment.amountPaid,
            pendingAmount: payment.pendingAmount,
            paymentStatus:
              payment.paymentStatus,
          },
        },
        "Payment recorded successfully"
      )
    );
  } catch (error) {
  await session.abortTransaction();

  if (
    uploadedPdf &&
    uploadedPdf.public_id
  ) {
    try {
      await cloudinary.uploader.destroy(
        uploadedPdf.public_id,
        {
          resource_type: "raw",
        }
      );
    } catch (cleanupError) {
      console.error(
        "Cloudinary cleanup failed:",
        cleanupError.message
      );
    }
  }

  throw error;
} finally {
    session.endSession();
  }
});


const getPaymentTransactions = asyncHandler(
  async (req, res) => {
    const {
      studentId,
      mobile,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {
      isDeleted: false,
    };

    if (studentId) {
      filter.studentId = studentId;
    }

    if (mobile) {
      filter.mobile = mobile;
    }

    const skip = (page - 1) * limit;

    const [transactions, total] =
      await Promise.all([
        PaymentTransaction.find(filter)
          .sort({ paymentDate: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),

        PaymentTransaction.countDocuments(filter),
      ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit),
          transactions,
        },
        "Transactions fetched successfully"
      )
    );
  }
);


const getPaymentTransactionById =
  asyncHandler(async (req, res) => {
    const transaction =
      await PaymentTransaction.findOne({
        _id: req.params.id,
        isDeleted: false,
      }).lean();

    if (!transaction) {
      throw new ApiError(
        404,
        "Transaction not found"
      );
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        transaction,
        "Transaction fetched successfully"
      )
    );
  });

  module.exports = {
  addPaymentTransaction,
  getPaymentTransactions,
  getPaymentTransactionById,
};