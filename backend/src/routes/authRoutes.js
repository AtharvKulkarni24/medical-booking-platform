const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/labs/register", authController.registerLab);
router.post("/labs/login", authController.loginLab);

module.exports = router;