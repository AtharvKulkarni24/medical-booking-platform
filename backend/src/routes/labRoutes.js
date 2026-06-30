const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middlewares/authMiddleware");
const { updateSlot } = require("../controllers/labController");
const { deleteSlot } = require("../controllers/labController");
const labController = require("../controllers/labController");

// The base path '/api/labs' will be defined in server.js
router.get("/profile", authenticateToken, labController.getLabProfile);
router.put("/profile", authenticateToken, labController.updateLabProfile);
router.post("/slots", authenticateToken, labController.createSlot);
router.get("/slots", authenticateToken, labController.getLabSlots);
router.put("/slots/:slot_id", authenticateToken, updateSlot);
router.delete("/slots/:slot_id", authenticateToken, deleteSlot);
module.exports = router;