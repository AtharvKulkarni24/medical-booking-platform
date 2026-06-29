const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middlewares/authMiddleware");
const testController = require("../controllers/testController");

// The base path '/api/labs/tests' will be defined in server.js
router.post("/", authenticateToken, testController.createTest);
router.get("/", authenticateToken, testController.getAllTests);
router.get("/:id", authenticateToken, testController.getTestById);
router.put("/:id", authenticateToken, testController.updateTest);
router.delete("/:id", authenticateToken, testController.deleteTest);

module.exports = router;