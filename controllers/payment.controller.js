const mongoose = require("mongoose");
const Payment = require("../models/payment.model");
const Student = require("../models/student.model");
const asyncHandler = require("../middlewares/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const generateReceiptNumber = require("../utils/generateReceiptNumber");

const CGST_RATE = 0.09;
const SGST_RATE = 0.09;

/* ======================================================
   CREATE PAYMENT
====================================================== */
const createPayment = asyncHandler(async (req, res) => {
  const {
    email,
    mobile,
    courseName,
    batchCode,
    totalFee,
    paidFee,
    paymentMode,
    transactionRef,
    companyGSTNumber,
  } = req.body;

  if (!email || !mobile)
    throw new ApiError(400, "Email and mobile are required");

  if (paidFee <= 0)
    throw new ApiError(400, "Paid amount must be greater than zero");

  // 🔍 Student validation
  const student = await Student.findOne({
    email: email.toLowerCase(),
    mobile: mobile.trim(),
    isDeleted: false,
  });

  if (!student)
    throw new ApiError(404, "Student not found with given email and mobile");

  // 🔢 GST calculation
  const cgst = Number((totalFee * CGST_RATE).toFixed(2));
  const sgst = Number((totalFee * SGST_RATE).toFixed(2));
  const totalPayable = totalFee + cgst + sgst;

  // 💰 Previous payments aggregation
  const previous = await Payment.aggregate([
    { $match: { studentId: student._id, isDeleted: false } },
    { $group: { _id: null, totalPaid: { $sum: "$paidFee" } } },
  ]);

  const alreadyPaid = previous[0]?.totalPaid || 0;
  const newTotalPaid = alreadyPaid + paidFee;

  if (newTotalPaid > totalPayable)
    throw new ApiError(400, "Paid amount exceeds total payable");

  const balanceFee = Number((totalPayable - newTotalPaid).toFixed(2));

  const receiptNumber = await generateReceiptNumber();

  const payment = await Payment.create({
    studentId: student._id,
    studentName: student.studentName,
    mobile: student.mobile,
    email: student.email,
    courseName,
    batchCode,
    totalFee,
    paidFee,
    cgst,
    sgst,
    balanceFee,
    receiptNumber,
    paymentMode,
    transactionRef,
    companyGSTNumber,
  });

  // 🔄 Update student flags
  student.isJoined = true;
  if (balanceFee === 0) student.isPaid = true;
  await student.save();

  res.status(201).json(
    new ApiResponse(201, payment, "Payment recorded successfully")
  );
});

/* ======================================================
   GET PAYMENTS BY STUDENT
====================================================== */
const getPaymentsByStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const payments = await Payment.find({
    studentId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!payments.length)
    throw new ApiError(404, "No payments found for this student");

  res.json(new ApiResponse(200, payments));
});

/* ======================================================
   GET RECEIPT
====================================================== */
const getReceiptByNumber = asyncHandler(async (req, res) => {
  const { receiptNumber } = req.params;

  const receipt = await Payment.findOne({
    receiptNumber,
    isDeleted: false,
  })
    .populate("studentId", "studentName email mobile batch")
    .lean();

  if (!receipt)
    throw new ApiError(404, "Receipt not found");

  res.json(new ApiResponse(200, receipt));
});

module.exports = {
  createPayment,
  getPaymentsByStudent,
  getReceiptByNumber,
};
