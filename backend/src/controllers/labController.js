const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  blacklistToken,
  revokeRefreshToken,
} = require("../services/redisClient");

// --- GET LAB DASHBOARD STATS ---
exports.getDashboardStats = async (req, res) => {
  try {
    const labId = req.user.id;

    // Run all 4 queries simultaneously using Promise.all for speed
    const [testsQuery, labQuery, completedQuery, upcomingQuery] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM tests WHERE lab_id = $1`, [labId]),
      db.query(`SELECT average_rating FROM labs WHERE lab_id = $1`, [labId]),
      db.query(`SELECT COUNT(*) FROM appointments WHERE lab_id = $1 AND status = 'COMPLETED'`, [labId]),
      db.query(`SELECT COUNT(*) FROM appointments WHERE lab_id = $1 AND status = 'CONFIRMED' AND appointment_date >= CURRENT_DATE`, [labId])
    ]);

    const stats = {
      total_tests: parseInt(testsQuery.rows[0].count, 10),
      average_rating: labQuery.rows[0].average_rating || "0.0",
      completed_appointments: parseInt(completedQuery.rows[0].count, 10),
      upcoming_bookings: parseInt(upcomingQuery.rows[0].count, 10)
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ success: false, error: "Server error while fetching dashboard stats." });
  }
};

// --- GET LAB PROFILE ---
exports.getLabProfile = async (req, res) => {
  try {
    const labId = req.user.id;

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

// --- UPDATE LAB PROFILE ---
exports.updateLabProfile = async (req, res) => {
  try {
    const labId = req.user.id;
    const { name, address_text, latitude, longitude } = req.body;

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

    const userQuery = await db.query(
      "SELECT password_hash FROM labs WHERE lab_id = $1",
      [labId],
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Diagnostic center not found." });
    }
    const currentHash = userQuery.rows[0].password_hash;

    const isMatch = await bcrypt.compare(current_password, currentHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Incorrect current password. Cannot update.",
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;
    const commonPasswords = ["password", "12345678", "qwerty", "letmein", "admin"];

    if (!passwordRegex.test(new_password)) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    const lowerNew = new_password.toLowerCase();
    if (commonPasswords.includes(lowerNew)) {
      return res.status(400).json({
        success: false,
        error: "Please choose a less common password.",
      });
    }

    const isSameAsCurrent = await bcrypt.compare(new_password, currentHash);
    if (isSameAsCurrent) {
      return res.status(400).json({
        success: false,
        error: "New password must be different from the current password.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(new_password, salt);

    await db.query("UPDATE labs SET password_hash = $1 WHERE lab_id = $2", [
      newPasswordHash,
      labId,
    ]);

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
      message: "Password updated successfully. Please re-login to continue.",
    });
  } catch (error) {
    console.error("Lab Password Update Error:", error);
    res.status(500).json({ success: false, error: "Server error during password update." });
  }
};

// --- GET ALL SLOTS (TEMPLATES) FOR A LAB ---
exports.getLabSlots = async (req, res) => {
  try {
    const labId = req.user.id;

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

    if (day_of_week < 0 || day_of_week > 6) {
      return res.status(400).json({ success: false, error: "Day of week must be between 0 and 6." });
    }

    if (start_time >= end_time) {
      return res.status(400).json({ success: false, error: "End time must be after start time." });
    }

    if (max_capacity <= 0) {
      return res.status(400).json({ success: false, error: "Maximum capacity must be greater than 0." });
    }

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

    const existingSlot = await db.query(
      `SELECT * FROM time_slots WHERE slot_id = $1 AND lab_id = $2`,
      [id, labId]
    );
    if (existingSlot.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Slot not found or unauthorized." });
    }

    const slot = existingSlot.rows[0];
    const newDay = day_of_week ?? slot.day_of_week;
    const newStart = start_time ?? slot.start_time;
    const newEnd = end_time ?? slot.end_time;
    const newCapacity = max_capacity ?? slot.max_capacity;

    if (newDay < 0 || newDay > 6) {
      return res.status(400).json({ success: false, error: "Day of week must be between 0 and 6." });
    }

    if (newStart >= newEnd) {
      return res.status(400).json({ success: false, error: "End time must be after start time." });
    }

    if (newCapacity <= 0) {
      return res.status(400).json({ success: false, error: "Maximum capacity must be greater than 0." });
    }

    const futureAppointments = await db.query(
      `SELECT COUNT(*) as count FROM appointments WHERE slot_id = $1 AND appointment_date >= CURRENT_DATE AND status = 'CONFIRMED'`,
      [id]
    );
    const hasFutureBookings = parseInt(futureAppointments.rows[0].count) > 0;

    if (hasFutureBookings && (
        newDay !== slot.day_of_week || 
        newStart !== slot.start_time || 
        newEnd !== slot.end_time
    )) {
      return res.status(400).json({ 
        success: false, 
        error: "Cannot change the day or time of this slot because patients have already booked it. You can only update the capacity." 
      });
    }

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
        error: `Cannot reduce capacity below ${maxActiveBookings} due to existing active bookings.`,
      });
    }

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
      return res.status(409).json({ success: false, error: "These updated times overlap with another existing slot on this day." });
    }

    const updatedSlot = await db.query(
      `UPDATE time_slots
       SET day_of_week = $1, start_time = $2, end_time = $3, max_capacity = $4
       WHERE slot_id = $5 AND lab_id = $6
       RETURNING slot_id, day_of_week, start_time, end_time, max_capacity`,
      [newDay, newStart, newEnd, newCapacity, id, labId]
    );

    return res.status(200).json({ success: true, message: "Slot updated successfully.", slot: updatedSlot.rows[0] });
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

    const slotResult = await db.query(
      `SELECT * FROM time_slots WHERE slot_id = $1 AND lab_id = $2`,
      [id, labId]
    );

    if (slotResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Slot not found or unauthorized." });
    }

    const futureAppointments = await db.query(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE slot_id = $1 
       AND appointment_date >= CURRENT_DATE 
       AND status = 'CONFIRMED'`,
      [id]
    );

    if (parseInt(futureAppointments.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete this time slot. There are patients with active, confirmed bookings for this time in the future."
      });
    }

    await db.query(
      `DELETE FROM time_slots WHERE slot_id = $1 AND lab_id = $2`,
      [id, labId]
    );

    return res.status(200).json({
      success: true,
      message: "Time slot deleted successfully.",
    });
  } catch (error) {
    console.error("Delete slot error:", error);
    
    // Catch foreign key constraint errors
    if (error.code === '23503') {
       return res.status(400).json({ 
         success: false, 
         error: "Cannot delete this slot because historical appointment records are tied to it. Try updating its capacity to 0 instead." 
       });
    }

    return res.status(500).json({ success: false, error: "Internal server error while deleting slot." });
  }
};
// ==========================================
// 1. GET LAB APPOINTMENTS (Organized by tabs)
// ==========================================
exports.getLabAppointments = async (req, res) => {
  try {
    const { lab_id } = req.params;

    // Grab the ID and Role based on your JWT payload
    const loggedInLabId = req.user.id || req.user.lab_id;
    const role = req.user.userType || req.user.role; 

    // Security Check
    if (role !== 'lab' || String(loggedInLabId) !== String(lab_id)) {
      return res.status(403).json({ error: "Unauthorized access to lab schedule." });
    }

    // BASE QUERY perfectly matching your schema joins
    const baseQuery = `
      SELECT 
        a.appointment_id AS id, 
        TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date, 
        a.status, 
        a.report_url,
        s.start_time,
        t.test_name, 
        p.name AS patient_name, 
        p.phone_number AS patient_phone, 
        p.email AS patient_email
      FROM appointments a
      JOIN tests t ON a.test_id = t.test_id
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN time_slots s ON a.slot_id = s.slot_id
      WHERE a.lab_id = $1
    `;

    // 1. TODAY'S Appointments
    const todayQuery = await db.query(
      `${baseQuery} AND a.appointment_date = CURRENT_DATE 
       ORDER BY s.start_time ASC`,
      [lab_id]
    );

    // 2. UPCOMING Appointments (Next 6 Days)
    const upcomingQuery = await db.query(
      `${baseQuery} AND a.appointment_date > CURRENT_DATE AND a.appointment_date <= (CURRENT_DATE + INTERVAL '6 days')
       ORDER BY a.appointment_date ASC, s.start_time ASC`,
      [lab_id]
    );

    // 3. PAST Appointments (Last 30 Days)
    const pastQuery = await db.query(
      `${baseQuery} AND a.appointment_date >= (CURRENT_DATE - INTERVAL '30 days') AND a.appointment_date < CURRENT_DATE
       ORDER BY a.appointment_date DESC, s.start_time DESC`,
      [lab_id]
    );

    res.status(200).json({
      today: todayQuery.rows,
      upcoming: upcomingQuery.rows,
      past: pastQuery.rows
    });

  } catch (error) {
    console.error("🔥 DATABASE SQL ERROR in getLabAppointments:", error.message);
    res.status(500).json({ error: "Server error fetching lab schedule." });
  }
};


