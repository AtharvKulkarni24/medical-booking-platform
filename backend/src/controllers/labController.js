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

exports.getLabSlots = async (req, res) => {
    try {
        const labId = req.user.id;

        const result = await db.query(
            `SELECT
                slot_id,
                start_time,
                end_time,
                max_capacity,
                current_bookings
             FROM time_slots
             WHERE lab_id = $1
             ORDER BY start_time ASC`,
            [labId]
        );

        return res.status(200).json({
            success: true,
            total_slots: result.rows.length,
            slots: result.rows
        });

    } catch (error) {
        console.error("Get Lab Slots Error:", error);

        return res.status(500).json({
            success: false,
            error: "Server error while fetching slots."
        });
    }
};

exports.createSlot = async (req, res) => {
    try {
        const labId = req.user.id;

        const {
            start_time,
            end_time,
            max_capacity
        } = req.body;

        await db.query(
            `INSERT INTO time_slots
            (lab_id, start_time, end_time, max_capacity)
            VALUES ($1, $2, $3, $4)`,
            [
                labId,
                start_time,
                end_time,
                max_capacity
            ]
        );

        res.status(201).json({
            success: true,
            message: "Slot created successfully."
        });

    } catch (err) {
        console.error("Create Slot Error:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};
 
exports.updateSlot = async (req, res) => {
  try {
    const labId = req.user.id; // assuming lab is logged in
    const { slot_id } = req.params;

    const {
      start_time,
      end_time,
      max_capacity
    } = req.body;

    // 1. Check if slot exists and belongs to this lab
    const existingSlot = await db.query(
      `SELECT * FROM time_slots WHERE slot_id = $1 AND lab_id = $2`,
      [slot_id, labId]
    );

    if (existingSlot.rowCount === 0) {
      return res.status(404).json({ message: "Slot not found" });
    }

    const slot = existingSlot.rows[0];

    // 2. Validate capacity vs current bookings
    if (max_capacity !== undefined && max_capacity < slot.current_bookings) {
      return res.status(400).json({
        message: `max_capacity cannot be less than current bookings (${slot.current_bookings})`
      });
    }

    // 3. Update query (only provided fields)
    const updatedSlot = await db.query(
      `UPDATE time_slots
       SET 
         start_time = COALESCE($1, start_time),
         end_time = COALESCE($2, end_time),
         max_capacity = COALESCE($3, max_capacity)
       WHERE slot_id = $4 AND lab_id = $5
       RETURNING *`,
      [
        start_time || null,
        end_time || null,
        max_capacity || null,
        slot_id,
        labId
      ]
    );

    return res.status(200).json({
      message: "Slot updated successfully",
      slot: updatedSlot.rows[0]
    });

  } catch (error) {
    console.error("Update slot error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteSlot = async (req, res) => {
  try {
    const labId = req.user.id;
    const { slot_id } = req.params;

    // 1. Check if slot exists and belongs to this lab
    const slotResult = await db.query(
      `SELECT * FROM time_slots WHERE slot_id = $1 AND lab_id = $2`,
      [slot_id, labId]
    );

    if (slotResult.rowCount === 0) {
      return res.status(404).json({
        message: "Slot not found or not authorized"
      });
    }

    const slot = slotResult.rows[0];

    // 2. Safety check (optional but recommended)
    if (slot.current_bookings > 0) {
      return res.status(400).json({
        message: "Cannot delete slot with active bookings"
      });
    }

    // 3. Delete slot
    await db.query(
      `DELETE FROM time_slots WHERE slot_id = $1 AND lab_id = $2`,
      [slot_id, labId]
    );

    return res.status(200).json({
      message: "Slot deleted successfully"
    });

  } catch (error) {
    console.error("Delete slot error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};