import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminLayoutShell } from "@/components/admin/AdminLayoutShell";

export const metadata: Metadata = {
  title: "Admin Console | T V Ajay",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let unreadCount = 0;
  try {
    const supabase = createClient();
    if (supabase) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false)
        .eq("is_archived", false);
      unreadCount = count ?? 0;
    }
  } catch {
    // If not authenticated or on login screen, unreadCount gracefully falls back to 0
  }

  return (
    <AdminLayoutShell unreadMessagesCount={unreadCount}>
      {children}
    </AdminLayoutShell>
  );
}
