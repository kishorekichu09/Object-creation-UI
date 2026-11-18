import React, { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ChevronDown, Info, Plus, Trash2, X } from "lucide-react";
import {
  type ConstraintMessage,
  type ConstraintMessageType,
  type CriteriaToken,
  type ObjectSettings,
  type SettingsFieldRef,
} from "../types/object-settings";
import { CriteriaBuilderModal, CriteriaSummaryCard } from "./criteria-builder";

const INPUT: React.CSSProperties = {
  width: "100%", background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border-strong)",
  borderRadius: 8, padding: "8px 11px", color: "var(--app-text-primary)", fontSize: 13, outline: "none",
  transition: "border-color 0.2s", fontFamily: "inherit",
};

const FIELD_LABEL: React.CSSProperties = {
  color: "var(--app-text-secondary)", fontSize: 11, marginBottom: 7,
};

const SECTION_TITLE: React.CSSProperties = {
  color: "var(--app-text-primary)",
  fontSize: 13,
  fontWeight: 600,
};

const BTN_OUTLINE: React.CSSProperties = {
  height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid var(--app-border)",
  background: "transparent", color: "var(--app-text-secondary)", cursor: "pointer",
  fontSize: 12, fontWeight: 550, fontFamily: "inherit",
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      style={{ width: 38, height: 20, borderRadius: 9999, position: "relative", flexShrink: 0, background: value ? "var(--app-accent)" : "var(--app-toggle-off)", border: "none", cursor: "pointer", transition: "background 0.2s" }}>
      <div style={{ position: "absolute", top: 2, left: value ? 19 : 2, width: 16, height: 16, borderRadius: "50%", background: "var(--app-text-on-accent)", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }} />
    </button>
  );
}

/** Hex colors only — appending alpha (`${color}66`) breaks with CSS variables */
const MESSAGE_TYPES: {
  id: ConstraintMessageType; label: string; color: string; Icon: React.ElementType; placeholder: string;
}[] = [
  {
    id: "information", label: "Information", color: "#60A5FA", Icon: Info,
    placeholder: "Shown when the constraint passes as information…",
  },
  {
    id: "warning", label: "Warning", color: "#F59E0B", Icon: AlertTriangle,
    placeholder: "Shown as a warning when this constraint applies…",
  },
  {
    id: "error", label: "Error", color: "#F87171", Icon: X,
    placeholder: "Shown as an error when the record cannot be saved…",
  },
];

