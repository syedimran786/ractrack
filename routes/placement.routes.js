const express = require("express");
const router = express.Router();

const {
  createPlacement,
  getPlacements,
  getPlacementById,
  updatePlacement,
  softDeletePlacement,
  restorePlacement,
  deletePlacement,
  getReviewsOnly,
  getOnlyPlacements,
} = require("../controllers/placement.controller");

router.post("/add", createPlacement);
router.get("/all", getPlacements);
router.get("/single/:id", getPlacementById);
router.put("/update/:id", updatePlacement);
router.patch("/soft-delete/:id", softDeletePlacement);
router.patch("/restore/:id", restorePlacement);
router.delete("/hard-delete/:id", deletePlacement);
router.get("/reviews", getReviewsOnly);
router.get("/only-placements", getOnlyPlacements);

module.exports = router;
