const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const {
  createUser,
  loginUser,
  logoutUser,
  getUsers,
  getUserById,
  updateUser,
  softDeleteUser,
} = require("../controllers/user.controller");

router.post("/login", loginUser);
router.post("/logout", protect, logoutUser);

// 🔐 ADMIN ONLY
router.post("/add", protect, authorize("admin"), createUser);
router.get("/", protect, authorize("admin"), getUsers);
router.get("/:id", protect, authorize("admin"), getUserById);
router.put("/update/:id", protect, authorize("admin"), updateUser);
router.put("/delete/:id", protect, authorize("admin"), softDeleteUser);

module.exports = router;
