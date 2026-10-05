require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
if (process.env.DATABASE_URL) {
  const databaseUrl = new URL(process.env.DATABASE_URL);
  if (
    databaseUrl.hostname.endsWith("render.com") &&
    !databaseUrl.searchParams.has("sslmode")
  ) {
    databaseUrl.searchParams.set("sslmode", "verify-full");
    process.env.DATABASE_URL = databaseUrl.toString();
  }
}
const pool = require("../src/config/db");

const DEMO_PREFIX = "DEMO DATA - ";
const DEFAULT_CENTER = { latitude: 18.456152544576973, longitude: 73.84434907464392 };

const demoLabs = [
  {
    key: "north",
    name: `${DEMO_PREFIX}MedBook Pune Sample Lab North`,
    email: "demo-pune-north@medbook.invalid",
    phone: "DEMO-PUNE-001",
    latitudeOffset: 0.035,
    longitudeOffset: 0.012,
  },
  {
    key: "central",
    name: `${DEMO_PREFIX}MedBook Pune Sample Lab Central`,
    email: "demo-pune-central@medbook.invalid",
    phone: "DEMO-PUNE-002",
    latitudeOffset: -0.008,
    longitudeOffset: 0.018,
  },
  {
    key: "south",
    name: `${DEMO_PREFIX}MedBook Pune Sample Lab South`,
    email: "demo-pune-south@medbook.invalid",
    phone: "DEMO-PUNE-003",
    latitudeOffset: -0.04,
    longitudeOffset: -0.015,
  },
];

const slotTemplates = [
  ["09:00", "11:00"],
  ["11:30", "13:30"],
  ["16:00", "18:00"],
];

