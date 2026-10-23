import { NextResponse } from "next/server";
import { AuthorizationError, getOwnerForApi } from "@/server/auth/session";
import { createLiveCheckInQr } from "@/server/services/live-qr";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await getOwnerForApi();
    const qr = await createLiveCheckInQr(auth.gym.id);
    return NextResponse.json(
      { ok: true, ...qr },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("[fitos-live-qr]", error);
    return NextResponse.json(
      { ok: false, message: "Could not refresh the check-in code." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
