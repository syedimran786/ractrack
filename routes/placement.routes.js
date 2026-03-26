const express = require("express");
const router = express.Router();

const {
  getPlacements,
  getPlacementById,
  submitOrUpdateReview,
  deletePlacement,
  restorePlacement,
  updatePlacementByHR,
} = require("../controllers/placement.controller");

// 📌 1️⃣ Get all placements (with filters + pagination)
router.get("/", getPlacements);

// 📌 2️⃣ Get single placement
router.get("/:id", getPlacementById);

// 📌 3️⃣ Submit / Update Review
router.post("/review/:studentId", submitOrUpdateReview);

//  Final Placement Update (Transaction Safe)
router.patch("/updateplacement/:id", updatePlacementByHR);

// 📌 4️⃣ Soft Delete Placement
router.patch("/delete/:id", deletePlacement);

// 📌 5️⃣ Restore Placement
router.patch("/restore/:id", restorePlacement);

module.exports = router;