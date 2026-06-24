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
const authorizeRoles = require("../middlewares/authorizeRoles.middleware");
const verifyJWT = require("../middlewares/auth.middleware");
const checkPasswordChange = require("../middlewares/checkPasswordChange.middleware");


router.post("/addbatch",verifyJWT,checkPasswordChange, authorizeRoles(
    "super admin",
    "admin"
  ), createBatch);
router.get("/getbatches", getBatches);
router.get("/getbatch/:id", getBatchById);
router.put("/updatebatch/:id", updateBatch);
router.patch("/deletebatch/soft-delete/:id", softDeleteBatch);
router.patch("/restore/:id", restoreBatch);
router.delete("/deletebatch/hard-delete/:id", hardDeleteBatch);

module.exports = router;
