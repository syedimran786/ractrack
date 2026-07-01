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
const authorizeRoles = require("../middlewares/authorizeRoles.middleware");

// 📌 1️⃣ Get all placements (with filters + pagination)
router.get("/", getPlacements);

// 📌 2️⃣ Get single placement
router.get("/:id",authorizeRoles(
    "super admin",
    "admin",
  ), getPlacementById);

// 📌 3️⃣ Submit / Update Review
router.post("/review/:studentId",authorizeRoles(
    "super admin",
    "admin",
    "branding",
    "hr"
  ), submitOrUpdateReview);

//  Final Placement Update (Transaction Safe)
router.patch("/updateplacement/:id",authorizeRoles(
    "super admin",
    "admin",
    "hr"
  ), updatePlacementByHR);

// 📌 4️⃣ Soft Delete Placement
router.patch("/delete/:id",authorizeRoles(
    "super admin",
    "admin"
  ), deletePlacement);

// 📌 5️⃣ Restore Placement
router.patch("/restore/:id", authorizeRoles(
    "super admin",
    "admin"
  ), restorePlacement);

module.exports = router;