import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyIsAdmin, ACTIVITY_COOKIE_NAME } from "@/lib/auth/admin";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export async function GET() {
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Check inactivity timeout
  const cookieStore = cookies();
  const lastActivityStr = cookieStore.get(ACTIVITY_COOKIE_NAME)?.value;
  if (lastActivityStr) {
    const lastActivity = parseInt(lastActivityStr, 10);
    if (!isNaN(lastActivity) && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Session expired due to inactivity" },
        { status: 401 }
      );
    }
  }

  // 2. Check is_admin() database function
  const isAdmin = await verifyIsAdmin(supabase);
  if (!isAdmin) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Forbidden - Administrator privilege required" },
      { status: 403 }
    );
  }

  // 3. Query real counts directly from database using user session (RLS applies)
  try {
    const [
      projectsRes,
      skillsRes,
      educationRes,
      experienceRes,
      certificationsRes,
      postsRes,
      messagesRes,
      unreadMessagesRes,
    ] = await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("skills").select("id", { count: "exact", head: true }),
      supabase.from("education").select("id", { count: "exact", head: true }),
      supabase.from("experience").select("id", { count: "exact", head: true }),
      supabase.from("certifications").select("id", { count: "exact", head: true }),
      supabase.from("posts").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("is_read", false),
    ]);

    return NextResponse.json({
      counts: {
        projects: projectsRes.count ?? 0,
        skills: skillsRes.count ?? 0,
        education: educationRes.count ?? 0,
        experience: experienceRes.count ?? 0,
        certifications: certificationsRes.count ?? 0,
        posts: postsRes.count ?? 0,
        totalMessages: messagesRes.count ?? 0,
        unreadMessages: unreadMessagesRes.count ?? 0,
      },
    });
  } catch (err) {
    console.error("[API ERROR] Error querying admin overview counts:", err);
    return NextResponse.json(
      { error: "Failed to query database statistics" },
      { status: 500 }
    );
  }
}