function MessageSection({
  value,
  onChange,
}: {
  value: ConstraintMessage;
  onChange: (next: ConstraintMessage) => void;
}) {
  const active = value.activeType ?? "information";
  const activeMeta = MESSAGE_TYPES.find(t => t.id === active) ?? MESSAGE_TYPES[0];

  return (
    <div>
      <div style={{ ...SECTION_TITLE, marginBottom: 4 }}>Message</div>
      <div style={{ color: "var(--app-text-muted)", fontSize: 11, lineHeight: 1.4, marginBottom: 10 }}>
        Configure Information, Warning, and Error separately — each can have its own description.
      </div>

      <div style={FIELD_LABEL}>Message type</div>
      <div className="flex gap-2" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        {MESSAGE_TYPES.map(t => {
          const selected = active === t.id;
          const filled = Boolean(value[t.id]?.trim());
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ ...value, activeType: t.id })}
              className="flex items-center gap-2"
              style={{
                padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${selected ? `${t.color}66` : "var(--app-border)"}`,
                background: selected ? `${t.color}18` : "transparent",
                color: selected ? "var(--app-text-primary)" : "var(--app-text-secondary)",
                fontSize: 12, fontWeight: 600,
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: t.id === "warning" ? 3 : "50%",
                background: t.color, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <t.Icon size={10} style={{ color: "var(--app-text-on-accent)" }} />
              </div>
              {t.label}
              {filled && (
                <span
                  title="Description added"
                  style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: t.color, flexShrink: 0,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div style={FIELD_LABEL}>
        {activeMeta.label} description
      </div>
      <textarea
        style={{ ...INPUT, resize: "vertical", minHeight: 68 }}
        value={value[active] ?? ""}
        onChange={e => onChange({ ...value, [active]: e.target.value })}
        placeholder={activeMeta.placeholder}
        rows={3}
      />
    </div>
  );
}

function DeleteCriteriaConfirm({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center font-sans"
      style={{ background: "var(--app-overlay-blur)", backdropFilter: "blur(3px)" }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-criteria-title"
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(360px, calc(100% - 48px))",
          borderRadius: 14,
          background: "var(--app-shell-bg-floating)",
          border: "1px solid var(--app-border)",
          boxShadow: "var(--app-popup-shadow)",
          padding: "16px 16px 14px",
        }}
      >
        <div className="flex items-start gap-3" style={{ marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "var(--app-shell-bg-danger)",
            border: "1px solid var(--app-border-danger)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Trash2 size={16} style={{ color: "var(--app-text-danger)" }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div id="delete-criteria-title" style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
              Delete criteria?
            </div>
            <p style={{ margin: "6px 0 0", color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.5 }}>
              Are you sure you want to delete this criteria? You can create a new one later if needed.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} style={BTN_OUTLINE}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              ...BTN_OUTLINE,
              background: "var(--app-text-danger)",
              borderColor: "var(--app-text-danger)",
              color: "var(--app-text-on-accent)",
              fontWeight: 600,
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ToggleBlock({
  title,
  subtitle,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ paddingTop: 8 }}>
      <div className="flex items-center justify-between gap-3">
        <div style={{ minWidth: 0 }}>
          <div style={SECTION_TITLE}>{title}</div>
          <div style={{ color: "var(--app-text-muted)", fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>
            {subtitle}
          </div>
        </div>
        <Toggle value={enabled} onChange={onToggle} />
      </div>
      {enabled && children && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 16 }}>
          {children}
        </div>
      )}
    </div>
  );
}

export interface ConstraintsSettingsPanelProps {
  settings: ObjectSettings["constraints"];
  onChange: (next: ObjectSettings["constraints"]) => void;
  fields: SettingsFieldRef[];
}

export function ConstraintsSettingsPanel({ settings, onChange, fields }: ConstraintsSettingsPanelProps) {
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const patch = (partial: Partial<ObjectSettings["constraints"]>) => {
    onChange({ ...settings, ...partial });
  };

  const openCriteriaModal = () => setCriteriaModalOpen(true);

  const handleCriteriaToggle = (v: boolean) => {
    patch({ enableCriteria: v });
    if (v) {
      setCriteriaModalOpen(true);
    } else {
      setCriteriaModalOpen(false);
    }
  };

  const handleAddCriteria = (tokens: CriteriaToken[], expression: string) => {
    patch({ criteriaTokens: tokens, criteriaCondition: expression, enableCriteria: true });
    setCriteriaModalOpen(false);
  };

  const handleConfirmDeleteCriteria = () => {
    patch({ criteriaTokens: [], criteriaCondition: "" });
    setDeleteConfirmOpen(false);
  };

  const handleCloseModal = () => {
    setCriteriaModalOpen(false);
    if (!settings.criteriaTokens.length) {
      patch({ enableCriteria: false });
    }
  };

  const objectOptions = fields.length
    ? fields.map(f => ({ id: f.id, label: f.label }))
    : [
        { id: "obj_self", label: "Current Object" },
        { id: "obj_related", label: "Related Object" },
      ];

  const resultCountHint = (() => {
    const max = settings.resultCountMax.trim();
    const min = settings.resultCountMin.trim();
    if (max && min) return `Allow between ${min} and ${max} matching records.`;
    if (max) return `Only ${max} record${max === "1" ? "" : "s"} matching the criteria can exist.`;
    if (min) return `At least ${min} matching record${min === "1" ? "" : "s"} must exist.`;
    return "";
  })();

  const hasCriteria = settings.criteriaTokens.length > 0;

  return (
    <div
      className="obj-adv-nav-scroll"
      style={{
        flex: "1 1 0%",
        minHeight: 0,
        height: 0,
        overflowY: "auto",
        overflowX: "hidden",
        paddingRight: 14,
        paddingBottom: 32,
        scrollbarWidth: "thin",
        scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent",
        overscrollBehavior: "contain",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", maxWidth: "100%" }}>
        <div style={{ marginBottom: 12 }}>
          <div style={FIELD_LABEL}>
            Constraint name <span className="text-destructive">*</span>
          </div>
          <input style={INPUT}
            value={settings.constraintName}
            onChange={e => patch({ constraintName: e.target.value })}
            placeholder="Enter constraint name"
          />
        </div>

        <ToggleBlock
          title="Enable Criteria"
          subtitle="The record will be saved when the criteria are met"
          enabled={settings.enableCriteria}
          onToggle={handleCriteriaToggle}
        >
          {hasCriteria ? (
            <CriteriaSummaryCard
              tokens={settings.criteriaTokens}
              expression={settings.criteriaCondition}
              onEdit={openCriteriaModal}
              onDelete={() => setDeleteConfirmOpen(true)}
            />
          ) : (
            <button
              type="button"
              onClick={openCriteriaModal}
              className="flex items-center gap-1.5"
              style={{
                alignSelf: "flex-start",
                height: 30,
                padding: "0 11px",
                borderRadius: 7,
                border: "1px solid var(--app-border-accent)",
                background: "var(--app-shell-bg-accent)",
                color: "var(--app-text-accent-muted)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Plus size={13} /> Add criteria
            </button>
          )}

          <div style={{ height: 1, background: "var(--app-border-subtle)" }} />
          <MessageSection
            value={settings.criteriaMessage}
            onChange={msg => patch({ criteriaMessage: msg })}
          />
        </ToggleBlock>

        <ToggleBlock
          title="Enable Result Count"
          subtitle="The record will be saved when the result count is met"
          enabled={settings.enableResultCount}
          onToggle={v => patch({ enableResultCount: v })}
        >
          <div className="grid grid-cols-2 gap-4 items-start">
            <div>
              <div style={FIELD_LABEL}>Select Object</div>
              <div style={{ position: "relative" }}>
                <select
                  value={settings.resultCountObject}
                  onChange={e => patch({ resultCountObject: e.target.value })}
                  style={{
                    ...INPUT, cursor: "pointer", appearance: "none",
                    WebkitAppearance: "none", MozAppearance: "none", paddingRight: 36,
                    height: 38, boxSizing: "border-box",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--app-accent)")}
                  onBlur={e => (e.target.style.borderColor = "var(--app-border-strong)")}
                >
                  <option value="">Select Object</option>
                  {objectOptions.map(o => (
                    <option key={o.id} value={o.label}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  color: "var(--app-text-secondary)", pointerEvents: "none",
                }} />
              </div>
            </div>
            <div>
              <div style={FIELD_LABEL}>Count</div>
              <div className="flex gap-3">
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    value={settings.resultCountMin}
                    onChange={e => patch({ resultCountMin: e.target.value })}
                    placeholder="Min"
                    title="Min Value"
                    style={{ ...INPUT, height: 38, boxSizing: "border-box" }}
                    onFocus={e => (e.target.style.borderColor = "var(--app-accent)")}
                    onBlur={e => (e.target.style.borderColor = "var(--app-border-strong)")}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    value={settings.resultCountMax}
                    onChange={e => patch({ resultCountMax: e.target.value })}
                    placeholder="Max"
                    title="Max Value"
                    style={{ ...INPUT, height: 38, boxSizing: "border-box" }}
                    onFocus={e => (e.target.style.borderColor = "var(--app-accent)")}
                    onBlur={e => (e.target.style.borderColor = "var(--app-border-strong)")}
                  />
                </div>
              </div>
              <div className="flex gap-3" style={{ marginTop: 6 }}>
                <div style={{ flex: 1, color: "var(--app-text-muted)", fontSize: 10 }}>Min</div>
                <div style={{ flex: 1, color: "var(--app-text-muted)", fontSize: 10 }}>Max</div>
              </div>
            </div>
          </div>
          {resultCountHint && (
            <div style={{ color: "var(--app-text-muted)", fontSize: 11, lineHeight: 1.45, marginTop: -8 }}>
              {resultCountHint}
            </div>
          )}
          <div style={{ height: 1, background: "var(--app-border-subtle)" }} />
          <MessageSection
            value={settings.resultCountMessage}
            onChange={msg => patch({ resultCountMessage: msg })}
          />
        </ToggleBlock>
      </div>

      <CriteriaBuilderModal
        open={criteriaModalOpen}
        fields={fields}
        initialTokens={settings.criteriaTokens}
        onClose={handleCloseModal}
        onAdd={handleAddCriteria}
      />

      <DeleteCriteriaConfirm
        open={deleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeleteCriteria}
      />
    </div>
  );
}
