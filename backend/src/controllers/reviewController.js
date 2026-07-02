const db = require("../config/db");
// ==========================================
// SUBMIT A REVIEW (PATIENT ONLY)
// ==========================================
exports.submitReview = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { appointmentId } = req.params;
    const { rating, comment } = req.body;

    // 1. Basic Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid rating between 1 and 5.",
      });
    }

    // 2. Fetch the appointment to verify ownership and status
    const appCheck = await db.query(
      `SELECT lab_id, status FROM appointments 
       WHERE appointment_id = $1 AND patient_id = $2`,
      [appointmentId, patientId],
    );

    if (appCheck.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Appointment not found." });
    }

    const appointment = appCheck.rows[0];
    const labId = appointment.lab_id;

    // 3. Business Rule: Must be COMPLETED
    if (appointment.status !== "COMPLETED") {
      return res.status(400).json({
        success: false,
        error: "You can only review an appointment after it has been completed.",
      });
    }

    // 4. Insert the Review
    const result = await db.query(
      `INSERT INTO reviews (patient_id, lab_id, appointment_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING review_id, rating, comment, created_at`,
      [patientId, labId, appointmentId, rating, comment || null],
    );

    // ==========================================
    // NEW: UPDATE THE LAB'S CACHED AVERAGE RATING
    // ==========================================
    await db.query(
      `UPDATE labs 
       SET average_rating = (
           SELECT ROUND(AVG(rating), 1) 
           FROM reviews 
           WHERE lab_id = $1
       )
       WHERE lab_id = $1`,
      [labId]
    );

    res.status(201).json({
      success: true,
      message: "Thank you! Your review has been submitted.",
      review: result.rows[0],
    });
  } catch (error) {
    // PostgreSQL Error 23505 is a Unique Violation (meaning they already reviewed it)
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        error: "You have already submitted a review for this appointment.",
      });
    }

    console.error("Submit Review Error:", error);
    res.status(500).json({ success: false, error: "Server error while submitting review." });
  }
};

// ==========================================
// GET REVIEWS FOR A LAB (PUBLIC)
// ==========================================
exports.getLabReviews = async (req, res) => {
  try {
    const { labId } = req.params;

    // We join the patients table so we can show the reviewer's name
    const reviews = await db.query(
      `SELECT 
         r.review_id, 
         r.rating, 
         r.comment, 
         r.created_at,
         p.name AS patient_name
       FROM reviews r
       JOIN patients p ON r.patient_id = p.patient_id
       WHERE r.lab_id = $1
       ORDER BY r.created_at DESC`,
      [labId],
    );

    // Calculate Average Rating
    const avgQuery = await db.query(
      `SELECT ROUND(AVG(rating), 1) as average_rating 
       FROM reviews WHERE lab_id = $1`,
      [labId],
    );

    res.status(200).json({
      success: true,
      total_reviews: reviews.rowCount,
      average_rating: avgQuery.rows[0].average_rating || 0,
      reviews: reviews.rows,
    });
  } catch (error) {
    console.error("Get Reviews Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error while fetching reviews." });
  }
};