const getCoordinate = (envName, fallback, min, max) => {
  const value = process.env[envName] ? Number(process.env[envName]) : fallback;
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${envName} must be a valid coordinate between ${min} and ${max}.`);
  }
  return value;
};

async function seedDemoData() {
  if (process.env.ALLOW_PUBLIC_DEMO_SEED !== "true") {
    throw new Error(
      "This adds clearly labeled fictional listings to the live database. " +
      "Set ALLOW_PUBLIC_DEMO_SEED=true to confirm you want to proceed."
    );
  }
  if (!process.env.DEMO_TARGET_DATABASE) {
    throw new Error("Set DEMO_TARGET_DATABASE to the exact database name before seeding.");
  }

  const center = {
    latitude: getCoordinate("DEMO_CENTER_LAT", DEFAULT_CENTER.latitude, -90, 90),
    longitude: getCoordinate("DEMO_CENTER_LNG", DEFAULT_CENTER.longitude, -180, 180),
  };

  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    const target = await client.query("SELECT current_database() AS database_name");
    if (target.rows[0].database_name !== process.env.DEMO_TARGET_DATABASE) {
      throw new Error(
        `Connected to "${target.rows[0].database_name}", not the explicitly approved ` +
        `target "${process.env.DEMO_TARGET_DATABASE}". No data was changed.`
      );
    }

    await client.query("BEGIN");
    transactionStarted = true;

    console.log(`Adding demo fixtures to database "${target.rows[0].database_name}".`);

    const masterTestsResult = await client.query(
      `SELECT master_test_id, category_id, test_name, description, sample_type,
              fasting_required, turnaround_hours
       FROM master_tests
       WHERE test_name = ANY($1::text[])`,
      [[
        "Blood Test",
        "Sonography Test",
        "Kidney Test",
        "Liver Test",
        "Sugar Test",
        "Vitamin Test",
        "Urine Test",
        "Thyroid Profile",
      ]]
    );
    const masterTests = new Map(
      masterTestsResult.rows.map((test) => [test.test_name, test])
    );
    if (masterTests.size !== 8) {
      throw new Error(
        "The master test catalog is incomplete. Run `node scripts/seed_master_catalog.js` first."
      );
    }

    const labIds = [];
    for (const [index, lab] of demoLabs.entries()) {
      const latitude = center.latitude + lab.latitudeOffset;
      const longitude = center.longitude + lab.longitudeOffset;
      const result = await client.query(
        `INSERT INTO labs (
           name, email, phone_number, password_hash, address_text,
           location_coordinates, is_verified, auth_document_url,
           city, state, pincode, razorpay_account_status
         )
         VALUES (
           $1, $2, $3, 'NOT_A_LOGIN_ACCOUNT', $4,
           ST_SetSRID(ST_MakePoint($5, $6), 4326), TRUE, $7,
           'Pune', 'Maharashtra', '411001', 'NOT_LINKED'
         )
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           phone_number = EXCLUDED.phone_number,
           address_text = EXCLUDED.address_text,
           location_coordinates = EXCLUDED.location_coordinates,
           is_verified = TRUE,
           auth_document_url = EXCLUDED.auth_document_url,
           city = EXCLUDED.city,
           state = EXCLUDED.state,
           pincode = EXCLUDED.pincode
         RETURNING lab_id`,
        [
          lab.name,
          lab.email,
          lab.phone,
          "Fictional demo listing only. Not a real diagnostic center.",
          longitude,
          latitude,
          "DEMO DATA ONLY - no real verification document",
        ]
      );
      labIds.push({ ...lab, labId: result.rows[0].lab_id });

      for (const test of masterTests.values()) {
        const existing = await client.query(
          `SELECT test_id FROM tests
           WHERE lab_id = $1 AND master_test_id = $2
           ORDER BY test_id
           LIMIT 1`,
          [result.rows[0].lab_id, test.master_test_id]
        );
        const price = 150 + ((index + 1) * 25) + (test.master_test_id % 10) * 40;
        const description = `Demo listing only. Sample price for ${test.test_name}; not a real medical service or price quotation.`;

        if (existing.rowCount > 0) {
          await client.query(
            `UPDATE tests
             SET test_name = $1, description = $2, price = $3, category_id = $4,
                 sample_type = $5, fasting_required = $6, turnaround_hours = $7,
                 is_verified = TRUE
             WHERE test_id = $8`,
            [
              test.test_name,
              description,
              price,
              test.category_id,
              test.sample_type,
              test.fasting_required,
              test.turnaround_hours,
              existing.rows[0].test_id,
            ]
          );
        } else {
          await client.query(
            `INSERT INTO tests (
               lab_id, test_name, description, price, category_id, master_test_id,
               sample_type, fasting_required, turnaround_hours, is_verified
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)`,
            [
              result.rows[0].lab_id,
              test.test_name,
              description,
              price,
              test.category_id,
              test.master_test_id,
              test.sample_type,
              test.fasting_required,
              test.turnaround_hours,
            ]
          );
        }
      }

      for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
        for (const [startTime, endTime] of slotTemplates) {
          const existingSlot = await client.query(
            `SELECT slot_id FROM time_slots
             WHERE lab_id = $1 AND day_of_week = $2
               AND start_time = $3::time AND end_time = $4::time
             LIMIT 1`,
            [result.rows[0].lab_id, dayOfWeek, startTime, endTime]
          );
          if (existingSlot.rowCount === 0) {
            await client.query(
              `INSERT INTO time_slots (lab_id, day_of_week, start_time, end_time, max_capacity)
               VALUES ($1, $2, $3, $4, 5)`,
              [result.rows[0].lab_id, dayOfWeek, startTime, endTime]
            );
          }
        }
      }
    }

    await client.query("COMMIT");
    transactionStarted = false;
    console.log(
      `Seeded ${labIds.length} demo labs, ${labIds.length * masterTests.size} test listings, ` +
      `${labIds.length * 7 * slotTemplates.length} weekly slots.`
    );
    console.log(
      `Search center: ${center.latitude.toFixed(6)}, ${center.longitude.toFixed(6)} (Pune).`
    );
    console.log("All listings are fictional demos; no accounts, appointments, or payments were created.");
    for (const lab of labIds) {
      console.log(`${lab.name} (lab_id=${lab.labId})`);
    }
  } catch (error) {
    if (client && transactionStarted) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

seedDemoData().catch((error) => {
  console.error("Demo data seeding failed:", error.message);
  process.exitCode = 1;
});
