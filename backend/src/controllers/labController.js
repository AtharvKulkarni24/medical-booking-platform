const db = require("../config/db"); // Using 'db' to match your other controllers
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { blacklistToken, revokeRefreshToken } = require("../services/redisClient");

// --- GET LAB PROFILE ---
exports.getLabProfile = async (req, res) => {
  try {
    const labId = req.user.id;

    // Explicitly select columns to avoid sending password_hash
    // Extract lat/lng from the PostGIS geography object for the frontend
    const query = `
      SELECT 
        lab_id, 
        name, 
        email, 
        address_text, 
        ST_Y(location_coordinates::geometry) AS latitude,
        ST_X(location_coordinates::geometry) AS longitude,
        auth_document_url, 
        is_verified, 
        average_rating
      FROM labs 
      WHERE lab_id = $1
    `;

    const result = await db.query(query, [labId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Diagnostic center profile not found."
      });
    }

    res.status(200).json({
      success: true,
      profile: result.rows[0]
    });

  } catch (error) {
    console.error("Get Lab Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while fetching profile."
    });
  }
};

// --- UPDATE LAB PROFILE (Bonus) ---
// Since you have a Profile page, you will need this route for labs to update their details
exports.updateLabProfile = async (req, res) => {
  try {
    const labId = req.user.id;
    const { name, address_text, latitude, longitude } = req.body;

    // We update the standard text fields AND rebuild the PostGIS point
    const query = `
      UPDATE labs 
      SET 
        name = COALESCE($1, name),
        address_text = COALESCE($2, address_text),
        location_coordinates = CASE 
            WHEN $3::numeric IS NOT NULL AND $4::numeric IS NOT NULL 
            THEN ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography 
            ELSE location_coordinates 
        END
      WHERE lab_id = $5
      RETURNING lab_id, name, address_text, ST_Y(location_coordinates::geometry) AS latitude, ST_X(location_coordinates::geometry) AS longitude;
    `;

    const result = await db.query(query, [name, address_text, latitude, longitude, labId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      profile: result.rows[0]
    });

  } catch (error) {
    console.error("Update Lab Profile Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error while updating profile." });
  }
};

// --- UPDATE LAB PASSWORD ---
exports.updateLabPassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const labId = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({ 
        success: false, 
        error: "Please provide both your current password and a new password." 
      });
    }

    // 1. Fetch current hash from the labs table
    const userQuery = await db.query(
      "SELECT password_hash FROM labs WHERE lab_id = $1", 
      [labId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Diagnostic center not found." });
    }
    const currentHash = userQuery.rows[0].password_hash;

    // 2. Verify current password
    const isMatch = await bcrypt.compare(current_password, currentHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Incorrect current password. Cannot update." });
    }

    // 3. Basic password strength checks
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/; 
    const commonPasswords = ["password", "12345678", "qwerty", "letmein", "admin"];

    if (!passwordRegex.test(new_password)) {
      return res.status(400).json({ 
        success: false, 
        error: "New password must be at least 8 characters and include uppercase, lowercase, number, and special character." 
      });
    }

    const lowerNew = new_password.toLowerCase();
    if (commonPasswords.includes(lowerNew)) {
      return res.status(400).json({ success: false, error: "Please choose a less common password." });
    }

    // 4. Prevent reusing the same password
    const isSameAsCurrent = await bcrypt.compare(new_password, currentHash);
    if (isSameAsCurrent) {
      return res.status(400).json({ success: false, error: "New password must be different from the current password." });
    }

    // 5. Hash and store the new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(new_password, salt);

    await db.query(
      "UPDATE labs SET password_hash = $1 WHERE lab_id = $2", 
      [newPasswordHash, labId]
    );

    // 6. Security: Force re-login by revoking tokens
    try {
      await revokeRefreshToken(labId);
    } catch (err) {
      console.error("Failed to revoke refresh tokens for lab:", err);
    }

    try {
      const authHeader = req.headers["authorization"] || req.headers["Authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token) {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          const expiresIn = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 0);
          await blacklistToken(token, expiresIn);
        }
      }
    } catch (err) {
      console.error("Failed to blacklist access token for lab:", err);
    }

    res.status(200).json({ 
      success: true, 
      message: "Password updated successfully. Please re-login to continue." 
    });

  } catch (error) {
    console.error("Lab Password Update Error:", error);
    res.status(500).json({ success: false, error: "Server error during password update." });
  }
};