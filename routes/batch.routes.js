const express = require("express");
const router = express.Router();
const {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  softDeleteBatch,
  restoreBatch,
  hardDeleteBatch,
} = require("../controllers/batch.controller");


router.post("/addbatch", createBatch);
router.get("/getbatches", getBatches);
router.get("/getbatch/:id", getBatchById);
router.put("/updatebatch/:id", updateBatch);
router.patch("/deletebatch/soft-delete/:id", softDeleteBatch);
router.patch("/restore/:id", restoreBatch);
router.delete("/deletebatch/hard-delete/:id", hardDeleteBatch);

module.exports = router;
