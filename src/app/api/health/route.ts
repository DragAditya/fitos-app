import { NextResponse } from "next/server";
import { databaseDriver, queryOne } from "@/server/db/client";

export async function GET() {
  const startedAt = Date.now();
  try {
    const row = await queryOne<{ profiles: number; gyms: number }>(
      `SELECT
        (SELECT COUNT(*)::int FROM profiles) AS profiles,
        (SELECT COUNT(*)::int FROM gyms) AS gyms`,
    );
    return NextResponse.json({
      ok: true,
      service: "fitos",
      database: databaseDriver(),
      mode: process.env.NODE_ENV ?? "development",
      demoSeed: process.env.FITOS_SEED_DEMO !== "false",
      counts: { profiles: row?.profiles ?? 0, gyms: row?.gyms ?? 0 },
      latencyMs: Date.now() - startedAt,
      time: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "fitos",
        error: error instanceof Error ? error.message : "Database unavailable",
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
}
