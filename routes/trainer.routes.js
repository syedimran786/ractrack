const express = require("express");
const router = express.Router();

const { multiFileUpload } = require("../middlewares/upload");

const {
  createTrainer,
  getTrainers,
  getTrainerById,
  updateTrainer,
  softDeleteTrainer,
  restoreTrainer,
  deleteTrainer,
} = require("../controllers/trainer.controller");

router.post(
  "/add",
  multiFileUpload([{ name: "trainerImage", maxCount: 1 }]),
  createTrainer
);

router.get("/", getTrainers);

router.get("/:id", getTrainerById);

router.put(
  "/update/:id",
  multiFileUpload([{ name: "image", maxCount: 1 }]),
  updateTrainer
);

router.patch("/soft-delete/:id", softDeleteTrainer);

router.patch("/restore/:id", restoreTrainer);

router.delete("/hard-delete/:id", deleteTrainer);

module.exports = router;
