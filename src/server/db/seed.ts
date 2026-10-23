import type { DbClient, DbExecutor } from "./client";
import { addDays, todayISO } from "@/lib/dates";
import { createQrToken } from "@/lib/qr-token";
import { hashPassword } from "@/server/auth/password";
import { getQrSecret } from "@/server/env";

type SeedMember = {
  name: string;
  email: string;
  phone: string;
  plan: number | null;
  startOffset: number;
  memberStatus: "active" | "inactive" | "suspended";
  paymentStatus: "paid" | "pending" | "failed" | "refunded" | "none";
  joinedOffset: number;
  pendingMembership?: boolean;
  noAttendance?: boolean;
};

const plans = [
  {
    name: "Monthly Momentum",
    price: 250000,
    days: 30,
    label: "1 month",
    description: "Full gym access for members who like to keep things flexible.",
    benefits: ["Unlimited gym floor access", "Locker & shower access", "Monthly progress check-in"],
  },
  {
    name: "Quarterly Reset",
    price: 660000,
    days: 90,
    label: "3 months",
    description: "A focused quarter with access to group classes and recovery.",
    benefits: [
      "Unlimited gym floor access",
      "All group classes",
      "Recovery room access",
      "Quarterly body composition scan",
    ],
  },
  {
    name: "Half-Year Strength",
    price: 1150000,
    days: 180,
    label: "6 months",
    description: "Our most popular plan for consistent, long-term progress.",
    benefits: [
      "Unlimited gym floor access",
      "All group classes",
      "Recovery room access",
      "2 personal training sessions",
      "Guest pass each month",
    ],
  },
  {
    name: "Annual Unlimited",
    price: 1900000,
    days: 365,
    label: "12 months",
    description: "The complete Ironclad experience, billed once a year.",
    benefits: [
      "Everything in Half-Year Strength",
      "Unlimited group classes",
      "Monthly InBody scan",
      "Priority class booking",
      "Freeze up to 30 days",
    ],
  },
];

