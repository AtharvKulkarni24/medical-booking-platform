const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { authorizeRole } = require("../middlewares/roleMiddleware");

// Apply authentication globally - Everyone must be logged in to hit these routes
router.use(authenticateToken);

// =================================
// PATIENT ROUTES 
// =================================

// Get all appointments for the logged-in patient
router.get("/my-appointments", authorizeRole("patient"), appointmentController.getPatientAppointments);

// Cancel a specific appointment
router.patch("/:id/cancel", authorizeRole("patient"), appointmentController.cancelAppointment);

// Step 1: Frontend requests an order ID
router.post("/create-order", authorizeRole("patient"), appointmentController.createAppointmentOrder);

// Step 2: Frontend sends the success receipt to finalize booking
router.post("/verify-and-book", authorizeRole("patient"), appointmentController.verifyAndBookAppointment);

// =================================
// LAB ROUTES 
// =================================

// Get the daily schedule for the logged-in diagnostic center
router.get("/roster", authorizeRole("lab"), appointmentController.getLabDailyRoster);

// Mark appointment as completed and attach report
router.patch("/:id/complete", authorizeRole("lab"), appointmentController.completeAppointment);

// Trigger manual batch payout (for testing or admin operations)
router.post("/trigger-payout", appointmentController.triggerManualPayout);

module.exports = router;