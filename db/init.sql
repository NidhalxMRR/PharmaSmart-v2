BEGIN;

CREATE TABLE IF NOT EXISTS suppliers (
  grossist TEXT PRIMARY KEY,
  region TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  lead_time_days INTEGER NOT NULL CHECK (lead_time_days >= 0),
  service_level TEXT NOT NULL CHECK (service_level IN ('Excellent', 'Bon', 'Moyen')),
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('Medicaments', 'Parapharmacie', 'Complements', 'Hygiene & Soins', 'Autres')),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  camv INTEGER NOT NULL DEFAULT 0 CHECK (camv >= 0),
  price NUMERIC(12, 3) NOT NULL CHECK (price >= 0),
  margin NUMERIC(6, 2) NOT NULL CHECK (margin >= 0),
  expiry_date DATE NOT NULL,
  grossist TEXT NOT NULL REFERENCES suppliers(grossist),
  is_out_of_stock BOOLEAN GENERATED ALWAYS AS (stock = 0) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_grossist_idx ON products(grossist);
CREATE INDEX IF NOT EXISTS products_expiry_date_idx ON products(expiry_date);

CREATE TABLE IF NOT EXISTS sensors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  min_temp NUMERIC(6, 2) NOT NULL,
  max_temp NUMERIC(6, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Normal' CHECK (status IN ('Normal', 'Warning', 'Critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (min_temp < max_temp)
);

CREATE TABLE IF NOT EXISTS iot_devices (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL DEFAULT 'main',
  sensor_id TEXT NOT NULL UNIQUE REFERENCES sensors(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  mqtt_client_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  firmware_version TEXT,
  battery_percent NUMERIC(5, 2) CHECK (battery_percent BETWEEN 0 AND 100),
  signal_dbm INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sensor_id TEXT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  temperature NUMERIC(6, 2) NOT NULL,
  humidity NUMERIC(6, 2) NOT NULL CHECK (humidity BETWEEN 0 AND 100),
  sequence_number BIGINT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sensor_id, sequence_number)
);

ALTER TABLE sensor_readings
  ADD COLUMN IF NOT EXISTS device_id TEXT REFERENCES iot_devices(id);

