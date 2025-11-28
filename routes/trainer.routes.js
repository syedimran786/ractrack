const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload");

const {
  createTrainer,
  getTrainers,
  getTrainerById,
  updateTrainer,
  softDeleteTrainer,
  restoreTrainer,
  deleteTrainer,
} = require("../controllers/trainer.controller");

// Create trainer
router.post("/addtrainer", upload.single("image"), createTrainer);

// Get all trainers
router.get("/gettrainers", getTrainers);

// Get single trainer
router.get("/gettrainer/:id", getTrainerById);

// Update trainer
router.put("/updatetrainer/:id", upload.single("image"), updateTrainer);

// Soft delete trainer
router.patch("/soft-delete/:id", softDeleteTrainer);

// Restore trainer
router.patch("/restore/:id", restoreTrainer);

// Hard delete trainer
router.delete("/hard-delete/:id", deleteTrainer);

module.exports = router;
