const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middlewares/authMiddleware");
const {authorizeRole}=require("../middlewares/roleMiddleware")

const testController = require("../controllers/testController");

// The base path '/api/labs/tests' will be defined in server.js
router.post("/", authenticateToken, authorizeRole('lab'),testController.createTest);
router.get("/", authenticateToken, authorizeRole('lab'),testController.getAllTests);
router.get("/:id", authenticateToken, authorizeRole('lab'),testController.getTestById);
router.put("/:id", authenticateToken, authorizeRole('lab'),testController.updateTest);
router.delete("/:id", authenticateToken, authorizeRole('lab'),testController.deleteTest);

module.exports = router;