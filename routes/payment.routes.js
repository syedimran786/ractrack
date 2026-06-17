const express = require("express");
const router = express.Router();

const {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  softDeletePayment,
  restorePayment,
  deletePayment,
} = require("../controllers/payment.controller");

router.post("/add", createPayment);

router.get("/", getPayments);

router.get("/:id", getPaymentById);

router.put("/update/:id", updatePayment);

router.patch("/soft-delete/:id", softDeletePayment);

router.patch("/restore/:id", restorePayment);

router.delete("/hard-delete/:id", deletePayment);

module.exports = router;