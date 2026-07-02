const db = require("../config/db");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "YOUR_TEST_KEY_ID",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "YOUR_TEST_SECRET",
});

// ==========================================
// STEP 1: CREATE PAYMENT ORDER
// ==========================================
exports.createAppointmentOrder = async (req, res) => {
  try {
    const { lab_id, test_id, slot_id, appointment_date } = req.body;

    if (!appointment_date) {
      return res.status(400).json({ success: false, error: "Appointment date is required." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7); 
    const requestedDateObj = new Date(appointment_date);
    requestedDateObj.setHours(0, 0, 0, 0); 

    if (requestedDateObj < today) {
      return res.status(400).json({ success: false, error: "Cannot book appointments in the past." });
    }
    if (requestedDateObj > maxDate) {
      return res.status(400).json({ success: false, error: "Appointments can only be booked up to 7 days in advance." });
    }

    // UPDATED: Now we also fetch day_of_week to enforce strictly matching schedules
    const capacityCheck = await db.query(
      `SELECT 
         day_of_week,
         start_time,
         max_capacity,
         (SELECT COUNT(*) FROM appointments 
          WHERE slot_id = $1 AND appointment_date = $2 AND status = 'CONFIRMED') as current_booked
       FROM time_slots 
       WHERE slot_id = $1`,
      [slot_id, appointment_date],
    );

    if (capacityCheck.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Time slot not found." });
    }

    const slot = capacityCheck.rows[0];
    const maxCap = parseInt(slot.max_capacity);
    const currentBooked = parseInt(slot.current_booked);

    // ==========================================
    // NEW: DAY OF WEEK VALIDATION (The Loophole Fix)
    // ==========================================
    const requestedDayOfWeek = requestedDateObj.getDay();
    if (slot.day_of_week !== requestedDayOfWeek) {
        return res.status(400).json({ 
            success: false, 
            error: "The selected date does not match the day of the week for this specific time slot." 
        });
    }

    if (currentBooked >= maxCap) {
      return res.status(400).json({ success: false, error: "This time slot is fully booked for the selected date." });
    }

    const isToday = requestedDateObj.getTime() === today.getTime();
    if (isToday) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const [slotHour, slotMinute] = slot.start_time.split(":").map(Number);

      if (currentHour > slotHour || (currentHour === slotHour && currentMinute >= slotMinute)) {
        return res.status(400).json({ success: false, error: "This time slot has already started or passed." });
      }
    }

    const testCheck = await db.query(
      `SELECT price FROM tests WHERE test_id = $1 AND lab_id = $2`,
      [test_id, lab_id],
    );

    if (testCheck.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Test not found in this lab." });
    }

    const amountInPaise = Math.round(testCheck.rows[0].price * 100);
    const shortReceipt = `rcpt_${Date.now()}`;
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: shortReceipt,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ success: false, error: "Failed to initialize payment." });
  }
};
// ==========================================
// STEP 2: VERIFY PAYMENT & SAVE APPOINTMENT
// ==========================================
exports.verifyAndBookAppointment = async (req, res) => {
  const client = await db.connect(); 

  try {
    const patientId = req.user.id;
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      lab_id,
      test_id,
      slot_id,
      appointment_date
    } = req.body;

    if (!appointment_date) {
        return res.status(400).json({ success: false, error: "Appointment date is required." });
    }

    // 1. Verify the Payment Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: "Invalid payment signature. Booking failed." });
    }

    await client.query("BEGIN");

    // 2. Fetch the test price so we can log the exact amount paid in the payments table
    const testQuery = await client.query(`SELECT price FROM tests WHERE test_id = $1`, [test_id]);
    if (testQuery.rowCount === 0) throw new Error("Test not found");
    const amountPaid = testQuery.rows[0].price;

    // 3. Save the Appointment (No payment_id here anymore!)
    const appointmentResult = await client.query(
      `INSERT INTO appointments (patient_id, lab_id, test_id, slot_id, appointment_date, status)
       SELECT $1, $2, $3, $4, $5, 'CONFIRMED'
       WHERE (
          SELECT COUNT(*) 
          FROM appointments 
          WHERE slot_id = $4 AND appointment_date = $5 AND status = 'CONFIRMED'
       ) < (
          SELECT max_capacity 
          FROM time_slots 
          WHERE slot_id = $4
       )
       RETURNING appointment_id, status, created_at;`,
      [patientId, lab_id, test_id, slot_id, appointment_date]
    );

    if (appointmentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ 
          success: false, 
          error: "Sorry, this slot just filled up. Payment will be refunded." 
      });
    }

    const newAppointmentId = appointmentResult.rows[0].appointment_id;

    // 4. Log the transaction securely into the new payments table
    await client.query(
      `INSERT INTO payments 
        (appointment_id, amount, gateway_provider, gateway_order_id, gateway_payment_id, status, transaction_date)
       VALUES 
        ($1, $2, 'Razorpay', $3, $4, 'Success', NOW())`,
      [newAppointmentId, amountPaid, razorpay_order_id, razorpay_payment_id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Payment verified and appointment booked successfully!",
      appointment: appointmentResult.rows[0]
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Verification/Booking Error:", error);
    res.status(500).json({ success: false, error: "Server error during booking finalization." });
  } finally {
    client.release();
  }
};

