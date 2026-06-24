const router = require("express").Router();

const {
  login,
  logout,
  refreshAccessToken,
  getCurrentUser,
  changeFirstLoginPassword,
} = require("../controllers/auth.controller");
const verifyJWT = require("../middlewares/auth.middleware");

router.post("/login", login);

router.post("/refresh-token", refreshAccessToken);

router.post("/logout", verifyJWT, logout);

router.post("/change-password", verifyJWT, changeFirstLoginPassword);

router.get("/me", verifyJWT, getCurrentUser);

module.exports = router;
