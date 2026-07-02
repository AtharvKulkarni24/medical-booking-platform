const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { authorizeRole } = require("../middlewares/roleMiddleware");

// PUBLIC ROUTE: Anyone can see a lab's reviews (useful for the lab profile page)
router.get("/lab/:labId", reviewController.getLabReviews);

// PROTECTED ROUTE: Only logged-in patients can submit a review
router.post("/appointment/:appointmentId", authenticateToken, authorizeRole("patient"), reviewController.submitReview);

module.exports = router;