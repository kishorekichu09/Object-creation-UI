import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import {
  mergeObjectSettings,
  collectSettingsBlockers,
  getSuggestedSettings,
  suggestPlural,
  type ObjectSettings,
  type ObjAdvSection,
} from "../types/object-settings";
import { ObjectAdvancedPanel, OBJ_ADV_NAV, OBJ_ADV_NAV_GROUPS, OBJ_ADV_SECTION_DESC, isObjAdvSectionConfigured, OBJ_ADV_NAV_WIDTH, OBJ_ADV_NAV_ICON_INSET } from "./object-advanced-panel";
import { useDrag, useDrop } from "react-dnd";
import {
  X, ArrowLeft, Plus, Trash2, GripVertical, ChevronRight, ChevronDown,
  Check, CheckCircle2, AlignLeft, Hash, Calendar, ListFilter,
  DollarSign, Clock, Type, Lock, Star, Search, RotateCcw,
  GitBranch, Zap, Pencil, Layers, Settings2, Phone, Link, CheckSquare,
  Image as ImageIcon, MapPin, Bookmark, CircleDot, Binary,
  ToggleLeft, Braces, CaseSensitive, FunctionSquare, FileCheck, AtSign,
  ArrowDownAZ, ArrowUpAZ, Group,
} from "lucide-react";










const MIN_OBJECT_FIELDS = 2;
const MAX_PROMINENT_FIELDS = 5;
const PRIMARY_FIELD_ID = "__primary_field__";

/** Field-tracking glyph — open zigzag path with nodes (less congested than filled rings). */
function FieldTrackingIcon({ size = 14, color = "var(--app-text-muted)", active = false }: {
  size?: number; color?: string; active?: boolean;
}) {
  const stroke = color;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M3 14.5 L7 6.5 L12 13 L17 5.5"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="3" cy="14.5" r="1.6" fill={stroke} />
      {/* Highlighted peak node — ring + center */}
      <circle cx="7" cy="6.5" r="2.6" stroke={stroke} strokeWidth="1.35" fill={active ? `${stroke}22` : "none"} />
      <circle cx="7" cy="6.5" r="1.15" fill={stroke} />
      <circle cx="12" cy="13" r="1.6" fill={stroke} />
      <circle cx="17" cy="5.5" r="1.6" fill={stroke} />
    </svg>
  );
}

// â”€â”€â”€ TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface PanelPreviewNode {
  id: string; type: "object" | "field" | "layout";
  label: string; fieldType?: string; required?: boolean;
  parentId?: string; isPreview: boolean;
}
export interface PanelPreviewEdge {
  id: string; from: string; to: string; type: "obj-field" | "obj-obj";
}
export interface WizardEditField {
  id?: string;
  label: string;
  fieldType: string;
  required?: boolean;
  starred?: boolean;
  tracked?: boolean;
  isPrimary?: boolean;
  relatedObjectId?: string;
}

export interface WizardObjectOption {
  id: string;
  label: string;
  apiName?: string;
}

export interface WizardEditInitial {
  /** Present only when editing an existing graph object. */
  editId?: string;
  name: string;
  title?: string;
  description?: string;
  objectType?: string;
  fields: WizardEditField[];
  objectSettings?: ObjectSettings;
  openSettings?: boolean;
}

/** Draft payload when the wizard is used inside the Use Template suite flow. */
export interface WizardDraftPayload {
  name: string;
  title: string;
  description: string;
  objectType: string;
  priFieldType: string;
  objectSettings: ObjectSettings;
  fields: Array<{
    label: string;
    fieldType: string;
    required: boolean;
    starred: boolean;
    tracked: boolean;
    isPrimary: boolean;
    relatedObjectId?: string;
  }>;
}

export interface CreateObjectWizardProps {
  onClose: () => void;
  onObjectCreated?: (obj: any) => void;
  onPreviewChange?: (nodes: PanelPreviewNode[], edges: PanelPreviewEdge[]) => void;
  /** When set, wizard opens prefilled to edit an existing object (both steps). */
  editInitial?: WizardEditInitial | null;
  /** API names already used by other objects (for uniqueness validation). */
  existingApiNames?: string[];
  /** Existing graph objects available for Lookup / Master Details fields. */
  availableObjects?: WizardObjectOption[];
  /**
   * Template-suite mode only: save draft back to the parent instead of deploying.
   * Blank Build Manually and graph edit paths must omit this.
   */
  onSaveDraft?: (draft: WizardDraftPayload) => void;
  draftSaveLabel?: string;
}

type WizardStep    = "step1" | "step2" | "step3" | "deployReview";
type ObjectType    = "Normal" | "Assignment" | "Collection" | "Questionnaire";
type PrimaryFType  = "Text" | "Auto number";
type AdvTabKey     = "lead" | "event";

const OBJECT_TYPE_META: Record<ObjectType, { title: string; desc: string }> = {
  Normal: { title: "Normal", desc: "Standard business object with records and layouts." },
  Assignment: { title: "Assignment", desc: "Routes records to owners or teams automatically." },
  Collection: { title: "Collection", desc: "Groups related records under a parent container." },
  Questionnaire: { title: "Questionnaire", desc: "Survey-style multi-step data capture." },
};

