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
const authorizeRoles = require("../middlewares/authorizeRoles.middleware");

router.post(
  "/add",
  multiFileUpload([{ name: "trainerImage", maxCount: 1 }]),
   authorizeRoles("super admin", "admin", "counsellor","branding"),
  createTrainer,
);

router.get("/", getTrainers);

router.get("/:id", authorizeRoles("super admin", "admin"), getTrainerById);

router.put(
  "/update/:id",
  multiFileUpload([{ name: "trainerImage", maxCount: 1 }]),
  authorizeRoles("super admin", "admin"),
  updateTrainer,
);

router.patch("/soft-delete/:id", authorizeRoles("super admin", "admin"), softDeleteTrainer);

router.patch("/restore/:id", authorizeRoles("super admin", "admin"), restoreTrainer);

router.delete("/hard-delete/:id", authorizeRoles("super admin", "admin"), deleteTrainer);

module.exports = router;
