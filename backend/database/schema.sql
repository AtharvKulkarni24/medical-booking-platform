-- ==========================================
-- MEDICAL PLATFORM DATABASE SCHEMA
-- ==========================================

-- 1. Enable Required Extensions
-- pgcrypto allows us to auto-generate UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- postgis enables the geospatial logic for distance searching
CREATE EXTENSION IF NOT EXISTS "postgis";

-- (Optional) Developer Helper: Drop existing tables if you ever need a clean reset
-- Remove the '--' to uncomment these during early testing if you need to wipe the DB
-- DROP TABLE IF EXISTS reviews CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS appointments CASCADE;
-- DROP TABLE IF EXISTS time_slots CASCADE;
-- DROP TABLE IF EXISTS tests CASCADE;
-- DROP TABLE IF EXISTS labs CASCADE;
-- DROP TABLE IF EXISTS patients CASCADE;


-- ==========================================
-- LEVEL 1: PARENT TABLES (Independent)
-- ==========================================

CREATE TABLE patients (
    patient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    last_known_location GEOGRAPHY(Point, 4326) -- SRID 4326 is standard GPS coordinates
);

CREATE TABLE labs (
    lab_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    address_text TEXT NOT NULL,
    location_coordinates GEOGRAPHY(Point, 4326) NOT NULL,
    auth_document_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    average_rating DECIMAL(3, 2) DEFAULT 0.00
);


-- ==========================================
-- LEVEL 2: LAB OFFERINGS (Depends on Labs)
-- ==========================================

CREATE TABLE tests (
    test_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id UUID REFERENCES labs(lab_id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    is_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE time_slots (
    slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id UUID REFERENCES labs(lab_id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    max_capacity INTEGER NOT NULL CHECK (max_capacity > 0),
    current_bookings INTEGER DEFAULT 0
);


-- ==========================================
-- LEVEL 3: CORE TRANSACTIONS (Depends on Patients, Labs, Tests, Slots)
-- ==========================================

CREATE TABLE appointments (
    appointment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(patient_id),
    lab_id UUID REFERENCES labs(lab_id),
    test_id UUID REFERENCES tests(test_id),
    slot_id UUID REFERENCES time_slots(slot_id),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Valid states: Pending, Confirmed, Completed, Cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- LEVEL 4: DEPENDENT RECORDS (Depends on Appointments)
-- ==========================================

CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID UNIQUE REFERENCES appointments(appointment_id),
    amount DECIMAL(10, 2) NOT NULL,
    gateway_provider VARCHAR(100) NOT NULL, -- e.g., 'Stripe', 'Razorpay'
    gateway_order_id VARCHAR(255) NOT NULL,
    gateway_payment_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Valid states: Pending, Success, Failed, Refunded
    transaction_date TIMESTAMP
);

CREATE TABLE reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID UNIQUE REFERENCES appointments(appointment_id),
    patient_id UUID REFERENCES patients(patient_id),
    lab_id UUID REFERENCES labs(lab_id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT
);
