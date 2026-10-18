"use client";

import React, { useState } from "react";
import {
  Mail,
  MailOpen,
  Archive,
  ArchiveRestore,
  Trash2,
  Reply,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  Inbox,
} from "lucide-react";
import {
  toggleMessageRead,
  toggleMessageArchive,
  deleteMessage,
} from "@/app/admin/actions/messages";

export interface ContactMessageRecord {
  id: string;
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
}

interface MessagesManagerProps {
  initialMessages: ContactMessageRecord[];
}

export const MessagesManager: React.FC<MessagesManagerProps> = ({
  initialMessages,
}) => {
  const [messages, setMessages] =
    useState<ContactMessageRecord[]>(initialMessages);
  const [selectedMessage, setSelectedMessage] =
    useState<ContactMessageRecord | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "archived">("all");

  // Delete modal state
  const [deleteTarget, setDeleteTarget] =
    useState<ContactMessageRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleToggleRead = async (msg: ContactMessageRecord) => {
    const nextReadState = !msg.is_read;
    const result = await toggleMessageRead(msg.id, nextReadState);
    if (result.success) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_read: nextReadState } : m))
      );
      if (selectedMessage?.id === msg.id) {
        setSelectedMessage({ ...selectedMessage, is_read: nextReadState });
      }
      showToast(result.message || `Message marked as ${nextReadState ? "read" : "unread"}.`);
    } else {
      showToast(result.error, true);
    }
  };

  const handleToggleArchive = async (msg: ContactMessageRecord) => {
    const nextArchiveState = !msg.is_archived;
    const result = await toggleMessageArchive(msg.id, nextArchiveState);
    if (result.success) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_archived: nextArchiveState } : m))
      );
      if (selectedMessage?.id === msg.id) {
        setSelectedMessage({ ...selectedMessage, is_archived: nextArchiveState });
      }
      showToast(result.message || `Message ${nextArchiveState ? "archived" : "unarchived"}.`);
    } else {
      showToast(result.error, true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    const result = await deleteMessage(deleteTarget.id);
    setDeleting(false);

    if (result.success) {
      setMessages((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      if (selectedMessage?.id === deleteTarget.id) {
        setSelectedMessage(null);
      }
      showToast("Message deleted permanently.");
      setDeleteTarget(null);
    } else {
      showToast(result.error, true);
    }
  };

  // Sort: Unread first, then chronological descending
  const sortedMessages = [...messages].sort((a, b) => {
    if (!a.is_read && b.is_read) return -1;
    if (a.is_read && !b.is_read) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Filter
  const filteredMessages = sortedMessages.filter((m) => {
    if (filter === "unread") return !m.is_read && !m.is_archived;
    if (filter === "archived") return m.is_archived;
    return !m.is_archived; // "all" shows active unarchived
  });

  const unreadCount = messages.filter((m) => !m.is_read && !m.is_archived).length;
  const archivedCount = messages.filter((m) => m.is_archived).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-outline-variant sticky top-20 z-20 backdrop-blur-md bg-opacity-95 shadow-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs transition-colors flex items-center gap-2 ${
              filter === "all"
                ? "bg-surface-tint text-black font-semibold shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Inbox ({messages.filter((m) => !m.is_archived).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs transition-colors flex items-center gap-2 ${
              filter === "unread"
                ? "bg-surface-tint text-black font-semibold shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Unread ({unreadCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("archived")}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs transition-colors flex items-center gap-2 ${
              filter === "archived"
                ? "bg-surface-tint text-black font-semibold shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived ({archivedCount})</span>
          </button>
        </div>

        <span className="font-mono text-xs text-outline">
          Showing {filteredMessages.length} of {messages.length} total messages
        </span>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-surface-tint/10 border border-surface-tint/40 flex items-center gap-3 text-xs text-surface-tint font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-error-container/20 border border-error/40 flex items-center gap-3 text-xs text-error font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Inbox View: Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Messages List (Left Column) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {filteredMessages.length === 0 ? (
            <div className="p-10 rounded-2xl bg-surface-container-low border border-outline-variant text-center flex flex-col items-center justify-center gap-2">
              <Mail className="w-8 h-8 text-outline" />
              <span className="font-mono text-xs text-outline uppercase tracking-wider mt-2">
                No Messages
              </span>
              <p className="font-body text-xs text-on-surface-variant">
                {filter === "unread"
                  ? "You have zero unread messages."
                  : filter === "archived"
                  ? "No archived messages found."
                  : "No contact submissions received yet."}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isSelected = selectedMessage?.id === msg.id;
              const formattedDate = new Date(msg.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg);
                    if (!msg.is_read) {
                      handleToggleRead(msg);
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                    isSelected
                      ? "bg-surface-container border-surface-tint/60 shadow-sm"
                      : !msg.is_read
                      ? "bg-surface-container-low border-surface-tint/40 hover:border-surface-tint"
                      : "bg-surface-container-low/60 border-outline-variant hover:border-outline"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {!msg.is_read && (
                        <span className="w-2 h-2 rounded-full bg-surface-tint shrink-0" />
                      )}
                      <span className="font-display font-bold text-sm text-on-surface truncate">
                        {msg.name}
                      </span>
                    </div>

                    <span className="font-mono text-[10px] text-outline shrink-0">
                      {formattedDate}
                    </span>
                  </div>

                  <p className="font-mono text-xs text-surface-tint truncate">
                    {msg.subject || "(No subject provided)"}
                  </p>

                  <p className="font-body text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Message Reader (Right Column) */}
        <div className="lg:col-span-7">
          {selectedMessage ? (
            <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col gap-6 sticky top-28 shadow-lg">
              {/* Message Header */}
              <div className="flex flex-col gap-3 pb-5 border-b border-outline-variant">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <h2 className="font-display text-lg font-bold text-on-surface">
                      {selectedMessage.subject || "(No Subject)"}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-body text-xs font-semibold text-on-surface">
                        From: {selectedMessage.name}
                      </span>
                      <span className="text-outline text-xs">&lt;{selectedMessage.email}&gt;</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMessage(null)}
                    className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-outline pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-surface-tint" />
                    <span>
                      {new Date(selectedMessage.created_at).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                      selectedMessage.is_read
                        ? "bg-surface-container text-outline border-outline-variant"
                        : "bg-surface-tint/20 text-surface-tint border-surface-tint/40"
                    }`}
                  >
                    {selectedMessage.is_read ? "Read" : "Unread"}
                  </span>
                </div>
              </div>

              {/* Message Body: Strictly Plain Text (Zero HTML Execution) */}
              <div className="p-4 rounded-xl bg-surface-container border border-outline-variant">
                <pre className="font-body text-sm text-on-surface leading-relaxed whitespace-pre-wrap break-words font-sans">
                  {selectedMessage.message}
                </pre>
              </div>

              {/* Message Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleRead(selectedMessage)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-tint text-xs font-mono text-on-surface transition-colors"
                  >
                    {selectedMessage.is_read ? (
                      <>
                        <Mail className="w-3.5 h-3.5 text-surface-tint" />
                        <span>Mark Unread</span>
                      </>
                    ) : (
                      <>
                        <MailOpen className="w-3.5 h-3.5 text-surface-tint" />
                        <span>Mark Read</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleArchive(selectedMessage)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-tint text-xs font-mono text-on-surface transition-colors"
                  >
                    {selectedMessage.is_archived ? (
                      <>
                        <ArchiveRestore className="w-3.5 h-3.5 text-surface-tint" />
                        <span>Unarchive</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5 text-surface-tint" />
                        <span>Archive</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(selectedMessage)}
                    className="p-2 rounded-xl bg-surface-container border border-outline-variant hover:border-error/60 text-outline hover:text-error transition-colors"
                    title="Delete Message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Mailto Reply Button */}
                <a
                  href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent(
                    `Re: ${selectedMessage.subject || "Message from T V Ajay Portfolio"}`
                  )}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-tint text-black font-display text-xs font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg transition-all"
                >
                  <Reply className="w-4 h-4" />
                  <span>Reply via Email</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="p-16 rounded-2xl bg-surface-container-low border border-dashed border-outline-variant text-center flex flex-col items-center justify-center gap-3">
              <Mail className="w-8 h-8 text-outline" />
              <span className="font-mono text-xs text-outline uppercase tracking-wider">
                No Message Selected
              </span>
              <p className="font-body text-xs text-on-surface-variant max-w-xs">
                Select any message from the list on the left to read its full body and reply.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-2xl p-6 flex flex-col gap-4">
            <h3 className="font-display text-base font-bold text-on-surface">
              Delete Message?
            </h3>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to permanently delete the message from{" "}
              <strong className="text-on-surface font-mono">{deleteTarget.name}</strong> (
              {deleteTarget.email})? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-outline hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-error text-on-error font-display text-xs font-semibold hover:bg-error/90 transition-all"
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
