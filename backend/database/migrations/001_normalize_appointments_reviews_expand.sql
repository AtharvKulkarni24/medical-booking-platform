LOCK TABLE labs, tests, time_slots, appointments, reviews IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM appointments a
    JOIN tests t ON t.test_id = a.test_id
    JOIN time_slots s ON s.slot_id = a.slot_id
    WHERE a.lab_id <> t.lab_id OR a.lab_id <> s.lab_id
  ) THEN
    RAISE EXCEPTION 'Cannot normalize appointments: one or more appointment lab IDs do not match the selected test and time slot.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM reviews r
    JOIN appointments a ON a.appointment_id = r.appointment_id
    WHERE r.patient_id <> a.patient_id OR r.lab_id <> a.lab_id
  ) THEN
    RAISE EXCEPTION 'Cannot normalize reviews: one or more review patient/lab IDs do not match their appointment.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS tests_lab_test_id_unique
  ON tests (lab_id, test_id);
CREATE UNIQUE INDEX IF NOT EXISTS time_slots_lab_slot_id_unique
  ON time_slots (lab_id, slot_id);

CREATE TABLE lab_test_slots (
  lab_test_slot_id SERIAL PRIMARY KEY,
  lab_id INT NOT NULL,
  test_id INT NOT NULL,
  slot_id INT NOT NULL,
  CONSTRAINT lab_test_slots_lab_test_slot_unique UNIQUE (lab_id, test_id, slot_id),
  CONSTRAINT lab_test_slots_id_lab_test_slot_unique
    UNIQUE (lab_test_slot_id, lab_id, test_id, slot_id),
  CONSTRAINT lab_test_slots_test_lab_fk
    FOREIGN KEY (lab_id, test_id) REFERENCES tests (lab_id, test_id) ON DELETE CASCADE,
  CONSTRAINT lab_test_slots_time_slot_lab_fk
    FOREIGN KEY (lab_id, slot_id) REFERENCES time_slots (lab_id, slot_id) ON DELETE CASCADE
);

INSERT INTO lab_test_slots (lab_id, test_id, slot_id)
SELECT t.lab_id, t.test_id, s.slot_id
FROM tests t
JOIN time_slots s ON s.lab_id = t.lab_id;

ALTER TABLE appointments
  ADD COLUMN lab_test_slot_id INT;

UPDATE appointments a
SET lab_test_slot_id = lts.lab_test_slot_id
FROM lab_test_slots lts
WHERE lts.lab_id = a.lab_id
  AND lts.test_id = a.test_id
  AND lts.slot_id = a.slot_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM appointments WHERE lab_test_slot_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot normalize appointments: a historical appointment has no matching lab/test/time-slot combination.';
  END IF;
END
$$;

ALTER TABLE appointments
  ALTER COLUMN lab_test_slot_id SET NOT NULL,
  ADD CONSTRAINT appointments_lab_test_slot_compat_fk
    FOREIGN KEY (lab_test_slot_id, lab_id, test_id, slot_id)
    REFERENCES lab_test_slots (lab_test_slot_id, lab_id, test_id, slot_id);

CREATE FUNCTION populate_appointment_lab_test_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  mapped_lab_id INT;
  mapped_test_id INT;
  mapped_slot_id INT;
BEGIN
  IF NEW.lab_test_slot_id IS NULL THEN
    SELECT lab_test_slot_id
    INTO NEW.lab_test_slot_id
    FROM lab_test_slots
    WHERE lab_id = NEW.lab_id
      AND test_id = NEW.test_id
      AND slot_id = NEW.slot_id;

    IF NEW.lab_test_slot_id IS NULL THEN
      RAISE EXCEPTION 'No valid lab/test/time-slot combination exists for this appointment.';
    END IF;
  ELSE
    SELECT lab_id, test_id, slot_id
    INTO mapped_lab_id, mapped_test_id, mapped_slot_id
    FROM lab_test_slots
    WHERE lab_test_slot_id = NEW.lab_test_slot_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'The selected lab/test/time-slot combination does not exist.';
    END IF;

    IF NEW.lab_id IS NULL THEN
      NEW.lab_id := mapped_lab_id;
    ELSIF mapped_lab_id <> NEW.lab_id THEN
      RAISE EXCEPTION 'Appointment lab ID does not match the selected combination.';
    END IF;

    IF NEW.test_id IS NULL THEN
      NEW.test_id := mapped_test_id;
    ELSIF mapped_test_id <> NEW.test_id THEN
      RAISE EXCEPTION 'Appointment test ID does not match the selected combination.';
    END IF;

    IF NEW.slot_id IS NULL THEN
      NEW.slot_id := mapped_slot_id;
    ELSIF mapped_slot_id <> NEW.slot_id THEN
      RAISE EXCEPTION 'Appointment lab/test/time-slot IDs do not match the selected combination.';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

CREATE TRIGGER appointments_populate_lab_test_slot
BEFORE INSERT OR UPDATE OF lab_test_slot_id, lab_id, test_id, slot_id ON appointments
FOR EACH ROW
EXECUTE FUNCTION populate_appointment_lab_test_slot();

CREATE FUNCTION lock_lab_catalog_changes()
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

CREATE FUNCTION add_test_time_slot_combinations_for_test()
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

CREATE FUNCTION add_test_time_slot_combinations_for_slot()
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

ALTER TABLE appointments
  ADD CONSTRAINT appointments_identity_unique UNIQUE (appointment_id, patient_id, lab_id);

ALTER TABLE reviews
  ADD CONSTRAINT reviews_appointment_identity_fk
  FOREIGN KEY (appointment_id, patient_id, lab_id)
  REFERENCES appointments (appointment_id, patient_id, lab_id);

CREATE FUNCTION populate_review_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT patient_id, lab_id
  INTO NEW.patient_id, NEW.lab_id
  FROM appointments
  WHERE appointment_id = NEW.appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A review must reference an existing appointment.';
  END IF;

  RETURN NEW;
END
$$;

CREATE TRIGGER reviews_populate_appointment_identity
BEFORE INSERT OR UPDATE OF appointment_id, patient_id, lab_id ON reviews
FOR EACH ROW
EXECUTE FUNCTION populate_review_identity();
