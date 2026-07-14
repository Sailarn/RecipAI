"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FolderPlus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { generateId } from "@/lib/utils";
import { SectionContainer } from "./instructions-section/section-container";
import {
  moveStepToDropTarget,
  moveStepToStep,
  orderStepIds,
  removeStepSection,
} from "./instructions-section/state";
import { StepCard } from "./instructions-section/step-card";
import type { InstructionSectionState } from "./instructions-section/types";
import type { RecipeFormData } from "./schema";

interface InstructionsSectionProps {
  register: UseFormRegister<RecipeFormData>;
  control: Control<RecipeFormData>;
  errors: FieldErrors<RecipeFormData>;
  setValue: UseFormSetValue<RecipeFormData>;
  onStepFileSelect: (stepId: string, file: File | null) => void;
}

interface InstructionFieldIdentity {
  rowId?: string;
  fieldId: string;
}

function instructionRowId(field: InstructionFieldIdentity): string {
  return field.rowId ?? field.fieldId;
}

function DropTarget({ id }: { id: string }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="min-h-3 rounded border border-dashed border-[rgba(255,200,100,0.25)]"
    />
  );
}

function groupStepIds(state: InstructionSectionState, sectionId?: string) {
  return state.stepIds.filter(
    (stepId) => state.sectionIdByStepId[stepId] === sectionId,
  );
}