function WizardStepIndicator({
  current,
  maxReachable = 1,
  onSelect,
  freeNavigate = false,
}: {
  current: 1 | 2 | 3;
  maxReachable?: 1 | 2 | 3;
  onSelect?: (step: 1 | 2 | 3) => void;
  /** Template customize: all steps are open tabs — click any to jump */
  freeNavigate?: boolean;
}) {
  const steps = [
    { n: 1 as const, label: "Object info", short: "Info" },
    { n: 2 as const, label: "Field configurations", short: "Fields" },
    { n: 3 as const, label: "Advanced settings", short: "Advanced" },
  ];

  if (freeNavigate) {
    return (
      <div
        className="flex"
        role="tablist"
        aria-label="Customize steps — click to move between Info, Fields, and Advanced"
        style={{
          padding: 0,
          borderRadius: 999,
          background: "color-mix(in srgb, var(--app-shell-bg-subtle) 88%, var(--app-border))",
          border: "1px solid var(--app-border)",
          boxShadow: "0 1px 2px color-mix(in srgb, var(--app-text-primary) 6%, transparent)",
          gap: 0,
          alignItems: "stretch",
          justifyContent: "flex-start",
          overflow: "visible",
          boxSizing: "border-box",
        }}
      >
        {steps.map((s, i) => {
          const active = current === s.n;
          const isFirst = i === 0;
          const isLast = i === steps.length - 1;
          return (
            <button
              key={s.n}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect?.(s.n)}
              aria-label={`${s.label}${active ? " (current)" : " — switch to this step"}`}
              title={s.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                borderRadius: 999,
                border: active
                  ? "1px solid color-mix(in srgb, var(--app-accent) 28%, var(--app-border))"
                  : "1px solid transparent",
                cursor: active ? "default" : "pointer",
                background: active
                  ? "color-mix(in srgb, var(--app-accent) 18%, var(--app-shell-bg-elevated))"
                  : "transparent",
                color: active ? "var(--app-accent)" : "var(--app-text-muted)",
                position: "relative",
                zIndex: active ? 2 : 0,
                /* Overlay the track stroke — flush top/bottom; first left / last right */
                marginTop: active ? -1 : 0,
                marginBottom: active ? -1 : 0,
                marginLeft: active && isFirst ? -1 : 0,
                marginRight: active && isLast ? -1 : 0,
                boxSizing: "border-box",
                boxShadow: "none",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "inherit",
                lineHeight: 1.2,
                transition: "background 0.18s ease, color 0.18s ease, border-color 0.18s ease",
              }}
            >
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.short}</span>
              <span
                style={{
                  minWidth: 20,
                  height: 20,
                  padding: "0 5px",
                  borderRadius: 999,
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  boxSizing: "border-box",
                  background: active
                    ? "color-mix(in srgb, var(--app-accent) 22%, transparent)"
                    : "var(--app-shell-bg-elevated)",
                  color: active ? "var(--app-accent)" : "var(--app-text-primary)",
                  border: active
                    ? "1px solid color-mix(in srgb, var(--app-accent) 28%, var(--app-border))"
                    : "1px solid var(--app-border)",
                }}
              >
                {s.n}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5" aria-label="Wizard progress">
      {steps.map((s, i) => {
        const active = current === s.n;
        const past = current > s.n;
        const reachable = s.n <= maxReachable;
        const clickable = Boolean(onSelect) && reachable && !active;
        const inner = (
          <>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700,
              background: active || past ? "var(--app-accent)" : "var(--app-shell-bg-subtle)",
              color: active || past ? "var(--app-text-on-accent)" : "var(--app-text-secondary)",
              border: active || past ? "none" : "1px solid var(--app-border-strong)",
            }}>
              {past && !active ? "✓" : s.n}
            </div>
            <span style={{
              color: active ? "var(--app-text-primary)" : reachable ? "var(--app-text-secondary)" : "var(--app-text-subtle)",
              fontSize: 12, fontWeight: active ? 600 : 500,
              whiteSpace: "nowrap",
            }}>
              {s.label}
            </span>
          </>
        );
        return (
          <React.Fragment key={s.n}>
            {i > 0 && (
              <ChevronRight
                size={14}
                style={{
                  color: past || active ? "var(--app-accent)" : "var(--app-text-subtle)",
                  flexShrink: 0,
                  margin: "0 2px",
                }}
                aria-hidden
              />
            )}
            {clickable ? (
              <button
                type="button"
                onClick={() => onSelect?.(s.n)}
                className="flex items-center gap-2"
                style={{
                  background: "none", border: "none", padding: "4px 6px", borderRadius: 8,
                  cursor: "pointer",
                }}
                aria-label={`Go to ${s.label}`}
              >
                {inner}
              </button>
            ) : (
              <div
                className="flex items-center gap-2"
                style={{ padding: "4px 6px", opacity: reachable ? 1 : 0.55 }}
                aria-current={active ? "step" : undefined}
              >
                {inner}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}


interface FieldConfig {
  id: string; label: string; name: string; fieldType: string;
  length: number; required: boolean; starred: boolean; tracked: boolean; isPrimary: boolean;
  relatedObjectId?: string;
  isUnique: boolean; isReadOnly: boolean;
  isSearchResultEnabled: boolean; isSearchEnabled: boolean;
  isListViewEnabled: boolean; isAugmentationEnabled: boolean;
  isFreezeColumn: boolean; isExternalMapper: boolean;
  helpText: string; advancedTab: AdvTabKey; helpTitle: string;
  defaultValue: string;
}

// â”€â”€â”€ FIELD TYPE DEFINITIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DND_TYPE = "WIZ_FIELD";

/** Dark: neon hues. Light: soft mid strokes (~10% deeper) + pastel fills for white chrome. */
const FIELD_TYPES = [
  { type: "Single-Line",         icon: Type,          color: "#9CA3AF", colorLight: "#8593A8" },
  { type: "Email Address",       icon: AtSign,        color: "#C084FC", colorLight: "#967DE1" },
  { type: "Date Picker",         icon: Calendar,      color: "#FCD34D", colorLight: "#D3A107" },
  { type: "Drop-Down",           icon: ListFilter,    color: "#F87171", colorLight: "#E26678" },
  { type: "Number",              icon: Hash,          color: "#60A5FA", colorLight: "#5695E1" },
  { type: "Currency",            icon: DollarSign,    color: "#FCD34D", colorLight: "#D3A107" },
  { type: "Image",               icon: ImageIcon,     color: "#9CA3AF", colorLight: "#8593A8" },
  { type: "Lookup",              icon: Search,        color: "#818CF8", colorLight: "#747EDF" },
  { type: "Multi Select",        icon: Layers,        color: "#F87171", colorLight: "#E26678" },
  { type: "Geolocation",         icon: MapPin,        color: "#34D399", colorLight: "#2FBE8A" },
  { type: "Master Details",      icon: GitBranch,     color: "#818CF8", colorLight: "#747EDF" },
  { type: "Rollup Summary",      icon: Bookmark,      color: "#A78BFA", colorLight: "#967DE1" },
  { type: "Time",                icon: Clock,         color: "#FCD34D", colorLight: "#D3A107" },
  { type: "Multi Line",          icon: AlignLeft,     color: "#9CA3AF", colorLight: "#8593A8" },
  { type: "Password",            icon: Lock,          color: "#F87171", colorLight: "#E26678" },
  { type: "Date & Time",         icon: Calendar,      color: "#FCD34D", colorLight: "#D3A107" },
  { type: "Radio",               icon: CircleDot,     color: "#F87171", colorLight: "#E26678" },
  { type: "Checkbox",            icon: CheckSquare,   color: "#F87171", colorLight: "#E26678" },
  { type: "Decimal",             icon: Binary,        color: "#60A5FA", colorLight: "#5695E1" },
  { type: "URL",                 icon: Link,          color: "#60A5FA", colorLight: "#5695E1" },
  { type: "Boolean",             icon: ToggleLeft,    color: "#34D399", colorLight: "#2FBE8A" },
  { type: "Autonumber",          icon: Braces,        color: "#60A5FA", colorLight: "#5695E1" },
  { type: "Richtext",            icon: CaseSensitive, color: "#9CA3AF", colorLight: "#8593A8" },
  { type: "Formula",             icon: FunctionSquare,color: "#818CF8", colorLight: "#747EDF" },
  { type: "Record Association",  icon: FileCheck,     color: "#34D399", colorLight: "#2FBE8A" },
  { type: "Phone",               icon: Phone,         color: "#34D399", colorLight: "#2FBE8A" },
];

const FT_COLOR: Record<string, string>            = Object.fromEntries(FIELD_TYPES.map(f => [f.type, f.color]));
const FT_COLOR_LIGHT: Record<string, string>      = Object.fromEntries(FIELD_TYPES.map(f => [f.type, f.colorLight]));
const FT_ICON:  Record<string, React.ElementType> = Object.fromEntries(FIELD_TYPES.map(f => [f.type, f.icon]));

function useFieldTypeColor(fieldType: string, fallback = "var(--app-text-secondary)") {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  return (isLight ? FT_COLOR_LIGHT[fieldType] : FT_COLOR[fieldType]) ?? fallback;
}

const DEFAULT_LABEL: Record<string, string> = {
  "Single-Line": "Name", "Email Address": "Email", "Date Picker": "Date",
  "Drop-Down": "Status", "Multi Select": "Tags", "Number": "Amount",
  "Currency": "Value", "Image": "Photo", "Lookup": "Related Record",
  "Geolocation": "Location", "Master Details": "Details", "Rollup Summary": "Total",
  "Time": "Time", "Multi Line": "Description", "Password": "Password",
  "Date & Time": "Created At", "Radio": "Option", "Checkbox": "Active",
  "Decimal": "Rate", "URL": "Website", "Boolean": "Enabled",
  "Autonumber": "Sequence", "Richtext": "Notes", "Formula": "Calculated",
  "Record Association": "Associated Record", "Phone": "Phone",
};

function isRelationField(fieldType: string): boolean {
  return fieldType === "Lookup" || fieldType === "Master Details" || fieldType === "Record Association";
}

interface ValidationBlocker {
  message: string;
  fieldId?: string;
  settingsSection?: ObjAdvSection;
}

function slugObjectName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export { slugObjectName };

function collectValidationBlockers(
  objectName: string,
  title: string,
  priLabel: string,
  priName: string,
  fields: FieldConfig[],
  isEdit: boolean,
  existingApiNames: string[],
  objectSettings: ObjectSettings,
  objectType: ObjectType,
  opts?: { draftEssentialsOnly?: boolean },
): ValidationBlocker[] {
  const blockers: ValidationBlocker[] = [];
  const apiName = slugObjectName(objectName);
  if (!apiName) blockers.push({ message: "Object name is required" });
  else if (!isEdit && existingApiNames.includes(apiName)) {
    blockers.push({ message: `Object name "${apiName}" is already in use` });
  }
  if (!priLabel.trim() || !priName.trim()) {
    blockers.push({ message: "Set the primary field’s label and name" });
  }
  if (fields.length < MIN_OBJECT_FIELDS) {
    blockers.push({ message: `Add at least one more field (${MIN_OBJECT_FIELDS} total)` });
  }
  if (!fields.some(f => f.isPrimary)) blockers.push({ message: "Primary field is missing" });

  // Template customize Save — essentials only so incomplete advanced/relations never trap the user
  if (opts?.draftEssentialsOnly) return blockers;

  fields.forEach(f => {
    if (isRelationField(f.fieldType) && !f.relatedObjectId) {
      blockers.push({
        message: `"${f.label || f.fieldType}" needs a related object`,
        fieldId: f.id,
      });
    }
  });
  // Advanced settings stay optional — still surfaced for guidance, never gate Build/Deploy
  const fieldRefs = fields.map(f => ({ id: f.id, label: f.label, fieldType: f.fieldType, isPrimary: f.isPrimary }));
  collectSettingsBlockers(objectSettings, fieldRefs, objectType).forEach(b => {
    blockers.push({ message: b.message, fieldId: b.fieldId, settingsSection: b.settingsSection });
  });
  return blockers;
}

function primaryWizardFieldType(priFieldType: PrimaryFType): string {
  return priFieldType === "Auto number" ? "Number" : "Single-Line";
}

function blankField(fieldType: string, label?: string, required = false, id?: string, isPrimary = false): FieldConfig {
  const lbl = label ?? DEFAULT_LABEL[fieldType] ?? fieldType;
  return {
    id: id ?? `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: lbl, name: lbl.toLowerCase().replace(/[^a-z0-9]/g, ""),
    fieldType, length: 30, required, starred: false, tracked: false, isPrimary,
    isUnique: false, isReadOnly: false, isSearchResultEnabled: false,
    isSearchEnabled: false, isListViewEnabled: false, isAugmentationEnabled: false,
    isFreezeColumn: false, isExternalMapper: false, helpText: "",
    advancedTab: "lead", helpTitle: "", defaultValue: "",
  };
}

function buildPrimaryField(
  priLabel: string,
  priFieldType: PrimaryFType,
  priRequired: boolean,
  priName?: string,
): FieldConfig {
  const ft = primaryWizardFieldType(priFieldType);
  const name = (priName ?? "").trim().toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, "");
  return {
    ...blankField(ft, priLabel || "Untitled", priRequired, PRIMARY_FIELD_ID, true),
    label: priLabel,
    name,
  };
}

function syncFieldsWithPrimary(
  fields: FieldConfig[],
  priLabel: string,
  priFieldType: PrimaryFType,
  priRequired: boolean,
  priName?: string,
): FieldConfig[] {
  const primary = buildPrimaryField(priLabel, priFieldType, priRequired, priName);
  const rest = fields.filter(f => !f.isPrimary && f.id !== PRIMARY_FIELD_ID);
  return [primary, ...rest];
}

function slugPrimaryFieldName(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, "");
}

function inferPrimaryFromEdit(fields: WizardEditField[]): {
  priLabel: string; priName: string; priFieldType: PrimaryFType; priRequired: boolean;
} {
  const primary = fields.find(f => f.isPrimary) ?? fields[0];
  if (!primary) return { priLabel: "", priName: "", priFieldType: "Text", priRequired: true };
  const isAuto = primary.fieldType === "Number" || primary.fieldType === "Auto number";
  const priLabel = primary.label;
  return {
    priLabel,
    priName: slugPrimaryFieldName(priLabel),
    priFieldType: isAuto ? "Auto number" : "Text",
    priRequired: primary.required !== false,
  };
}

function initEditFields(editFields: WizardEditField[]): FieldConfig[] {
  if (editFields.length === 0) return [];
  const primaryIdx = Math.max(0, editFields.findIndex(f => f.isPrimary));
  const { priFieldType } = inferPrimaryFromEdit(editFields);
  return editFields.map((f, i) => {
    const isPrimary = i === primaryIdx;
    const wizType = isPrimary
      ? primaryWizardFieldType(priFieldType)
      : graphFieldToWizard(f.fieldType);
    const fc = blankField(
      wizType,
      f.label,
      isPrimary ? f.required !== false : Boolean(f.required),
      f.id ?? (isPrimary ? PRIMARY_FIELD_ID : undefined),
      isPrimary,
    );
    if (isPrimary) fc.name = slugPrimaryFieldName(f.label);
    fc.starred = Boolean(f.starred);
    fc.tracked = Boolean(f.tracked);
    fc.relatedObjectId = f.relatedObjectId;
    return fc;
  });
}

/** Map graph / seed field types into wizard palette types. */
function graphFieldToWizard(fieldType: string): string {
  const map: Record<string, string> = {
    Text: "Single-Line",
    "Long Text": "Multi Line",
    Email: "Email Address",
    Phone: "Phone",
    Date: "Date Picker",
    Time: "Time",
    Number: "Number",
    Currency: "Currency",
    Select: "Drop-Down",
    Checkbox: "Checkbox",
    Lookup: "Lookup",
    File: "Image",
    URL: "URL",
  };
  if (map[fieldType]) return map[fieldType];
  if (FIELD_TYPES.some(f => f.type === fieldType)) return fieldType;
  return "Single-Line";
}

/** Map wizard field types to graph/seed field types for deploy. */
export function wizardFieldToGraph(fieldType: string, isPrimary = false, priFieldType?: PrimaryFType): string {
  if (isPrimary && priFieldType === "Auto number") return "Number";
  const map: Record<string, string> = {
    "Single-Line": "Text",
    "Multi Line": "Long Text",
    "Email Address": "Email",
    Phone: "Phone",
    "Date Picker": "Date",
    Time: "Time",
    "Date & Time": "Time",
    Number: "Number",
    Decimal: "Number",
    Currency: "Currency",
    "Drop-Down": "Select",
    "Multi Select": "Select",
    Radio: "Select",
    Checkbox: "Checkbox",
    Boolean: "Checkbox",
    Lookup: "Lookup",
    "Master Details": "Lookup",
    "Record Association": "Lookup",
    Image: "File",
    URL: "URL",
    Password: "Text",
    Geolocation: "Text",
    "Rollup Summary": "Number",
    Autonumber: "Number",
    Richtext: "Long Text",
    Formula: "Text",
  };
  return map[fieldType] ?? "Text";
}

function toWizardObjectType(ot?: string): ObjectType {
  if (ot === "Normal" || ot === "Assignment" || ot === "Collection" || ot === "Questionnaire") return ot;
  return "Normal";
}

// ─── SMALL HELPERS ─────────────────────────────────────────────────────────────
const INPUT: React.CSSProperties = {
  width: "100%", background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border-strong)",
  borderRadius: 8, padding: "8px 11px", color: "var(--app-text-primary)", fontSize: 13, outline: "none",
  transition: "border-color 0.2s", fontFamily: "inherit",
};

const FIELD_LABEL: React.CSSProperties = {
  color: "var(--app-text-secondary)", fontSize: 11, marginBottom: 6, display: "block",
};

const BTN_PRIMARY: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 34, padding: "0 14px",
  borderRadius: 12, border: "none", cursor: "pointer", background: "var(--app-btn-primary-bg)",
  color: "var(--app-btn-primary-text)", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
  boxShadow: "0 2px 8px var(--app-btn-primary-shadow)",
};

const STATUS_DIALOG: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  textAlign: "center",
  width: 320,
  minHeight: 188,
  padding: "36px 40px",
  boxSizing: "border-box",
  borderRadius: 16,
  background: "var(--app-deploy-card-bg)",
  border: "1px solid var(--app-border)",
  boxShadow: "var(--app-wizard-floating-shadow)",
};

const BTN_OUTLINE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 34, padding: "0 14px",
  borderRadius: 12, cursor: "pointer", background: "transparent",
  border: "1px solid var(--app-border)", color: "var(--app-text-primary)",
  fontSize: 13, fontWeight: 500, fontFamily: "inherit",
};

/** Clearly inactive — no primary tint, no bright label */
const BTN_DISABLED: React.CSSProperties = {
  ...BTN_OUTLINE,
  background: "var(--app-border-subtle)",
  border: "1px solid var(--app-border-subtle)",
  color: "var(--app-text-subtle)",
  boxShadow: "none",
  cursor: "not-allowed",
  opacity: 1,
};

const BTN_SUCCESS: React.CSSProperties = {
  ...BTN_OUTLINE,
  borderColor: "var(--app-border-success)",
  background: "var(--app-shell-bg-success)",
  color: "var(--app-text-success)",
  cursor: "default",
};

const BTN_GHOST: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent",
  cursor: "pointer", color: "var(--app-text-muted)", fontSize: 13, fontFamily: "inherit", padding: "4px 8px",
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      style={{ width: 38, height: 20, borderRadius: 9999, position: "relative", flexShrink: 0, background: value ? "var(--app-accent)" : "var(--app-toggle-off)", border: "none", cursor: "pointer", transition: "background 0.2s" }}>
      <div style={{ position: "absolute", top: 2, left: value ? 19 : 2, width: 16, height: 16, borderRadius: "50%", background: "var(--app-text-on-accent)", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }} />
    </button>
  );
}

function Radio({ label, checked, onChange, fullWidth = false }: {
  label: string; checked: boolean; onChange: () => void; fullWidth?: boolean;
}) {
  return (
    <button type="button" onClick={onChange} className="flex items-center gap-2"
      style={{
        background: "none", border: "none", cursor: "pointer", padding: "6px 8px 6px 0",
        textAlign: "left", width: fullWidth ? "100%" : "auto",
      }}>
      <RadioIndicator checked={checked} />
      <span style={{ color: checked ? "var(--app-text-primary)" : "var(--app-text-secondary)", fontSize: 13, fontWeight: checked ? 600 : 500, transition: "color 0.15s" }}>
        {label}
      </span>
    </button>
  );
}

function RadioIndicator({ checked, size = 16 }: { checked: boolean; size?: number }) {
  const dot = Math.round(size * 0.375);
  return (
    <div
      aria-hidden
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${checked ? "var(--app-accent)" : "var(--app-border-strong)"}`,
        background: checked ? "var(--app-accent)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}
    >
      {checked && (
        <div style={{ width: dot, height: dot, borderRadius: "50%", background: "var(--app-text-on-accent)" }} />
      )}
    </div>
  );
}

function WizSectionHeader({ title, desc, stepLabel }: { title: string; desc: string; stepLabel?: string }) {
  return (
    <div style={{ marginBottom: 19.2 }}>
      {stepLabel && (
        <div style={{ color: "var(--app-text-muted)", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
          {stepLabel}
        </div>
      )}
      <h2 style={{ margin: "0 0 6px", color: "var(--app-text-primary)", fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      <p style={{ margin: 0, color: "var(--app-text-muted)", fontSize: 13, lineHeight: 1.5, maxWidth: 52 * 8 }}>
        {desc}
      </p>
    </div>
  );
}

function AccordionSection({ title, defaultOpen = true, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-3"
        style={{ background: "none", border: "none", cursor: "pointer" }}>
        <span style={{ color: "var(--app-text-secondary)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 700 }}>{title}</span>
        <ChevronDown size={12} style={{ color: "var(--app-text-subtle)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>
      {open && <div style={{ paddingBottom: 8 }}>{children}</div>}
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span style={{ color: "var(--app-text-body)", fontSize: 13 }}>{label}</span>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

// â”€â”€â”€ PALETTE ITEM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PaletteItem({ fieldType, Icon, onClick }: {
  fieldType: string; Icon: React.ElementType; onClick: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const color = (isLight ? FT_COLOR_LIGHT[fieldType] : FT_COLOR[fieldType])
    ?? "var(--app-text-secondary)";
  // Light: soft stroke + pastel fill of the same hue; dark keeps neon-on-glass chips.
  const chipBg = isLight
    ? `color-mix(in srgb, ${color} 16%, #ffffff)`
    : `color-mix(in srgb, ${color} 16%, transparent)`;
  const chipBorder = isLight
    ? `color-mix(in srgb, ${color} 48%, transparent)`
    : `color-mix(in srgb, ${color} 32%, transparent)`;
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_TYPE, item: { fieldType }, collect: m => ({ isDragging: m.isDragging() }),
  }));
  return (
    <div ref={drag as any} onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
      style={{
        opacity: isDragging ? 0.4 : 1,
        transition: "background 0.12s, border-color 0.12s",
        borderLeft: "2px solid transparent",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = isLight ? "var(--app-shell-bg-hover)" : "var(--app-border-subtle)";
        e.currentTarget.style.borderLeftColor = color;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderLeftColor = "transparent";
      }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: chipBg,
        border: `1px solid ${chipBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={12} style={{ color }} strokeWidth={2.15} />
      </div>
      <span style={{
        color: "var(--app-text-primary)",
        fontSize: 13,
        fontWeight: 400,
        letterSpacing: "0.01em",
      }}>
        {fieldType}
      </span>
    </div>
  );
}

// â”€â”€â”€ DROP ZONE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DropZone({ onDrop, children, isEmpty }: {
  onDrop: (ft: string) => void; isEmpty: boolean; children: React.ReactNode;
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: DND_TYPE,
    drop: (item: { fieldType: string }) => onDrop(item.fieldType),
    collect: m => ({ isOver: m.isOver() }),
  }));
  return (
    <div ref={drop as any} style={{ minHeight: 100, transition: "all 0.15s" }}>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 mx-4 my-3 rounded-xl"
          style={{ border: isOver ? "1.5px dashed var(--app-accent)" : "1.5px dashed var(--app-border)", background: isOver ? "rgba(99,102,241,0.06)" : "transparent", color: isOver ? "var(--app-accent-light)" : "var(--app-text-muted)", transition: "all 0.15s" }}>
          <Plus size={16} style={{ opacity: 0.75 }} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>{isOver ? "Release to add field" : "Drag fields here or click from the left panel"}</span>
        </div>
      ) : (
        <div style={{ outline: isOver ? "1.5px dashed var(--app-accent)" : "none", outlineOffset: -4, borderRadius: 8, transition: "outline 0.12s" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ FIELD ROW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FieldRow({ field, isSelected, onSelect, onDelete, onStar, onTrack, canDelete, starDisabled, starTitle, compact }: {
  field: FieldConfig; isSelected: boolean;
  onSelect: () => void; onDelete: () => void; onStar: () => void; onTrack: () => void;
  canDelete?: boolean; starDisabled?: boolean; starTitle?: string;
  compact?: boolean;
}) {
  const Icon  = FT_ICON[field.fieldType]  ?? Type;
  const color = useFieldTypeColor(field.fieldType);
  const trackColor = field.tracked ? "var(--app-accent-light)" : "var(--app-text-muted)";
  return (
    <div className="flex items-center gap-2 px-3 py-2 group cursor-pointer"
      style={{ background: isSelected ? "var(--app-shell-bg-accent)" : "transparent", borderLeft: isSelected ? "2px solid var(--app-accent)" : "2px solid transparent", transition: "all 0.12s" }}
      onClick={onSelect}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--app-shell-bg-hover)"; }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
      {!compact && <GripVertical size={13} style={{ color: "var(--app-text-subtle)", cursor: "grab", flexShrink: 0 }} />}
      <div style={{
        width: compact ? 20 : 22, height: compact ? 20 : 22, borderRadius: 5, flexShrink: 0,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={11} style={{ color }} strokeWidth={2.25} />
      </div>
      <span style={{
        color: "var(--app-text-primary)", fontSize: compact ? 12 : 13, flex: 1, minWidth: 0,
        display: "flex", alignItems: "center", gap: 8, overflow: "hidden",
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          {field.label || "Untitled"}
        </span>
        {field.isPrimary && (
          <span style={{
            display: "inline-flex", alignItems: "center", flexShrink: 0,
            padding: "2px 8px", borderRadius: 999, fontSize: 8, fontWeight: 700,
            border: "1px solid var(--app-border-accent)", background: "var(--app-shell-bg-accent)",
            color: "var(--app-accent-light)", letterSpacing: "0.06em",
          }}>
            PRIMARY
          </span>
        )}
      </span>
      {!compact && (
        <span style={{ color: "var(--app-text-muted)", fontSize: 11, flexShrink: 0 }}>{field.fieldType}</span>
      )}
      {!compact && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onTrack(); }}
          title={field.tracked ? "Disable field tracking" : "Enable field tracking"}
          style={{
            color: trackColor,
            background: "none", border: "none",
            cursor: "pointer",
            padding: 2, display: "flex", transition: "color 0.15s", flexShrink: 0,
          }}>
          <FieldTrackingIcon size={16} color={trackColor} active={field.tracked} />
        </button>
      )}
      {!compact && (
        <button
          onClick={e => { e.stopPropagation(); if (!starDisabled) onStar(); }}
          title={starTitle}
          style={{
            color: field.starred ? "#FCD34D" : "var(--app-text-muted)",
            background: "none", border: "none",
            cursor: starDisabled && !field.starred ? "not-allowed" : "pointer",
            padding: 2, display: "flex", transition: "color 0.15s", flexShrink: 0,
            opacity: starDisabled && !field.starred ? 0.35 : 1,
          }}>
          <Star size={13} fill={field.starred ? "#FCD34D" : "none"} />
        </button>
      )}
      {!field.isPrimary && canDelete !== false && !compact && (
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--app-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--app-text-danger)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--app-text-muted)")}>
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

// â”€â”€â”€ FIELD PROPERTIES PANEL (right panel, normal view) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FieldPropertiesPanel({ field, onUpdate, onAdvanced, onHelpText, availableObjects = [] }: {
  field: FieldConfig;
  onUpdate: (id: string, u: Partial<FieldConfig>) => void;
  onAdvanced: () => void;
  onHelpText: () => void;
  availableObjects?: WizardObjectOption[];
}) {
  const Icon  = FT_ICON[field.fieldType]  ?? Type;
  const color = useFieldTypeColor(field.fieldType);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={14} style={{ color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {field.label || "Field Properties"}
          </div>
          <div style={{ color: "var(--app-text-muted)", fontSize: 11 }}>{field.fieldType}</div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>

        <div className="mb-3.5">
          <div style={FIELD_LABEL}>Label</div>
          <input style={INPUT} value={field.label} onChange={e => onUpdate(field.id, { label: e.target.value })} placeholder="Field label" />
        </div>

        <div className="mb-3.5">
          <div style={FIELD_LABEL}>Name</div>
          <input style={INPUT} value={field.name} onChange={e => onUpdate(field.id, { name: e.target.value })}
             placeholder="field_name" />
        </div>

        <div className="mb-3.5">
          <div style={FIELD_LABEL}>Max length</div>
          <input style={INPUT} type="number" value={field.length} onChange={e => onUpdate(field.id, { length: Number(e.target.value) })} min={1} max={9999} />
        </div>

        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-foreground">Is Required</span>
          <Toggle value={field.required} onChange={v => onUpdate(field.id, { required: v })} />
        </div>

        {isRelationField(field.fieldType) && (
          <div className="mb-3.5">
            <div style={FIELD_LABEL}>
              Related object <span className="text-destructive">*</span>
            </div>
            <select style={INPUT}
              className="w-full"
              value={field.relatedObjectId ?? ""}
              onChange={e => onUpdate(field.id, { relatedObjectId: e.target.value || undefined })}
            >
              <option value="">Select an object…</option>
              {availableObjects.map(o => (
                <option key={o.id} value={o.id}>{o.label}{o.apiName ? ` (${o.apiName})` : ""}</option>
              ))}
            </select>
            {availableObjects.length === 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                No other objects on the graph yet. Create related objects first.
              </p>
            )}
          </div>
        )}

        <button onClick={onHelpText}
          className="flex items-center justify-between w-full mt-3 px-4 py-3.5 rounded-lg"
          style={{ background: "var(--app-shell-bg-subtle)", border: "1px solid var(--app-border)", cursor: "pointer", transition: "all 0.15s", marginBottom: 10 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--app-shell-bg-hover)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--app-toggle-off)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--app-shell-bg-subtle)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--app-border)"; }}>
          <div className="flex items-center gap-2.5">
            <AlignLeft size={13} style={{ color: "var(--app-text-secondary)" }} />
            <span style={{ color: "var(--app-text-body)", fontSize: 13, fontWeight: 600 }}>Help text</span>
          </div>
          <div className="flex items-center gap-1.5">
            {(field.helpTitle || field.helpText) && (
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--app-accent)" }} />
            )}
            <ChevronRight size={13} style={{ color: "var(--app-text-muted)" }} />
          </div>
        </button>

        <button onClick={onAdvanced}
          className="flex items-center justify-between w-full px-4 py-3.5 rounded-lg"
          style={{ background: "var(--app-shell-bg-subtle)", border: "1px solid var(--app-border)", cursor: "pointer", transition: "all 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--app-shell-bg-hover)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--app-toggle-off)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--app-shell-bg-subtle)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--app-border)"; }}>
          <div className="flex items-center gap-2.5">
            <Settings2 size={13} style={{ color: "var(--app-text-secondary)" }} />
            <span style={{ color: "var(--app-text-body)", fontSize: 13, fontWeight: 600 }}>Advanced Settings</span>
          </div>
          <ChevronRight size={13} style={{ color: "var(--app-text-muted)" }} />
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ ADVANCED SETTINGS PANEL (field â€” sidebar nav + toggle rows, mirrors ObjectAdvancedPanel) â”€â”€â”€
const ADV_FIELD_NAV: { id: "constraints" | "eventinfo"; icon: React.ElementType; label: string }[] = [
  { id: "constraints", icon: Lock,      label: "Constraints" },
  { id: "eventinfo",   icon: AlignLeft, label: "Event Info"  },
];


function PrimaryFieldPropertiesPanel({
  field,
  priFieldType,
  fieldTracking,
  onUpdate,
  onFieldTypeChange,
  onFieldTrackingChange,
}: {
  field: FieldConfig;
  priFieldType: PrimaryFType;
  fieldTracking: boolean;
  onUpdate: (id: string, u: Partial<FieldConfig>) => void;
  onFieldTypeChange: (v: PrimaryFType) => void;
  onFieldTrackingChange: (v: boolean) => void;
}) {
  const Icon = FT_ICON[field.fieldType] ?? Star;
  const color = useFieldTypeColor(field.fieldType);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="flex items-center gap-3 px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: `${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={14} style={{ color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600 }}>
            Primary field
          </div>
          <div style={{ color: "var(--app-text-muted)", fontSize: 11 }}>
            Required — identifies each record in lists and lookups
          </div>
        </div>
        <span style={{
          padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700,
          border: "1px solid var(--app-border-accent)", background: "var(--app-shell-bg-accent)",
          color: "var(--app-accent-light)", letterSpacing: "0.06em",
        }}>
          PRIMARY
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>
        <div className="mb-3.5">
          <div style={FIELD_LABEL}>
            Label <span style={{ color: "var(--app-text-danger)" }}>*</span>
          </div>
          <input
            style={INPUT}
            value={field.label}
            onChange={e => onUpdate(field.id, { label: e.target.value })}
            placeholder="e.g. Name, ID, Title"
            autoFocus
          />
        </div>

        <div className="mb-3.5">
          <div style={FIELD_LABEL}>
            Field name <span style={{ color: "var(--app-text-danger)" }}>*</span>
          </div>
          <input
            style={INPUT}
            value={field.name}
            onChange={e => {
              const name = e.target.value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, "");
              onUpdate(field.id, { name });
            }}
            placeholder="e.g. name"
          />
        </div>

        <div className="mb-4">
          <div style={{ ...FIELD_LABEL, marginBottom: 10 }}>Field type</div>
          <div className="flex items-center gap-6 flex-wrap">
            {(["Text", "Auto number"] as PrimaryFType[]).map(ft => (
              <Radio
                key={ft}
                label={ft}
                checked={priFieldType === ft}
                onChange={() => {
                  onFieldTypeChange(ft);
                  onUpdate(field.id, {
                    fieldType: ft === "Auto number" ? "Number" : "Single-Line",
                  });
                }}
              />
            ))}
          </div>
        </div>

        <div style={{
          padding: "14px 16px", borderRadius: 10,
          border: "1px solid var(--app-border)", background: "var(--app-shell-bg-subtle)",
        }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 500 }}>Field tracking</div>
              <div style={{ color: "var(--app-text-muted)", fontSize: 12, marginTop: 4 }}>
                Log changes to this field over time
              </div>
            </div>
            <Toggle value={fieldTracking} onChange={onFieldTrackingChange} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdvancedPanel({ field, onUpdate, onBack }: {
  field: FieldConfig;
  onUpdate: (id: string, u: Partial<FieldConfig>) => void;
  onBack: () => void;
}) {
  const [activeSection, setActiveSection] = useState<"constraints" | "eventinfo">("constraints");

  const TRow = ({ label, sub, value, onChange }: {
    label: string; sub?: string; value: boolean; onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-2.5"
      style={{ borderBottom: "1px solid var(--app-shell-bg-input)" }}>
      <div>
        <div style={{ color: "var(--app-text-body)", fontSize: 12 }}>{label}</div>
        {sub && <div style={{ color: "var(--app-text-subtle)", fontSize: 10, marginTop: 1 }}>{sub}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );

  const FieldInp = ({ label, value, onChange, placeholder, type = "text" }: {
    label: string; value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string; type?: string;
  }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <input style={INPUT} type={type} value={value} onChange={onChange} placeholder={placeholder}
         />
    </div>
  );

  const activeNav = ADV_FIELD_NAV.find(n => n.id === activeSection)!;
  const ActiveNavIcon = activeNav.icon;

  const renderContent = () => {
    if (activeSection === "constraints") return (
      <>
        <div style={{ color: "var(--app-text-subtle)", fontSize: 11, lineHeight: 1.5, marginBottom: 16 }}>Control field access, uniqueness and display behaviour.</div>
        <TRow label="Is Unique"     sub="Prevent duplicate values"          value={field.isUnique}              onChange={v => onUpdate(field.id, { isUnique: v })} />
        <TRow label="Is Read Only"  sub="Prevent editing this field"        value={field.isReadOnly}            onChange={v => onUpdate(field.id, { isReadOnly: v })} />
        <TRow label="Search Result" sub="Show in search result display"     value={field.isSearchResultEnabled} onChange={v => onUpdate(field.id, { isSearchResultEnabled: v })} />
        <TRow label="Search"        sub="Allow searching by this field"     value={field.isSearchEnabled}       onChange={v => onUpdate(field.id, { isSearchEnabled: v })} />
        <TRow label="List View"     sub="Display in list view columns"      value={field.isListViewEnabled}     onChange={v => onUpdate(field.id, { isListViewEnabled: v })} />
        <TRow label="Augmentation"  sub="Enable AI data augmentation"       value={field.isAugmentationEnabled} onChange={v => onUpdate(field.id, { isAugmentationEnabled: v })} />
        <TRow label="Freeze Column" sub="Pin column in table views"         value={field.isFreezeColumn}        onChange={v => onUpdate(field.id, { isFreezeColumn: v })} />
        <TRow label="Ext. Mapper"   sub="Map to an external data key"       value={field.isExternalMapper}      onChange={v => onUpdate(field.id, { isExternalMapper: v })} />
      </>
    );
    return (
      <>
        <div style={{ color: "var(--app-text-subtle)", fontSize: 11, lineHeight: 1.5, marginBottom: 16 }}>Override field properties for event-specific contexts.</div>
        <FieldInp label="LABEL"         value={field.label}        onChange={e => onUpdate(field.id, { label: e.target.value })} />
        <FieldInp label="NAME"          value={field.name}         onChange={e => onUpdate(field.id, { name: e.target.value })} />
        <FieldInp label="MAX LENGTH"    value={field.length}       type="number" onChange={e => onUpdate(field.id, { length: Number(e.target.value) })} />
        <FieldInp label="DEFAULT VALUE" value={field.defaultValue} placeholder="Optional" onChange={e => onUpdate(field.id, { defaultValue: e.target.value })} />
      </>
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, animation: "slideFromRight 0.2s ease" }}>

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md"
          style={{ color: "var(--app-text-secondary)", background: "var(--app-shell-bg-input)", border: "none", cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--app-text-primary)"; (e.currentTarget as HTMLElement).style.background = "var(--app-border)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--app-text-secondary)"; (e.currentTarget as HTMLElement).style.background = "var(--app-shell-bg-input)"; }}>
          <ArrowLeft size={11} /> Back
        </button>
        <div style={{ width: 1, height: 14, background: "var(--app-border)", flexShrink: 0 }} />
        <Settings2 size={12} style={{ color: "var(--app-accent)", flexShrink: 0 }} />
        <span style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600, flex: 1 }}>Advanced Settings</span>
        <span style={{ color: "var(--app-text-subtle)", fontSize: 10 }}>2 sections</span>
      </div>

      {/* Two-column body: left nav + right content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* Left nav — matches ObjectAdvancedPanel proportions */}
        <div style={{ width: OBJ_ADV_NAV_WIDTH, flexShrink: 0, borderRight: "1px solid var(--app-border-subtle)", overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", paddingTop: 8, paddingBottom: 8 }}>
          {ADV_FIELD_NAV.map(item => {
            const NavIcon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button key={item.id} onClick={() => setActiveSection(item.id)}
                className="flex items-center gap-2.5 w-full"
                style={{
                  padding: `10px 12px 10px ${OBJ_ADV_NAV_ICON_INSET}px`, background: isActive ? "var(--app-shell-bg-accent)" : "transparent",
                  borderTop: "none", borderRight: "none", borderBottom: "none",
                  borderLeft: `2px solid ${isActive ? "var(--app-accent)" : "transparent"}`,
                  cursor: "pointer", transition: "all 0.14s",
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--app-shell-bg-hover)"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <NavIcon size={13} style={{ color: isActive ? "var(--app-accent-light)" : "var(--app-text-subtle)", flexShrink: 0, transition: "color 0.14s" }} />
                <span style={{ color: isActive ? "var(--app-text-primary)" : "var(--app-text-muted)", fontSize: 12, textAlign: "left", lineHeight: 1.35, transition: "color 0.14s" }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right content — matches ObjectAdvancedPanel padding */}
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "18px 24px 24px", scrollbarWidth: "none" }}>
          <div className="flex items-center gap-2.5" style={{ marginBottom: 14 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--app-shell-bg-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ActiveNavIcon size={12} style={{ color: "var(--app-accent-light)" }} />
            </div>
            <span style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600 }}>
              {activeNav.label}
            </span>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ HELP TEXT PANEL (opens like Advanced Settings — wide panel + left nav) â”€â”€â”€
function HelpTextPanel({ field, onUpdate, onBack }: {
  field: FieldConfig;
  onUpdate: (id: string, u: Partial<FieldConfig>) => void;
  onBack: () => void;
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, animation: "slideFromRight 0.2s ease" }}>
      <div className="flex items-center gap-2.5 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md"
          style={{ color: "var(--app-text-secondary)", background: "var(--app-shell-bg-input)", border: "none", cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--app-text-primary)"; (e.currentTarget as HTMLElement).style.background = "var(--app-border)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--app-text-secondary)"; (e.currentTarget as HTMLElement).style.background = "var(--app-shell-bg-input)"; }}>
          <ArrowLeft size={11} /> Back
        </button>
        <div style={{ width: 1, height: 14, background: "var(--app-border)", flexShrink: 0 }} />
        <AlignLeft size={12} style={{ color: "var(--app-accent)", flexShrink: 0 }} />
        <span style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600, flex: 1 }}>Help Text</span>
        <span style={{ color: "var(--app-text-subtle)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
          {field.label}
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <div style={{
          width: OBJ_ADV_NAV_WIDTH, flexShrink: 0, borderRight: "1px solid var(--app-border-subtle)",
          overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", paddingTop: 8, paddingBottom: 8,
        }}>
          <button type="button"
            className="flex items-center gap-2.5 w-full"
            style={{
              padding: `10px 12px 10px ${OBJ_ADV_NAV_ICON_INSET}px`, background: "var(--app-shell-bg-accent)",
              borderTop: "none", borderRight: "none", borderBottom: "none",
              borderLeft: "2px solid var(--app-accent)", cursor: "default",
            }}>
            <AlignLeft size={13} style={{ color: "var(--app-accent-light)", flexShrink: 0 }} />
            <span style={{ color: "var(--app-text-primary)", fontSize: 12, textAlign: "left", lineHeight: 1.35 }}>
              Help Text
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{
          padding: "18px 24px 24px",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent",
        }}>
          <div className="flex items-center gap-2.5" style={{ marginBottom: 14 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, background: "var(--app-shell-bg-accent)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <AlignLeft size={12} style={{ color: "var(--app-accent-light)" }} />
            </div>
            <span style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600 }}>Help Text</span>
          </div>

          <p style={{ color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.6, marginBottom: 20 }}>
            Add a title and description that will be shown to users as a help tooltip when they interact with this field.
          </p>

          <div className="mb-4">
            <div style={FIELD_LABEL}>Title</div>
            <input style={INPUT}
              value={field.helpTitle}
              onChange={e => onUpdate(field.id, { helpTitle: e.target.value })}
              placeholder="e.g. Employee Full Name"
            />
          </div>

          <div>
            <div style={FIELD_LABEL}>Description</div>
            <textarea style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}
              value={field.helpText}
              onChange={e => onUpdate(field.id, { helpText: e.target.value })}
              rows={5}
              placeholder="e.g. Enter the employee's full legal name as it appears on their ID…"
              
            />
          </div>

          {(field.helpTitle || field.helpText) && (
            <div style={{
              marginTop: 18, padding: "14px 16px", borderRadius: 10,
              background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
            }}>
              <div style={{ color: "var(--app-text-accent-muted)", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                {field.helpTitle || field.label}
              </div>
              {field.helpText && (
                <div style={{ color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.6 }}>{field.helpText}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ RIGHT PANEL EMPTY STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RightPanelHint({ onConfigureFeatures }: { onConfigureFeatures?: () => void }) {
  return (
    <div className="flex h-full flex-col font-sans">
      <div className="flex flex-col items-center justify-center flex-1 gap-4 px-8 text-center" style={{ color: "var(--app-text-disabled)" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: "1.5px dashed var(--app-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Settings2 size={20} style={{ color: "var(--app-text-disabled)" }} />
        </div>
        <span style={{ fontSize: 13, lineHeight: 1.6 }}>Select a field to configure its properties</span>
      </div>
      {onConfigureFeatures && (
        <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--app-border-subtle)" }}>
          <button type="button" onClick={onConfigureFeatures} style={{ ...BTN_OUTLINE, height: 32, fontSize: 12 }}>Advanced settings</button>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ MAIN WIZARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function CreateObjectWizard({ onClose, onObjectCreated, onPreviewChange, editInitial = null, existingApiNames = [], availableObjects = [], onSaveDraft, draftSaveLabel = "Save object" }: CreateObjectWizardProps) {
  const onPreviewChangeRef = useRef(onPreviewChange);
  useEffect(() => { onPreviewChangeRef.current = onPreviewChange; });

  const isEdit = Boolean(editInitial?.editId);
  const isDraftMode = Boolean(onSaveDraft);
  const editPrimary = inferPrimaryFromEdit(editInitial?.fields ?? []);
  const pluralTouchedRef = useRef(Boolean(editInitial?.objectSettings?.primaryInfo?.pluralLabel));

  const [step, setStep] = useState<WizardStep>(() =>
    editInitial?.openSettings ? "step3" : "step1",
  );

  // â”€â”€ Step 1 state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [objectName,    setObjectName]    = useState(editInitial?.name ?? "");
  const [title,         setTitle]         = useState(editInitial?.title ?? editInitial?.name ?? "");
  const [description,   setDescription]   = useState(editInitial?.description ?? "");
  const [objectType,    setObjectType]    = useState<ObjectType>(toWizardObjectType(editInitial?.objectType));
  const [priLabel,      setPriLabel]      = useState(editPrimary.priLabel);
  const [priName,       setPriName]       = useState(editPrimary.priName);
  const [priFieldType,  setPriFieldType]  = useState<PrimaryFType>(editPrimary.priFieldType);
  const [fieldTracking, setFieldTracking] = useState(() => {
    const ft = editInitial?.objectSettings?.fieldTracking;
    return Boolean(ft?.trackCreated || ft?.trackModified || ft?.logHistory);
  });
  const [priRequired,   setPriRequired]   = useState(editPrimary.priRequired);

  useEffect(() => {
    if (pluralTouchedRef.current || !title.trim()) return;
    const suggested = suggestPlural(title);
    setObjectSettings(prev => ({
      ...prev,
      primaryInfo: { ...prev.primaryInfo, pluralLabel: suggested },
    }));
  }, [title]);

  const [objectSettings, setObjectSettings] = useState<ObjectSettings>(() =>
    mergeObjectSettings(editInitial?.objectSettings, editInitial?.objectType),
  );
  const [advSettingsSection, setAdvSettingsSection] = useState<ObjAdvSection>("addinfo");

  // â”€â”€ Step 2 state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [fields,          setFields]          = useState<FieldConfig[]>(() =>
    editInitial?.fields?.length ? initEditFields(editInitial.fields) : [],
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showAdvanced,    setShowAdvanced]    = useState(false);
  const [showHelpText,    setShowHelpText]    = useState(false);
  const [success,         setSuccess]         = useState(false);
  const [saved,           setSaved]           = useState(isEdit);
  const [built,           setBuilt]           = useState(isEdit);
  const [building,        setBuilding]        = useState(false);
  const [deploying,       setDeploying]       = useState(false);
  const [buildErrors,     setBuildErrors]     = useState<ValidationBlocker[]>([]);
  const [successAction,   setSuccessAction]   = useState<"save" | "build" | "deploy">("deploy");
  const [objectVersion,   setObjectVersion]   = useState({ major: 1, minor: 0 });
  const [fieldSortDir, setFieldSortDir] = useState<"asc" | "desc" | null>(null);
  const [groupFieldsByType, setGroupFieldsByType] = useState(false);
  const [inspectDeployFields, setInspectDeployFields] = useState(true);
  const [viewportW, setViewportW] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth : 1600),
  );
  const fieldListScrollRef = useRef<HTMLDivElement | null>(null);
  const fieldListBottomRef = useRef<HTMLDivElement | null>(null);
  const prevFieldCountRef = useRef<number | null>(null);

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // â”€â”€ Preview graph â€” fires when name OR fields OR step change â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const cb = onPreviewChangeRef.current;
    if (!cb) return;
    const displayLabel = (title.trim() || objectName.trim());
    if (!displayLabel) { cb([], []); return; }

    const nodes: PanelPreviewNode[] = [
      { id: "__preview_object__", type: "object", label: displayLabel, isPreview: true },
    ];
    const edges: PanelPreviewEdge[] = [];

    if (step === "step2" || step === "step3") {
      fields.forEach(f => {
        const nid = `__pf_${f.id}__`;
        nodes.push({
          id: nid, type: "field", label: f.label || "Field",
          fieldType: f.fieldType, required: f.required,
          parentId: "__preview_object__", isPreview: true,
        });
        edges.push({ id: `__pe_${f.id}__`, from: "__preview_object__", to: nid, type: "obj-field" });
      });

      const relatedIds = new Set<string>();
      fields.forEach(f => {
        if (isRelationField(f.fieldType) && f.relatedObjectId) relatedIds.add(f.relatedObjectId);
      });
      relatedIds.forEach(rid => {
        const rel = availableObjects.find(o => o.id === rid);
        if (!rel) return;
        const relNodeId = `__preview_rel_${rid}__`;
        nodes.push({ id: relNodeId, type: "object", label: rel.label, isPreview: true });
        edges.push({ id: `__po_${rid}__`, from: "__preview_object__", to: relNodeId, type: "obj-obj" });
      });
    }

    cb(nodes, edges);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectName, title, fields, step]);

  useEffect(() => () => { onPreviewChangeRef.current?.([], []); }, []);

  useEffect(() => {
    if (!isEdit && saved) setBuilt(false);
  }, [fields, objectName, title, priLabel, priFieldType, objectSettings, isEdit, saved]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (step === "step1") onClose();
        else if (showAdvanced) setShowAdvanced(false);
        else if (showHelpText) setShowHelpText(false);
        else if (step === "deployReview") setStep("step3");
        else if (step === "step3") setStep("step2");
        else if (step === "step2") setStep("step1");
        else onClose();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, step, showAdvanced, showHelpText]);

  // â”€â”€ Field management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addField = useCallback((fieldType: string) => {
    const newField = blankField(fieldType);
    setFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setShowAdvanced(false);
    setShowHelpText(false);
  }, []);

  // Grow field card until viewport max; when capped, scroll to show the newly added field
  useEffect(() => {
    const prev = prevFieldCountRef.current;
    if (prev === null) {
      prevFieldCountRef.current = fields.length;
      return;
    }
    prevFieldCountRef.current = fields.length;
    if (fields.length <= prev) return;
    const scrollToNew = () => {
      const scroller = fieldListScrollRef.current;
      if (!scroller) return;
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    };
    requestAnimationFrame(() => requestAnimationFrame(scrollToNew));
  }, [fields.length]);

  const updateField = useCallback((id: string, u: Partial<FieldConfig>) => {
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...u } : f)));
    if (id === PRIMARY_FIELD_ID) {
      if (u.label !== undefined) setPriLabel(u.label);
      if (u.name !== undefined) setPriName(u.name);
      if (u.required !== undefined) setPriRequired(u.required);
    }
  }, []);

  const deleteField = useCallback((id: string) => {
    setFields(prev => {
      const target = prev.find(f => f.id === id);
      if (!target || target.isPrimary) return prev;
      if (prev.length <= MIN_OBJECT_FIELDS) return prev;
      return prev.filter(f => f.id !== id);
    });
    setSelectedFieldId(prev => prev === id ? null : prev);
    setShowAdvanced(false);
    setShowHelpText(false);
  }, []);

  const toggleStar = useCallback((id: string) => {
    setFields(prev => {
      const target = prev.find(f => f.id === id);
      if (!target) return prev;
      if (!target.starred) {
        const count = prev.filter(f => f.starred).length;
        if (count >= MAX_PROMINENT_FIELDS) return prev;
      }
      return prev.map(f => (f.id === id ? { ...f, starred: !f.starred } : f));
    });
  }, []);

  const toggleTrack = useCallback((id: string) => {
    setFields(prev => prev.map(f => (f.id === id ? { ...f, tracked: !f.tracked } : f)));
  }, []);

  const prominentCount = fields.filter(f => f.starred).length;

  const orderedFields = useMemo(() => {
    const primary = fields.filter(f => f.isPrimary);
    const rest = fields.filter(f => !f.isPrimary);
    if (fieldSortDir) {
      rest.sort((a, b) => {
        const cmp = (a.label || "").localeCompare(b.label || "", undefined, { sensitivity: "base" });
        return fieldSortDir === "asc" ? cmp : -cmp;
      });
    }
    return [...primary, ...rest];
  }, [fields, fieldSortDir]);

  const groupedFieldSections = useMemo(() => {
    if (!groupFieldsByType) return null;
    const map = new Map<string, FieldConfig[]>();
    orderedFields.forEach(f => {
      const key = f.fieldType || "Other";
      const list = map.get(key) ?? [];
      list.push(f);
      map.set(key, list);
    });
    return Array.from(map.entries()).map(([type, items]) => ({ type, items }));
  }, [orderedFields, groupFieldsByType]);

  const settingsFields = fields.map(f => ({
    id: f.id, label: f.label, fieldType: f.fieldType, isPrimary: f.isPrimary,
  }));

  const validationBlockers = collectValidationBlockers(
    objectName, title, priLabel, priName, fields, isEdit, existingApiNames, objectSettings, objectType,
  );
  /** Essentials + field config only — advanced settings never block Build / Deploy */
  const requiredBlockers = validationBlockers.filter(b => !b.settingsSection);
  const deployBlockers = requiredBlockers.map(b => b.message);

  /** Template customize — enable Save as soon as anything differs from the opened draft */
  const draftSnapshot = useMemo(() => {
    if (!isDraftMode) return "";
    return JSON.stringify({
      objectName,
      title,
      description,
      objectType,
      priLabel,
      priName,
      priFieldType,
      priRequired,
      fieldTracking,
      objectSettings,
      fields: fields.map(f => ({
        id: f.id,
        label: f.label,
        name: f.name,
        fieldType: f.fieldType,
        required: f.required,
        starred: f.starred,
        tracked: f.tracked,
        isPrimary: f.isPrimary,
        relatedObjectId: f.relatedObjectId ?? "",
        helpText: f.helpText,
        defaultValue: f.defaultValue,
        isUnique: f.isUnique,
        isReadOnly: f.isReadOnly,
      })),
    });
  }, [
    isDraftMode, objectName, title, description, objectType,
    priLabel, priName, priFieldType, priRequired, fieldTracking,
    objectSettings, fields,
  ]);

  const [draftBaseline, setDraftBaseline] = useState<string | null>(null);
  useEffect(() => {
    if (!isDraftMode) {
      setDraftBaseline(null);
      return;
    }
    if (draftBaseline !== null) return;
    // Let auto plural / sync settle, then lock baseline so only real edits unlock Save
    const t = window.setTimeout(() => setDraftBaseline(draftSnapshot), 120);
    return () => window.clearTimeout(t);
  }, [isDraftMode, draftBaseline, draftSnapshot]);

  const isDraftDirty = Boolean(isDraftMode && draftBaseline !== null && draftSnapshot !== draftBaseline);

  const focusBlocker = useCallback((blocker: ValidationBlocker) => {
    if (blocker.fieldId) {
      setSelectedFieldId(blocker.fieldId);
      setShowAdvanced(false);
      setShowHelpText(false);
      setStep("step2");
    }
    if (blocker.settingsSection) {
      setAdvSettingsSection(blocker.settingsSection);
      setStep("step3");
      setSelectedFieldId(null);
      setShowAdvanced(false);
      setShowHelpText(false);
    }
  }, []);

  const openObjectFeatures = useCallback(() => {
    setSelectedFieldId(null);
    setShowAdvanced(false);
    setShowHelpText(false);
    setStep("step3");
  }, []);

  const handleFieldTrackingChange = useCallback((enabled: boolean) => {
    setFieldTracking(enabled);
    setObjectSettings(prev => ({
      ...prev,
      fieldTracking: {
        ...prev.fieldTracking,
        trackCreated: enabled,
        trackModified: enabled,
        trackDeleted: enabled ? prev.fieldTracking.trackDeleted : false,
        logHistory: enabled,
      },
    }));
  }, []);

  const primaryFieldEditor = {
    label: priLabel,
    name: priName,
    fieldType: priFieldType,
    fieldTracking,
    onLabelChange: (value: string) => setPriLabel(value),
    onNameChange: (value: string) => {
      setPriName(value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, ""));
    },
    onFieldTypeChange: (value: PrimaryFType) => setPriFieldType(value),
    onFieldTrackingChange: handleFieldTrackingChange,
  };


  const step3Suggestions = useMemo(
    () => getSuggestedSettings(objectType, settingsFields),
    [objectType, settingsFields],
  );

  const runBuild = useCallback(async () => {
    if (building) return;
    const synced = syncFieldsWithPrimary(fields, priLabel.trim(), priFieldType, priRequired, priName);
    const blockers = collectValidationBlockers(
      objectName, title, priLabel, priName, synced, isEdit, existingApiNames, objectSettings, objectType,
    ).filter(b => !b.settingsSection);
    setBuilding(true);
    setSaved(true);
    setBuildErrors([]);
    await new Promise(r => setTimeout(r, 1100));
    if (blockers.length > 0) {
      setBuilt(false);
      setBuildErrors(blockers);
    } else {
      setBuilt(true);
      setBuildErrors([]);
      setSuccessAction("build");
      // Blank Build Manually → summary screen; Deploy only from there
      if (!isDraftMode && !isEdit) {
        setStep("deployReview");
      }
    }
    setBuilding(false);
  }, [building, fields, priLabel, priName, priFieldType, priRequired, objectName, title, isEdit, existingApiNames, objectSettings, objectType, isDraftMode]);

  const goToStep2 = useCallback(() => {
    const seedLabel = priLabel.trim();
    const seedName = priName.trim();
    setFields(prev => syncFieldsWithPrimary(prev, seedLabel, priFieldType, priRequired, seedName));
    setSelectedFieldId(PRIMARY_FIELD_ID);
    setShowAdvanced(false);
    setShowHelpText(false);
    setStep("step2");
  }, [priLabel, priName, priFieldType, priRequired]);

  const goToStep3 = useCallback(() => {
    setFields(prev => syncFieldsWithPrimary(prev, priLabel.trim(), priFieldType, priRequired, priName));
    setShowAdvanced(false);
    setShowHelpText(false);
    setStep("step3");
  }, [priLabel, priName, priFieldType, priRequired]);

  const finishAndClose = useCallback(async () => {
    const synced = syncFieldsWithPrimary(fields, priLabel.trim(), priFieldType, priRequired, priName);

    // Template-suite draft save — never touches the graph; any edit unlocks Save (no validation gate)
    if (isDraftMode && onSaveDraft) {
      if (deploying || !isDraftDirty) return;
      setDeploying(true);
      await new Promise(r => setTimeout(r, 420));
      onSaveDraft({
        name: objectName.trim() || (editInitial?.name ?? ""),
        title: title.trim() || (editInitial?.title ?? editInitial?.name ?? ""),
        description,
        objectType,
        priFieldType,
        objectSettings,
        fields: synced.map(f => ({
          label: f.label,
          fieldType: f.fieldType,
          required: f.required,
          starred: f.starred,
          tracked: f.tracked,
          isPrimary: f.isPrimary,
          relatedObjectId: f.relatedObjectId,
        })),
      });
      setDeploying(false);
      setSuccess(true);
      setSuccessAction("save");
      setTimeout(onClose, 900);
      return;
    }

    if (deploying) return;
    if (!isEdit) {
      setDeploying(true);
      await new Promise(r => setTimeout(r, 1100));
      setDeploying(false);
    }
    const nextVer = isEdit ? objectVersion : { major: 1, minor: 0 };
    setObjectVersion(nextVer);
    setSuccess(true);
    setSuccessAction(isEdit ? "save" : "deploy");
    onObjectCreated?.({
      editId: editInitial?.editId,
      name: objectName.trim(),
      title: title.trim(),
      description,
      objectType,
      priFieldType,
      lifecycleStatus: isEdit ? "Deployed" : "Deployed",
      objectSettings,
      version: `${nextVer.major}.${nextVer.minor}`,
      versionBump: undefined,
      fields: synced.map(f => ({
        label: f.label,
        fieldType: wizardFieldToGraph(f.fieldType, f.isPrimary, priFieldType),
        required: f.required,
        starred: f.starred,
        tracked: f.tracked,
        isPrimary: f.isPrimary,
        relatedObjectId: f.relatedObjectId,
      })),
    });
    setTimeout(onClose, 1400);
  }, [deploying, onObjectCreated, onClose, objectName, title, description, objectType, objectSettings, fields, priLabel, priName, priFieldType, priRequired, editInitial?.editId, editInitial?.name, editInitial?.title, isEdit, objectVersion, isDraftMode, onSaveDraft, isDraftDirty]);

  const selectedField = fields.find(f => f.id === selectedFieldId) ?? null;
  const canContinueStep1 = objectName.trim().length > 0;
  const primaryConfigured = priLabel.trim().length > 0 && priName.trim().length > 0;
  const canContinueStep2 = primaryConfigured && fields.length >= MIN_OBJECT_FIELDS;
  const maxReachableStep: 1 | 2 | 3 = isDraftMode
    ? 3
    : (!canContinueStep1 ? 1 : (canContinueStep2 ? 3 : 2));
  const headerObjectTitle = objectName.trim() || (isEdit ? "Edit object" : "Create objects");
  const headerObjectSub = objectName.trim()
    ? (title.trim() || (isEdit ? "Editing object" : isDraftMode ? "Template object" : "New object"))
    : (isEdit ? "Object details" : isDraftMode ? "Customize template object" : "Build manually");
  const navigateToStep = useCallback((n: 1 | 2 | 3) => {
    if (n === 1) { setStep("step1"); return; }
    if (n === 2 && (isDraftMode || canContinueStep1)) { goToStep2(); return; }
    if (n === 3 && (isDraftMode || canContinueStep2)) goToStep3();
  }, [canContinueStep1, canContinueStep2, goToStep2, goToStep3, isDraftMode]);
  const canBuild      = requiredBlockers.length === 0 && !building;
  const canSaveDraft  = isDraftMode && isDraftDirty && !deploying;
  const draftSaveHint = !isDraftDirty ? "Change anything in this object to enable Save" : undefined;
  const canDeploy     = isEdit
    ? requiredBlockers.length === 0
    : isDraftMode
      ? canSaveDraft
      : built && requiredBlockers.length === 0 && !deploying;
  const relationFieldCount = fields.filter(f => isRelationField(f.fieldType) && f.relatedObjectId).length;

  // Template customize — saving overlay (any step)
  if (isDraftMode && deploying && !success) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: "var(--app-shell-bg-overlay)", backdropFilter: "blur(6px)" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={STATUS_DIALOG}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
            border: "3px solid var(--app-border-accent)", borderTopColor: "var(--app-accent)",
            animation: "spin 0.8s linear infinite",
            boxSizing: "border-box",
          }} />
          <div style={{ color: "var(--app-text-primary)", fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>
            Saving object…
          </div>
          <div style={{ color: "var(--app-text-muted)", fontSize: 13, fontWeight: 500, lineHeight: 1.45 }}>
            Updating this object in your template suite…
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€ SUCCESS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (success) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: "var(--app-shell-bg-overlay)", backdropFilter: "blur(6px)" }}>
        <style>{`@keyframes popInWiz{from{transform:scale(0.92);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
        <div style={{ ...STATUS_DIALOG, animation: "popInWiz 0.32s cubic-bezier(0.34,1.4,0.64,1)" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "var(--app-text-success)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Check size={26} strokeWidth={2} style={{ color: "var(--app-text-on-accent)" }} />
          </div>
          <div style={{ color: "var(--app-text-primary)", fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>
            {successAction === "build"
              ? "Build Successful!"
              : isDraftMode
                ? "Object saved to suite"
                : isEdit ? "Object Saved!" : "Object Deployed!"}
          </div>
          <div style={{ color: "var(--app-text-muted)", fontSize: 13, fontWeight: 500, lineHeight: 1.45 }}>
            {successAction === "build"
              ? "Validation passed — ready to deploy."
              : isDraftMode
                ? "Returning to your template suite…"
                : isEdit ? "Updating nodes on your graph…" : "Connecting nodes to your graph…"}
          </div>
        </div>
      </div>
    );
  }

  // Post-build deploy summary (Build Manually) — Deploy objects only from here
  if (step === "deployReview" && !isDraftMode && !isEdit) {
    const displayTitle = title.trim() || objectName.trim() || "Object";
    return (
      <>
        <style>{`
          @keyframes wizFade{from{opacity:0}to{opacity:1}}
          .wiz-deploy-scroll::-webkit-scrollbar{width:6px}
          .wiz-deploy-scroll::-webkit-scrollbar-thumb{background:var(--app-scrollbar-thumb);border-radius:999px}
        `}</style>
        <div
          className="fixed inset-0 z-[60] flex flex-col font-sans"
          style={{
            background: "color-mix(in srgb, var(--app-shell-bg-elevated) 86%, transparent)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            animation: "wizFade 0.22s ease",
          }}
        >
          <div
            className="relative flex items-center gap-4 px-6 shrink-0"
            style={{ height: 56, borderBottom: "1px solid var(--app-border)", background: "var(--app-shell-bg-elevated)" }}
          >
            <button
              type="button"
              onClick={() => setStep("step3")}
              style={{ ...BTN_GHOST, flexShrink: 0, color: "var(--app-text-muted)" }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div style={{ width: 1, height: 22, background: "var(--app-border)", flexShrink: 0 }} />
            <div className="min-w-0 flex-1">
              <div style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600 }}>Create objects</div>
              <div style={{ color: "var(--app-text-muted)", fontSize: 12 }}>Build Manually · {displayTitle}</div>
            </div>
            <button
              type="button"
              onClick={() => { void finishAndClose(); }}
              disabled={!canDeploy}
              style={{
                ...BTN_PRIMARY,
                flexShrink: 0,
                ...(!canDeploy ? {
                  background: "var(--app-border-subtle)",
                  color: "var(--app-text-subtle)",
                  boxShadow: "none",
                  cursor: "not-allowed",
                } : {}),
                ...(deploying ? { cursor: "wait" } : {}),
              }}
            >
              <Zap size={14} />
              <span>{deploying ? "Deploying…" : "Deploy objects"}</span>
              <ChevronRight size={15} strokeWidth={2.6} style={{ marginLeft: 6 }} />
            </button>
          </div>

          {deploying && (
            <div className="fixed inset-0 z-[65] flex items-center justify-center"
              style={{ background: "var(--app-shell-bg-overlay)", backdropFilter: "blur(6px)" }}>
              <div style={STATUS_DIALOG}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                  border: "3px solid var(--app-border-accent)", borderTopColor: "var(--app-accent)",
                  animation: "spin 0.8s linear infinite",
                  boxSizing: "border-box",
                }} />
                <div style={{ color: "var(--app-text-primary)", fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>
                  Deploying object…
                </div>
                <div style={{ color: "var(--app-text-muted)", fontSize: 13, fontWeight: 500, lineHeight: 1.45 }}>
                  Publishing object to your graph…
                </div>
              </div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          <div className="flex flex-1 min-h-0 justify-center">
            <main className="wiz-deploy-scroll overflow-y-auto flex-1 min-w-0" style={{ padding: "28px clamp(20px, 4vw, 56px)" }}>
              <div
                style={{
                  maxWidth: 760, width: "100%", margin: "0 auto",
                  borderRadius: 18,
                  background: "var(--app-deploy-card-bg)",
                  border: "1px solid var(--app-border)",
                  boxShadow: "var(--app-wizard-floating-shadow)",
                  boxSizing: "border-box",
                  overflow: "hidden",
                  animation: "wizFade 0.28s ease",
                }}
              >
                <div style={{ padding: "22px clamp(20px, 3vw, 32px) 18px", background: "var(--app-deploy-card-header)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 7,
                          padding: "5px 11px", borderRadius: 999,
                          background: "color-mix(in srgb, var(--app-text-success) 12%, var(--app-shell-bg-elevated))",
                          border: "1px solid color-mix(in srgb, var(--app-text-success) 35%, transparent)",
                          color: "var(--app-text-success)",
                          fontSize: 11, fontWeight: 600,
                        }}>
                          <span style={{
                            width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                            border: "1.5px solid color-mix(in srgb, currentColor 45%, transparent)",
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                          </span>
                          Validated & ready
                        </span>
                      </div>
                      <div style={{ color: "var(--app-text-primary)", fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>
                        {displayTitle} object
                      </div>
                      <div style={{ color: "var(--app-text-muted)", fontSize: 13, lineHeight: 1.55, maxWidth: 560 }}>
                        <span style={{ color: "var(--app-text-secondary)", fontWeight: 600 }}>
                          Type · {objectType}
                        </span>
                        {" — "}
                        this deploy publishes <strong style={{ color: "var(--app-text-secondary)", fontWeight: 600 }}>{displayTitle}</strong>
                        {" "}with {fields.length} field{fields.length === 1 ? "" : "s"}
                        {relationFieldCount > 0 ? ` and ${relationFieldCount} relationship${relationFieldCount === 1 ? "" : "s"}` : ""}
                        {" "}so it is ready to use on the graph.
                        {description.trim() ? ` ${description.trim()}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      title="Edit object"
                      aria-label="Edit object"
                      onClick={() => setStep("step1")}
                      style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        border: "1px solid var(--app-border)",
                        background: "var(--app-shell-bg-elevated)",
                        color: "var(--app-text-secondary)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                  </div>

                  <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", marginTop: 18 }}>
                    {[
                      { label: "Objects", value: 1, tone: "var(--app-stat-object)", soft: "var(--app-stat-object-soft)" },
                      { label: "Fields", value: fields.length, tone: "var(--app-stat-field)", soft: "var(--app-stat-field-soft)" },
                      { label: "Relationships", value: relationFieldCount, tone: "var(--app-stat-link)", soft: "var(--app-stat-link-soft)" },
                      { label: "Validation", value: "Passed", tone: "var(--app-stat-validation)", soft: "var(--app-stat-validation-soft)" },
                    ].map(stat => (
                      <div
                        key={stat.label}
                        style={{
                          padding: "12px 14px", borderRadius: 12, background: stat.soft,
                          border: `1px solid color-mix(in srgb, ${stat.tone} 42%, var(--app-border-subtle))`,
                          position: "relative", overflow: "hidden",
                        }}
                      >
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: stat.tone, borderRadius: "3px 0 0 3px" }} />
                        <div style={{ color: "var(--app-stat-label)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>
                          {stat.label.toUpperCase()}
                        </div>
                        <div style={{
                          color: typeof stat.value === "string" ? stat.tone : "var(--app-text-primary)",
                          fontSize: typeof stat.value === "number" ? 24 : 15,
                          fontWeight: 600,
                          letterSpacing: typeof stat.value === "number" ? "-0.02em" : undefined,
                        }}>
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: "20px clamp(20px, 3vw, 32px) 28px" }}>
                  <div className="flex items-center justify-between gap-3" style={{ marginBottom: 12 }}>
                    <div style={{ color: "var(--app-text-secondary)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>
                      Object details
                    </div>
                    <div style={{ color: "var(--app-text-subtle)", fontSize: 11 }}>
                      Tap to inspect fields
                    </div>
                  </div>
                  <div
                    style={{
                      borderRadius: 14,
                      border: "1px solid var(--app-border)",
                      background: inspectDeployFields ? "var(--app-ai-row-tint)" : "var(--app-shell-bg-elevated)",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setInspectDeployFields(v => !v)}
                      className="flex items-center gap-3 px-3.5 py-3 text-left"
                      style={{ border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", width: "100%" }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        background: "color-mix(in srgb, var(--app-graph-object) 16%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--app-graph-object) 32%, transparent)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--app-graph-object)", fontSize: 12, fontWeight: 600,
                      }}>
                        1
                      </div>
                      <div className="min-w-0 flex-1">
                        <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600 }}>{displayTitle}</div>
                        <div style={{ color: "var(--app-text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {description.trim() || "No description"}
                        </div>
                      </div>
                      <div style={{
                        padding: "3px 8px", borderRadius: 999,
                        background: "var(--app-shell-bg-subtle)",
                        border: "1px solid var(--app-border-subtle)",
                        color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, flexShrink: 0,
                      }}>
                        {fields.length} fields
                      </div>
                      {inspectDeployFields
                        ? <ChevronDown size={14} style={{ color: "var(--app-text-muted)" }} />
                        : <ChevronRight size={14} style={{ color: "var(--app-text-muted)" }} />}
                    </button>
                    {inspectDeployFields && (
                      <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--app-border-subtle)" }}>
                        <div style={{ color: "var(--app-text-subtle)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", margin: "12px 0 8px" }}>
                          FIELDS
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {fields.map(f => (
                            <span
                              key={f.id}
                              style={{
                                padding: "5px 9px", borderRadius: 8,
                                border: "1px solid var(--app-border-subtle)",
                                background: "var(--app-shell-bg-subtle)",
                                color: "var(--app-text-secondary)",
                                fontSize: 11, fontWeight: 500,
                              }}
                            >
                              {f.label || f.fieldType}
                              {f.isPrimary ? " · PRIMARY" : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  // STEP 1 — Object info (name, type, title, description)
  if (step === "step1") {
    return (
      <>
        <style>{`
          @keyframes wizFade{from{opacity:0}to{opacity:1}}
          .wiz-form-scroll::-webkit-scrollbar{width:6px}
          .wiz-form-scroll::-webkit-scrollbar-thumb{background:var(--app-scrollbar-thumb);border-radius:999px}
          .wiz-form-scroll::-webkit-scrollbar-track{background:transparent}
        `}</style>

        <div
          className="fixed inset-0 z-[60] flex flex-col font-sans"
          style={{
            background: "color-mix(in srgb, var(--app-shell-bg-elevated) 86%, transparent)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            animation: "wizFade 0.22s ease",
          }}
        >
          <div className="relative flex items-center gap-4 px-6 shrink-0"
            style={{ height: 56, borderBottom: "1px solid var(--app-border)", background: "var(--app-shell-bg-elevated)" }}>
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <button type="button" onClick={onClose} aria-label="Close wizard" style={{ ...BTN_GHOST, width: 32, height: 32, placeContent: "center", padding: 0 }}><X size={16} /></button>
              <div style={{ width: 1, height: 22, background: "var(--app-border)", flexShrink: 0 }} />
              <div className="min-w-0 overflow-hidden">
                <div style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {headerObjectTitle}
                </div>
                <div style={{ color: "var(--app-text-muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {headerObjectSub}
                </div>
              </div>
            </div>
            <div className="absolute left-1/2 top-1/2" style={{ transform: "translate(-50%, -50%)" }}>
              <WizardStepIndicator
                current={1}
                maxReachable={maxReachableStep}
                onSelect={navigateToStep}
                freeNavigate={isDraftMode}
              />
            </div>
            <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
              {isDraftMode ? (
                <button
                  type="button"
                  onClick={() => { void finishAndClose(); }}
                  disabled={!canSaveDraft}
                  title={!canSaveDraft ? draftSaveHint : undefined}
                  style={{
                    flexShrink: 0,
                    ...(canSaveDraft ? BTN_PRIMARY : BTN_DISABLED),
                    ...(deploying ? { cursor: "wait" } : {}),
                  }}
                >
                  {deploying ? "Saving…" : draftSaveLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => canContinueStep1 && goToStep2()}
                  disabled={!canContinueStep1}
                  style={{
                    ...BTN_PRIMARY,
                    flexShrink: 0,
                    ...(canContinueStep1
                      ? {}
                      : {
                          background: "var(--app-border-subtle)",
                          color: "var(--app-text-subtle)",
                          boxShadow: "none",
                          cursor: "not-allowed",
                        }),
                  }}
                >
                  Continue
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-1 min-h-0 justify-center">
            <main className="wiz-form-scroll overflow-y-auto flex-1 min-w-0" style={{ padding: "32px clamp(24px, 5vw, 72px)" }}>
              <div style={{
                maxWidth: 640, width: "100%", margin: "0 auto",
                minHeight: "calc(100% - 8px)",
                display: "flex", flexDirection: "column",
                padding: "32px clamp(24px, 3vw, 40px)",
                borderRadius: 16,
                background: "var(--app-shell-bg-elevated)",
                border: "1px solid var(--app-border)",
                boxShadow: "var(--app-wizard-floating-shadow)",
                boxSizing: "border-box",
              }}>
                <WizSectionHeader
                  title="Object info"
                  desc="Name the object and set how it appears in the API and on the graph."
                />

                <div style={{ marginBottom: 18 }}>
                  <div style={FIELD_LABEL}>
                    Object name <span style={{ color: "var(--app-text-danger)" }}>*</span>
                    {isEdit && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: "var(--app-text-muted)" }}>(locked after save)</span>}
                  </div>
                  <input style={INPUT}
                    value={objectName}
                    readOnly={isEdit}
                    onChange={e => {
                      if (isEdit) return;
                      setObjectName(slugObjectName(e.target.value));
                    }}
                    placeholder="e.g. employee, lead, invoice"
                    autoFocus={!isEdit}
                  />
                  <p style={{ margin: "6px 0 0", color: "var(--app-text-subtle)", fontSize: 11 }}>Lowercase, numbers, underscores</p>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div style={FIELD_LABEL}>
                    Object type <span style={{ color: "var(--app-text-danger)" }}>*</span>
                  </div>
                  <div
                    role="radiogroup"
                    aria-label="Object type"
                    style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
                  >
                    {(["Normal", "Assignment", "Collection", "Questionnaire"] as ObjectType[]).map(ot => (
                      <Radio
                        key={ot}
                        label={OBJECT_TYPE_META[ot].title}
                        checked={objectType === ot}
                        onChange={() => setObjectType(ot)}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div style={FIELD_LABEL}>Title</div>
                  <input style={INPUT}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Employee"
                  />
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 160 }}>
                  <div style={FIELD_LABEL}>Description</div>
                  <textarea
                    style={{
                      ...INPUT,
                      flex: 1,
                      minHeight: 140,
                      resize: "vertical",
                      lineHeight: 1.6,
                    }}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What does this object represent?"
                    rows={6}
                  />
                </div>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  // STEP 3 — Advanced settings (optional) + Build / Deploy
  if (step === "step3") {
    const configuredAdvancedCount = OBJ_ADV_NAV.filter(
      n => n.id !== "primary" && isObjAdvSectionConfigured(objectSettings, n.id),
    ).length;

    const renderAdvNavItem = (
      id: ObjAdvSection,
      label: string,
      desc: string,
      Icon: React.ElementType,
      opts?: { configured?: boolean; suggested?: boolean },
    ) => {
      const active = advSettingsSection === id;
      return (
        <button
          key={id}
          type="button"
          onClick={() => setAdvSettingsSection(id)}
          className="flex items-start gap-3 w-full text-left"
          style={{
            padding: "8px 12px",
            borderRadius: 0,
            borderTop: "none",
            borderRight: "none",
            borderBottom: "none",
            borderLeft: active ? "2px solid var(--app-accent)" : "2px solid transparent",
            cursor: "pointer",
            background: active ? "var(--app-shell-bg-accent)" : "transparent",
            transition: "background 0.15s",
            marginBottom: 2,
          }}
        >
          <Icon size={14} style={{ color: active ? "var(--app-accent-light)" : "var(--app-text-subtle)", marginTop: 2, flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", color: active ? "var(--app-text-primary)" : "var(--app-text-secondary)", fontSize: 13, fontWeight: active ? 600 : 500 }}>
              {label}
            </span>
            <span style={{ display: "block", color: "var(--app-text-subtle)", fontSize: 11, fontWeight: 400, lineHeight: 1.4, marginTop: 2 }}>
              {desc}
            </span>
          </span>
          {opts?.configured && !active && (
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399", marginTop: 6, flexShrink: 0 }} />
          )}
          {opts?.suggested && (
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FCD34D", marginTop: 6, flexShrink: 0 }} />
          )}
        </button>
      );
    };

    const draftHeaderActions = (
      <button
        type="button"
        onClick={() => { void finishAndClose(); }}
        disabled={!canSaveDraft}
        title={!canSaveDraft ? draftSaveHint : undefined}
        style={{
          flexShrink: 0,
          ...(canSaveDraft ? BTN_PRIMARY : BTN_DISABLED),
          ...(deploying ? { cursor: "wait" } : {}),
        }}
      >
        {deploying ? "Saving…" : draftSaveLabel}
      </button>
    );

    const lifecycleActions = isEdit ? (
      <button
        type="button"
        onClick={finishAndClose}
        disabled={!canDeploy}
        title={!canDeploy ? deployBlockers.join(" · ") : undefined}
        style={{ ...(canDeploy ? BTN_PRIMARY : BTN_DISABLED), flexShrink: 0 }}
      >
        <Zap size={14} /> Save
      </button>
    ) : isDraftMode ? (
      draftHeaderActions
    ) : (
      <button
        type="button"
        onClick={() => {
          if (built) setStep("deployReview");
          else if (canBuild) void runBuild();
        }}
        disabled={building || deploying || (!built && !canBuild)}
        title={!built && !canBuild ? deployBlockers.join(" · ") : undefined}
        style={{
          flexShrink: 0,
          ...((built || (canBuild && !building)) ? BTN_PRIMARY : BTN_DISABLED),
          ...(building ? { cursor: "wait" } : {}),
        }}
      >
        {building ? "Building…" : built ? (
          <>Review deploy <ChevronRight size={14} /></>
        ) : (
          <>Build <ChevronRight size={14} /></>
        )}
      </button>
    );

    return (
      <>
        <style>{`
          @keyframes wizFade{from{opacity:0}to{opacity:1}}
          .wiz-form-scroll::-webkit-scrollbar,
          .obj-adv-nav-scroll::-webkit-scrollbar{width:6px}
          .wiz-form-scroll::-webkit-scrollbar-thumb,
          .obj-adv-nav-scroll::-webkit-scrollbar-thumb{background:var(--app-scrollbar-thumb);border-radius:999px}
          .wiz-form-scroll::-webkit-scrollbar-track,
          .obj-adv-nav-scroll::-webkit-scrollbar-track{background:transparent}
        `}</style>

        <div
          className="fixed inset-0 z-[60] flex flex-col font-sans"
          style={{
            background: "color-mix(in srgb, var(--app-shell-bg-elevated) 86%, transparent)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            animation: "wizFade 0.22s ease",
          }}
        >
          <div className="relative flex items-center gap-4 px-6 shrink-0"
            style={{ height: 56, borderBottom: "1px solid var(--app-border)", background: "var(--app-shell-bg-elevated)" }}>
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <button type="button" onClick={() => setStep("step2")} style={{ ...BTN_GHOST, flexShrink: 0, color: "var(--app-text-muted)" }}>
                <ArrowLeft size={14} /> Back
              </button>
              <div style={{ width: 1, height: 22, background: "var(--app-border)", flexShrink: 0 }} />
              <div className="min-w-0 overflow-hidden">
                <div style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {headerObjectTitle}
                </div>
                <div style={{ color: "var(--app-text-muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {headerObjectSub}
                </div>
              </div>
            </div>
            <div className="absolute left-1/2 top-1/2" style={{ transform: "translate(-50%, -50%)" }}>
              <WizardStepIndicator
                current={3}
                maxReachable={maxReachableStep}
                onSelect={navigateToStep}
                freeNavigate={isDraftMode}
              />
            </div>
            <div className="flex items-center justify-end flex-1 min-w-0">
              {lifecycleActions}
            </div>
          </div>

          {(requiredBlockers.length > 0 || buildErrors.length > 0) && (
            <div className="px-5 font-sans shrink-0"
              style={{
                paddingTop: 6,
                paddingBottom: 6,
                boxSizing: "border-box",
                background: buildErrors.length > 0 ? "var(--app-status-banner-error-bg)" : "var(--app-status-banner-warn-bg)",
                borderBottom: `1px solid ${buildErrors.length > 0 ? "var(--app-status-banner-error-border)" : "var(--app-status-banner-warn-border)"}`,
              }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ color: buildErrors.length > 0 ? "var(--app-status-banner-error-text)" : "var(--app-status-banner-warn-text)", fontSize: 11, fontWeight: 400, flexShrink: 0, lineHeight: 1.35 }}>
                  {buildErrors.length > 0 ? "Build failed:" : "To build:"}
                </span>
                {(buildErrors.length > 0 ? buildErrors : requiredBlockers).map((b, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span
                        aria-hidden
                        style={{
                          color: buildErrors.length > 0 ? "var(--app-status-banner-error-text)" : "var(--app-status-banner-warn-text)",
                          fontSize: 11, fontWeight: 400, opacity: 0.55, lineHeight: 1.35,
                        }}
                      >
                        |
                      </span>
                    )}
                    <button type="button" onClick={() => focusBlocker(b)}
                      style={{
                        color: buildErrors.length > 0 ? "var(--app-status-banner-item-text)" : "var(--app-status-banner-warn-item-text)", fontSize: 11, fontWeight: 400, lineHeight: 1.35,
                        background: b.fieldId ? "var(--app-status-banner-chip-bg)" : "none",
                        border: b.fieldId
                          ? `1px solid ${buildErrors.length > 0 ? "var(--app-status-banner-error-chip-border)" : "var(--app-status-banner-chip-border)"}`
                          : "none",
                        borderRadius: 6,
                        padding: b.fieldId ? "1px 8px" : 0, cursor: b.fieldId ? "pointer" : "default",
                      }}>
                      {b.message}{b.fieldId ? " ->" : ""}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {(building || deploying) && (
            <div className="fixed inset-0 z-[65] flex items-center justify-center"
              style={{ background: "var(--app-shell-bg-overlay)", backdropFilter: "blur(6px)" }}>
              <div style={STATUS_DIALOG}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                  border: "3px solid var(--app-border-accent)", borderTopColor: "var(--app-accent)",
                  animation: "spin 0.8s linear infinite",
                  boxSizing: "border-box",
                }} />
                <div style={{ color: "var(--app-text-primary)", fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>
                  {deploying
                    ? (isDraftMode ? "Saving object…" : "Deploying object…")
                    : "Building object…"}
                </div>
                <div style={{ color: "var(--app-text-muted)", fontSize: 13, fontWeight: 500, lineHeight: 1.45 }}>
                  {deploying
                    ? (isDraftMode
                      ? "Updating this object in your template suite…"
                      : "Publishing object to your graph…")
                    : "Validating fields and relationships"}
                </div>
              </div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          <div className="flex flex-1 min-h-0 w-full">
              <aside
                className="shrink-0 flex flex-col min-h-0"
                style={{
                  width: 280,
                  borderRight: "1px solid var(--app-border-subtle)",
                  padding: "20px 10px 24px 24px",
                  background: "color-mix(in srgb, var(--app-shell-bg-elevated) 92%, transparent)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                }}
              >
                <div style={{ padding: "0 4px 14px", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
                      <span style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
                        Advanced settings
                      </span>
                      <span style={{ color: "var(--app-text-muted)", fontSize: 11, fontWeight: 400, lineHeight: 1.4 }}>
                        (optional)
                      </span>
                    </div>
                    {configuredAdvancedCount > 0 && (
                      <span style={{
                        marginLeft: "auto", flexShrink: 0,
                        fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
                        background: "var(--app-shell-bg-accent)", color: "var(--app-text-accent-muted)",
                      }}>
                        {configuredAdvancedCount}
                      </span>
                    )}
                  </div>
                  <div style={{ color: "var(--app-text-muted)", fontSize: 11, lineHeight: 1.4, marginTop: 4 }}>
                    Configure now or continue to build
                  </div>
                </div>

                <div className="obj-adv-nav-scroll flex-1 min-h-0" style={{ overflowY: "auto" }}>
                  {OBJ_ADV_NAV_GROUPS.map(group => {
                    const items = group.sections
                      .map(id => OBJ_ADV_NAV.find(n => n.id === id))
                      .filter(n => n && n.id !== "primary") as typeof OBJ_ADV_NAV;
                    if (items.length === 0) return null;
                    return (
                      <div key={group.label} style={{ marginBottom: 4 }}>
                        <div style={{ color: "var(--app-text-subtle)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", padding: "8px 4px 4px" }}>
                          {group.label.toUpperCase()}
                        </div>
                        {items.map(item => renderAdvNavItem(
                          item.id,
                          item.label,
                          OBJ_ADV_SECTION_DESC[item.id].split(".")[0],
                          item.icon,
                          {
                            configured: isObjAdvSectionConfigured(objectSettings, item.id),
                            suggested: step3Suggestions.some(s => s.section === item.id),
                          },
                        ))}
                      </div>
                    );
                  })}
                </div>
              </aside>

              <main className="flex flex-col flex-1 min-w-0 min-h-0">
                <div className="flex-1 min-h-0 overflow-hidden" style={{ padding: "20px 24px 24px 20px" }}>
                  <div style={{
                    width: "100%", height: "100%",
                    display: "flex", flexDirection: "column", minHeight: 0,
                    borderRadius: 16,
                    background: "color-mix(in srgb, var(--app-shell-bg-elevated) 94%, transparent)",
                    border: "1px solid var(--app-border)",
                    overflow: "hidden",
                  }}>
                    <ObjectAdvancedPanel
                      settings={objectSettings}
                      onChange={setObjectSettings}
                      onBack={() => setStep("step2")}
                      objectType={objectType}
                      fields={settingsFields}
                      primaryField={primaryFieldEditor}
                      controlledActive={advSettingsSection}
                      onActiveChange={setAdvSettingsSection}
                      excludeSections={["primary"]}
                      hideNav
                      hideHeader
                      contentOnly
                      identityContext={{
                        apiName: objectName,
                        displayName: title.trim() || objectName,
                        description,
                        primaryFieldLabel: priLabel,
                        primaryFieldType: priFieldType,
                      }}
                    />
                  </div>
                </div>
              </main>
            </div>
        </div>
      </>
    );
  }

  // STEP 2 — Field configurations
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2 — graph-integrated: LEFT palette + CENTER card + RIGHT properties
  // ─────────────────────────────────────────────────────────────────────────────
  const hasStatusBanner = requiredBlockers.length > 0 || buildErrors.length > 0;
  const statusBannerItems = buildErrors.length > 0 ? buildErrors : requiredBlockers;
  /** Match Step 1 chrome height (56). Product bar is hidden while the wizard is open. */
  const STEP2_HEADER_H = 56;
  // Match measured banner: padding 6+6 + ~16px line → 28; extra rows wrap at ~4 chips.
  const statusBannerHeight = hasStatusBanner
    ? 28 + Math.max(0, Math.ceil(statusBannerItems.length / 4) - 1) * 24
    : 0;
  const step2BodyTop = STEP2_HEADER_H + statusBannerHeight;
  const fieldCardTop = step2BodyTop + 16;
  const fieldCardBottomPad = 16;
  const fieldCardMaxH = `calc(100vh - ${fieldCardTop + fieldCardBottomPad}px)`;

  const leftPanelW = viewportW < 1280 ? 188 : 200;
  // Help text / Advanced settings: restore prior wide sidebar + compact center field card
  const rightPanelW = showAdvanced || showHelpText
    ? Math.min(676, Math.max(560, Math.floor(viewportW * 0.48)))
    : (viewportW < 1280 ? 320 : 340);
  const sideGap = 16;
  const advOpen = showAdvanced || showHelpText;
  const middleLaneW = viewportW - leftPanelW - rightPanelW;
  const cardCompact = advOpen || middleLaneW < 440 + sideGap * 2;
  const fieldCardMax = cardCompact ? (advOpen ? 260 : 280) : Math.min(440, Math.max(300, middleLaneW - sideGap * 2));
  const fieldCardW = `min(${fieldCardMax}px, calc(100vw - ${leftPanelW + rightPanelW + sideGap * 2}px))`;
  const fieldCardLeft = `calc(${leftPanelW}px + (100vw - ${leftPanelW + rightPanelW}px) / 2)`;

  return (
    <>
      <style>{`
        @keyframes slideFromLeft{from{transform:translateX(-20px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes slideFromRight{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes dropIn{from{transform:translateX(-50%) translateY(-10px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
        @keyframes versionPopIn{from{transform:translateY(-8px) scale(0.96);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .field-card-scroll::-webkit-scrollbar{width:6px}
        .field-card-scroll::-webkit-scrollbar-thumb{background:var(--app-scrollbar-thumb);border-radius:999px}
        .field-card-scroll::-webkit-scrollbar-track{background:transparent}
      `}</style>

      {/* Header — same top chrome as Step 1 (no product bar underneath) */}
      <div className="fixed z-[62] left-0 right-0 flex items-center gap-4 px-6 font-sans"
        style={{ top: 0, height: STEP2_HEADER_H, background: "var(--app-shell-bg-elevated)", borderBottom: "1px solid var(--app-border)" }}>

        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button type="button" onClick={() => setStep("step1")} style={{ ...BTN_GHOST, flexShrink: 0, color: "var(--app-text-muted)" }}><ArrowLeft size={14} /> Back</button>
          <div style={{ width: 1, height: 22, background: "var(--app-border)", flexShrink: 0 }} />
          <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            <div style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {headerObjectTitle}
            </div>
            <div style={{ color: "var(--app-text-muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {headerObjectSub}
            </div>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2" style={{ transform: "translate(-50%, -50%)" }}>
          <WizardStepIndicator
            current={2}
            maxReachable={maxReachableStep}
            onSelect={navigateToStep}
            freeNavigate={isDraftMode}
          />
        </div>

        <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
          {isDraftMode ? (
            <button
              type="button"
              onClick={() => { void finishAndClose(); }}
              disabled={!canSaveDraft}
              title={!canSaveDraft ? draftSaveHint : undefined}
              style={{
                flexShrink: 0,
                ...(canSaveDraft ? BTN_PRIMARY : BTN_DISABLED),
                ...(deploying ? { cursor: "wait" } : {}),
              }}
            >
              {deploying ? "Saving…" : draftSaveLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => canContinueStep2 && goToStep3()}
              disabled={!canContinueStep2}
              title={!canContinueStep2
                ? (!primaryConfigured
                  ? "Set the primary field label and name"
                  : `Add at least ${MIN_OBJECT_FIELDS} fields (primary + one more)`)
                : undefined}
              style={{
                ...BTN_PRIMARY,
                flexShrink: 0,
                ...(canContinueStep2
                  ? {}
                  : {
                      background: "var(--app-border-subtle)",
                      color: "var(--app-text-subtle)",
                      boxShadow: "none",
                      cursor: "not-allowed",
                    }),
              }}
            >
              Continue
              <ChevronRight size={14} />
            </button>
          )}
        </div>
          </div>

          {hasStatusBanner && (
        <div className="fixed z-[62] left-0 right-0 px-5 font-sans"
          style={{
            top: STEP2_HEADER_H,
            paddingTop: 6,
            paddingBottom: 6,
            boxSizing: "border-box",
            background: buildErrors.length > 0 ? "var(--app-status-banner-error-bg)" : "var(--app-status-banner-warn-bg)",
            borderBottom: `1px solid ${buildErrors.length > 0 ? "var(--app-status-banner-error-border)" : "var(--app-status-banner-warn-border)"}`,
          }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ color: buildErrors.length > 0 ? "var(--app-status-banner-error-text)" : "var(--app-status-banner-warn-text)", fontSize: 11, fontWeight: 400, flexShrink: 0, lineHeight: 1.35 }}>
              {buildErrors.length > 0 ? "Build failed:" : "To continue:"}
            </span>
            {statusBannerItems.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <span
                    aria-hidden
                    style={{
                      color: buildErrors.length > 0 ? "var(--app-status-banner-error-text)" : "var(--app-status-banner-warn-text)",
                      fontSize: 11, fontWeight: 400, opacity: 0.55, lineHeight: 1.35,
                    }}
                  >
                    |
                  </span>
                )}
                <button type="button" onClick={() => focusBlocker(b)}
                  style={{
                    color: buildErrors.length > 0 ? "var(--app-status-banner-item-text)" : "var(--app-status-banner-warn-item-text)", fontSize: 11, fontWeight: 400, lineHeight: 1.35,
                    background: b.fieldId ? "var(--app-status-banner-chip-bg)" : "none",
                    border: b.fieldId
                      ? `1px solid ${buildErrors.length > 0 ? "var(--app-status-banner-error-chip-border)" : "var(--app-status-banner-chip-border)"}`
                      : "none",
                    borderRadius: 6,
                    padding: b.fieldId ? "1px 8px" : 0, cursor: b.fieldId ? "pointer" : "default",
                  }}>
                  {b.message}{b.fieldId ? " ->" : ""}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Body: LEFT + CENTER (over graph) + RIGHT */}
      <div className="fixed z-[60] left-0 right-0 flex font-sans"
        style={{ top: step2BodyTop, bottom: 0 }}>

        {/* LEFT — Field palette */}
        <div style={{ width: leftPanelW, flexShrink: 0, background: "color-mix(in srgb, var(--app-wizard-sidebar-bg) 90%, transparent)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderRight: "1px solid var(--app-border)", overflowY: "auto", scrollbarWidth: "none", animation: "slideFromLeft 0.22s ease" }}>
          <div className="px-4 pt-4 pb-2.5" style={{
            color: "var(--app-text-secondary)",
            fontSize: 10,
            letterSpacing: "0.14em",
            fontWeight: 700,
          }}>
            FIELD TYPES
          </div>
          {FIELD_TYPES.map(f => (
            <PaletteItem key={f.type} fieldType={f.type} Icon={f.icon} onClick={() => addField(f.type)} />
          ))}
          <div className="px-4 py-3 mt-1" style={{
            color: "var(--app-text-muted)",
            fontSize: 11,
            lineHeight: 1.6,
            fontWeight: 400,
          }}>
            Click to add or drag into the card →
          </div>
        </div>

        {/* CENTER — transparent; graph visible; floating card centered in the middle lane */}
        <div style={{ flex: 1, pointerEvents: "none", position: "relative" }}>
          <div style={{
            position: "fixed", top: fieldCardTop,
            left: fieldCardLeft,
            transform: "translateX(-50%)",
            width: fieldCardW,
            maxHeight: fieldCardMaxH,
            display: "flex",
            flexDirection: "column",
            background: "var(--app-shell-bg-floating-soft)",
            border: "1px solid var(--app-border)",
            borderRadius: 16, overflow: "hidden", pointerEvents: "auto",
            backdropFilter: "blur(5px) saturate(1.02)",
            WebkitBackdropFilter: "blur(5px) saturate(1.02)",
            boxShadow: "var(--app-wizard-floating-shadow)",
            animation: "dropIn 0.25s ease",
            transition: "width 0.22s cubic-bezier(0.25,0.46,0.45,0.94), left 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
          }}>

            {/* Card header */}
            <div className="flex items-center gap-2 px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--app-accent)", boxShadow: "0 0 8px rgba(99,102,241,0.8)", flexShrink: 0 }} />
              <span style={{
                color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600, flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{title.trim() || objectName}</span>
              {!cardCompact && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                    style={{ background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border)" }}>
                    <Search size={11} style={{ color: "var(--app-text-muted)" }} />
                    <span style={{ color: "var(--app-text-subtle)", fontSize: 11, minWidth: 55 }}>Search…</span>
                  </div>
                  <button
                    type="button"
                    title="Reset field order"
                    onClick={() => { setFieldSortDir(null); setGroupFieldsByType(false); }}
                    style={{ color: "var(--app-text-muted)", background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border)", cursor: "pointer", width: 27, height: 27, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget.style.color = "var(--app-text-primary)"); (e.currentTarget.style.background = "var(--app-border)"); }}
                    onMouseLeave={e => { (e.currentTarget.style.color = "var(--app-text-muted)"); (e.currentTarget.style.background = "var(--app-shell-bg-input)"); }}>
                    <RotateCcw size={12} />
                  </button>
                  <button
                    type="button"
                    title={fieldSortDir === "asc" ? "Sort Z–A" : fieldSortDir === "desc" ? "Clear sort" : "Sort A–Z"}
                    onClick={() => setFieldSortDir(d => (d === null ? "asc" : d === "asc" ? "desc" : null))}
                    style={{
                      color: fieldSortDir ? "var(--app-btn-action-text)" : "var(--app-text-muted)",
                      background: fieldSortDir ? "rgba(99,102,241,0.18)" : "var(--app-shell-bg-input)",
                      border: `1px solid ${fieldSortDir ? "var(--app-border-accent)" : "var(--app-border)"}`,
                      cursor: "pointer", width: 27, height: 27, borderRadius: 6,
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                    }}>
                    {fieldSortDir === "desc" ? <ArrowUpAZ size={12} /> : <ArrowDownAZ size={12} />}
                  </button>
                  <button
                    type="button"
                    title={groupFieldsByType ? "Ungroup fields" : "Group fields by type"}
                    onClick={() => setGroupFieldsByType(v => !v)}
                    style={{
                      color: groupFieldsByType ? "var(--app-btn-action-text)" : "var(--app-text-muted)",
                      background: groupFieldsByType ? "rgba(99,102,241,0.18)" : "var(--app-shell-bg-input)",
                      border: `1px solid ${groupFieldsByType ? "var(--app-border-accent)" : "var(--app-border)"}`,
                      cursor: "pointer", width: 27, height: 27, borderRadius: 6,
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                    }}>
                    <Group size={12} />
                  </button>
                  <button
                    type="button"
                    title="Prominent fields"
                    style={{ color: "var(--app-text-muted)", background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border)", cursor: "pointer", width: 27, height: 27, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget.style.color = "var(--app-text-primary)"); (e.currentTarget.style.background = "var(--app-border)"); }}
                    onMouseLeave={e => { (e.currentTarget.style.color = "var(--app-text-muted)"); (e.currentTarget.style.background = "var(--app-shell-bg-input)"); }}>
                    <Star size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Field list — grows with content until card max height, then scrolls */}
            <div
              ref={fieldListScrollRef}
              className="field-card-scroll"
              style={{
                flex: "1 1 auto",
                minHeight: 0,
                overflowY: "auto",
                overscrollBehavior: "contain",
              }}
            >
              <DropZone onDrop={addField} isEmpty={fields.length === 0}>
                {groupedFieldSections
                  ? groupedFieldSections.map(section => (
                    <div key={section.type}>
                      <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderTop: "1px solid var(--app-shell-bg-input)" }}>
                        <span style={{ color: "var(--app-text-muted)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>
                          {section.type.toUpperCase()}
                        </span>
                        <span style={{ color: "var(--app-text-subtle)", fontSize: 9 }}>{section.items.length}</span>
                        <div className="flex-1 h-px" style={{ background: "var(--app-border-subtle)" }} />
                      </div>
                      {section.items.map(f => (
                        <FieldRow
                          key={f.id} field={f}
                          isSelected={selectedFieldId === f.id}
                          onSelect={() => { setSelectedFieldId(f.id); setShowAdvanced(false); setShowHelpText(false); }}
                          onDelete={() => deleteField(f.id)}
                          onStar={() => toggleStar(f.id)}
                          onTrack={() => toggleTrack(f.id)}
                          canDelete={!f.isPrimary}
                          starDisabled={!f.starred && prominentCount >= MAX_PROMINENT_FIELDS}
                          starTitle={
                            !f.starred && prominentCount >= MAX_PROMINENT_FIELDS
                              ? `Maximum ${MAX_PROMINENT_FIELDS} prominent fields`
                              : f.starred ? "Remove from prominent" : "Mark as prominent (max 5)"
                          }
                          compact={cardCompact}
                        />
                      ))}
                    </div>
                  ))
                  : orderedFields.map(f => (
                    <FieldRow
                      key={f.id} field={f}
                      isSelected={selectedFieldId === f.id}
                      onSelect={() => { setSelectedFieldId(f.id); setShowAdvanced(false); setShowHelpText(false); }}
                      onDelete={() => deleteField(f.id)}
                      onStar={() => toggleStar(f.id)}
                      onTrack={() => toggleTrack(f.id)}
                      canDelete={!f.isPrimary}
                      starDisabled={!f.starred && prominentCount >= MAX_PROMINENT_FIELDS}
                      starTitle={
                        !f.starred && prominentCount >= MAX_PROMINENT_FIELDS
                          ? `Maximum ${MAX_PROMINENT_FIELDS} prominent fields`
                          : f.starred ? "Remove from prominent" : "Mark as prominent (max 5)"
                      }
                      compact={cardCompact}
                    />
                  ))}
                {fields.length > 0 && !cardCompact && (
                  <div className="flex items-center gap-2 px-4 py-2.5 cursor-default"
                    style={{ borderTop: "1px solid var(--app-border-subtle)", color: "var(--app-text-muted)" }}>
                    <Plus size={12} />
                    <span style={{ fontSize: 11, fontWeight: 500 }}>Click a field type on the left to add more</span>
                  </div>
                )}
                <div ref={fieldListBottomRef} aria-hidden style={{ height: 1, width: "100%" }} />
              </DropZone>
            </div>

            {/* Footer — slim status while compact */}
            <div className="shrink-0" style={{ borderTop: "1px solid var(--app-border-subtle)", background: "rgba(99,102,241,0.04)" }}>
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--app-accent)", boxShadow: "0 0 5px var(--app-accent)" }} />
                  <span style={{ color: "var(--app-accent)", fontSize: 10, fontWeight: 600 }}>
                    {cardCompact ? "LIVE" : "LIVE IN GRAPH"}
                  </span>
                </div>
                <span style={{ color: fields.length < MIN_OBJECT_FIELDS ? "var(--app-text-danger-soft)" : "var(--app-text-muted)", fontSize: 10 }}>
                  {cardCompact
                    ? `${fields.length} fields`
                    : (
                      <>
                        {fields.length}/{MIN_OBJECT_FIELDS} min fields · {prominentCount}/{MAX_PROMINENT_FIELDS} prominent
                        {!isEdit && (
                          <span style={{ marginLeft: 8, color: built ? "#34D399" : "var(--app-text-muted)" }}>
                            · {built ? "Built" : "Draft"}
                          </span>
                        )}
                      </>
                    )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Properties OR Advanced OR Object Settings */}
        {(selectedField || (!selectedField)) && (
          <div style={{
            width: rightPanelW,
            flexShrink: 0,
            background: "color-mix(in srgb, var(--app-wizard-sidebar-bg) 90%, transparent)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderLeft: "1px solid var(--app-border)",
            display: "flex",
            flexDirection: "column",
            animation: "slideFromRight 0.22s ease",
            transition: "width 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
          }}>
            {selectedField ? (
              selectedField.isPrimary ? (
                <PrimaryFieldPropertiesPanel
                  field={selectedField}
                  priFieldType={priFieldType}
                  fieldTracking={fieldTracking}
                  onUpdate={updateField}
                  onFieldTypeChange={setPriFieldType}
                  onFieldTrackingChange={v => {
                    handleFieldTrackingChange(v);
                    updateField(selectedField.id, { tracked: v });
                  }}
                />
              ) : showAdvanced ? (
                <AdvancedPanel field={selectedField} onUpdate={updateField} onBack={() => setShowAdvanced(false)} />
              ) : showHelpText ? (
                <HelpTextPanel field={selectedField} onUpdate={updateField} onBack={() => setShowHelpText(false)} />
              ) : (
                <FieldPropertiesPanel field={selectedField} onUpdate={updateField} onAdvanced={() => { setShowAdvanced(true); setShowHelpText(false); }} onHelpText={() => { setShowHelpText(true); setShowAdvanced(false); }} availableObjects={availableObjects} />
              )
            ) : (
              <RightPanelHint onConfigureFeatures={openObjectFeatures} />
            )}
          </div>
        )}
      </div>
    </>
  );
}
