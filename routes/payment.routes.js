const express = require("express");
const router = express.Router();

const {
  createPayment,
  getPaymentsByStudent,
  getReceiptByNumber,
} = require("../controllers/payment.controller");

router.post("/add", createPayment);
router.get("/student/:studentId", getPaymentsByStudent);
router.get("/receipt/:receiptNumber", getReceiptByNumber);

module.exports = router;
