import React from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { Mail } from "lucide-react";
import {
  MessagesManager,
  type ContactMessageRecord,
} from "@/components/admin/MessagesManager";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const { supabase } = await requireAdmin();

  const { data: dbMessages } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  const initialMessages: ContactMessageRecord[] = (
    (dbMessages || []) as ContactMessageRecord[]
  ).map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    subject: m.subject || null,
    message: m.message,
    is_read: Boolean(m.is_read),
    is_archived: Boolean(m.is_archived),
    created_at: m.created_at,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-surface-tint" />
          <h1 className="font-display text-2xl font-bold text-on-surface">Messages Inbox</h1>
        </div>
        <p className="font-body text-xs text-on-surface-variant">
          Inquiries and contact submissions sent from your portfolio contact form.
        </p>
      </div>

      <MessagesManager initialMessages={initialMessages} />
    </div>
  );
}
