"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { updateSectionsOrder } from "@/app/admin/actions/sections";
import type { SectionItemInput } from "@/lib/validations/admin";

interface SectionOrderManagerProps {
  initialSections: SectionItemInput[];
}

interface SortableSectionRowProps {
  section: SectionItemInput;
  index: number;
  onUpdate: (updated: SectionItemInput) => void;
}

const SortableSectionRow: React.FC<SortableSectionRowProps> = ({
  section,
  index,
  onUpdate,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDragging
          ? "bg-surface-container-high border-surface-tint shadow-lg z-30 opacity-90 scale-[1.01]"
          : "bg-surface-container-low border-outline-variant hover:border-outline"
      }`}
    >
      {/* Left: Drag Handle & Order Badge & Section Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${section.title}`}
          className="p-1.5 rounded-lg text-outline hover:text-surface-tint hover:bg-surface-container-high transition-colors cursor-grab active:cursor-grabbing focus:outline-none focus:ring-1 focus:ring-surface-tint"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <span className="w-6 h-6 rounded-md bg-surface-container-high border border-outline-variant flex items-center justify-center font-mono text-xs text-on-surface-variant font-bold shrink-0">
          {index + 1}
        </span>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-outline mb-1">
              Title ({section.id})
            </label>
            <input
              type="text"
              value={section.title}
              onChange={(e) => onUpdate({ ...section, title: e.target.value })}
              className="w-full h-9 px-3 rounded-lg bg-surface-container border border-outline-variant text-sm font-display font-medium text-on-surface focus:border-surface-tint focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-outline mb-1">
              Subtitle / Caption
            </label>
            <input
              type="text"
              value={section.subtitle || ""}
              placeholder="Section narrative subtitle..."
              onChange={(e) =>
                onUpdate({ ...section, subtitle: e.target.value || null })
              }
              className="w-full h-9 px-3 rounded-lg bg-surface-container border border-outline-variant text-xs font-body text-on-surface-variant focus:border-surface-tint focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Right: Visibility Toggle Button */}
      <div className="flex items-center justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-outline-variant/60">
        <button
          type="button"
          onClick={() => onUpdate({ ...section, is_visible: !section.is_visible })}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            section.is_visible
              ? "bg-surface-tint/10 text-surface-tint border border-surface-tint/30 hover:bg-surface-tint/20"
              : "bg-surface-container text-outline border border-outline-variant hover:text-on-surface-variant"
          }`}
        >
          {section.is_visible ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Visible</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hidden</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export const SectionOrderManager: React.FC<SectionOrderManagerProps> = ({
  initialSections,
}) => {
  const [sections, setSections] = useState<SectionItemInput[]>(initialSections);
  const [initialState] = useState<SectionItemInput[]>(initialSections);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isDirty = JSON.stringify(sections) !== JSON.stringify(initialState);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, idx) => ({
          ...item,
          sort_order: (idx + 1) * 10,
        }));
      });
    }
  };

  const handleUpdateSection = (updated: SectionItemInput) => {
    setSections((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  const handleReset = () => {
    setSections(initialState);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const orderedPayload = sections.map((item, idx) => ({
      ...item,
      sort_order: (idx + 1) * 10,
    }));

    const result = await updateSectionsOrder(orderedPayload);
    setLoading(false);

    if (result.success) {
      setSuccessMessage(result.message || "Section order and visibility updated.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Sticky Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-outline-variant sticky top-20 z-20 backdrop-blur-md bg-opacity-95 shadow-md">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-sm text-on-surface">
            Display Order ({sections.length} Sections)
          </span>
          {isDirty && (
            <span className="px-2.5 py-0.5 rounded-full bg-tertiary/20 text-tertiary text-[10px] font-mono font-semibold animate-pulse">
              Unsaved Changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant hover:border-outline text-xs font-mono text-outline hover:text-on-surface transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-surface-tint text-black font-display text-xs font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Section Order</span>
          </button>
        </div>
      </div>

      {/* Messages */}
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

      {/* Instruction hint */}
      <p className="font-body text-xs text-on-surface-variant">
        Drag and drop rows using the handles to reorder sections. Use the toggle to hide or show sections on the public site. Changes apply immediately upon saving.
      </p>

      {/* Sortable List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {sections.map((section, index) => (
              <SortableSectionRow
                key={section.id}
                section={section}
                index={index}
                onUpdate={handleUpdateSection}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
