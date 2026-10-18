"use server";

import { requireAdmin } from "@/lib/auth/admin";
import type { ActionResult } from "./settings";

/**
 * Toggles the read status of a contact message.
 * Strictly uses the authenticated admin session (RLS enforced). Never uses service-role key.
 */
export async function toggleMessageRead(
  id: string,
  isRead: boolean
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("messages")
      .update({ is_read: isRead })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: `Message marked as ${isRead ? "read" : "unread"}.`,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Toggles the archived status of a contact message.
 */
export async function toggleMessageArchive(
  id: string,
  isArchived: boolean
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("messages")
      .update({ is_archived: isArchived })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: `Message ${isArchived ? "archived" : "unarchived"}.`,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Permanently deletes a message.
 */
export async function deleteMessage(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("messages").delete().eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "Message deleted successfully." };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
