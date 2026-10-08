-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. DROP EXISTING TABLES (Reverse Order of Creation)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS lab_test_slots CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS master_tests CASCADE;
DROP TABLE IF EXISTS test_categories CASCADE;
DROP TABLE IF EXISTS labs CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- 3. CREATE TABLES
CREATE TABLE patients (
    patient_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE labs (
    lab_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    address_text TEXT NOT NULL,
    location_coordinates GEOMETRY(Point, 4326) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    auth_document_url TEXT,
    average_rating DECIMAL(2, 1) DEFAULT 0.0,
    razorpay_account_id VARCHAR(255),
    razorpay_account_status VARCHAR(50) DEFAULT 'NOT_LINKED',
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_account_holder_name VARCHAR(255),
    business_entity_type VARCHAR(50) DEFAULT 'individual',
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    platform_commission_percentage DECIMAL(5, 2) DEFAULT 10.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(10) DEFAULT '🧪',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE master_tests (
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

CREATE TABLE tests (
    test_id SERIAL PRIMARY KEY,
    lab_id INT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category_id INT REFERENCES test_categories(category_id) ON DELETE SET NULL,
    master_test_id INT REFERENCES master_tests(master_test_id) ON DELETE SET NULL,
    sample_type VARCHAR(50) DEFAULT 'Blood',
    fasting_required BOOLEAN DEFAULT FALSE,
    turnaround_hours INT DEFAULT 24,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lab_id, test_id)
);

CREATE TABLE time_slots (
    slot_id SERIAL PRIMARY KEY,
    lab_id INT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INT NOT NULL CHECK (max_capacity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lab_id, slot_id)
);

CREATE TABLE lab_test_slots (
    lab_test_slot_id SERIAL PRIMARY KEY,
    lab_id INT NOT NULL,
    test_id INT NOT NULL,
    slot_id INT NOT NULL,
    UNIQUE (lab_id, test_id, slot_id),
    UNIQUE (lab_test_slot_id, lab_id, test_id, slot_id),
    FOREIGN KEY (lab_id, test_id) REFERENCES tests(lab_id, test_id) ON DELETE CASCADE,
    FOREIGN KEY (lab_id, slot_id) REFERENCES time_slots(lab_id, slot_id) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION lock_lab_catalog_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(2147483000, NEW.lab_id);
    RETURN NEW;
END
$$;

CREATE TRIGGER tests_lock_lab_catalog_changes
BEFORE INSERT ON tests
FOR EACH ROW
EXECUTE FUNCTION lock_lab_catalog_changes();

CREATE TRIGGER time_slots_lock_lab_catalog_changes
BEFORE INSERT ON time_slots
FOR EACH ROW
EXECUTE FUNCTION lock_lab_catalog_changes();

CREATE OR REPLACE FUNCTION add_test_time_slot_combinations_for_test()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO lab_test_slots (lab_id, test_id, slot_id)
    SELECT NEW.lab_id, NEW.test_id, s.slot_id
    FROM time_slots s
    WHERE s.lab_id = NEW.lab_id
    ON CONFLICT (lab_id, test_id, slot_id) DO NOTHING;
    RETURN NEW;
END
$$;

CREATE TRIGGER tests_add_lab_test_slots
AFTER INSERT ON tests
FOR EACH ROW
EXECUTE FUNCTION add_test_time_slot_combinations_for_test();

CREATE OR REPLACE FUNCTION add_test_time_slot_combinations_for_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO lab_test_slots (lab_id, test_id, slot_id)
    SELECT NEW.lab_id, t.test_id, NEW.slot_id
    FROM tests t
    WHERE t.lab_id = NEW.lab_id
    ON CONFLICT (lab_id, test_id, slot_id) DO NOTHING;
    RETURN NEW;
END
$$;

CREATE TRIGGER time_slots_add_lab_test_slots
AFTER INSERT ON time_slots
FOR EACH ROW
EXECUTE FUNCTION add_test_time_slot_combinations_for_slot();

CREATE TABLE appointments (
    appointment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id INT NOT NULL REFERENCES patients(patient_id),
    lab_test_slot_id INT NOT NULL REFERENCES lab_test_slots(lab_test_slot_id),
    appointment_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    report_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(appointment_id),
    amount DECIMAL(10, 2) NOT NULL,
    gateway_provider VARCHAR(100) NOT NULL,
    gateway_order_id VARCHAR(255) NOT NULL,
    gateway_payment_id VARCHAR(255),
    razorpay_transfer_id VARCHAR(255),
    platform_fee DECIMAL(10, 2) DEFAULT 0.00,
    lab_payout_amount DECIMAL(10, 2) DEFAULT 0.00,
    refund_id VARCHAR(255),
    refund_status VARCHAR(50) DEFAULT 'NOT_REFUNDED',
    refund_amount DECIMAL(10, 2) DEFAULT 0.00,
    payout_status VARCHAR(50) DEFAULT 'PENDING',
    payout_date TIMESTAMP,
    payout_error TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(appointment_id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);