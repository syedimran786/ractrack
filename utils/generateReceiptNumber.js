const Payment = require("../models/payment.model");

const generateReceiptNumber = async () => {
  const year = new Date().getFullYear();

  const lastReceipt = await Payment.findOne({
    receiptNumber: new RegExp(`^TRN-${year}`),
  })
    .sort({ createdAt: -1 })
    .select("receiptNumber")
    .lean();

  let seq = 1;

  if (lastReceipt?.receiptNumber) {
    seq = Number(lastReceipt.receiptNumber.split("-")[2]) + 1;
  }

  return `TRN-${year}-${String(seq).padStart(6, "0")}`;
};

module.exports = generateReceiptNumber;
