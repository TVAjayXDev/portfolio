import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_COOKIE_NAME } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  const response = NextResponse.json({ success: true, redirect: "/admin/login" });
  response.cookies.delete(ACTIVITY_COOKIE_NAME);
  return response;
}

export async function GET() {
  const supabase = createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  const response = NextResponse.redirect(new URL("/admin/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
  response.cookies.delete(ACTIVITY_COOKIE_NAME);
  return response;
}