CREATE INDEX IF NOT EXISTS sensor_readings_sensor_time_idx
  ON sensor_readings(sensor_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS sensor_readings_device_time_idx
  ON sensor_readings(device_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS iot_ingestion_errors (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL,
  error_message TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('Pharmacien Titulaire', 'Pharmacien Adjoint', 'Préparateur', 'Stagiaire')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_schedules (
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche')),
  shift TEXT NOT NULL CHECK (shift IN ('Matin', 'Après-midi', 'Garde', 'Repos')),
  PRIMARY KEY (staff_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  grossist TEXT NOT NULL REFERENCES suppliers(grossist),
  status TEXT NOT NULL,
  total_price NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (total_price >= 0)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 3) NOT NULL CHECK (unit_price >= 0)
);

INSERT INTO suppliers (grossist, region, contact_name, phone, email, lead_time_days, service_level, notes) VALUES
  ('Cogepha', 'Nord-Ouest', 'Service commercial Cogepha', '+216 71 000 101', 'cogepha@pharmasmart.tn', 2, 'Excellent', 'Prioritaire pour les génériques et les réassorts urgents.'),
  ('Medigros', 'Grand Tunis', 'Support Medigros', '+216 71 000 202', 'medigros@pharmasmart.tn', 3, 'Bon', 'Bien positionné sur l’hygiène, le bien-être et les compléments.'),
  ('PCT', 'National', 'Plateforme PCT', '+216 71 000 303', 'pct@pharmasmart.tn', 1, 'Excellent', 'Canal stratégique pour sécuriser les ruptures et les volumes.'),
  ('Direct Lab', 'Fabricants', 'Relations laboratoire', '+216 71 000 404', 'directlab@pharmasmart.tn', 4, 'Moyen', 'Approvisionnement direct utile pour les références à forte marge.')
ON CONFLICT (grossist) DO NOTHING;

INSERT INTO products (id, name, code, category, stock, min_stock, camv, price, margin, expiry_date, grossist) VALUES
  ('p1', 'CLAMOXYL 1g - Boite de 14 comprimés', '870021462319', 'Medicaments', 0, 25, 120, 18.885, 22, '2027-11-20', 'Cogepha'),
  ('p2', 'DOLIPRANE 1000mg - Boite de 8 comprimés', '3282776003', 'Medicaments', 0, 50, 350, 3.520, 18, '2028-04-12', 'PCT'),
  ('p3', 'MAXILASE 3000 U.I. COMP. ENROB. B/24', '6192408103', 'Medicaments', 0, 30, 180, 7.590, 20, '2027-09-05', 'Cogepha'),
  ('p4', 'FIXODENT CREME ADHESIVE NATURAL 47g', '870021462318', 'Hygiene & Soins', 0, 10, 45, 16.500, 25, '2026-12-15', 'Medigros'),
  ('p5', 'LAIT FARINE APRANOR 3EME AGE 400g', '6192403911', 'Complements', 0, 15, 60, 27.000, 15, '2027-02-18', 'Medigros'),
  ('p6', 'AUGMENTIN Enfant 100mg/12.5mg - Flacon 60ml', '4859140172', 'Medicaments', 12, 20, 85, 14.255, 22, '2026-08-15', 'PCT'),
  ('p7', 'PHYSIOGEL Creme Hydratante 150ml', '3041091670', 'Hygiene & Soins', 8, 12, 30, 43.500, 30, '2026-09-01', 'Direct Lab'),
  ('p8', 'GAVISCON Menthe Suspension Buvable 250ml', '3282776012', 'Medicaments', 24, 15, 110, 9.850, 20, '2026-08-30', 'Cogepha'),
  ('p9', 'BION 3 Senior - Boite de 30 comprimés', '4569140221', 'Complements', 14, 10, 40, 32.400, 25, '2026-08-20', 'Medigros'),
  ('p10', 'EUPHYTOSE - Boite de 120 comprimés', '3400934376483', 'Complements', 45, 15, 90, 12.800, 20, '2028-05-18', 'Cogepha'),
  ('p11', 'PARACETAMOL Arrow 500mg - Boite de 16', '3400936306358', 'Medicaments', 88, 30, 400, 1.950, 15, '2029-01-10', 'PCT'),
  ('p12', 'DUREX Preservatifs Classic Boite de 12', '5011417572710', 'Hygiene & Soins', 18, 8, 50, 15.600, 35, '2030-03-24', 'Direct Lab')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sensors (id, name, location, min_temp, max_temp, status) VALUES
  ('s1', 'Réfrigérateur Principal (Vaccins)', 'Zone Froide A', 2.0, 8.0, 'Normal'),
  ('s2', 'Box Stockage (Insuline)', 'Zone Froide B', 2.0, 8.0, 'Normal'),
  ('s3', 'Réserve Générale', 'Stock Central', 15.0, 25.0, 'Normal'),
  ('s4', 'Laboratoire de Préparation', 'Labo Officine', 15.0, 25.0, 'Normal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO iot_devices (
  id,
  pharmacy_id,
  sensor_id,
  display_name,
  mqtt_client_id
) VALUES (
  'esp32-fridge-01',
  'main',
  's1',
  'ESP32 Réfrigérateur Principal',
  'esp32-fridge-01'
)
ON CONFLICT (id) DO UPDATE SET
  pharmacy_id = EXCLUDED.pharmacy_id,
  sensor_id = EXCLUDED.sensor_id,
  display_name = EXCLUDED.display_name,
  mqtt_client_id = EXCLUDED.mqtt_client_id,
  updated_at = NOW();

INSERT INTO sensor_readings (sensor_id, measured_at, temperature, humidity, sequence_number)
SELECT
  seed.sensor_id,
  NOW() - ((8 - seed.sequence_number) * INTERVAL '1 hour'),
  seed.temperature,
  seed.humidity,
  seed.sequence_number
FROM (VALUES
  ('s1', TIME '09:00', 4.1, 47, 1), ('s1', TIME '10:00', 4.3, 48, 2), ('s1', TIME '11:00', 4.5, 49, 3), ('s1', TIME '12:00', 4.2, 48, 4), ('s1', TIME '13:00', 4.0, 46, 5), ('s1', TIME '14:00', 4.2, 48, 6), ('s1', TIME '15:00', 4.2, 48, 7),
  ('s2', TIME '09:00', 5.0, 50, 1), ('s2', TIME '10:00', 5.2, 52, 2), ('s2', TIME '11:00', 5.5, 51, 3), ('s2', TIME '12:00', 5.4, 50, 4), ('s2', TIME '13:00', 5.1, 49, 5), ('s2', TIME '14:00', 5.0, 50, 6), ('s2', TIME '15:00', 5.1, 51, 7),
  ('s3', TIME '09:00', 20.5, 54, 1), ('s3', TIME '10:00', 21.0, 54, 2), ('s3', TIME '11:00', 21.5, 55, 3), ('s3', TIME '12:00', 22.0, 56, 4), ('s3', TIME '13:00', 22.4, 55, 5), ('s3', TIME '14:00', 22.1, 54, 6), ('s3', TIME '15:00', 21.8, 55, 7),
  ('s4', TIME '09:00', 21.8, 57, 1), ('s4', TIME '10:00', 22.1, 57, 2), ('s4', TIME '11:00', 22.4, 58, 3), ('s4', TIME '12:00', 22.8, 59, 4), ('s4', TIME '13:00', 23.0, 60, 5), ('s4', TIME '14:00', 22.7, 59, 6), ('s4', TIME '15:00', 22.5, 58, 7)
) AS seed(sensor_id, reading_time, temperature, humidity, sequence_number)
ON CONFLICT (sensor_id, sequence_number) DO NOTHING;

-- Older development volumes used fixed same-day clock times, which could place
-- demo readings ahead of early-morning live telemetry.
UPDATE sensor_readings
SET measured_at = NOW() - ((8 - sequence_number) * INTERVAL '1 hour')
WHERE device_id IS NULL
  AND sequence_number BETWEEN 1 AND 7
  AND measured_at > NOW();

INSERT INTO staff (id, name, email, avatar, role) VALUES
  ('st1', 'Nidhal Gharbi', 'nidhalgharbi@gmail.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', 'Pharmacien Titulaire'),
  ('st2', 'Akrem Issaoui', 'akrem.issaoui1@gmail.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', 'Pharmacien Adjoint'),
  ('st3', 'Saber Sakli', 'mhamdiazer13@gmail.com', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', 'Préparateur'),
  ('st4', 'Mohamed Raddaoui', 'Mohamed.RADDAOUI@esprit.tn', 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=200', 'Stagiaire')
ON CONFLICT (id) DO NOTHING;

INSERT INTO staff_schedules (staff_id, day_of_week, shift) VALUES
  ('st1', 'Lundi', 'Matin'), ('st1', 'Mardi', 'Matin'), ('st1', 'Mercredi', 'Après-midi'), ('st1', 'Jeudi', 'Après-midi'), ('st1', 'Vendredi', 'Matin'), ('st1', 'Samedi', 'Matin'), ('st1', 'Dimanche', 'Repos'),
  ('st2', 'Lundi', 'Après-midi'), ('st2', 'Mardi', 'Après-midi'), ('st2', 'Mercredi', 'Matin'), ('st2', 'Jeudi', 'Matin'), ('st2', 'Vendredi', 'Après-midi'), ('st2', 'Samedi', 'Après-midi'), ('st2', 'Dimanche', 'Repos'),
  ('st3', 'Lundi', 'Matin'), ('st3', 'Mardi', 'Après-midi'), ('st3', 'Mercredi', 'Repos'), ('st3', 'Jeudi', 'Matin'), ('st3', 'Vendredi', 'Matin'), ('st3', 'Samedi', 'Garde'), ('st3', 'Dimanche', 'Garde'),
  ('st4', 'Lundi', 'Matin'), ('st4', 'Mardi', 'Matin'), ('st4', 'Mercredi', 'Matin'), ('st4', 'Jeudi', 'Matin'), ('st4', 'Vendredi', 'Après-midi'), ('st4', 'Samedi', 'Repos'), ('st4', 'Dimanche', 'Repos')
ON CONFLICT (staff_id, day_of_week) DO NOTHING;

INSERT INTO purchase_orders (id, ordered_at, grossist, status, total_price) VALUES
  ('ord-101', '2026-07-16T10:15:00-07:00', 'Cogepha', 'Livré', 145.500)
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_order_items (order_id, product_id, name, quantity, unit_price)
SELECT seed.order_id, seed.product_id, seed.name, seed.quantity, seed.unit_price
FROM (VALUES
  ('ord-101', 'p1', 'CLAMOXYL 1g', 5, 18.885),
  ('ord-101', 'p2', 'DOLIPRANE 1000mg', 10, 3.520),
  ('ord-101', 'p3', 'MAXILASE 3000 U.I.', 2, 7.590)
) AS seed(order_id, product_id, name, quantity, unit_price)
WHERE NOT EXISTS (SELECT 1 FROM purchase_order_items WHERE order_id = 'ord-101');

COMMIT;