export function InstructionsSection({
  register,
  control,
  errors,
  setValue,
  onStepFileSelect,
}: InstructionsSectionProps) {
  const t = useTranslations("recipeForm");
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "instructions",
    keyName: "fieldId",
  });
  const formSections = useWatch({ control, name: "sections" }) ?? [];
  const ingredients = useWatch({ control, name: "ingredients" }) ?? [];
  const ingredientSectionIds = useMemo(
    () =>
      new Set(
        ingredients
          .map((ingredient) => ingredient.sectionId)
          .filter((sectionId): sectionId is string => Boolean(sectionId)),
      ),
    [ingredients],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [state, setState] = useState<InstructionSectionState>(() => {
    const sectionIdByStepId = Object.fromEntries(
      fields.map((field) => [
        instructionRowId(field),
        field.sectionId ?? undefined,
      ]),
    );
    const seeded = {
      sections: formSections,
      stepIds: fields.map(instructionRowId),
      sectionIdByStepId,
    };
    return {
      ...seeded,
      stepIds: orderStepIds(seeded, sectionIdByStepId, seeded.stepIds),
    };
  });
  const [editingSectionId, setEditingSectionId] = useState<string>();
  const [expandedStepIds, setExpandedStepIds] = useState<string[]>([]);
  const fieldsById = useMemo(
    () =>
      new Map(
        fields.map((field, index) => [
          instructionRowId(field),
          { field, index },
        ]),
      ),
    [fields],
  );

  useEffect(() => {
    const order = state.stepIds;
    const current = fields.map(instructionRowId);
    order.forEach((stepId, targetIndex) => {
      const currentIndex = current.indexOf(stepId);
      if (currentIndex !== targetIndex) {
        move(currentIndex, targetIndex);
        current.splice(currentIndex, 1);
        current.splice(targetIndex, 0, stepId);
      }
    });
  }, [fields, move, state.stepIds]);

  function updateState(next: InstructionSectionState) {
    setState(next);
    setValue("sections", next.sections, { shouldDirty: true });
    for (const [index, field] of fields.entries()) {
      setValue(
        `instructions.${index}.sectionId`,
        next.sectionIdByStepId[instructionRowId(field)] ?? null,
        { shouldDirty: true },
      );
    }
  }
  function orderedState(
    sectionIdByStepId: InstructionSectionState["sectionIdByStepId"],
    sections = state.sections,
    stepIds = state.stepIds,
  ) {
    return {
      sections,
      stepIds: orderStepIds({ ...state, sections }, sectionIdByStepId, stepIds),
      sectionIdByStepId,
    };
  }
  function addSection() {
    const section = {
      id: generateId(),
      name: t("newSection"),
      order: state.sections.length,
    };
    updateState(
      orderedState(state.sectionIdByStepId, [...state.sections, section]),
    );
    setEditingSectionId(section.id);
  }
  function renameSection(sectionId: string, name: string) {
    const trimmed = name.trim();
    updateState({
      ...state,
      sections: state.sections.map((section) =>
        section.id === sectionId
          ? { ...section, name: trimmed || t("newSection") }
          : section,
      ),
    });
    setEditingSectionId(undefined);
  }
  function deleteSection(sectionId: string) {
    updateState(removeStepSection(state, sectionId, ingredientSectionIds));
  }
  function removeStep(stepId: string) {
    const index = fieldsById.get(stepId)?.index;
    if (index === undefined) return;
    remove(index);
    const { [stepId]: _, ...sectionIdByStepId } = state.sectionIdByStepId;
    updateState({
      ...state,
      stepIds: state.stepIds.filter((id) => id !== stepId),
      sectionIdByStepId,
    });
  }
  function addStep(sectionId?: string) {
    const rowId = generateId();
    const sectionIdByStepId = {
      ...state.sectionIdByStepId,
      [rowId]: sectionId,
    };
    append({
      rowId,
      instruction: "",
      imageUrl: "",
      sectionId: sectionId ?? null,
    });
    updateState(
      orderedState(sectionIdByStepId, state.sections, [
        ...state.stepIds,
        rowId,
      ]),
    );
  }
  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : undefined;
    if (!overId || activeId === overId) return;
    updateState(
      overId.startsWith("drop-")
        ? moveStepToDropTarget(
            state,
            activeId,
            overId.replace("drop-", "") || undefined,
          )
        : moveStepToStep(state, activeId, overId),
    );
  }
  const visibleSections = state.sections.filter(
    (section) =>
      groupStepIds(state, section.id).length > 0 ||
      !ingredientSectionIds.has(section.id),
  );
  const hasSections = visibleSections.length > 0;
  const renderSteps = (stepIds: string[], compact = false) => (
    <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
      {stepIds.map((stepId) => {
        const entry = fieldsById.get(stepId);
        return entry ? (
          <StepCard
            key={stepId}
            stepId={stepId}
            index={entry.index}
            totalSteps={fields.length}
            imageUrl={entry.field.imageUrl}
            error={Boolean(errors.instructions?.[entry.index]?.instruction)}
            register={register}
            setValue={setValue}
            onRemove={() => removeStep(stepId)}
            onStepFileSelect={onStepFileSelect}
            compact={compact}
            isDetailsExpanded={expandedStepIds.includes(stepId)}
            onToggleDetails={() =>
              setExpandedStepIds((current) =>
                current.includes(stepId)
                  ? current.filter((id) => id !== stepId)
                  : [...current, stepId],
              )
            }
          />
        ) : null;
      })}
    </SortableContext>
  );
  return (
    <div>
      <p className="mb-4 text-[12px] leading-[1.6] text-[var(--fg-2)]">
        {t("stepHintText")}
      </p>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-3">
          {hasSections
            ? visibleSections.map((section) => (
                <SectionContainer
                  key={section.id}
                  section={section}
                  stepCountLabel={t("stepCount", {
                    count: groupStepIds(state, section.id).length,
                  })}
                  isEditing={editingSectionId === section.id}
                  onRename={(name) => renameSection(section.id, name)}
                  onRenameRequest={() => setEditingSectionId(section.id)}
                  onDelete={() => deleteSection(section.id)}
                  sectionNamePlaceholder={t("sectionNamePlaceholder")}
                  toggleLabel={t("toggleSection")}
                  renameLabel={t("renameSection")}
                  deleteLabel={t("deleteSection")}
                >
                  {renderSteps(groupStepIds(state, section.id), true)}
                  <DropTarget id={`drop-${section.id}`} />
                  <button
                    type="button"
                    onClick={() => addStep(section.id)}
                    className="text-left text-[12px] text-[var(--fg-3)]"
                  >
                    {t("addStepHere")}
                  </button>
                </SectionContainer>
              ))
            : renderSteps(state.stepIds)}
          {hasSections && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase text-[var(--fg-3)]">
                {t("ungrouped")}
              </p>
              {renderSteps(groupStepIds(state))}
              <DropTarget id="drop-" />
            </div>
          )}
        </div>
      </DndContext>
      {errors.instructions && (
        <p className="mt-1 pl-[2px] text-[11px] text-[rgba(239,68,68,0.85)]">
          {errors.instructions.message}
        </p>
      )}
      <button
        type="button"
        onClick={() => addStep()}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-[14px] border border-dashed border-[rgba(255,200,100,0.25)] p-[10px] text-[13px] text-[var(--fg-2)]"
      >
        <Plus size={14} />
        {t("addStep")}
      </button>
      <button
        type="button"
        onClick={addSection}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-[14px] border border-dashed border-[rgba(255,180,60,0.4)] p-[10px] text-[13px] text-[var(--fg-2)]"
      >
        <FolderPlus size={14} />
        {t(hasSections ? "newSection" : "splitIntoSections")}
      </button>
    </div>
  );
}