// ==========================================
// GET ALL APPOINTMENTS FOR A PATIENT
// ==========================================
exports.getPatientAppointments = async (req, res) => {
  try {
    const patientId = req.user.id;

    const result = await db.query(
      `SELECT 
         a.appointment_id, 
         TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date, -- FIX: Force pure string
         a.status, 
         a.report_url,
         pay.gateway_payment_id AS payment_id,
         l.name AS lab_name, 
         l.address_text,
         t.test_name, 
         t.price,
         s.start_time, 
         s.end_time
       FROM appointments a
       JOIN labs l ON a.lab_id = l.lab_id
       JOIN tests t ON a.test_id = t.test_id
       JOIN time_slots s ON a.slot_id = s.slot_id
       LEFT JOIN payments pay ON a.appointment_id = pay.appointment_id
       WHERE a.patient_id = $1
       ORDER BY a.appointment_date DESC, s.start_time DESC`,
      [patientId]
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = [];
    const past = [];

    result.rows.forEach((app) => {
      const appDate = new Date(app.appointment_date);
      if (appDate >= today && app.status !== "CANCELLED") {
        upcoming.push(app);
      } else {
        past.push(app);
      }
    });

    res.status(200).json({
      success: true,
      total: result.rows.length,
      upcoming,
      past,
    });
  } catch (error) {
    console.error("Fetch Appointments Error:", error);
    res.status(500).json({ success: false, error: "Server error while fetching appointments." });
  }
};

// ==========================================
// CANCEL AN APPOINTMENT
// ==========================================
exports.cancelAppointment = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { id } = req.params; // The appointment ID

    // 1. Find the appointment and ensure it belongs to this patient
    const appCheck = await db.query(
      `SELECT appointment_date, status FROM appointments 
       WHERE appointment_id = $1 AND patient_id = $2`,
      [id, patientId],
    );

    if (appCheck.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Appointment not found." });
    }

    const appointment = appCheck.rows[0];

    // 2. Business Logic Validation
    if (appointment.status === "CANCELLED") {
      return res
        .status(400)
        .json({
          success: false,
          error: "This appointment is already cancelled.",
        });
    }

    const appDate = new Date(appointment.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appDate < today) {
      return res
        .status(400)
        .json({
          success: false,
          error: "You cannot cancel a past appointment.",
        });
    }

    // 3. Update the status
    // Note: In a real production app, you would also trigger a Razorpay refund API call here!
    await db.query(
      `UPDATE appointments SET status = 'CANCELLED' 
       WHERE appointment_id = $1`,
      [id],
    );

    res.status(200).json({
      success: true,
      message:
        "Appointment cancelled successfully. Your time slot has been freed up.",
    });
  } catch (error) {
    console.error("Cancel Appointment Error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Server error while cancelling appointment.",
      });
  }
};

// ==========================================
// GET DAILY ROSTER FOR LABS
// ==========================================
exports.getLabDailyRoster = async (req, res) => {
  try {
    const labId = req.user.id;
    const targetDate = req.query.date || new Date().toISOString().split("T")[0];

    // FIX: Added LEFT JOIN payments to get the payment ID properly
    const rosterResult = await db.query(
      `SELECT 
         a.appointment_id, 
         a.appointment_date, 
         a.status,
         pay.gateway_payment_id AS payment_id,
         p.name AS patient_name,
         p.phone_number AS patient_phone,
         p.email AS patient_email,
         t.test_name,
         s.start_time,
         s.end_time
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN tests t ON a.test_id = t.test_id
       JOIN time_slots s ON a.slot_id = s.slot_id
       LEFT JOIN payments pay ON a.appointment_id = pay.appointment_id
       WHERE a.lab_id = $1 AND a.appointment_date = $2
       ORDER BY s.start_time ASC`,
      [labId, targetDate],
    );

    res.status(200).json({
      success: true,
      date: targetDate,
      total_patients: rosterResult.rowCount,
      roster: rosterResult.rows,
    });
  } catch (error) {
    console.error("Lab Roster Error:", error);
    res.status(500).json({ success: false, error: "Server error while fetching the daily roster." });
  }
};
// ==========================================
// COMPLETE APPOINTMENT & ATTACH REPORT (LAB ONLY)
// ==========================================
exports.completeAppointment = async (req, res) => {
  try {
    const labId = req.user.id;
    const { id } = req.params; // The appointment ID
    const { report_url } = req.body;

    // 1. Verify the appointment belongs to this lab
    const appCheck = await db.query(
      `SELECT status FROM appointments 
       WHERE appointment_id = $1 AND lab_id = $2`,
      [id, labId],
    );

    if (appCheck.rowCount === 0) {
      return res
        .status(404)
        .json({
          success: false,
          error: "Appointment not found or unauthorized.",
        });
    }

    const currentStatus = appCheck.rows[0].status;

    // 2. Business Logic Validation
    if (currentStatus === "CANCELLED") {
      return res.status(400).json({
        success: false,
        error: "Cannot complete a cancelled appointment.",
      });
    }

    if (currentStatus === "COMPLETED" && !report_url) {
      return res.status(400).json({
        success: false,
        error: "This appointment is already marked as completed.",
      });
    }

    // 3. Update Status and Attach URL
    // We use COALESCE so if they want to update the URL later, it doesn't overwrite it with null if they forget to send it
    const updatedAppointment = await db.query(
      `UPDATE appointments 
       SET 
         status = 'COMPLETED',
         report_url = COALESCE($1, report_url)
       WHERE appointment_id = $2 
       RETURNING appointment_id, status, report_url`,
      [report_url || null, id],
    );

    res.status(200).json({
      success: true,
      message: "Appointment marked as completed successfully.",
      appointment: updatedAppointment.rows[0],
    });
  } catch (error) {
    console.error("Complete Appointment Error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Server error while completing appointment.",
      });
  }
};
