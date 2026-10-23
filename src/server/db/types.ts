export type DbTimestamp = string | Date;

export type Role = "owner" | "member";
export type MemberStatus = "active" | "inactive" | "suspended";
export type MembershipStatus = "pending" | "active" | "completed" | "cancelled";
export type PaymentStatus = "paid" | "pending" | "failed" | "refunded";
export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "card";
export type NotificationKind = "announcement" | "expiry" | "payment" | "renewal" | "system";

export type Profile = {
  id: string;
  email: string;
  password_hash: string | null;
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  avatar_url: string | null;
  role: Role;
  email_verified_at: DbTimestamp | null;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type Gym = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  currency: string;
  logo_url: string | null;
  member_code_prefix: string;
  member_checkin_enabled: boolean;
  reminder_days: number;
  receipt_footer: string | null;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type GymMember = {
  id: string;
  gym_id: string;
  profile_id: string;
  member_code: string;
  status: MemberStatus;
  joined_at: string;
  emergency_contact: string | null;
  notes: string | null;
  invite_token_hash: string | null;
  invite_expires_at: DbTimestamp | null;
  invited_email: string | null;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type MemberRow = GymMember & {
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  avatar_url: string | null;
  has_password: boolean;
  plan_id: string | null;
  plan_name: string | null;
  membership_id: string | null;
  membership_start: string | null;
  membership_end: string | null;
  membership_status: MembershipStatus | null;
  membership_price_cents: number | null;
};

export type MembershipPlan = {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_days: number;
  duration_label: string;
  benefits: string[];
  archived_at: DbTimestamp | null;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
  active_members?: number;
};

export type Membership = {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: MembershipStatus;
  price_cents: number;
  created_by: string | null;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type MembershipRow = Membership & {
  plan_name: string;
  duration_days: number;
  duration_label: string;
  benefits: string[];
  member_name: string;
  member_email: string;
  member_code: string;
};

export type Attendance = {
  id: string;
  gym_id: string;
  member_id: string;
  check_in_date: string;
  checked_in_at: DbTimestamp;
  method: "qr" | "manual";
  checked_in_by: string | null;
  note: string | null;
};

export type AttendanceRow = Attendance & {
  member_name: string;
  member_email: string;
  member_code: string;
  avatar_url: string | null;
};

export type Payment = {
  id: string;
  gym_id: string;
  member_id: string;
  membership_id: string | null;
  receipt_number: string;
  amount_cents: number;
  plan_applied_cents: number;
  advance_added_cents: number;
  credit_used_cents: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  notes: string | null;
  paid_at: DbTimestamp;
  recorded_by: string | null;
  refunded_at: DbTimestamp | null;
  created_at: DbTimestamp;
};

export type PaymentRow = Payment & {
  member_name: string;
  member_email: string;
  member_code: string;
  plan_name: string | null;
};

export type MemberCreditEntry = {
  id: string;
  gym_id: string;
  member_id: string;
  payment_id: string | null;
  membership_id: string | null;
  amount_cents: number;
  kind: "advance_received" | "advance_applied" | "advance_refunded" | "advance_restored" | "adjustment";
  note: string | null;
  created_at: DbTimestamp;
};

export type PaymentQuote = {
  membershipId: string;
  memberId: string;
  planName: string;
  currency: string;
  priceCents: number;
  paidCents: number;
  dueCents: number;
  advanceCents: number;
  cashNeededCents: number;
  creditToApplyCents: number;
};

export type Notification = {
  id: string;
  gym_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  audience: "all" | "selected";
  created_by: string | null;
  created_at: DbTimestamp;
  recipient_count?: number;
  read_count?: number;
};

export type MemberNotification = Notification & {
  recipient_id: string;
  read_at: DbTimestamp | null;
};

export type RenewalRequest = {
  id: string;
  gym_id: string;
  member_id: string;
  membership_id: string | null;
  note: string | null;
  status: "pending" | "handled" | "declined";
  created_at: DbTimestamp;
  handled_at: DbTimestamp | null;
  handled_by: string | null;
  member_name: string;
  member_email: string;
};

export type QrTokenRecord = {
  id: string;
  gym_id: string;
  member_id: string;
  nonce: number;
  active: boolean;
  last_used_at: DbTimestamp | null;
  revoked_at: DbTimestamp | null;
  created_at: DbTimestamp;
};

export type SessionRecord = {
  id: string;
  user_id: string;
  token_hash: string;
  user_agent: string | null;
  expires_at: DbTimestamp;
  created_at: DbTimestamp;
};
