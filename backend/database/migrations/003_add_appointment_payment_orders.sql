CREATE TABLE appointment_payment_orders (
    razorpay_order_id VARCHAR(255) PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(patient_id),
    lab_test_slot_id INT NOT NULL REFERENCES lab_test_slots(lab_test_slot_id),
    appointment_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    platform_fee DECIMAL(10, 2) NOT NULL,
    lab_payout_amount DECIMAL(10, 2) NOT NULL,
    is_mock BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED'
        CHECK (status IN ('CREATED', 'BOOKED', 'REFUND_REQUIRED')),
    razorpay_payment_id VARCHAR(255) UNIQUE,
    appointment_id UUID UNIQUE REFERENCES appointments(appointment_id),
    refund_id VARCHAR(255),
    refund_status VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUIRED'
        CHECK (refund_status IN ('NOT_REQUIRED', 'PROCESSING', 'PENDING', 'PROCESSED', 'FAILED')),
    refund_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX appointment_payment_orders_patient_created_idx
    ON appointment_payment_orders(patient_id, created_at DESC);
