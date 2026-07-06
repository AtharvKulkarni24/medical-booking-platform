const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middlewares/authMiddleware");
const { authorizeRole } = require("../middlewares/roleMiddleware");
const labController = require("../controllers/labController");

// All routes below require authentication and lab role
router.use(authenticateToken);
router.use(authorizeRole("lab"));

// Dashboard Stats (NEW)
router.get("/dashboard-stats", labController.getDashboardStats);

// Profile
router.get("/profile", labController.getLabProfile);
router.put("/profile", labController.updateLabProfile);
router.patch("/profile/password", labController.updateLabPassword);

// Time slots
router.post("/slots", labController.createSlot);
router.get("/slots", labController.getLabSlots);
router.get("/slots/:id", labController.getSlotById);
router.put("/slots/:id", labController.updateSlot);
router.delete("/slots/:id", labController.deleteSlot);

module.exports = router;