const members: SeedMember[] = [
  { name: "Riya Kapoor", email: "member@fitos.app", phone: "+91 98450 11221", plan: 3, startOffset: 120, memberStatus: "active", paymentStatus: "paid", joinedOffset: 420 },
  { name: "Arjun Nair", email: "arjun.nair@example.com", phone: "+91 98860 21342", plan: 0, startOffset: 26, memberStatus: "active", paymentStatus: "paid", joinedOffset: 212 },
  { name: "Meera Iyer", email: "meera.iyer@example.com", phone: "+91 99001 44582", plan: 1, startOffset: 45, memberStatus: "active", paymentStatus: "paid", joinedOffset: 310 },
  { name: "Kabir Shah", email: "kabir.shah@example.com", phone: "+91 97400 87861", plan: 0, startOffset: 55, memberStatus: "active", paymentStatus: "paid", joinedOffset: 280 },
  { name: "Ananya Rao", email: "ananya.rao@example.com", phone: "+91 98452 78113", plan: 2, startOffset: 160, memberStatus: "active", paymentStatus: "paid", joinedOffset: 360 },
  { name: "Dev Malhotra", email: "dev.malhotra@example.com", phone: "+91 98803 55421", plan: 0, startOffset: 12, memberStatus: "suspended", paymentStatus: "pending", joinedOffset: 190 },
  { name: "Sara Khan", email: "sara.khan@example.com", phone: "+91 99012 63341", plan: 1, startOffset: 200, memberStatus: "inactive", paymentStatus: "refunded", joinedOffset: 500 },
  { name: "Ishaan Verma", email: "ishaan.verma@example.com", phone: "+91 98455 90210", plan: 3, startOffset: 300, memberStatus: "active", paymentStatus: "paid", joinedOffset: 550 },
  { name: "Nisha Patel", email: "nisha.patel@example.com", phone: "+91 97318 44402", plan: 0, startOffset: 29, memberStatus: "active", paymentStatus: "paid", joinedOffset: 155 },
  { name: "Rohan Gupta", email: "rohan.gupta@example.com", phone: "+91 98867 23113", plan: 0, startOffset: 40, memberStatus: "active", paymentStatus: "paid", joinedOffset: 240 },
  { name: "Tara Singh", email: "tara.singh@example.com", phone: "+91 99008 77191", plan: null, startOffset: 0, memberStatus: "active", paymentStatus: "none", joinedOffset: 3, noAttendance: true },
  { name: "Aditya Menon", email: "aditya.menon@example.com", phone: "+91 98451 30982", plan: 1, startOffset: 20, memberStatus: "active", paymentStatus: "paid", joinedOffset: 175 },
  { name: "Priya Sharma", email: "priya.sharma@example.com", phone: "+91 98802 61744", plan: 3, startOffset: 30, memberStatus: "active", paymentStatus: "paid", joinedOffset: 300 },
  { name: "Zoya Ali", email: "zoya.ali@example.com", phone: "+91 99020 15584", plan: 0, startOffset: 12, memberStatus: "active", paymentStatus: "paid", joinedOffset: 95 },
  { name: "Karan Joshi", email: "karan.joshi@example.com", phone: "+91 97411 90221", plan: 2, startOffset: 220, memberStatus: "active", paymentStatus: "paid", joinedOffset: 480 },
  { name: "Farhan Ahmed", email: "farhan.ahmed@example.com", phone: "+91 98458 73312", plan: 0, startOffset: 7, memberStatus: "active", paymentStatus: "pending", joinedOffset: 160 },
  { name: "Neha Kulkarni", email: "neha.kulkarni@example.com", phone: "+91 98809 44551", plan: 1, startOffset: 70, memberStatus: "active", paymentStatus: "paid", joinedOffset: 390 },
  { name: "Vikram Desai", email: "vikram.desai@example.com", phone: "+91 99003 28119", plan: 0, startOffset: 100, memberStatus: "inactive", paymentStatus: "failed", joinedOffset: 430 },
  { name: "Aisha Sheikh", email: "aisha.sheikh@example.com", phone: "+91 98453 55118", plan: 2, startOffset: 15, memberStatus: "active", paymentStatus: "paid", joinedOffset: 120 },
  { name: "Krish Raman", email: "krish.raman@example.com", phone: "+91 98864 12779", plan: 0, startOffset: 3, memberStatus: "active", paymentStatus: "paid", joinedOffset: 35 },
  { name: "Diya Sen", email: "diya.sen@example.com", phone: "+91 99018 56102", plan: 3, startOffset: 80, memberStatus: "active", paymentStatus: "paid", joinedOffset: 340 },
  { name: "Manav Bhatia", email: "manav.bhatia@example.com", phone: "+91 98457 31990", plan: 1, startOffset: 92, memberStatus: "active", paymentStatus: "refunded", joinedOffset: 330 },
  { name: "Simran Kaur", email: "simran.kaur@example.com", phone: "+91 98800 71234", plan: 0, startOffset: 5, memberStatus: "active", paymentStatus: "paid", joinedOffset: 60 },
  {
    name: "Ishita Roy",
    email: "ishita.roy@example.com",
    phone: "+91 99004 81245",
    plan: 2,
    startOffset: -5,
    memberStatus: "active",
    paymentStatus: "pending",
    joinedOffset: 4,
    pendingMembership: true,
    noAttendance: true,
  },
];

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const GYM_ID = "22222222-2222-4222-8222-222222222222";

function profileId(index: number) {
  return `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
}
function memberId(index: number) {
  return `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
}
function membershipId(index: number, suffix = 0) {
  return `50000000-0000-4000-8000-${String(index + 1).padStart(8, "0")}${String(suffix).padStart(4, "0")}`;
}
function planId(index: number) {
  return `33333333-3333-4333-8333-${String(index + 1).padStart(12, "0")}`;
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bulkInsert(
  db: DbExecutor,
  table: string,
  columns: string[],
  rows: unknown[][],
  chunkSize = 250,
) {
  if (rows.length === 0) return Promise.resolve();
  const chunks: unknown[][][] = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }
  return chunks.reduce<Promise<unknown>>(async (promise, chunk) => {
    await promise;
    const placeholders = chunk
      .map(
        (_, rowIndex) =>
          `(${columns
            .map((_, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`)
            .join(", ")})`,
      )
      .join(", ");
    return db.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`,
      chunk.flat() as never[],
    );
  }, Promise.resolve());
}

