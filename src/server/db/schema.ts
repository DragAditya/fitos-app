/**
 * Local PostgreSQL schema.
 *
 * The same DDL is mirrored in `db/migrations/0001_init.sql` so the application can
 * be pointed at a managed PostgreSQL instance later. All money is stored in minor
 * units (paise) and all business records are scoped by gym_id.
 */
export const SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text,
  full_name text NOT NULL,
  phone text,
  date_of_birth date,
  address text,
  avatar_url text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gyms (
  id text PRIMARY KEY,
  owner_id text NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  address text,
  city text,
  phone text,
  email text,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  currency text NOT NULL DEFAULT 'INR',
  logo_url text,
  member_code_prefix text NOT NULL DEFAULT 'IC',
  member_checkin_enabled boolean NOT NULL DEFAULT true,
  reminder_days integer NOT NULL DEFAULT 7,
  receipt_footer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Existing deployments get the workspace settings without a destructive migration.
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS member_code_prefix text NOT NULL DEFAULT 'IC';
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS member_checkin_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS reminder_days integer NOT NULL DEFAULT 7;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS receipt_footer text;

CREATE TABLE IF NOT EXISTS gym_members (
  id text PRIMARY KEY,
  gym_id text NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  profile_id text NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  member_code text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  joined_at date NOT NULL,
  emergency_contact text,
  notes text,
  invite_token_hash text,
  invite_expires_at timestamptz,
  invited_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, member_code)
);

CREATE TABLE IF NOT EXISTS membership_plans (
  id text PRIMARY KEY,
  gym_id text NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  duration_days integer NOT NULL CHECK (duration_days BETWEEN 1 AND 3650),
  duration_label text NOT NULL,
  benefits text[] NOT NULL DEFAULT '{}',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
  id text PRIMARY KEY,
  gym_id text NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES gym_members(id) ON DELETE RESTRICT,
  plan_id text NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  created_by text REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS memberships_one_active_per_member
  ON memberships(member_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS memberships_gym_end_idx ON memberships(gym_id, end_date);
CREATE INDEX IF NOT EXISTS memberships_member_idx ON memberships(member_id, start_date DESC);

CREATE TABLE IF NOT EXISTS attendance (
  id text PRIMARY KEY,
  gym_id text NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES gym_members(id) ON DELETE RESTRICT,
  check_in_date date NOT NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL CHECK (method IN ('qr', 'manual')),
  checked_in_by text REFERENCES profiles(id) ON DELETE SET NULL,
  note text,
  UNIQUE (member_id, check_in_date)
);

CREATE INDEX IF NOT EXISTS attendance_gym_date_idx ON attendance(gym_id, check_in_date DESC);
CREATE INDEX IF NOT EXISTS attendance_member_idx ON attendance(member_id, check_in_date DESC);

CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY,
  gym_id text NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES gym_members(id) ON DELETE RESTRICT,
  membership_id text REFERENCES memberships(id) ON DELETE SET NULL,
  receipt_number text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  plan_applied_cents integer NOT NULL DEFAULT 0 CHECK (plan_applied_cents >= 0),
  advance_added_cents integer NOT NULL DEFAULT 0 CHECK (advance_added_cents >= 0),
  credit_used_cents integer NOT NULL DEFAULT 0 CHECK (credit_used_cents >= 0),
  currency text NOT NULL DEFAULT 'INR',
  method text NOT NULL CHECK (method IN ('cash', 'upi', 'bank_transfer', 'card')),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  reference text,
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  recorded_by text REFERENCES profiles(id) ON DELETE SET NULL,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, receipt_number)
);

-- Existing deployments get the split fields without a destructive migration.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS plan_applied_cents integer NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS advance_added_cents integer NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS credit_used_cents integer NOT NULL DEFAULT 0;
UPDATE payments SET plan_applied_cents = amount_cents
  WHERE plan_applied_cents = 0 AND advance_added_cents = 0 AND credit_used_cents = 0
    AND membership_id IS NOT NULL;
UPDATE payments SET advance_added_cents = amount_cents
  WHERE plan_applied_cents = 0 AND advance_added_cents = 0 AND credit_used_cents = 0
    AND membership_id IS NULL;

CREATE INDEX IF NOT EXISTS payments_gym_date_idx ON payments(gym_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS payments_member_idx ON payments(member_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(gym_id, status);
CREATE INDEX IF NOT EXISTS payments_membership_idx ON payments(membership_id) WHERE membership_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS member_credit_ledger (
  id text PRIMARY KEY,
  gym_id text NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  payment_id text REFERENCES payments(id) ON DELETE SET NULL,
  membership_id text REFERENCES memberships(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('advance_received', 'advance_applied', 'advance_refunded', 'advance_restored', 'adjustment')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_credit_ledger_member_idx ON member_credit_ledger(gym_id, member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS member_credit_ledger_payment_idx ON member_credit_ledger(payment_id);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  gym_id text NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('announcement', 'expiry', 'payment', 'renewal', 'system')),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'selected')),
  created_by text REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_gym_date_idx ON notifications(gym_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_recipients (
  id text PRIMARY KEY,
  notification_id text NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, member_id)
);

CREATE INDEX IF NOT EXISTS notification_recipients_member_idx ON notification_recipients(member_id, read_at);

CREATE TABLE IF NOT EXISTS member_qr_tokens (
  id text PRIMARY KEY,
  gym_id text NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id text NOT NULL UNIQUE REFERENCES gym_members(id) ON DELETE CASCADE,
  nonce integer NOT NULL DEFAULT 1 CHECK (nonce >= 1),
  active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  user_agent text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS renewal_requests (
  id text PRIMARY KEY,
  gym_id text NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  membership_id text REFERENCES memberships(id) ON DELETE SET NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'handled', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  handled_at timestamptz,
  handled_by text REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS renewal_requests_gym_idx ON renewal_requests(gym_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY,
  gym_id text REFERENCES gyms(id) ON DELETE SET NULL,
  actor_id text REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_gym_date_idx ON audit_logs(gym_id, created_at DESC);
`;
