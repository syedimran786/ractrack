const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateReceiptPdf = async ({
  transaction,
  payment,
}) => {
  return new Promise((resolve, reject) => {
    try {
      const receiptsDir = path.join(
        __dirname,
        "../uploads/receipts"
      );

      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const fileName = `${transaction.receiptNumber}.pdf`;

      const filePath = path.join(
        receiptsDir,
        fileName
      );

      const doc = new PDFDocument({
        margin: 50,
      });

      const stream =
        fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(22)
        .text("PAYMENT RECEIPT", {
          align: "center",
        });

      doc.moveDown();

      doc.fontSize(12);

      doc.text(
        `Receipt Number: ${transaction.receiptNumber}`
      );

      doc.text(
        `Date: ${new Date().toLocaleDateString()}`
      );

      doc.moveDown();

      doc.text(
        `Student Mobile: ${payment.mobile}`
      );

      doc.text(
        `Payment Mode: ${transaction.paymentMode}`
      );

      doc.text(
        `Transaction ID: ${
          transaction.transactionId || "N/A"
        }`
      );

      doc.moveDown();

      doc.text(
        `Amount Paid: ₹${transaction.amountPaid}`
      );

      doc.text(
        `Total Paid Till Date: ₹${payment.amountPaid}`
      );

      doc.text(
        `Pending Amount: ₹${payment.pendingAmount}`
      );

      doc.text(
        `Status: ${payment.paymentStatus}`
      );

      doc.moveDown();

      doc.text(
        `Received By: ${
          transaction.receivedBy || "Admin"
        }`
      );

      doc.text(
        `Remarks: ${
          transaction.remarks || "-"
        }`
      );

      doc.moveDown(2);

      doc.text(
        "Thank you for your payment.",
        {
          align: "center",
        }
      );

      doc.end();

      stream.on("finish", () => {
        resolve({
          filePath,
          fileName,
        });
      });

      stream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateReceiptPdf;