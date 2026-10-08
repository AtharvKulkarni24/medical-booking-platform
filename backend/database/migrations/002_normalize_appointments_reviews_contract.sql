LOCK TABLE appointments, reviews IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM appointments a
    LEFT JOIN lab_test_slots lts
      ON lts.lab_test_slot_id = a.lab_test_slot_id
     AND lts.lab_id = a.lab_id
     AND lts.test_id = a.test_id
     AND lts.slot_id = a.slot_id
    WHERE lts.lab_test_slot_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot contract appointment columns: a row does not match its normalized lab/test/time-slot association.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM reviews r
    JOIN appointments a ON a.appointment_id = r.appointment_id
    WHERE r.patient_id <> a.patient_id OR r.lab_id <> a.lab_id
  ) THEN
    RAISE EXCEPTION 'Cannot contract review columns: a review identity does not match its appointment.';
  END IF;
END
$$;

DROP TRIGGER appointments_populate_lab_test_slot ON appointments;
DROP FUNCTION populate_appointment_lab_test_slot();
DROP TRIGGER reviews_populate_appointment_identity ON reviews;
DROP FUNCTION populate_review_identity();

ALTER TABLE reviews
  DROP CONSTRAINT reviews_appointment_identity_fk,
  DROP COLUMN patient_id,
  DROP COLUMN lab_id;

ALTER TABLE appointments
  DROP CONSTRAINT appointments_lab_test_slot_compat_fk,
  DROP CONSTRAINT appointments_identity_unique,
  DROP COLUMN lab_id,
  DROP COLUMN test_id,
  DROP COLUMN slot_id,
  ADD CONSTRAINT appointments_lab_test_slot_fk
    FOREIGN KEY (lab_test_slot_id)
    REFERENCES lab_test_slots (lab_test_slot_id);
