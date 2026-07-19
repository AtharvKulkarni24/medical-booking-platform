const db = require("../config/db");
const bcrypt = require("bcrypt"); // FIX: Corrected spelling
const jwt = require("jsonwebtoken");
const { blacklistToken, revokeRefreshToken } = require("../services/redisClient");

// --- GET PATIENT PROFILE ---
exports.getPatientProfile = async (req, res) => {
  try {
    const patientId = req.user.id;
    
    // REMOVED: last_known_location
    const query = `SELECT patient_id, name, email, phone_number, created_at FROM patients WHERE patient_id=$1`;
    const result = await db.query(query, [patientId]);

    if (result.rows.length == 0) {
      return res.status(404).json({ success: false, error: "Patient not found." });
    }

    res.status(200).json({ success: true, patient: result.rows[0] });
  } catch (error) {
    console.error("Fetch Profile Error:", error);
    res.status(500).json({ success: false, error: "Server error while fetching profile." });
  }
};

// --- UPDATE PATIENT PROFILE (Name & Phone) ---
exports.updatePatientProfile = async (req, res) => {
  try {
    const { name, phone_number } = req.body;
    const patientId = req.user.id;

    if (!name && !phone_number) {
      return res.status(400).json({ success: false, error: "Please provide either a new name or a new phone number to update." });
    }

    const updateQuery = `UPDATE patients SET name=COALESCE($1,name),phone_number=COALESCE($2,phone_number) WHERE patient_id=$3 RETURNING patient_id,name,email,phone_number`;
    const result = await db.query(updateQuery, [name || null, phone_number || null, patientId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Patient not found." });
    }

    res.status(200).json({ success: true, message: "Profile updated successfully.", patient: result.rows[0] });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ success: false, error: "Server error while updating profile." });
  }
};

// --- UPDATE PATIENT PASSWORD ---
exports.updatePatientPassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const patientId = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, error: "Please provide both your current password and a new password." });
    }

    const userQuery = await db.query("SELECT password_hash FROM patients WHERE patient_id=$1", [patientId]);

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Patient not found." });
    }
    const currentHash = userQuery.rows[0].password_hash;

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, currentHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Incorrect current password. Cannot update." });
    }

    // Basic password strength checks
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/; 
    const commonPasswords = ["password", "12345678", "qwerty", "letmein", "admin"];

    if (!passwordRegex.test(new_password)) {
      return res.status(400).json({ success: false, error: "New password must be at least 8 characters and include uppercase, lowercase, number, and special character." });
    }

    const lowerNew = new_password.toLowerCase();
    if (commonPasswords.includes(lowerNew)) {
      return res.status(400).json({ success: false, error: "Please choose a less common password." });
    }

    // Prevent reusing the same password
    const isSameAsCurrent = await bcrypt.compare(new_password, currentHash);
    if (isSameAsCurrent) {
      return res.status(400).json({ success: false, error: "New password must be different from the current password." });
    }

    // Hash and store the new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(new_password, salt);

    await db.query("UPDATE patients SET password_hash=$1 WHERE patient_id=$2", [newPasswordHash, patientId]);

    // Revoke refresh tokens and blacklist current access token
    try {
      await revokeRefreshToken(patientId);
    } catch (err) {
      console.error("Failed to revoke refresh tokens:", err);
    }

    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token) {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          const expiresIn = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 0);
          await blacklistToken(token, expiresIn);
        }
      }
    } catch (err) {
      console.error("Failed to blacklist access token:", err);
    }

    res.status(200).json({ success: true, message: "Password updated successfully. Please re-login to continue." });
  } catch (error) {
    console.error("Password Update Error:", error);
    res.status(500).json({ success: false, error: "Server error during password update." });
  }
};
// ==========================================
// GET COMPLETED APPOINTMENTS (FOR REVIEWS)
// ==========================================
exports.getCompletedAppointments = async (req, res) => {
  try {
    const patientId = req.user.id; // Comes from authenticateToken middleware

    // We use "appointment_id as id" so it perfectly matches your React frontend
    const result = await db.query(
      `SELECT 
        a.appointment_id AS id, 
        a.appointment_date, 
        s.start_time,
        s.end_time,
        a.status,
        l.name AS lab_name,
        t.test_name AS test_name
      FROM appointments a
      JOIN labs l ON a.lab_id = l.lab_id
      JOIN time_slots s ON a.slot_id=s.slot_id
      JOIN tests t ON a.test_id = t.test_id
      WHERE a.patient_id = $1 AND a.status = 'COMPLETED'
      ORDER BY a.appointment_date DESC`,
      [patientId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching completed appointments:", error);
    res.status(500).json({ success: false, error: "Server error fetching appointments." });
  }
};

// ==========================================
// GET PAST REVIEWS
// ==========================================
exports.getPastReviews = async (req, res) => {
  try {
    const patientId = req.user.id;

    const result = await db.query(
      `SELECT 
        r.review_id, 
        r.appointment_id, 
        r.rating, 
        r.comment, 
        r.created_at,
        l.name AS lab_name,
        t.test_name AS test_name
      FROM reviews r
      JOIN labs l ON r.lab_id = l.lab_id
      JOIN appointments a ON r.appointment_id = a.appointment_id
      JOIN tests t ON a.test_id = t.test_id
      WHERE r.patient_id = $1
      ORDER BY r.created_at DESC`,
      [patientId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching past reviews:", error);
    res.status(500).json({ success: false, error: "Server error fetching reviews." });
  }
};