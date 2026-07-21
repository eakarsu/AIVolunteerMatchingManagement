BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  organization TEXT,
  role TEXT NOT NULL DEFAULT 'volunteer'
    CHECK (role IN ('volunteer', 'coordinator', 'manager', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

COMMIT;
