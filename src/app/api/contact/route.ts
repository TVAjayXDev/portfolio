import { NextRequest, NextResponse } from "next/server";
import { processContactSubmission } from "@/lib/contact";

export const dynamic = "force-dynamic";

/**
 * Handles contact form submissions via POST /api/contact.
 * Delegates core processing to processContactSubmission in src/lib/contact.ts.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      undefined;

    const result = await processContactSubmission(body, rawIp);
    return NextResponse.json(result.data, { status: result.status });
  } catch (err) {
    console.error("[CONTACT ROUTE EXCEPTION]:", (err as Error).name || "UnhandledError");
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
