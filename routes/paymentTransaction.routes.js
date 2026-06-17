const express = require("express");
const router = express.Router();

const {
  addPaymentTransaction,
  getPaymentTransactions,
  getPaymentTransactionById,
} = require("../controllers/paymentTransaction.controller");

router.post("/add", addPaymentTransaction);

router.get("/", getPaymentTransactions);

router.get("/:id", getPaymentTransactionById);

module.exports = router;