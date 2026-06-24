const express = require("express");
const router = express.Router();
const { 
  createUser, 
  getUsers, 
  getUserById, 
  updateUser, 
  updateUserStatus, 
  changePassword, 
  resetPassword, 
  softDeleteUser, 
  restoreUser, 
  hardDeleteUser, 
  resendCredentials} = require("../controllers/user.controller.js");

router.post("/add", createUser);

router.get("/", getUsers);

router.get("/:id", getUserById);

router.put("/update/:id", updateUser);

router.patch("/status/:id", updateUserStatus);

router.patch("/change-password/:id",changePassword);

router.patch("/reset-password/:id",resetPassword);

router.patch( "/soft-delete/:id", softDeleteUser);

router.patch("/restore/:id",restoreUser);

router.delete("/hard-delete/:id",hardDeleteUser);

router.post("/resend-credentials/:id",resendCredentials);


module.exports=router;