export async function seedDemoData(db: DbClient) {
  const today = todayISO();
  const now = new Date();
  const passwordHash = await hashPassword("FitOS2026!");
  const random = mulberry32(20261021);

  const planRows = plans.map((plan, index) => [
    planId(index),
    GYM_ID,
    plan.name,
    plan.description,
    plan.price,
    plan.days,
    plan.label,
    `{${plan.benefits.map((benefit) => `"${benefit.replaceAll('"', '\\"')}"`).join(",")}}`,
    new Date(now.getTime() - (420 - index * 8) * 86400000).toISOString(),
  ]);

  const memberProfileRows = members.map((member, index) => [
    profileId(index),
    member.email.toLowerCase(),
    passwordHash,
    member.name,
    member.phone,
    addDays(today, -(8000 + index * 173)),
    `${12 + (index % 30)}, Indiranagar, Bengaluru`,
    null,
    "member",
    new Date(now.getTime() - member.joinedOffset * 86400000).toISOString(),
    new Date(now.getTime() - member.joinedOffset * 86400000).toISOString(),
  ]);

  const memberRows = members.map((member, index) => [
    memberId(index),
    GYM_ID,
    profileId(index),
    `IC-${String(index + 1).padStart(4, "0")}`,
    member.memberStatus,
    addDays(today, -member.joinedOffset),
    index % 4 === 0 ? "+91 98450 00000" : null,
    index === 5 ? "Temporarily suspended pending payment review." : null,
    null,
    null,
    null,
    new Date(now.getTime() - member.joinedOffset * 86400000).toISOString(),
    new Date(now.getTime() - member.joinedOffset * 86400000).toISOString(),
  ]);

  const membershipRows: unknown[][] = [];
  const paymentRows: unknown[][] = [];
  const activeMemberships: Array<{
    memberIndex: number;
    start: string;
    end: string;
    planIndex: number;
  }> = [];

  const paymentDayOffsets = [2, 6, 9, 16, 4, 11, 30, 3, 7, 18, 0, 5, 12, 22, 35, 8, 2, 55, 9, 1, 14, 20, 4, 6];

  members.forEach((member, index) => {
    if (member.plan === null) return;
    const plan = plans[member.plan]!;
    const start = addDays(today, -member.startOffset);
    const end = addDays(start, plan.days - 1);
    const membershipStatus = member.pendingMembership ? "pending" : "active";
    const mid = membershipId(index);
    membershipRows.push([
      mid,
      GYM_ID,
      memberId(index),
      planId(member.plan),
      start,
      end,
      membershipStatus,
      plan.price,
      OWNER_ID,
      new Date(now.getTime() - Math.min(member.startOffset, 60) * 86400000).toISOString(),
      new Date(now.getTime() - Math.min(member.startOffset, 60) * 86400000).toISOString(),
    ]);
    activeMemberships.push({ memberIndex: index, start, end, planIndex: member.plan });

    if (member.paymentStatus !== "none") {
      const expectedActive = end >= today;
      const daysAgo = member.pendingMembership
        ? 4
        : expectedActive
          ? paymentDayOffsets[index] ?? 8
          : Math.min(member.startOffset, 120);
      const paidAt = new Date(now.getTime() - daysAgo * 86400000);
      const status = member.paymentStatus;
      paymentRows.push([
        `60000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        GYM_ID,
        memberId(index),
        mid,
        `IC-${today.slice(0, 4)}-${String(index + 1).padStart(5, "0")}`,
        plan.price,
        plan.price,
        0,
        0,
        "INR",
        (["upi", "card", "cash", "bank_transfer"] as const)[index % 4],
        status,
        `FIT-${String(10240 + index)}`,
        status === "pending"
          ? "Awaiting owner confirmation."
          : status === "refunded"
            ? "Refunded after membership cancellation request."
            : "Membership fee, recorded at the front desk.",
        paidAt.toISOString(),
        OWNER_ID,
        status === "refunded" ? new Date(now.getTime() - (daysAgo - 1) * 86400000).toISOString() : null,
        paidAt.toISOString(),
      ]);
    }
  });

  // Historical memberships + payments for a richer member profile history.
  const historyIndexes = [0, 1, 4, 7, 12, 20];
  historyIndexes.forEach((index, historyIndex) => {
    const member = members[index]!;
    if (member.plan === null) return;
    const priorPlanIndex = (member.plan + 1) % plans.length;
    const priorPlan = plans[priorPlanIndex]!;
    const currentStart = addDays(today, -member.startOffset);
    const priorEnd = addDays(currentStart, -1);
    const priorStart = addDays(priorEnd, -(priorPlan.days - 1));
    const mid = membershipId(index, 1);
    membershipRows.push([
      mid,
      GYM_ID,
      memberId(index),
      planId(priorPlanIndex),
      priorStart,
      priorEnd,
      "completed",
      priorPlan.price,
      OWNER_ID,
      new Date(now.getTime() - (member.startOffset + 5) * 86400000).toISOString(),
      new Date(now.getTime() - (member.startOffset + 5) * 86400000).toISOString(),
    ]);
    paymentRows.push([
      `61000000-0000-4000-8000-${String(index + 1).padStart(8, "0")}${String(historyIndex).padStart(4, "0")}`,
      GYM_ID,
      memberId(index),
      mid,
      `IC-${today.slice(0, 4)}-H${String(index + 1).padStart(4, "0")}`,
      priorPlan.price,
      priorPlan.price,
      0,
      0,
      "INR",
      "upi",
      "paid",
      `HIST-${4000 + index}`,
      "Previous membership term.",
      new Date(now.getTime() - (member.startOffset + 2) * 86400000).toISOString(),
      OWNER_ID,
      null,
      new Date(now.getTime() - (member.startOffset + 2) * 86400000).toISOString(),
    ]);
  });

  const attendanceRows: unknown[][] = [];
  const seen = new Set<string>();
  const attendanceTimeFor = (index: number, dayOffset: number) => {
    const hour = 6 + ((index + dayOffset) % 5);
    const minute = (index * 7 + dayOffset * 13) % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  activeMemberships.forEach(({ memberIndex, start, end }) => {
    const member = members[memberIndex]!;
    if (member.noAttendance || member.memberStatus !== "active") return;
    for (let dayOffset = 0; dayOffset < 60; dayOffset += 1) {
      const day = addDays(today, -dayOffset);
      if (day < start || day > end || day > today) continue;
      const joined = addDays(today, -member.joinedOffset);
      if (day < joined) continue;
      const probability = 0.32 + ((memberIndex * 7) % 24) / 100;
      const forced = memberIndex === 0 && dayOffset < 5;
      if (!forced && random() > probability) continue;
      const key = `${memberIndex}:${day}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const time = attendanceTimeFor(memberIndex, dayOffset);
      attendanceRows.push([
        `70000000-0000-4000-8000-${String(memberIndex + 1).padStart(6, "0")}${String(dayOffset).padStart(6, "0")}`,
        GYM_ID,
        memberId(memberIndex),
        day,
        `${day}T${time}:00+05:30`,
        dayOffset % 6 === 0 ? "manual" : "qr",
        OWNER_ID,
        dayOffset % 6 === 0 ? "Manual check-in at front desk." : null,
      ]);
    }
  });

  const todaysCheckIns = [0, 2, 4, 7, 8, 11, 15, 18, 19, 22];
  todaysCheckIns.forEach((memberIndex, index) => {
    const key = `${memberIndex}:${today}`;
    if (seen.has(key)) {
      attendanceRows.splice(
        attendanceRows.findIndex(
          (row) => row[2] === memberId(memberIndex) && row[3] === today,
        ),
        1,
      );
    }
    seen.add(key);
    const time = ["06:12", "06:48", "07:21", "07:56", "08:34", "09:02", "09:41", "10:06", "10:28", "11:03"][index]!;
    attendanceRows.push([
      `71000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      GYM_ID,
      memberId(memberIndex),
      today,
      `${today}T${time}:00+05:30`,
      "qr",
      OWNER_ID,
      null,
    ]);
  });

  const notificationSpecs = [
    {
      id: "90000000-0000-4000-8000-000000000001",
      kind: "announcement",
      title: "New October class timetable is live",
      body: "Strength Foundations moves to 7:00 AM on weekdays, and our new mobility class runs every Saturday at 9:00 AM. Book your spot at the front desk.",
      audience: "all",
      createdAt: new Date(now.getTime() - 3 * 86400000 - 3600000).toISOString(),
      recipients: members.map((_, index) => index),
      readRatio: 0.45,
    },
    {
      id: "90000000-0000-4000-8000-000000000002",
      kind: "announcement",
      title: "Festive week gym timings",
      body: "The gym will open from 6:00 AM to 12:00 PM on Saturday and remain closed on Sunday for maintenance. Your membership end date is not affected.",
      audience: "all",
      createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
      recipients: members.map((_, index) => index),
      readRatio: 0.72,
    },
    {
      id: "90000000-0000-4000-8000-000000000003",
      kind: "expiry",
      title: "Your membership expires this week",
      body: "Your current plan is coming to an end. Renew at the front desk or from the membership screen to keep your access uninterrupted.",
      audience: "selected",
      createdAt: new Date(now.getTime() - 86400000).toISOString(),
      recipients: [1, 8],
      readRatio: 0,
    },
    {
      id: "90000000-0000-4000-8000-000000000004",
      kind: "payment",
      title: "Payment reminder",
      body: "We have an outstanding balance on your membership. Please settle it at reception or via UPI. Speak to us if you need help.",
      audience: "selected",
      createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      recipients: [5, 15, 23],
      readRatio: 0.33,
    },
    {
      id: "90000000-0000-4000-8000-000000000005",
      kind: "announcement",
      title: "Welcome to Ironclad Strength Club",
      body: "We are glad you are here. Open the FitOS app, tap Check in, and scan the live code at the front desk. Ask us anything, any time.",
      audience: "all",
      createdAt: new Date(now.getTime() - 45 * 86400000).toISOString(),
      recipients: members.map((_, index) => index),
      readRatio: 0.9,
    },
    {
      id: "90000000-0000-4000-8000-000000000006",
      kind: "announcement",
      title: "Recovery room is now open",
      body: "Compression boots, foam rollers and a guided stretch routine are available after 6 PM. Members on quarterly plans and above have unlimited access.",
      audience: "all",
      createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
      recipients: members.map((_, index) => index),
      readRatio: 0.3,
    },
  ] as const;

  const notificationRows = notificationSpecs.map((notification) => [
    notification.id,
    GYM_ID,
    notification.kind,
    notification.title,
    notification.body,
    notification.audience,
    OWNER_ID,
    notification.createdAt,
  ]);

  const recipientRows: unknown[][] = [];
  notificationSpecs.forEach((notification, notificationIndex) => {
    notification.recipients.forEach((memberIndex, index) => {
      const read =
        index / Math.max(1, notification.recipients.length) < notification.readRatio;
      recipientRows.push([
        `91000000-0000-4000-8000-${String(notificationIndex + 1).padStart(4, "0")}${String(memberIndex + 1).padStart(8, "0")}`,
        notification.id,
        memberId(memberIndex),
        read ? new Date(now.getTime() - 2 * 86400000).toISOString() : null,
        notification.createdAt,
      ]);
    });
  });

  const qrRows = members.map((_, index) => {
    const id = `80000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    // The cryptographic signature is derived on demand from the stored nonce and server secret.
    createQrToken(
      { publicId: id, nonce: 1, memberId: memberId(index), gymId: GYM_ID },
      getQrSecret(),
    );
    return [
      id,
      GYM_ID,
      memberId(index),
      1,
      true,
      index === 0 ? new Date(now.getTime() - 2 * 86400000).toISOString() : null,
      null,
      new Date(now.getTime() - 30 * 86400000).toISOString(),
    ];
  });

  const auditRows = [
    ["a1000000-0000-4000-8000-000000000001", GYM_ID, OWNER_ID, "member.created", "member", memberId(23), "{}", new Date(now.getTime() - 4 * 86400000).toISOString()],
    ["a1000000-0000-4000-8000-000000000002", GYM_ID, OWNER_ID, "membership.assigned", "membership", membershipId(23), "{}", new Date(now.getTime() - 4 * 86400000).toISOString()],
    ["a1000000-0000-4000-8000-000000000003", GYM_ID, OWNER_ID, "payment.recorded", "payment", "60000000-0000-4000-8000-000000000001", "{}", new Date(now.getTime() - 2 * 86400000).toISOString()],
  ];

  await db.transaction(async (tx) => {
    await tx.query(
      `INSERT INTO profiles (id, email, password_hash, full_name, phone, address, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        OWNER_ID,
        "owner@fitos.app",
        passwordHash,
        "Aarav Mehta",
        "+91 98450 77821",
        "14, 100 Feet Road, Indiranagar, Bengaluru",
        "owner",
        new Date(now.getTime() - 500 * 86400000).toISOString(),
        new Date(now.getTime() - 500 * 86400000).toISOString(),
      ],
    );
    await tx.query(
      `INSERT INTO gyms (id, owner_id, name, slug, address, city, phone, email, timezone, currency, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        GYM_ID,
        OWNER_ID,
        "Ironclad Strength Club",
        "ironclad-strength-club",
        "218, 12th Main Road, Indiranagar",
        "Bengaluru",
        "+91 80 4123 8890",
        "hello@ironclad.fit",
        "Asia/Kolkata",
        "INR",
        new Date(now.getTime() - 500 * 86400000).toISOString(),
        new Date(now.getTime() - 500 * 86400000).toISOString(),
      ],
    );
    await bulkInsert(
      tx,
      "membership_plans",
      ["id", "gym_id", "name", "description", "price_cents", "duration_days", "duration_label", "benefits", "created_at"],
      planRows,
    );
    await bulkInsert(
      tx,
      "profiles",
      ["id", "email", "password_hash", "full_name", "phone", "date_of_birth", "address", "avatar_url", "role", "created_at", "updated_at"],
      memberProfileRows,
    );
    await bulkInsert(
      tx,
      "gym_members",
      ["id", "gym_id", "profile_id", "member_code", "status", "joined_at", "emergency_contact", "notes", "invite_token_hash", "invite_expires_at", "invited_email", "created_at", "updated_at"],
      memberRows,
    );
    await bulkInsert(
      tx,
      "memberships",
      ["id", "gym_id", "member_id", "plan_id", "start_date", "end_date", "status", "price_cents", "created_by", "created_at", "updated_at"],
      membershipRows,
    );
    await bulkInsert(
      tx,
      "payments",
      ["id", "gym_id", "member_id", "membership_id", "receipt_number", "amount_cents", "plan_applied_cents", "advance_added_cents", "credit_used_cents", "currency", "method", "status", "reference", "notes", "paid_at", "recorded_by", "refunded_at", "created_at"],
      paymentRows,
    );
    await bulkInsert(
      tx,
      "attendance",
      ["id", "gym_id", "member_id", "check_in_date", "checked_in_at", "method", "checked_in_by", "note"],
      attendanceRows,
    );
    await bulkInsert(
      tx,
      "notifications",
      ["id", "gym_id", "kind", "title", "body", "audience", "created_by", "created_at"],
      notificationRows,
    );
    await bulkInsert(
      tx,
      "notification_recipients",
      ["id", "notification_id", "member_id", "read_at", "created_at"],
      recipientRows,
    );
    await bulkInsert(
      tx,
      "member_qr_tokens",
      ["id", "gym_id", "member_id", "nonce", "active", "last_used_at", "revoked_at", "created_at"],
      qrRows,
    );
    await bulkInsert(
      tx,
      "audit_logs",
      ["id", "gym_id", "actor_id", "action", "entity_type", "entity_id", "metadata", "created_at"],
      auditRows,
    );
    await tx.query(
      `INSERT INTO renewal_requests (id, gym_id, member_id, membership_id, note, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
      [
        "b1000000-0000-4000-8000-000000000001",
        GYM_ID,
        memberId(1),
        membershipId(1),
        "I would like to continue with the quarterly plan. Could I start it next week?",
        new Date(now.getTime() - 8 * 3600000).toISOString(),
      ],
    );
  });
}
