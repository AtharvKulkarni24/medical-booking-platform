-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. DROP EXISTING TABLES (Reverse Order of Creation)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
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
    platform_commission_percentage DECIMAL(5, 2) DEFAULT 10.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tests (
    test_id SERIAL PRIMARY KEY,
    lab_id INT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE time_slots (
    slot_id SERIAL PRIMARY KEY,
    lab_id INT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INT NOT NULL CHECK (max_capacity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
    appointment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id INT NOT NULL REFERENCES patients(patient_id),
    lab_id INT NOT NULL REFERENCES labs(lab_id),
    test_id INT NOT NULL REFERENCES tests(test_id),
    slot_id INT NOT NULL REFERENCES time_slots(slot_id),
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
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(patient_id),
    lab_id INT NOT NULL REFERENCES labs(lab_id),
    appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(appointment_id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);