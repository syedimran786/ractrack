const Payment = require("../models/payment.model");
const Student = require("../models/student.model");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

/* =========================================================
   Create Payment Record
========================================================= */

const createPayment = asyncHandler(async (req, res) => {
  const {
    studentId,
    courseFee,
    gstPercentage = 18,
    notes,
  } = req.body;

  if (!studentId) {
    throw new ApiError(400, "studentId is required");
  }

  if (!courseFee || courseFee <= 0) {
    throw new ApiError(400, "Valid courseFee is required");
  }

  const student = await Student.findOne({
    _id: studentId,
    isDeleted: false,
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  const existingPayment = await Payment.findOne({
    studentId,
    isDeleted: false,
  });

  if (existingPayment) {
    throw new ApiError(
      409,
      "Payment record already exists for this student"
    );
  }

  // GST Inclusive Calculation
  const taxableAmount = Number(
    (courseFee / (1 + gstPercentage / 100)).toFixed(2)
  );

  const gstAmount = Number(
    (courseFee - taxableAmount).toFixed(2)
  );

  const payment = await Payment.create({
    studentId: student._id,
    mobile: student.mobile,
    studentName: student.studentName,
    batch: student.batch,

    courseFee,
    gstPercentage,
    taxableAmount,
    gstAmount,

    amountPaid: 0,
    pendingAmount: courseFee,

    paymentStatus: "pending",

    notes,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      payment,
      "Payment record created successfully"
    )
  );
});

/* =========================================================
   Get Payments
========================================================= */

const getPayments = asyncHandler(async (req, res) => {
  const {
    search,
    paymentStatus,
    batch,
    page = 1,
    limit = 10,
  } = req.query;

  const filter = {
    isDeleted: false,
  };

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  if (batch) {
    filter.batch = batch.trim().toLowerCase();
  }

  if (search) {
    filter.$or = [
      {
        studentName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        mobile: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),

    Payment.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        payments,
      },
      "Payments fetched successfully"
    )
  );
});

/* =========================================================
   Get Single Payment
========================================================= */

const getPaymentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await Payment.findOne({
    _id: id,
    isDeleted: false,
  }).lean();

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      payment,
      "Payment fetched successfully"
    )
  );
});

/* =========================================================
   Update Payment
========================================================= */

const updatePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await Payment.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  const {
    courseFee,
    gstPercentage,
    notes,
  } = req.body;

  if (
    payment.amountPaid > 0 &&
    courseFee &&
    courseFee < payment.amountPaid
  ) {
    throw new ApiError(
      400,
      "Course fee cannot be less than amount already paid"
    );
  }

  if (courseFee) {
    const gst = gstPercentage || payment.gstPercentage;

    const taxableAmount = Number(
      (courseFee / (1 + gst / 100)).toFixed(2)
    );

    const gstAmount = Number(
      (courseFee - taxableAmount).toFixed(2)
    );

    payment.courseFee = courseFee;
    payment.gstPercentage = gst;
    payment.taxableAmount = taxableAmount;
    payment.gstAmount = gstAmount;

    payment.pendingAmount =
      courseFee - payment.amountPaid;

    if (payment.amountPaid === 0) {
      payment.paymentStatus = "pending";
    } else if (
      payment.amountPaid >= courseFee
    ) {
      payment.paymentStatus = "paid";
    } else {
      payment.paymentStatus = "partial";
    }
  }

  if (notes !== undefined) {
    payment.notes = notes;
  }

  await payment.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      payment,
      "Payment updated successfully"
    )
  );
});

/* =========================================================
   Soft Delete
========================================================= */

const softDeletePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await Payment.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  payment.isDeleted = true;
  payment.deletedAt = new Date();

  await payment.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Payment soft deleted successfully"
    )
  );
});

/* =========================================================
   Restore Payment
========================================================= */

const restorePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await Payment.findOne({
    _id: id,
    isDeleted: true,
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  payment.isDeleted = false;
  payment.deletedAt = null;

  await payment.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      payment,
      "Payment restored successfully"
    )
  );
});

/* =========================================================
   Hard Delete
========================================================= */

const deletePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await Payment.findById(id);

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  await payment.deleteOne();

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Payment deleted successfully"
    )
  );
});

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  softDeletePayment,
  restorePayment,
  deletePayment,
};