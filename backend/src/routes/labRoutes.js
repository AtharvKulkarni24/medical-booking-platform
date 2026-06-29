const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middlewares/authMiddleware");
const labController = require("../controllers/labController");

// The base path '/api/labs' will be defined in server.js
router.get("/profile", authenticateToken, labController.getLabProfile);
router.put("/profile", authenticateToken, labController.updateLabProfile);

module.exports = router;