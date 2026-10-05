require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const db = require('../src/config/db');

async function seedMasterCatalog() {
  console.log("🌱 Starting Master Test Catalog & Categories Database Migration...");

  try {
    // 1. Create tables if not exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS test_categories (
        category_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        icon VARCHAR(10) DEFAULT '🧪',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS master_tests (
        master_test_id SERIAL PRIMARY KEY,
        category_id INT REFERENCES test_categories(category_id) ON DELETE CASCADE,
        test_name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        sample_type VARCHAR(50) DEFAULT 'Blood',
        fasting_required BOOLEAN DEFAULT FALSE,
        turnaround_hours INT DEFAULT 24,
        aliases TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Alter existing tests table if columns do not exist
    await db.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tests' AND column_name='category_id') THEN
          ALTER TABLE tests ADD COLUMN category_id INT REFERENCES test_categories(category_id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tests' AND column_name='master_test_id') THEN
          ALTER TABLE tests ADD COLUMN master_test_id INT REFERENCES master_tests(master_test_id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tests' AND column_name='sample_type') THEN
          ALTER TABLE tests ADD COLUMN sample_type VARCHAR(50) DEFAULT 'Blood';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tests' AND column_name='fasting_required') THEN
          ALTER TABLE tests ADD COLUMN fasting_required BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tests' AND column_name='turnaround_hours') THEN
          ALTER TABLE tests ADD COLUMN turnaround_hours INT DEFAULT 24;
        END IF;
      END $$;
    `);

    // 3. Seed Categories
    const categories = [
      { name: 'Pathology & Blood', icon: '🩸', description: 'Complete blood count, blood disorders, and routine pathology screenings.' },
      { name: 'Radiology & Imaging', icon: '🩺', description: 'High-resolution ultrasound, sonography, X-rays, and imaging.' },
      { name: 'Kidney & Urinary Care', icon: '🫘', description: 'Renal function tests, urine analysis, and kidney health markers.' },
      { name: 'Liver & Digestive Care', icon: '🧪', description: 'Liver enzymes, bilirubin, proteins, and gastrointestinal health.' },
      { name: 'Diabetic & Metabolic', icon: '📏', description: 'Blood glucose monitoring, HbA1c, and insulin sensitivity.' },
      { name: 'Wellness & Vitamins', icon: '☀️', description: 'Vitamin D, B12, minerals, and overall health wellness profiles.' },
      { name: 'Thyroid & Hormones', icon: '🦋', description: 'T3, T4, TSH thyroid panel and endocrine system checks.' }
    ];

    const categoryMap = {};

    for (const cat of categories) {
      const res = await db.query(
        `INSERT INTO test_categories (name, icon, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET icon = $2, description = $3
         RETURNING category_id, name;`,
        [cat.name, cat.icon, cat.description]
      );
      categoryMap[cat.name] = res.rows[0].category_id;
    }

    console.log("✅ Seeded categories:", Object.keys(categoryMap).length);

    // 4. Seed Master Tests
    const masterTests = [
      {
        category_name: 'Pathology & Blood',
        test_name: 'Blood Test',
        description: 'Evaluates overall health and detects a wide range of blood disorders including anemia, infection, and leukemia.',
        sample_type: 'Blood',
        fasting_required: false,
        turnaround_hours: 24,
        aliases: ['CBC', 'Complete Blood Count', 'Blood Profile', 'Hemogram']
      },
      {
        category_name: 'Radiology & Imaging',
        test_name: 'Sonography Test',
        description: 'High-resolution ultrasound imaging for internal organ screening, abdominal checkup, and soft tissue evaluation.',
        sample_type: 'Ultrasound',
        fasting_required: true,
        turnaround_hours: 12,
        aliases: ['Ultrasound', 'USG Scan', 'Abdominal Sonography', 'Pelvic Sonography']
      },
      {
        category_name: 'Kidney & Urinary Care',
        test_name: 'Kidney Test',
        description: 'Evaluates how well your kidneys are filtering waste from your blood including Serum Creatinine, Urea, and Uric Acid.',
        sample_type: 'Blood & Urine',
        fasting_required: false,
        turnaround_hours: 24,
        aliases: ['KFT', 'Kidney Function Test', 'Renal Profile', 'Creatinine Test']
      },
      {
        category_name: 'Liver & Digestive Care',
        test_name: 'Liver Test',
        description: 'Measures proteins, liver enzymes (SGOT, SGPT), and bilirubin levels to assess liver health and detect jaundice.',
        sample_type: 'Blood',
        fasting_required: true,
        turnaround_hours: 24,
        aliases: ['LFT', 'Liver Function Test', 'SGOT SGPT', 'Bilirubin Test']
      },
      {
        category_name: 'Diabetic & Metabolic',
        test_name: 'Sugar Test',
        description: 'Measures blood glucose levels (Fasting, PP, HbA1c) to screen for, diagnose, and monitor diabetes.',
        sample_type: 'Blood',
        fasting_required: true,
        turnaround_hours: 12,
        aliases: ['Glucose Test', 'HbA1c', 'Fasting Blood Sugar', 'Diabetes Profile', 'PP Sugar']
      },
      {
        category_name: 'Wellness & Vitamins',
        test_name: 'Vitamin Test',
        description: 'Checks for essential Vitamin D3 and Vitamin B12 deficiencies affecting bone density, nerve health, and energy levels.',
        sample_type: 'Blood',
        fasting_required: false,
        turnaround_hours: 48,
        aliases: ['Vitamin D', 'Vitamin B12', 'Vitamin Deficiency Profile', 'Nutritional Checkup']
      },
      {
        category_name: 'Kidney & Urinary Care',
        test_name: 'Urine Test',
        description: 'Routine microscopic and chemical analysis of urine to detect urinary tract infections (UTI), kidney issues, and diabetes.',
        sample_type: 'Urine',
        fasting_required: false,
        turnaround_hours: 12,
        aliases: ['Urinalysis', 'Routine Urine Test', 'Urine Culture', 'UTI Test']
      },
      {
        category_name: 'Thyroid & Hormones',
        test_name: 'Thyroid Profile',
        description: 'Checks Triiodothyronine (T3), Thyroxine (T4), and Thyroid Stimulating Hormone (TSH) to evaluate thyroid gland health.',
        sample_type: 'Blood',
        fasting_required: false,
        turnaround_hours: 24,
        aliases: ['T3 T4 TSH', 'Thyroid Test', 'TSH Level', 'Thyroid Panel']
      }
    ];

    for (const test of masterTests) {
      const catId = categoryMap[test.category_name];
      await db.query(
        `INSERT INTO master_tests (category_id, test_name, description, sample_type, fasting_required, turnaround_hours, aliases)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (test_name) DO UPDATE 
         SET category_id = $1, description = $3, sample_type = $4, fasting_required = $5, turnaround_hours = $6, aliases = $7;`,
        [catId, test.test_name, test.description, test.sample_type, test.fasting_required, test.turnaround_hours, test.aliases]
      );
    }

    console.log("✅ Seeded master test dictionary items:", masterTests.length);

    // 5. Update existing lab tests to link category_id and metadata based on matching names
    await db.query(`
      UPDATE tests t
      SET 
        category_id = mt.category_id,
        master_test_id = mt.master_test_id,
        sample_type = COALESCE(t.sample_type, mt.sample_type),
        fasting_required = COALESCE(t.fasting_required, mt.fasting_required),
        turnaround_hours = COALESCE(t.turnaround_hours, mt.turnaround_hours)
      FROM master_tests mt
      WHERE LOWER(t.test_name) = LOWER(mt.test_name);
    `);

    console.log("🎉 Master Test Catalog Migration & Seeding Completed Successfully!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Migration Error:", err);
    process.exit(1);
  }
}

seedMasterCatalog();
