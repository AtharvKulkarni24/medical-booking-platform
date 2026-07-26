const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middlewares/authMiddleware");
const { authorizeRole } = require("../middlewares/roleMiddleware");
const { requireRazorpayVerification } = require("../middlewares/verifyLabMiddleware");
const labController = require("../controllers/labController");

// All routes require authentication and lab role
router.use(authenticateToken);
router.use(authorizeRole("lab"));

// 1. UNRESTRICTED ENDPOINTS (Profile & Razorpay Onboarding)
router.get("/profile", labController.getLabProfile);
router.put("/profile", labController.updateLabProfile);
router.patch("/profile/password", labController.updateLabPassword);

router.post("/razorpay-onboard", labController.onboardRazorpayAccount);
router.get("/razorpay-payout-status", labController.getRazorpayPayoutStatus);

// 2. STRICTLY RESTRICTED ENDPOINTS (Requires Active Razorpay Linked Account)
router.use(requireRazorpayVerification);

// Dashboard Stats
router.get("/dashboard-stats", labController.getDashboardStats);

// Time slots
router.post("/slots", labController.createSlot);
router.get("/slots", labController.getLabSlots);
router.get("/slots/:id", labController.getSlotById);
router.put("/slots/:id", labController.updateSlot);
router.delete("/slots/:id", labController.deleteSlot);

// Tests management
router.post("/tests", labController.createTest);
router.get("/tests", labController.getAllTests);
router.get("/tests/:id", labController.getTestById);
router.put("/tests/:id", labController.updateTest);
router.delete("/tests/:id", labController.deleteTest);

// Lab appointments
router.get("/:lab_id/appointments", labController.getLabAppointments);
router.patch("/appointments/:id/complete", labController.completeAppointment);

module.exports = router;