// ==========================================
// 2. COMPLETE APPOINTMENT & ATTACH REPORT
// ==========================================
exports.completeAppointment = async (req, res) => {
  try {
    const loggedInLabId = req.user.id || req.user.lab_id;
    const role = req.user.userType || req.user.role; 
    
    // This expects the UUID from your appointments table
    const { id } = req.params; 
    const { report_url } = req.body;

    // Security Check
    if (role !== 'lab') {
      return res.status(403).json({ 
        success: false, 
        error: "Unauthorized. Only labs can perform this action." 
      });
    }

    // Verify ownership and check if it is today
    const appCheck = await db.query(
      `SELECT 
         status, 
         (appointment_date = CURRENT_DATE) AS is_today 
       FROM appointments 
       WHERE appointment_id = $1 AND lab_id = $2`,
      [id, loggedInLabId]
    );

    if (appCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Appointment not found or you are not authorized to modify it.",
      });
    }

    const { status: currentStatus, is_today: isToday } = appCheck.rows[0];

    // Business Logic Validation
    if (currentStatus === "CANCELLED") {
      return res.status(400).json({ 
        success: false, 
        error: "Cannot complete a cancelled appointment." 
      });
    }

    if (currentStatus === "COMPLETED" && !report_url) {
      return res.status(400).json({ 
        success: false, 
        error: "This appointment is already marked as completed." 
      });
    }

    if (!isToday) {
      return res.status(400).json({ 
        success: false, 
        error: "Action Denied: Appointments can only be marked as completed on their exact scheduled date." 
      });
    }

    // Update Status and Attach URL using COALESCE
    const updatedAppointment = await db.query(
      `UPDATE appointments 
       SET 
         status = 'COMPLETED',
         report_url = COALESCE($1, report_url)
       WHERE appointment_id = $2 
       RETURNING appointment_id, status, report_url`,
      [report_url || null, id]
    );

    res.status(200).json({
      success: true,
      message: "Appointment marked as completed successfully.",
      appointment: updatedAppointment.rows[0],
    });

  } catch (error) {
    console.error("🔥 Complete Appointment Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error while completing appointment.",
    });
  }
};