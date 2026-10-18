import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Supabase Free Tier Keep-Alive Endpoint
 * Pinned via Vercel Cron or GitHub Action once daily to prevent automatic
 * project pausing after 7 days of inactivity.
 *
 * Requirements:
 * - Method: GET
 * - Authorization: Bearer <CRON_SECRET>
 * - Trivial read: reads a single id from site_settings
 * - Response: { ok: true } (zero leaked data)
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = createPublicClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database client configuration missing" },
      { status: 500 }
    );
  }

  const { error } = await supabase
    .from("site_settings")
    .select("id")
    .limit(1)
    .single();

  if (error) {
    console.error("[KEEPALIVE PING ERROR]:", error.message);
    return NextResponse.json(
      { error: "Keepalive operation failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
