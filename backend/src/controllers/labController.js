const db = require("../config/db"); // Using 'db' to match your other controllers
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  blacklistToken,
  revokeRefreshToken,
} = require("../services/redisClient");

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
        message: "Diagnostic center profile not found.",
      });
    }

    res.status(200).json({
      success: true,
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Get Lab Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while fetching profile.",
    });
  }
};

// --- UPDATE LAB PROFILE (Bonus) ---
exports.updateLabProfile = async (req, res) => {
  try {
    const labId = req.user.id;
    const { name, address_text, latitude, longitude } = req.body;

    // FIX: Removed the ::geography cast on the THEN line
    const query = `
      UPDATE labs 
      SET 
        name = COALESCE($1, name),
        address_text = COALESCE($2, address_text),
        location_coordinates = CASE 
            WHEN $3::numeric IS NOT NULL AND $4::numeric IS NOT NULL 
            THEN ST_SetSRID(ST_MakePoint($4, $3), 4326) 
            ELSE location_coordinates 
        END
      WHERE lab_id = $5
      RETURNING lab_id, name, address_text, ST_Y(location_coordinates::geometry) AS latitude, ST_X(location_coordinates::geometry) AS longitude;
    `;

    const result = await db.query(query, [
      name,
      address_text,
      latitude,
      longitude,
      labId,
    ]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Profile not found." });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Update Lab Profile Error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error while updating profile.",
      });
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
        error: "Please provide both your current password and a new password.",
      });
    }

    // 1. Fetch current hash from the labs table
    const userQuery = await db.query(
      "SELECT password_hash FROM labs WHERE lab_id = $1",
      [labId],
    );

    if (userQuery.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Diagnostic center not found." });
    }
    const currentHash = userQuery.rows[0].password_hash;

    // 2. Verify current password
    const isMatch = await bcrypt.compare(current_password, currentHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({
          success: false,
          error: "Incorrect current password. Cannot update.",
        });
    }

    // 3. Basic password strength checks
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;
    const commonPasswords = [
      "password",
      "12345678",
      "qwerty",
      "letmein",
      "admin",
    ];

    if (!passwordRegex.test(new_password)) {
      return res.status(400).json({
        success: false,
        error:
          "New password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    const lowerNew = new_password.toLowerCase();
    if (commonPasswords.includes(lowerNew)) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Please choose a less common password.",
        });
    }

    // 4. Prevent reusing the same password
    const isSameAsCurrent = await bcrypt.compare(new_password, currentHash);
    if (isSameAsCurrent) {
      return res
        .status(400)
        .json({
          success: false,
          error: "New password must be different from the current password.",
        });
    }

    // 5. Hash and store the new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(new_password, salt);

    await db.query("UPDATE labs SET password_hash = $1 WHERE lab_id = $2", [
      newPasswordHash,
      labId,
    ]);

    // 6. Security: Force re-login by revoking tokens
    try {
      await revokeRefreshToken(labId);
    } catch (err) {
      console.error("Failed to revoke refresh tokens for lab:", err);
    }

    try {
      const authHeader =
        req.headers["authorization"] || req.headers["Authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token) {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          const expiresIn = Math.max(
            decoded.exp - Math.floor(Date.now() / 1000),
            0,
          );
          await blacklistToken(token, expiresIn);
        }
      }
    } catch (err) {
      console.error("Failed to blacklist access token for lab:", err);
    }

    res.status(200).json({
      success: true,
      message: "Password updated successfully. Please re-login to continue.",
    });
  } catch (error) {
    console.error("Lab Password Update Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error during password update." });
  }
};

// --- GET ALL SLOTS (TEMPLATES) FOR A LAB ---
exports.getLabSlots = async (req, res) => {
  try {
    const labId = req.user.id;

    // Fetch the weekly schedule template (ordered by day, then time)
    const result = await db.query(
      `SELECT slot_id, day_of_week, start_time, end_time, max_capacity
       FROM time_slots
       WHERE lab_id = $1
       ORDER BY day_of_week ASC, start_time ASC`,
      [labId]
    );

    return res.status(200).json({
      success: true,
      total_slots: result.rows.length,
      slots: result.rows,
    });
  } catch (error) {
    console.error("Get Lab Slots Error:", error);
    return res.status(500).json({ success: false, error: "Server error while fetching slots." });
  }
};

// --- GET A SPECIFIC SLOT BY ID ---
exports.getSlotById = async (req, res) => {
  try {
    const labId = req.user.id;
    const { id } = req.params;

    const result = await db.query(
      `SELECT slot_id, day_of_week, start_time, end_time, max_capacity
       FROM time_slots
       WHERE slot_id = $1 AND lab_id = $2`,
      [id, labId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Slot not found or unauthorized." });
    }

    return res.status(200).json({
      success: true,
      slot: result.rows[0],
    });
  } catch (error) {
    console.error("Get Slot By ID Error:", error);
    return res.status(500).json({ success: false, error: "Server error while fetching slot." });
  }
};

// --- CREATE A NEW SLOT ---
exports.createSlot = async (req, res) => {
  try {
    const labId = req.user.id;
    const { day_of_week, start_time, end_time, max_capacity } = req.body;

    if (day_of_week === undefined || !start_time || !end_time || max_capacity === undefined) {
      return res.status(400).json({
        success: false,
        error: "Day of week, start time, end time, and max capacity are required.",
      });
    }

    // Validate Day of Week (0 = Sunday, 6 = Saturday)
    if (day_of_week < 0 || day_of_week > 6) {
      return res.status(400).json({ success: false, error: "Day of week must be between 0 and 6." });
    }

    // 1. Validate Time Logic
    if (start_time >= end_time) {
      return res.status(400).json({ success: false, error: "End time must be after start time." });
    }

    // 2. Validate Capacity
    if (max_capacity <= 0) {
      return res.status(400).json({ success: false, error: "Maximum capacity must be greater than 0." });
    }

   // 3. Prevent Overlapping Slots (On the same day!)
    const overlapCheck = await db.query(
      `SELECT 1 FROM time_slots 
       WHERE lab_id = $1 
         AND day_of_week = $4 
         AND start_time < $3::time 
         AND end_time > $2::time`,
      [labId, start_time, end_time, day_of_week]
    );

    if (overlapCheck.rowCount > 0) {
      return res.status(409).json({
        success: false,
        error: "This time slot overlaps with an existing slot on this day.",
      });
    }

    // 4. Execute Insert
    const result = await db.query(
      `INSERT INTO time_slots (lab_id, day_of_week, start_time, end_time, max_capacity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING slot_id, day_of_week, start_time, end_time, max_capacity`,
      [labId, day_of_week, start_time, end_time, max_capacity]
    );

    res.status(201).json({
      success: true,
      message: "Slot template created successfully.",
      slot: result.rows[0],
    });
  } catch (error) {
    console.error("Create Slot Error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error while creating slot." });
  }
};

