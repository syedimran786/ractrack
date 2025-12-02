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

router.post("/addplacement", createPlacement);
router.get("/getplacements", getPlacements);
router.get("/getplacement/:id", getPlacementById);
router.put("/updateplacement/:id", updatePlacement);
router.patch("/soft-delete/:id", softDeletePlacement);
router.patch("/restore/:id", restorePlacement);
router.delete("/hard-delete/:id", deletePlacement);
router.get("/getreviewsonly", getReviewsOnly);
router.get("/getonlyplacements", getOnlyPlacements);

module.exports = router;
