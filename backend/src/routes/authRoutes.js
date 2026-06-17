const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middlewares/authMiddleware");

//Patient Routes
router.post("/patients/register", authController.registerPatient);
router.post("/patients/login", authController.loginPatient);
router.post(
  "/patients/logout",
  authenticateToken,
  authController.logoutPatient,
);

//Lab Routes
router.post("/labs/register", authController.registerLab);
router.post("/labs/login", authController.loginLab);
router.post("/labs/logout", authenticateToken, authController.logoutLab);

module.exports = router;
