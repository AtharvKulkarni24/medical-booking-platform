const db = require("../config/db"); // Using 'db' to match your other controllers

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