// --- UPDATE A SLOT ---
exports.updateSlot = async (req, res) => {
  try {
    const labId = req.user.id;
    const { id } = req.params;
    const { day_of_week, start_time, end_time, max_capacity } = req.body;

    // 1. Check if slot exists
    const existingSlot = await db.query(
      `SELECT * FROM time_slots WHERE slot_id = $1 AND lab_id = $2`,
      [id, labId]
    );
    if (existingSlot.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Slot not found or unauthorized." });
    }

    const slot = existingSlot.rows[0];

    // 2. Compute final values based on partial inputs (??)
    const newDay = day_of_week ?? slot.day_of_week;
    const newStart = start_time ?? slot.start_time;
    const newEnd = end_time ?? slot.end_time;
    const newCapacity = max_capacity ?? slot.max_capacity;

    if (newDay < 0 || newDay > 6) {
      return res.status(400).json({ success: false, error: "Day of week must be between 0 and 6." });
    }

    // 3. Validate Computed Time Logic
    if (newStart >= newEnd) {
      return res.status(400).json({ success: false, error: "End time must be after start time." });
    }

    if (newCapacity <= 0) {
      return res.status(400).json({ success: false, error: "Maximum capacity must be greater than 0." });
    }

    // 4. Validate Capacity against ACTUAL upcoming appointments
    // We check if any single future day already has more bookings than the new capacity
    const bookingCheck = await db.query(
      `SELECT COUNT(*) as daily_count 
       FROM appointments 
       WHERE slot_id = $1 AND appointment_date >= CURRENT_DATE 
       GROUP BY appointment_date 
       ORDER BY daily_count DESC LIMIT 1`,
      [id]
    );
    
    const maxActiveBookings = bookingCheck.rowCount > 0 ? parseInt(bookingCheck.rows[0].daily_count) : 0;

    if (newCapacity < maxActiveBookings) {
      return res.status(400).json({
        success: false,
        error: `Cannot reduce capacity. There is an upcoming date with ${maxActiveBookings} active bookings.`,
      });
    }

    // 5. Prevent Overlapping Slots (excluding current slot)
    const overlapCheck = await db.query(
      `SELECT 1 FROM time_slots 
       WHERE lab_id = $1 
         AND slot_id <> $2 
         AND day_of_week = $5 
         AND start_time < $4::time 
         AND end_time > $3::time`,
      [labId, id, newStart, newEnd, newDay]
    );

    if (overlapCheck.rowCount > 0) {
      return res.status(409).json({
        success: false,
        error: "These updated times overlap with another existing slot on this day.",
      });
    }

    // 6. Execute Update
    const updatedSlot = await db.query(
      `UPDATE time_slots
       SET day_of_week = $1, start_time = $2, end_time = $3, max_capacity = $4
       WHERE slot_id = $5 AND lab_id = $6
       RETURNING slot_id, day_of_week, start_time, end_time, max_capacity`,
      [newDay, newStart, newEnd, newCapacity, id, labId]
    );

    return res.status(200).json({
      success: true,
      message: "Slot updated successfully.",
      slot: updatedSlot.rows[0],
    });
  } catch (error) {
    console.error("Update slot error:", error);
    return res.status(500).json({ success: false, error: "Internal server error while updating slot." });
  }
};

// --- DELETE A SLOT ---
exports.deleteSlot = async (req, res) => {
  try {
    const labId = req.user.id;
    const { id } = req.params;

    // 1. Check if slot exists
    const slotResult = await db.query(
      `SELECT * FROM time_slots WHERE slot_id = $1 AND lab_id = $2`,
      [id, labId]
    );

    if (slotResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Slot not found or unauthorized." });
    }

    // 2. Safety check: Check if this slot has ANY upcoming appointments attached to it
    const futureAppointments = await db.query(
      `SELECT COUNT(*) FROM appointments 
       WHERE slot_id = $1 AND appointment_date >= CURRENT_DATE`,
      [id]
    );

    if (parseInt(futureAppointments.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete this template. There are active patient appointments scheduled for future dates.",
      });
    }

    // 3. Execute Delete
    await db.query(
      `DELETE FROM time_slots WHERE slot_id = $1 AND lab_id = $2`,
      [id, labId]
    );

    return res.status(200).json({
      success: true,
      message: "Slot deleted successfully.",
    });
  } catch (error) {
    console.error("Delete slot error:", error);
    return res.status(500).json({ success: false, error: "Internal server error while deleting slot." });
  }
};