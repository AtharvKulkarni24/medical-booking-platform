require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const bcrypt = require("bcrypt");
const pool = require("../src/config/db");

async function seedData() {
  const client = await pool.connect();
  try {
    console.log("🌱 Seeding test data for end-to-end testing...");

    const passwordHash = await bcrypt.hash("Password@123", 10);

    // 1. Seed Patient
    const patientRes = await client.query(
      `INSERT INTO patients (name, email, phone_number, password_hash)
       VALUES ('Rahul Sharma', 'patient@test.com', '9876543210', $1)
       ON CONFLICT (email) DO NOTHING
       RETURNING patient_id, name, email;`,
      [passwordHash]
    );

    // 2. Seed Unverified/Unlinked Lab (For testing Lab Onboarding & Restricted Access flow)
    const unlinkedLabRes = await client.query(
      `INSERT INTO labs (name, email, phone_number, password_hash, address_text, location_coordinates, auth_document_url, is_verified)
       VALUES ('Apex Diagnostic Center', 'lab@test.com', '9123456789', $1, '123 MG Road, Camp, Pune', ST_SetSRID(ST_MakePoint(73.8742, 18.5204), 4326), 'https://example.com/doc.pdf', FALSE)
       ON CONFLICT (email) DO NOTHING
       RETURNING lab_id, name, email;`,
      [passwordHash]
    );

    // 3. Seed Pre-verified/Linked Lab (For testing Patient Search & Split Payment Booking flow)
    const verifiedLabRes = await client.query(
      `INSERT INTO labs (
        name, email, phone_number, password_hash, address_text, location_coordinates, auth_document_url, 
        is_verified, razorpay_account_id, razorpay_account_status, bank_account_number, bank_ifsc, bank_account_holder_name, business_entity_type, platform_commission_percentage
       )
       VALUES (
        'LifeLine Scan & Pathology', 'verifiedlab@test.com', '9988776655', $1, '456 FC Road, Shivaji Nagar, Pune', ST_SetSRID(ST_MakePoint(73.8415, 18.5308), 4326), 'https://example.com/license.pdf',
        TRUE, 'acc_test_lifeline123', 'ACTIVATED', '987654321012', 'SBIN0001234', 'LifeLine Diagnostics Pvt Ltd', 'private_limited', 10.00
       )
       ON CONFLICT (email) DO NOTHING
       RETURNING lab_id, name, email;`,
      [passwordHash]
    );

    const verifiedLabId = verifiedLabRes.rows[0]?.lab_id || 2;

    // 4. Seed Diagnostic Tests for Verified Lab
    const tests = [
      { name: 'Complete Blood Count (CBC)', desc: 'Evaluates overall health and detects infections, anemia, and clotting disorders.', price: 500.00 },
      { name: 'Full Body Lipid Profile', desc: 'Measures total cholesterol, HDL, LDL, and triglycerides.', price: 1200.00 },
      { name: 'Thyroid Profile (T3, T4, TSH)', desc: 'Screening to evaluate thyroid gland performance.', price: 800.00 }
    ];

    for (const t of tests) {
      await client.query(
        `INSERT INTO tests (lab_id, test_name, description, price, is_verified)
         VALUES ($1, $2, $3, $4, TRUE);`,
        [verifiedLabId, t.name, t.desc, t.price]
      );
    }

    // 5. Seed Master Weekly Time Slots for Verified Lab (Everyday: Sunday=0 to Saturday=6)
    for (let day = 0; day <= 6; day++) {
      await client.query(
        `INSERT INTO time_slots (lab_id, day_of_week, start_time, end_time, max_capacity)
         VALUES 
          ($1, $2, '09:00:00', '11:00:00', 5),
          ($1, $2, '11:30:00', '13:30:00', 5),
          ($1, $2, '16:00:00', '18:00:00', 5);`,
        [verifiedLabId, day]
      );
    }

    console.log("🟢 Test Data Seeded Successfully!");
  } catch (error) {
    console.error("🔴 Error seeding test data:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedData();
