import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  X, ArrowLeft, Sparkles, Zap, Check, Trash2, Plus,
  Type, Mail, Calendar, ListFilter, Hash, DollarSign,
  Paperclip, Link2, Globe, GitBranch, AlignLeft, Lock, Clock,
  Layers, MoreHorizontal, Mic, ChevronDown, ChevronRight,
  AlertTriangle, Loader2, Circle, Download, Palette,
  Pencil, Settings2,
} from "lucide-react";
import {
  wizardFieldToGraph,
  type PanelPreviewNode,
  type PanelPreviewEdge,
} from "./create-object-wizard";
import {
  type GenField,
  type GenObject,
  type GenSuite,
  type AgentTask,
  type AgentTaskStatus,
  type ExecutionPlan,
  type ThinkingStep,
  type ValidationResult,
  enrichLookupRelations,
  buildSuiteObjEdges,
  buildExecutionPlan,
  buildPlanningNarrative,
  detectClarificationNeeds,
  isGenericSuiteInference,
  buildInitialAgentTasks,
  buildStageChecklist,
  tasksForGenerationTick,
  markTask,
  validateGeneratedSuite,
  autoFixValidationIssues,
  applyChangePrompt,
  rewriteSuiteFromFeedback,
  AGENT_CAPABILITIES,
  buildClarificationChoices,
  buildReanalysisNarrative,
} from "./create-object-ai-agent";

// ─── FIELD TYPE MAPS ───────────────────────────────────────────────────────────
const FT_COLOR: Record<string, string> = {
  "Single-Line": "var(--app-text-secondary)", "Email Address": "#C084FC", "Date Picker": "#FCD34D",
  "Drop-Down": "var(--app-text-danger)", "Multi Select": "var(--app-text-danger)", "Number": "#60A5FA",
  "Currency": "#FCD34D", "Image": "var(--app-text-secondary)", "Lookup": "var(--app-accent-light)",
  "Geolocation": "#34D399", "Master Details": "var(--app-accent-light)", "Multi Line": "var(--app-text-secondary)",
  "Password": "var(--app-text-danger)", "Date & Time": "#FCD34D",
};
const FT_ICON: Record<string, React.ElementType> = {
  "Single-Line": Type, "Email Address": Mail, "Date Picker": Calendar,
  "Drop-Down": ListFilter, "Multi Select": Layers, "Number": Hash,
  "Currency": DollarSign, "Image": Paperclip, "Lookup": Link2,
  "Geolocation": Globe, "Master Details": GitBranch, "Multi Line": AlignLeft,
  "Password": Lock, "Date & Time": Clock,
};

const EDITABLE_FIELD_TYPES = [
  "Single-Line", "Multi Line", "Email Address", "Number", "Currency",
  "Drop-Down", "Multi Select", "Date Picker", "Date & Time", "Lookup", "Image",
] as const;

const QUICK_STARTS = [
  { label: "CRM", prompt: "CRM app with leads, deals and accounts" },
  { label: "HR", prompt: "HR system for employees, payroll and leave" },
  { label: "Commerce", prompt: "E-commerce store with orders and products" },
  { label: "Projects", prompt: "Project management with tasks and sprints" },
  { label: "Finance", prompt: "Finance app with invoices and expenses" },
  { label: "IT Service", prompt: "IT service desk with tickets, assets and incidents" },
] as const;

const INPUT: React.CSSProperties = {
  width: "100%", background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border-strong)",
  borderRadius: 8, padding: "8px 11px", color: "var(--app-text-primary)", fontSize: 13, outline: "none",
  transition: "border-color 0.2s", fontFamily: "inherit", boxSizing: "border-box",
};

const FIELD_LABEL: React.CSSProperties = {
  color: "var(--app-text-secondary)", fontSize: 11, marginBottom: 6, display: "block",
};

const BTN_PRIMARY: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px",
  borderRadius: 8, border: "none", cursor: "pointer", background: "var(--app-btn-primary-bg)",
  color: "var(--app-btn-primary-text)", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
  boxShadow: "0 2px 8px var(--app-btn-primary-shadow)",
};

const BTN_OUTLINE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px",
  borderRadius: 8, cursor: "pointer", background: "transparent",
  border: "1px solid var(--app-border)", color: "var(--app-text-primary)",
  fontSize: 13, fontWeight: 500, fontFamily: "inherit",
};

const BTN_DISABLED: React.CSSProperties = {
  ...BTN_OUTLINE,
  background: "var(--app-border-subtle)",
  border: "1px solid var(--app-border-subtle)",
  color: "var(--app-text-subtle)",
  boxShadow: "none",
  cursor: "not-allowed",
};

const BTN_GHOST: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent",
  cursor: "pointer", color: "var(--app-text-muted)", fontSize: 13, fontFamily: "inherit", padding: "4px 8px",
};

/** Left-chat choice chips + CTA actions — medium weight, left-aligned. */
const CHAT_ACTION_BTN: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  height: "auto",
  minHeight: 40,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--app-border-accent)",
  background: "var(--app-shell-bg-accent)",
  color: "var(--app-text-primary)",
  fontSize: 12,
  fontWeight: 500,
  fontFamily: "inherit",
  justifyContent: "flex-start",
  textAlign: "left",
  whiteSpace: "normal",
  lineHeight: 1.4,
  cursor: "pointer",
  boxShadow: "0 1px 0 color-mix(in srgb, var(--app-accent) 12%, transparent)",
  transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
};

const AI_FIELD_NAV_W = 108;
const AI_FIELD_NAV_INSET = 12;

function fieldApiName(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "") || "field";
}

function AiToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 38, height: 20, borderRadius: 9999, position: "relative", flexShrink: 0,
        background: value ? "var(--app-accent)" : "var(--app-toggle-off)",
        border: "none", cursor: "pointer", transition: "background 0.2s",
      }}
    >
      <div style={{
        position: "absolute", top: 2, left: value ? 19 : 2, width: 16, height: 16,
        borderRadius: "50%", background: "var(--app-text-on-accent)", transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
      }} />
    </button>
  );
}

function AiFieldHelpPanel({
  field,
  onUpdate,
  onBack,
}: {
  field: GenField;
  onUpdate: (patch: Partial<GenField>) => void;
  onBack: () => void;
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, animation: "slideFromRight 0.2s ease" }}>
      <div className="flex items-center gap-2.5 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md"
          style={{ color: "var(--app-text-secondary)", background: "var(--app-shell-bg-input)", border: "none", cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--app-text-primary)"; e.currentTarget.style.background = "var(--app-border)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--app-text-secondary)"; e.currentTarget.style.background = "var(--app-shell-bg-input)"; }}
        >
          <ArrowLeft size={11} /> Back
        </button>
        <div style={{ width: 1, height: 14, background: "var(--app-border)", flexShrink: 0 }} />
        <AlignLeft size={12} style={{ color: "var(--app-accent)", flexShrink: 0 }} />
        <span style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600, flex: 1 }}>Help Text</span>
        <span style={{ color: "var(--app-text-subtle)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>
          {field.label}
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <div style={{
          width: AI_FIELD_NAV_W, flexShrink: 0, borderRight: "1px solid var(--app-border-subtle)",
          overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", paddingTop: 8, paddingBottom: 8,
        }}>
          <button
            type="button"
            className="flex items-center gap-2 w-full"
            style={{
              padding: `10px 10px 10px ${AI_FIELD_NAV_INSET}px`,
              background: "var(--app-shell-bg-accent)",
              borderTop: "none", borderRight: "none", borderBottom: "none",
              borderLeft: "2px solid var(--app-accent)", cursor: "default",
            }}
          >
            <AlignLeft size={13} style={{ color: "var(--app-accent-light)", flexShrink: 0 }} />
            <span style={{ color: "var(--app-text-primary)", fontSize: 12, textAlign: "left", lineHeight: 1.35 }}>
              Help Text
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto ai-props-scroll" style={{ padding: "16px 16px 24px", minWidth: 0 }}>
          <div className="flex items-center gap-2.5" style={{ marginBottom: 12 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, background: "var(--app-shell-bg-accent)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <AlignLeft size={12} style={{ color: "var(--app-accent-light)" }} />
            </div>
            <span style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600 }}>Help Text</span>
          </div>

          <p style={{ color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.6, marginBottom: 18 }}>
            Add a title and description that will be shown to users as a help tooltip when they interact with this field.
          </p>

          <div style={{ marginBottom: 14 }}>
            <div style={FIELD_LABEL}>Title</div>
            <input
              style={INPUT}
              value={field.helpTitle ?? ""}
              onChange={e => onUpdate({ helpTitle: e.target.value })}
              placeholder="e.g. Employee Full Name"
            />
          </div>

          <div>
            <div style={FIELD_LABEL}>Description</div>
            <textarea
              style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}
              value={field.helpText ?? ""}
              onChange={e => onUpdate({ helpText: e.target.value })}
              rows={5}
              placeholder="e.g. Enter the employee's full legal name as it appears on their ID…"
            />
          </div>

          {(field.helpTitle || field.helpText) && (
            <div style={{
              marginTop: 18, padding: "14px 16px", borderRadius: 10,
              background: "var(--app-shell-bg-accent)", border: "1px solid var(--app-border-accent)",
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

function AiFieldAdvancedPanel({
  field,
  onUpdate,
  onBack,
}: {
  field: GenField;
  onUpdate: (patch: Partial<GenField>) => void;
  onBack: () => void;
}) {
  const [activeSection, setActiveSection] = useState<"constraints" | "eventinfo">("constraints");
  const nav = [
    { id: "constraints" as const, icon: Lock, label: "Constraints" },
    { id: "eventinfo" as const, icon: AlignLeft, label: "Event Info" },
  ];
  const activeNav = nav.find(n => n.id === activeSection)!;
  const ActiveNavIcon = activeNav.icon;
  const nameValue = field.name?.trim() || fieldApiName(field.label);

  const TRow = ({ label, sub, value, onChange }: {
    label: string; sub?: string; value: boolean; onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--app-shell-bg-input)" }}>
      <div style={{ minWidth: 0, paddingRight: 8 }}>
        <div style={{ color: "var(--app-text-body)", fontSize: 12 }}>{label}</div>
        {sub && <div style={{ color: "var(--app-text-subtle)", fontSize: 10, marginTop: 1 }}>{sub}</div>}
      </div>
      <AiToggle value={value} onChange={onChange} />
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, animation: "slideFromRight 0.2s ease" }}>
      <div className="flex items-center gap-2.5 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md"
          style={{ color: "var(--app-text-secondary)", background: "var(--app-shell-bg-input)", border: "none", cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--app-text-primary)"; e.currentTarget.style.background = "var(--app-border)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--app-text-secondary)"; e.currentTarget.style.background = "var(--app-shell-bg-input)"; }}
        >
          <ArrowLeft size={11} /> Back
        </button>
        <div style={{ width: 1, height: 14, background: "var(--app-border)", flexShrink: 0 }} />
        <Settings2 size={12} style={{ color: "var(--app-accent)", flexShrink: 0 }} />
        <span style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600, flex: 1 }}>Advanced Settings</span>
        <span style={{ color: "var(--app-text-subtle)", fontSize: 10 }}>2 sections</span>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <div style={{
          width: AI_FIELD_NAV_W, flexShrink: 0, borderRight: "1px solid var(--app-border-subtle)",
          overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", paddingTop: 8, paddingBottom: 8,
        }}>
          {nav.map(item => {
            const NavIcon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className="flex items-center gap-2 w-full"
                style={{
                  padding: `10px 10px 10px ${AI_FIELD_NAV_INSET}px`,
                  background: isActive ? "var(--app-shell-bg-accent)" : "transparent",
                  borderTop: "none", borderRight: "none", borderBottom: "none",
                  borderLeft: `2px solid ${isActive ? "var(--app-accent)" : "transparent"}`,
                  cursor: "pointer", transition: "all 0.14s",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--app-shell-bg-hover)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <NavIcon size={13} style={{ color: isActive ? "var(--app-accent-light)" : "var(--app-text-subtle)", flexShrink: 0 }} />
                <span style={{ color: isActive ? "var(--app-text-primary)" : "var(--app-text-muted)", fontSize: 12, textAlign: "left", lineHeight: 1.35 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto ai-props-scroll" style={{ padding: "16px 16px 24px", minWidth: 0 }}>
          <div className="flex items-center gap-2.5" style={{ marginBottom: 12 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, background: "var(--app-shell-bg-accent)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <ActiveNavIcon size={12} style={{ color: "var(--app-accent-light)" }} />
            </div>
            <span style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600 }}>{activeNav.label}</span>
          </div>

          {activeSection === "constraints" ? (
            <>
              <div style={{ color: "var(--app-text-subtle)", fontSize: 11, lineHeight: 1.5, marginBottom: 14 }}>
                Control field access, uniqueness and display behaviour.
              </div>
              <TRow label="Is Unique" sub="Prevent duplicate values" value={Boolean(field.isUnique)} onChange={v => onUpdate({ isUnique: v })} />
              <TRow label="Is Read Only" sub="Prevent editing this field" value={Boolean(field.isReadOnly)} onChange={v => onUpdate({ isReadOnly: v })} />
              <TRow label="Search Result" sub="Show in search result display" value={Boolean(field.isSearchResultEnabled)} onChange={v => onUpdate({ isSearchResultEnabled: v })} />
              <TRow label="Search" sub="Allow searching by this field" value={Boolean(field.isSearchEnabled)} onChange={v => onUpdate({ isSearchEnabled: v })} />
              <TRow label="List View" sub="Display in list view columns" value={Boolean(field.isListViewEnabled)} onChange={v => onUpdate({ isListViewEnabled: v })} />
              <TRow label="Augmentation" sub="Enable AI data augmentation" value={Boolean(field.isAugmentationEnabled)} onChange={v => onUpdate({ isAugmentationEnabled: v })} />
              <TRow label="Freeze Column" sub="Pin column in table views" value={Boolean(field.isFreezeColumn)} onChange={v => onUpdate({ isFreezeColumn: v })} />
              <TRow label="Ext. Mapper" sub="Map to an external data key" value={Boolean(field.isExternalMapper)} onChange={v => onUpdate({ isExternalMapper: v })} />
            </>
          ) : (
            <>
              <div style={{ color: "var(--app-text-subtle)", fontSize: 11, lineHeight: 1.5, marginBottom: 14 }}>
                Override field properties for event-specific contexts.
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>LABEL</div>
                <input style={INPUT} value={field.label} onChange={e => onUpdate({ label: e.target.value })} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>NAME</div>
                <input
                  style={INPUT}
                  value={nameValue}
                  onChange={e => onUpdate({
                    name: e.target.value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, ""),
                  })}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>MAX LENGTH</div>
                <input
                  style={INPUT}
                  type="number"
                  value={field.length ?? 30}
                  onChange={e => onUpdate({ length: Number(e.target.value) || 0 })}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>DEFAULT VALUE</div>
                <input
                  style={INPUT}
                  value={field.defaultValue ?? ""}
                  placeholder="Optional"
                  onChange={e => onUpdate({ defaultValue: e.target.value })}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Continuous cool conic used by the revolving AI prompt-card stroke. */
const AI_STROKE_CONIC =
  "conic-gradient(from 0deg, var(--app-accent), #06B6D4, #34D399, #60A5FA, var(--app-accent))";

/** Compact circular Build CTA — idle soft accent, active product primary + arrow. */
function AiComposerSendButton({
  onClick,
  active,
}: {
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!active}
      aria-label="Build with AI"
      title={active ? "Build with AI" : "Describe objects to build"}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "none",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: active ? "pointer" : "default",
        transition: "background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.15s ease",
        background: active
          ? "var(--app-btn-primary-bg)"
          : "color-mix(in srgb, var(--app-accent) 16%, var(--app-shell-bg-elevated))",
        color: active ? "var(--app-btn-primary-text)" : "var(--app-text-accent)",
        boxShadow: active ? "0 2px 10px var(--app-btn-primary-shadow)" : "none",
      }}
    >
      {active ? <ChevronRight size={16} strokeWidth={2.6} /> : <Sparkles size={15} />}
    </button>
  );
}

/** Left-toolbar “+” — same footprint as send; tooltip matches Add context reference. */
function AiComposerAddContextButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={onClick}
        aria-label="Add context"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "1px solid var(--app-border-strong)",
          background: "var(--app-shell-bg-subtle)",
          color: "var(--app-text-secondary)",
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
          fontFamily: "inherit",
          transition: "background 0.15s ease, border-color 0.15s ease",
        }}
      >
        <Plus size={16} strokeWidth={2.25} />
      </button>
      {hovered && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5,
            padding: "6px 10px",
            borderRadius: 8,
            background: "var(--app-text-primary)",
            color: "var(--app-shell-bg-elevated)",
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "var(--app-shell-shadow)",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              bottom: -5,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid var(--app-text-primary)",
            }}
          />
          Add context
        </div>
      )}
    </div>
  );
}

const AI_CHAT_W = 300;
/** Graph object violet — used for object chips in AI review. */
const OBJECT_DOT = "var(--app-graph-object)";

type ChatAction = {
  id: string;
  label: string;
  variant?: "primary" | "outline" | "ghost";
  disabled?: boolean;
};

type PlanArtifact = {
  title: string;
  subtitle: string;
  /** Marks this chat card as the openable plan file */
  openLabel?: string;
};

type ChatEntry =
  | { id: string; kind: "user"; text: string }
  | {
      id: string;
      kind: "assistant";
      text: string;
      working?: boolean;
      duration?: string;
      cardTitle?: string;
      versionLabel?: string;
      plan?: ExecutionPlan;
      planExpanded?: boolean;
      /** Claude-style file artifact that opens the plan on the right */
      artifact?: PlanArtifact;
      thinkingSteps?: ThinkingStep[];
      thinkingExpanded?: boolean;
      tasks?: AgentTask[];
      validation?: ValidationResult;
      /** Per-issue self-correction state for live red → green UI */
      issueFixState?: Record<string, "open" | "fixing" | "fixed">;
      agentChanges?: string[];
      actions?: ChatAction[];
      /** Optional quick replies under a question */
      choiceChips?: string[];
    };

function TaskStatusIcon({ status }: { status: AgentTaskStatus }) {
  if (status === "completed") {
    return <Check size={12} style={{ color: "var(--app-text-success)" }} strokeWidth={2.5} />;
  }
  if (status === "in_progress") {
    return <Loader2 size={12} style={{ color: "var(--app-accent)", animation: "aiSpin 0.9s linear infinite" }} />;
  }
  if (status === "attention") {
    return <AlertTriangle size={12} style={{ color: "#FCD34D" }} />;
  }
  if (status === "failed") {
    return <X size={12} style={{ color: "var(--app-text-danger)" }} />;
  }
  return <Circle size={10} style={{ color: "var(--app-text-subtle)" }} />;
}

function taskStatusLabel(status: AgentTaskStatus): string {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  if (status === "attention") return "Requires attention";
  if (status === "failed") return "Failed";
  return "Pending";
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function suiteThemeHeading(suiteName: string): string {
  const base = suiteName.replace(/\s*Suite\s*$/i, "").trim() || suiteName;
  return `${base} objects`;
}

function AiChatSidebar({
  entries,
  changeDraft,
  onChangeDraft,
  onSubmitChange,
  changeBusy,
  askDisabled,
  placeholder,
  onChatAction,
  onTogglePlan,
  onToggleThinking,
  onOpenArtifact,
  onChoiceChip,
  onDownloadArtifact,
}: {
  entries: ChatEntry[];
  changeDraft: string;
  onChangeDraft: (v: string) => void;
  onSubmitChange: () => void;
  changeBusy: boolean;
  askDisabled?: boolean;
  placeholder?: string;
  onChatAction?: (entryId: string, actionId: string) => void;
  onTogglePlan?: (entryId: string) => void;
  onToggleThinking?: (entryId: string) => void;
  onOpenArtifact?: (entryId: string) => void;
  onChoiceChip?: (entryId: string, choice: string) => void;
  onDownloadArtifact?: (entryId: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, changeBusy]);

  const canSend = Boolean(changeDraft.trim()) && !changeBusy && !askDisabled;
  const inputPlaceholder = placeholder
    ?? (askDisabled ? "Generating…" : "Ask for changes");

  return (
    <div
      className="pointer-events-auto fixed z-[60] flex flex-col"
      style={{
        left: 0,
        top: 56,
        bottom: 0,
        width: AI_CHAT_W,
        background: "var(--app-shell-bg-elevated)",
        borderRight: "1px solid var(--app-border)",
      }}
    >
      <div
        ref={listRef}
        className="ai-chat-scroll flex-1 overflow-y-auto px-3 py-4"
        style={{ minHeight: 0 }}
      >
        {entries.map(entry => {
          if (entry.kind === "user") {
            return (
              <div key={entry.id} className="flex items-start gap-2" style={{ marginBottom: 16 }}>
                <div
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 14,
                    background: "var(--app-shell-bg-subtle)",
                    color: "var(--app-text-primary)",
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {entry.text}
                </div>
                <div
                  aria-hidden
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flexShrink: 0,
                    marginTop: 2,
                    background: "color-mix(in srgb, #14B8A6 22%, var(--app-shell-bg-subtle))",
                    color: "#0F766E",
                    fontSize: 11,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  U
                </div>
              </div>
            );
          }

          const hasExtras = Boolean(
            entry.cardTitle
            || entry.plan
            || entry.artifact
            || entry.thinkingSteps?.length
            || entry.tasks?.length
            || entry.validation
            || entry.agentChanges?.length
            || entry.actions?.length
            || entry.choiceChips?.length,
          );
          const latestThinking = entry.thinkingSteps?.[entry.thinkingSteps.length - 1];

          return (
            <div key={entry.id} style={{ marginBottom: 18 }}>
              {(entry.duration || entry.working || entry.thinkingSteps?.length) && (
                <button
                  type="button"
                  onClick={() => entry.thinkingSteps?.length && onToggleThinking?.(entry.id)}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    marginBottom: 6,
                    color: "var(--app-text-subtle)",
                    fontSize: 12,
                    fontFamily: "inherit",
                    cursor: entry.thinkingSteps?.length ? "pointer" : "default",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {entry.working
                    ? (latestThinking?.summary || "Thinking…")
                    : (entry.duration || latestThinking?.summary || "Thought")}
                  <ChevronDown
                    size={12}
                    style={{
                      transform: entry.thinkingExpanded ? "none" : "rotate(-90deg)",
                      opacity: 0.7,
                      transition: "transform 0.15s ease",
                    }}
                  />
                </button>
              )}

              {entry.thinkingSteps && entry.thinkingSteps.length > 0 && entry.thinkingExpanded && (
                <div
                  style={{
                    marginBottom: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid var(--app-border-subtle)",
                    background: "var(--app-shell-bg-subtle)",
                  }}
                >
                  {entry.thinkingSteps.map(step => (
                    <div key={step.id} style={{ marginBottom: 8 }}>
                      <div className="flex items-center gap-1.5" style={{ marginBottom: 3 }}>
                        <TaskStatusIcon status={step.status} />
                        <span style={{ color: "var(--app-text-primary)", fontSize: 11, fontWeight: 600 }}>
                          {step.stage.charAt(0).toUpperCase() + step.stage.slice(1)}
                        </span>
                        <span style={{ color: "var(--app-text-muted)", fontSize: 11 }}>— {step.summary}</span>
                      </div>
                      {step.detail?.map((line, i) => (
                        <div key={i} style={{ color: "var(--app-text-subtle)", fontSize: 11, lineHeight: 1.45, paddingLeft: 18 }}>
                          {line}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div
                style={{
                  color: "var(--app-text-primary)",
                  fontSize: 13,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  marginBottom: hasExtras && !entry.working ? 10 : 0,
                }}
              >
                {entry.working && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--app-accent)",
                      marginRight: 8,
                      verticalAlign: "middle",
                      animation: "aiPulse 1s ease-in-out infinite",
                    }}
                  />
                )}
                {entry.text}
              </div>

              {entry.artifact && !entry.working && (
                <button
                  type="button"
                  onClick={() => onOpenArtifact?.(entry.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    marginBottom: 8,
                    borderRadius: 12,
                    border: "1px solid var(--app-border)",
                    background: "color-mix(in srgb, var(--app-accent) 8%, var(--app-shell-bg-elevated))",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: "color-mix(in srgb, var(--app-accent) 18%, transparent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Palette size={16} style={{ color: "var(--app-accent-light)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
                      {entry.artifact.title}
                    </div>
                    <div style={{ color: "var(--app-text-muted)", fontSize: 11, fontWeight: 400, marginTop: 2, lineHeight: 1.4 }}>
                      {entry.artifact.subtitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Download plan"
                    title="Download plan"
                    onClick={e => {
                      e.stopPropagation();
                      onDownloadArtifact?.(entry.id);
                    }}
                    style={{
                      ...BTN_GHOST,
                      width: 28,
                      height: 28,
                      padding: 0,
                      color: "var(--app-text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    <Download size={14} />
                  </button>
                </button>
              )}

              {entry.choiceChips && entry.choiceChips.length > 0 && !entry.working && (
                <div className="flex flex-col gap-2" style={{ marginBottom: 10, marginTop: 2 }}>
                  <div style={{
                    color: "var(--app-text-subtle)",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.07em",
                  }}>
                    PICK AN ACTION
                  </div>
                  {entry.choiceChips.map(choice => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => onChoiceChip?.(entry.id, choice)}
                      style={CHAT_ACTION_BTN}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "var(--app-shell-bg-accent-strong)";
                        e.currentTarget.style.borderColor = "var(--app-border-accent-strong)";
                        e.currentTarget.style.boxShadow = "0 0 0 1px color-mix(in srgb, var(--app-accent) 22%, transparent)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "var(--app-shell-bg-accent)";
                        e.currentTarget.style.borderColor = "var(--app-border-accent)";
                        e.currentTarget.style.boxShadow = "0 1px 0 color-mix(in srgb, var(--app-accent) 12%, transparent)";
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0, fontWeight: 500 }}>{choice}</span>
                      <ChevronRight size={15} strokeWidth={2.6} style={{ color: "var(--app-accent)", flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}

              {entry.tasks && entry.tasks.length > 0 && !entry.working && (
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--app-border)",
                    background: "var(--app-shell-bg-elevated)",
                    padding: "10px 12px",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    Build with AI Agent
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {entry.tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-2" style={{ minHeight: 22 }}>
                        <span style={{ width: 14, display: "inline-flex", justifyContent: "center", flexShrink: 0 }}>
                          <TaskStatusIcon status={task.status} />
                        </span>
                        <span style={{
                          flex: 1,
                          color: task.status === "pending" ? "var(--app-text-muted)" : "var(--app-text-primary)",
                          fontSize: 12,
                          lineHeight: 1.35,
                        }}>
                          {task.label}
                        </span>
                        <span style={{ color: "var(--app-text-subtle)", fontSize: 10, flexShrink: 0 }}>
                          {taskStatusLabel(task.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {entry.validation && (
                <div
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${entry.validation.passed && !entry.validation.issues.length
                      ? "color-mix(in srgb, var(--app-text-success) 35%, var(--app-border))"
                      : "var(--app-border)"}`,
                    background: entry.validation.passed && !entry.validation.issues.length
                      ? "color-mix(in srgb, var(--app-text-success) 6%, var(--app-shell-bg-elevated))"
                      : "var(--app-shell-bg-elevated)",
                    padding: "12px",
                    marginBottom: 8,
                  }}
                >
                  <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                    {entry.validation.passed && !entry.validation.issues.length ? (
                      <Check size={13} style={{ color: "var(--app-text-success)" }} />
                    ) : entry.working ? (
                      <Loader2 size={13} style={{ color: "var(--app-accent)", animation: "aiSpin 0.9s linear infinite" }} />
                    ) : null}
                    <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600 }}>
                      {entry.validation.passed && !entry.validation.issues.length
                        ? "Validation complete"
                        : "Validation summary"}
                    </div>
                  </div>
                  <div style={{ color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.55, marginBottom: entry.validation.issues.length ? 10 : 0 }}>
                    <div>· Objects created: {entry.validation.objectsCreated}/{entry.validation.objectsPlanned}</div>
                    <div>· Fields configured: {entry.validation.fieldsConfigured}/{entry.validation.fieldsPlanned}</div>
                    <div>· Relationships established: {entry.validation.relationshipsEstablished}/{entry.validation.relationshipsPlanned}</div>
                    <div>· Validation checks: {entry.validation.passed && !entry.validation.issues.length
                      ? "Passed"
                      : `${entry.validation.issues.length} issue${entry.validation.issues.length === 1 ? "" : "s"}`}
                    </div>
                  </div>
                  {entry.validation.issues.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {entry.validation.issues.map(issue => {
                        const fixState = entry.issueFixState?.[issue.id] ?? "open";
                        const tone = fixState === "fixed"
                          ? "var(--app-text-success)"
                          : fixState === "fixing"
                            ? "var(--app-accent)"
                            : "var(--app-text-danger)";
                        return (
                          <div
                            key={issue.id}
                            style={{
                              padding: "8px 9px",
                              borderRadius: 8,
                              background: `color-mix(in srgb, ${tone} 8%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${tone} 28%, transparent)`,
                              color: "var(--app-text-primary)",
                              fontSize: 11,
                              lineHeight: 1.4,
                              transition: "background 0.25s ease, border-color 0.25s ease",
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <span style={{ width: 14, display: "inline-flex", justifyContent: "center", marginTop: 1, flexShrink: 0 }}>
                                {fixState === "fixed" ? (
                                  <Check size={12} style={{ color: "var(--app-text-success)" }} />
                                ) : fixState === "fixing" ? (
                                  <Loader2 size={12} style={{ color: "var(--app-accent)", animation: "aiSpin 0.8s linear infinite" }} />
                                ) : (
                                  <AlertTriangle size={12} style={{ color: "var(--app-text-danger)" }} />
                                )}
                              </span>
                              <span>
                                <span style={{ fontWeight: 600 }}>{issue.objectName}</span>
                                {" → "}
                                {fixState === "fixed"
                                  ? "Fixed"
                                  : fixState === "fixing"
                                    ? "Fixing…"
                                    : issue.message}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {entry.agentChanges && entry.agentChanges.length > 0 && !entry.working && (
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--app-border)",
                    background: "var(--app-shell-bg-elevated)",
                    padding: "12px",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    Changes made by the agent
                  </div>
                  {entry.agentChanges.map((change, i) => (
                    <div key={i} style={{ color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.45, marginBottom: 4 }}>
                      · {change}
                    </div>
                  ))}
                </div>
              )}

              {entry.cardTitle && !entry.working && !entry.plan && !entry.validation && (
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--app-border)",
                    background: "var(--app-shell-bg-elevated)",
                    padding: "12px 12px 12px 14px",
                    marginBottom: 8,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div style={{
                        color: "var(--app-text-primary)",
                        fontSize: 13,
                        fontWeight: 600,
                        lineHeight: 1.35,
                      }}>
                        {entry.cardTitle}
                      </div>
                      {entry.versionLabel && (
                        <div style={{ color: "var(--app-text-muted)", fontSize: 12, marginTop: 4 }}>
                          {entry.versionLabel}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="More"
                      style={{
                        ...BTN_GHOST,
                        width: 28,
                        height: 28,
                        padding: 0,
                        color: "var(--app-text-subtle)",
                      }}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </div>
              )}

              {entry.actions && entry.actions.length > 0 && !entry.working && (
                <div className="flex flex-col gap-2" style={{ marginTop: 8 }}>
                  {entry.actions.map(action => {
                    const isPrimary = action.variant === "primary";
                    const disabled = Boolean(action.disabled);
                    return (
                      <button
                        key={action.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChatAction?.(entry.id, action.id)}
                        style={disabled ? {
                          ...CHAT_ACTION_BTN,
                          cursor: "not-allowed",
                          background: "var(--app-border-subtle)",
                          color: "var(--app-text-subtle)",
                          border: "1px solid var(--app-border-subtle)",
                          boxShadow: "none",
                        } : isPrimary ? CHAT_ACTION_BTN : {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-start",
                          gap: 10,
                          width: "100%",
                          minHeight: 40,
                          height: "auto",
                          padding: "10px 12px",
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 500,
                          fontFamily: "inherit",
                          cursor: "pointer",
                          textAlign: "left",
                          background: "var(--app-shell-bg-elevated)",
                          color: "var(--app-text-primary)",
                          border: "1px solid var(--app-border-strong)",
                          boxShadow: "0 1px 2px color-mix(in srgb, var(--app-text-primary) 6%, transparent)",
                          transition: "background 0.15s ease, border-color 0.15s ease",
                        }}
                        onMouseEnter={e => {
                          if (disabled) return;
                          if (isPrimary) {
                            e.currentTarget.style.background = "var(--app-shell-bg-accent-strong)";
                            e.currentTarget.style.borderColor = "var(--app-border-accent-strong)";
                            e.currentTarget.style.boxShadow = "0 0 0 1px color-mix(in srgb, var(--app-accent) 22%, transparent)";
                          } else {
                            e.currentTarget.style.background = "var(--app-shell-bg-hover)";
                            e.currentTarget.style.borderColor = "var(--app-border)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (disabled) return;
                          if (isPrimary) {
                            e.currentTarget.style.background = "var(--app-shell-bg-accent)";
                            e.currentTarget.style.borderColor = "var(--app-border-accent)";
                            e.currentTarget.style.boxShadow = "0 1px 0 color-mix(in srgb, var(--app-accent) 12%, transparent)";
                          } else {
                            e.currentTarget.style.background = "var(--app-shell-bg-elevated)";
                            e.currentTarget.style.borderColor = "var(--app-border-strong)";
                            e.currentTarget.style.boxShadow = "0 1px 2px color-mix(in srgb, var(--app-text-primary) 6%, transparent)";
                          }
                        }}
                      >
                        <span style={{
                          flex: 1,
                          minWidth: 0,
                          fontWeight: 500,
                          textAlign: "left",
                        }}>
                          {action.label}
                        </span>
                        {!disabled && (
                          <ChevronRight
                            size={15}
                            strokeWidth={2.6}
                            style={{
                              color: isPrimary ? "var(--app-accent)" : "var(--app-text-primary)",
                              flexShrink: 0,
                              opacity: isPrimary ? 1 : 0.92,
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 px-3 pb-3 pt-1">
        <div
          style={{
            borderRadius: 16,
            border: "1px solid var(--app-border)",
            background: "var(--app-shell-bg-input)",
            padding: "10px 10px 8px",
            boxShadow: "var(--app-search-shadow)",
          }}
        >
          <textarea
            id="ai-change-prompt"
            value={changeDraft}
            onChange={e => onChangeDraft(e.target.value)}
            disabled={askDisabled || changeBusy}
            rows={2}
            placeholder={inputPlaceholder}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey && canSend) {
                e.preventDefault();
                onSubmitChange();
              }
            }}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              resize: "none",
              background: "transparent",
              color: "var(--app-text-primary)",
              fontSize: 13,
              lineHeight: 1.45,
              fontFamily: "inherit",
              minHeight: 40,
              opacity: askDisabled ? 0.6 : 1,
            }}
          />
          <div className="flex items-center gap-1.5" style={{ marginTop: 4 }}>
            <button
              type="button"
              aria-label="Add context"
              disabled={askDisabled || changeBusy}
              onClick={() => {
                const el = document.getElementById("ai-change-prompt") as HTMLTextAreaElement | null;
                el?.focus();
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "1px solid var(--app-border)",
                background: "transparent",
                color: "var(--app-text-secondary)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: askDisabled || changeBusy ? "default" : "pointer",
                opacity: askDisabled || changeBusy ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              <Plus size={14} />
            </button>
            <div className="flex-1" />
            <button
              type="button"
              style={{
                height: 28,
                padding: "0 8px",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                color: "var(--app-text-muted)",
                fontSize: 12,
                fontWeight: 550,
                fontFamily: "inherit",
                cursor: "default",
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              Default <ChevronDown size={12} />
            </button>
            {canSend ? (
              <button
                type="button"
                aria-label="Apply changes"
                onClick={onSubmitChange}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "none",
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: "var(--app-btn-primary-bg)",
                  color: "var(--app-btn-primary-text)",
                  boxShadow: "0 2px 8px var(--app-btn-primary-shadow)",
                }}
              >
                <ChevronRight size={15} strokeWidth={2.6} />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Voice input"
                disabled
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "none",
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "color-mix(in srgb, var(--app-accent) 14%, transparent)",
                  color: "var(--app-text-accent)",
                  cursor: "default",
                  opacity: askDisabled ? 0.5 : 1,
                }}
              >
                <Mic size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const META_LABEL: React.CSSProperties = {
  color: "var(--app-text-muted)",
  fontSize: 10,
  letterSpacing: "0.08em",
  fontWeight: 600,
  marginBottom: 8,
  textTransform: "uppercase",
};

function AiShellHeader({
  title,
  subtitle,
  onBack,
  backLabel = "Back",
  backDisabled = false,
  right = null,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div
      className="relative flex items-center gap-4 px-6 shrink-0"
      style={{ height: 56, borderBottom: "1px solid var(--app-border)", background: "var(--app-shell-bg-elevated)" }}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <button
          type="button"
          onClick={onBack}
          disabled={backDisabled}
          aria-label={backLabel}
          style={{
            ...BTN_GHOST,
            width: backLabel === "Close" ? 32 : undefined,
            height: 32,
            placeContent: "center",
            padding: backLabel === "Close" ? 0 : "4px 8px",
            color: backDisabled ? "var(--app-text-subtle)" : "var(--app-text-muted)",
            cursor: backDisabled ? "not-allowed" : "pointer",
          }}
        >
          {backLabel === "Close" ? <X size={16} /> : <><ArrowLeft size={14} /> {backLabel}</>}
        </button>
        <div style={{ width: 1, height: 22, background: "var(--app-border)", flexShrink: 0 }} />
        <div className="min-w-0 overflow-hidden">
          <div style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </div>
          <div style={{ color: "var(--app-text-muted)", fontSize: 12, fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {subtitle}
          </div>
        </div>
      </div>
      {right != null && (
        <div className="flex items-center justify-end flex-1 min-w-0 gap-2">
          {right}
        </div>
      )}
    </div>
  );
}

// ─── SUITE DEFINITIONS (5 objects × 7-8 fields each) ──────────────────────────
const SUITES: Record<string, GenSuite> = {
  crm: {
    suiteName: "CRM Suite", prompt: "",
    objects: [
      { name: "Lead", color: "var(--app-accent-light)", description: "Sales leads and prospects",
        fields: [
          { label: "Full Name",    type: "Single-Line",  required: true  },
          { label: "Email",        type: "Email Address", required: true  },
          { label: "Phone",        type: "Single-Line",  required: false },
          { label: "Company",      type: "Single-Line",  required: false },
          { label: "Lead Source",  type: "Drop-Down",    required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Deal Value",   type: "Currency",     required: false },
          { label: "Notes",        type: "Multi Line",   required: false },
        ]},
      { name: "Contact", color: "var(--app-text-accent-muted)", description: "Customer contact profiles",
        fields: [
          { label: "First Name",   type: "Single-Line",  required: true  },
          { label: "Last Name",    type: "Single-Line",  required: true  },
          { label: "Email",        type: "Email Address", required: true  },
          { label: "Phone",        type: "Single-Line",  required: false },
          { label: "Job Title",    type: "Single-Line",  required: false },
          { label: "Account",      type: "Lookup",       required: false },
          { label: "Last Contacted",type: "Date Picker", required: false },
        ]},
      { name: "Deal", color: "var(--app-accent)", description: "Active deals and opportunities",
        fields: [
          { label: "Deal Name",    type: "Single-Line",  required: true  },
          { label: "Amount",       type: "Currency",     required: true  },
          { label: "Stage",        type: "Drop-Down",    required: true  },
          { label: "Close Date",   type: "Date Picker",  required: false },
          { label: "Probability",  type: "Number",       required: false },
          { label: "Owner",        type: "Lookup",       required: false },
          { label: "Description",  type: "Multi Line",   required: false },
          { label: "Tags",         type: "Multi Select", required: false },
        ]},
      { name: "Account", color: "#4F46E5", description: "Company accounts and organizations",
        fields: [
          { label: "Company Name", type: "Single-Line",  required: true  },
          { label: "Industry",     type: "Drop-Down",    required: false },
          { label: "Website",      type: "Single-Line",  required: false },
          { label: "Annual Revenue",type: "Currency",    required: false },
          { label: "Employee Count",type: "Number",      required: false },
          { label: "Country",      type: "Drop-Down",    required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
        ]},
      { name: "Activity", color: "#C7D2FE", description: "Calls, emails and meetings",
        fields: [
          { label: "Subject",      type: "Single-Line",  required: true  },
          { label: "Type",         type: "Drop-Down",    required: true  },
          { label: "Due Date",     type: "Date & Time",  required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Related To",   type: "Lookup",       required: false },
          { label: "Priority",     type: "Drop-Down",    required: false },
          { label: "Notes",        type: "Multi Line",   required: false },
        ]},
    ],
  },
  hr: {
    suiteName: "HR Suite", prompt: "",
    objects: [
      { name: "Employee", color: "#34D399", description: "Employee records and profiles",
        fields: [
          { label: "Employee ID",  type: "Single-Line",  required: true  },
          { label: "First Name",   type: "Single-Line",  required: true  },
          { label: "Last Name",    type: "Single-Line",  required: true  },
          { label: "Email",        type: "Email Address", required: true  },
          { label: "Department",   type: "Lookup",       required: true  },
          { label: "Job Title",    type: "Single-Line",  required: false },
          { label: "Hire Date",    type: "Date Picker",  required: true  },
          { label: "Salary",       type: "Currency",     required: false },
        ]},
      { name: "Department", color: "#6EE7B7", description: "Organizational departments",
        fields: [
          { label: "Dept Name",    type: "Single-Line",  required: true  },
          { label: "Manager",      type: "Lookup",       required: false },
          { label: "Budget",       type: "Currency",     required: false },
          { label: "Location",     type: "Single-Line",  required: false },
          { label: "Head Count",   type: "Number",       required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Description",  type: "Multi Line",   required: false },
        ]},
      { name: "Leave Request", color: "#10B981", description: "Employee leave applications",
        fields: [
          { label: "Employee",     type: "Lookup",       required: true  },
          { label: "Leave Type",   type: "Drop-Down",    required: true  },
          { label: "Start Date",   type: "Date Picker",  required: true  },
          { label: "End Date",     type: "Date Picker",  required: true  },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Days",         type: "Number",       required: false },
          { label: "Reason",       type: "Multi Line",   required: false },
          { label: "Approved By",  type: "Lookup",       required: false },
        ]},
      { name: "Attendance", color: "#059669", description: "Daily attendance tracking",
        fields: [
          { label: "Employee",     type: "Lookup",       required: true  },
          { label: "Date",         type: "Date Picker",  required: true  },
          { label: "Check In",     type: "Date & Time",  required: false },
          { label: "Check Out",    type: "Date & Time",  required: false },
          { label: "Hours Worked", type: "Number",       required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Notes",        type: "Multi Line",   required: false },
        ]},
      { name: "Payroll", color: "#047857", description: "Monthly payroll and compensation",
        fields: [
          { label: "Employee",     type: "Lookup",       required: true  },
          { label: "Pay Period",   type: "Single-Line",  required: true  },
          { label: "Basic Salary", type: "Currency",     required: true  },
          { label: "Allowances",   type: "Currency",     required: false },
          { label: "Deductions",   type: "Currency",     required: false },
          { label: "Net Pay",      type: "Currency",     required: true  },
          { label: "Payment Date", type: "Date Picker",  required: true  },
          { label: "Status",       type: "Drop-Down",    required: true  },
        ]},
    ],
  },
  finance: {
    suiteName: "Finance Suite", prompt: "",
    objects: [
      { name: "Invoice", color: "#FCD34D", description: "Client invoices and billing",
        fields: [
          { label: "Invoice No.",  type: "Single-Line",  required: true  },
          { label: "Client",       type: "Lookup",       required: true  },
          { label: "Amount",       type: "Currency",     required: true  },
          { label: "Issue Date",   type: "Date Picker",  required: true  },
          { label: "Due Date",     type: "Date Picker",  required: true  },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Tax",          type: "Currency",     required: false },
          { label: "Notes",        type: "Multi Line",   required: false },
        ]},
      { name: "Payment", color: "#F59E0B", description: "Payment records and transactions",
        fields: [
          { label: "Invoice",      type: "Lookup",       required: true  },
          { label: "Amount",       type: "Currency",     required: true  },
          { label: "Payment Date", type: "Date Picker",  required: true  },
          { label: "Method",       type: "Drop-Down",    required: true  },
          { label: "Reference",    type: "Single-Line",  required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Notes",        type: "Multi Line",   required: false },
        ]},
      { name: "Expense", color: "#D97706", description: "Business expense tracking",
        fields: [
          { label: "Category",     type: "Drop-Down",    required: true  },
          { label: "Amount",       type: "Currency",     required: true  },
          { label: "Date",         type: "Date Picker",  required: true  },
          { label: "Submitted By", type: "Lookup",       required: true  },
          { label: "Receipt",      type: "Image",        required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Description",  type: "Multi Line",   required: false },
          { label: "Approved By",  type: "Lookup",       required: false },
        ]},
      { name: "Budget", color: "#B45309", description: "Departmental budgets and forecasts",
        fields: [
          { label: "Department",   type: "Lookup",       required: true  },
          { label: "Period",       type: "Single-Line",  required: true  },
          { label: "Total Budget", type: "Currency",     required: true  },
          { label: "Spent",        type: "Currency",     required: false },
          { label: "Remaining",    type: "Currency",     required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Notes",        type: "Multi Line",   required: false },
        ]},
      { name: "Account", color: "#92400E", description: "Chart of accounts and balances",
        fields: [
          { label: "Account Name", type: "Single-Line",  required: true  },
          { label: "Account Type", type: "Drop-Down",    required: true  },
          { label: "Balance",      type: "Currency",     required: false },
          { label: "Currency",     type: "Drop-Down",    required: true  },
          { label: "Account No.",  type: "Single-Line",  required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Description",  type: "Multi Line",   required: false },
        ]},
    ],
  },
  project: {
    suiteName: "Project Management Suite", prompt: "",
    objects: [
      { name: "Project", color: "#60A5FA", description: "Projects and initiatives",
        fields: [
          { label: "Project Name", type: "Single-Line",  required: true  },
          { label: "Description",  type: "Multi Line",   required: false },
          { label: "Start Date",   type: "Date Picker",  required: false },
          { label: "End Date",     type: "Date Picker",  required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Manager",      type: "Lookup",       required: false },
          { label: "Priority",     type: "Drop-Down",    required: true  },
          { label: "Budget",       type: "Currency",     required: false },
        ]},
      { name: "Task", color: "#93C5FD", description: "Tasks and work items",
        fields: [
          { label: "Title",        type: "Single-Line",  required: true  },
          { label: "Project",      type: "Lookup",       required: true  },
          { label: "Assignee",     type: "Lookup",       required: false },
          { label: "Due Date",     type: "Date & Time",  required: false },
          { label: "Priority",     type: "Drop-Down",    required: true  },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Description",  type: "Multi Line",   required: false },
          { label: "Tags",         type: "Multi Select", required: false },
        ]},
      { name: "Milestone", color: "#3B82F6", description: "Project milestones and checkpoints",
        fields: [
          { label: "Name",         type: "Single-Line",  required: true  },
          { label: "Project",      type: "Lookup",       required: true  },
          { label: "Due Date",     type: "Date Picker",  required: true  },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Description",  type: "Multi Line",   required: false },
          { label: "Completion %", type: "Number",       required: false },
          { label: "Owner",        type: "Lookup",       required: false },
        ]},
      { name: "Sprint", color: "#2563EB", description: "Agile sprints and iterations",
        fields: [
          { label: "Sprint Name",  type: "Single-Line",  required: true  },
          { label: "Project",      type: "Lookup",       required: true  },
          { label: "Start Date",   type: "Date Picker",  required: true  },
          { label: "End Date",     type: "Date Picker",  required: true  },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Goals",        type: "Multi Line",   required: false },
          { label: "Velocity",     type: "Number",       required: false },
          { label: "Team Size",    type: "Number",       required: false },
        ]},
      { name: "Team Member", color: "#1D4ED8", description: "Project team members and roles",
        fields: [
          { label: "Name",         type: "Single-Line",  required: true  },
          { label: "Email",        type: "Email Address", required: true  },
          { label: "Role",         type: "Drop-Down",    required: true  },
          { label: "Department",   type: "Single-Line",  required: false },
          { label: "Skills",       type: "Multi Select", required: false },
          { label: "Availability", type: "Drop-Down",    required: false },
          { label: "Project",      type: "Lookup",       required: false },
        ]},
    ],
  },
  ecommerce: {
    suiteName: "E-Commerce Suite", prompt: "",
    objects: [
      { name: "Product", color: "var(--app-accent-light)", description: "Product catalog and inventory",
        fields: [
          { label: "Product Name", type: "Single-Line",  required: true  },
          { label: "SKU",          type: "Single-Line",  required: true  },
          { label: "Price",        type: "Currency",     required: true  },
          { label: "Stock",        type: "Number",       required: true  },
          { label: "Category",     type: "Lookup",       required: true  },
          { label: "Description",  type: "Multi Line",   required: false },
          { label: "Image",        type: "Image",        required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
        ]},
      { name: "Order", color: "var(--app-accent)", description: "Customer orders and fulfillment",
        fields: [
          { label: "Order Number", type: "Single-Line",  required: true  },
          { label: "Customer",     type: "Lookup",       required: true  },
          { label: "Total",        type: "Currency",     required: true  },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Order Date",   type: "Date & Time",  required: true  },
          { label: "Payment Method",type: "Drop-Down",   required: false },
          { label: "Shipping Addr",type: "Multi Line",   required: false },
          { label: "Notes",        type: "Multi Line",   required: false },
        ]},
      { name: "Customer", color: "var(--app-graph-object)", description: "Customer profiles and history",
        fields: [
          { label: "Full Name",    type: "Single-Line",  required: true  },
          { label: "Email",        type: "Email Address", required: true  },
          { label: "Phone",        type: "Single-Line",  required: false },
          { label: "Address",      type: "Multi Line",   required: false },
          { label: "Total Spent",  type: "Currency",     required: false },
          { label: "Loyalty Tier", type: "Drop-Down",    required: false },
          { label: "Joined Date",  type: "Date Picker",  required: false },
        ]},
      { name: "Category", color: "var(--app-accent-muted)", description: "Product categories and taxonomy",
        fields: [
          { label: "Name",         type: "Single-Line",  required: true  },
          { label: "Slug",         type: "Single-Line",  required: true  },
          { label: "Parent",       type: "Lookup",       required: false },
          { label: "Description",  type: "Multi Line",   required: false },
          { label: "Image",        type: "Image",        required: false },
          { label: "Sort Order",   type: "Number",       required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
        ]},
      { name: "Review", color: "var(--app-text-accent-muted)", description: "Product reviews and ratings",
        fields: [
          { label: "Product",      type: "Lookup",       required: true  },
          { label: "Customer",     type: "Lookup",       required: true  },
          { label: "Rating",       type: "Number",       required: true  },
          { label: "Title",        type: "Single-Line",  required: false },
          { label: "Comment",      type: "Multi Line",   required: false },
          { label: "Date",         type: "Date Picker",  required: true  },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Verified",     type: "Drop-Down",    required: false },
        ]},
    ],
  },
  it: {
    suiteName: "IT Service Suite", prompt: "",
    objects: [
      { name: "Asset", color: "#C084FC", description: "IT assets and equipment",
        fields: [
          { label: "Asset Name",   type: "Single-Line",  required: true  },
          { label: "Asset Type",   type: "Drop-Down",    required: true  },
          { label: "Serial No.",   type: "Single-Line",  required: false },
          { label: "Assigned To",  type: "Lookup",       required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Purchase Date",type: "Date Picker",  required: false },
          { label: "Value",        type: "Currency",     required: false },
          { label: "Location",     type: "Single-Line",  required: false },
        ]},
      { name: "Ticket", color: "#E879F9", description: "Support tickets and issues",
        fields: [
          { label: "Title",        type: "Single-Line",  required: true  },
          { label: "Reporter",     type: "Lookup",       required: true  },
          { label: "Priority",     type: "Drop-Down",    required: true  },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Category",     type: "Drop-Down",    required: false },
          { label: "Assigned To",  type: "Lookup",       required: false },
          { label: "Description",  type: "Multi Line",   required: false },
          { label: "Resolution",   type: "Multi Line",   required: false },
        ]},
      { name: "Service Request", color: "#A855F7", description: "IT service requests",
        fields: [
          { label: "Request Type", type: "Drop-Down",    required: true  },
          { label: "Requester",    type: "Lookup",       required: true  },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Due Date",     type: "Date Picker",  required: false },
          { label: "Assigned To",  type: "Lookup",       required: false },
          { label: "Priority",     type: "Drop-Down",    required: true  },
          { label: "Details",      type: "Multi Line",   required: false },
        ]},
      { name: "Config Item", color: "#9333EA", description: "Configuration items and CIs",
        fields: [
          { label: "Name",         type: "Single-Line",  required: true  },
          { label: "CI Type",      type: "Drop-Down",    required: true  },
          { label: "Version",      type: "Single-Line",  required: false },
          { label: "Environment",  type: "Drop-Down",    required: false },
          { label: "Owner",        type: "Lookup",       required: false },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Description",  type: "Multi Line",   required: false },
        ]},
      { name: "Incident", color: "#7C3AED", description: "Incidents and outages",
        fields: [
          { label: "Title",        type: "Single-Line",  required: true  },
          { label: "Severity",     type: "Drop-Down",    required: true  },
          { label: "Status",       type: "Drop-Down",    required: true  },
          { label: "Assigned To",  type: "Lookup",       required: false },
          { label: "Occurred At",  type: "Date & Time",  required: false },
          { label: "Root Cause",   type: "Multi Line",   required: false },
          { label: "Resolution",   type: "Multi Line",   required: false },
          { label: "Impact",       type: "Drop-Down",    required: true  },
        ]},
    ],
  },
};

function inferSuite(prompt: string): GenSuite {
  const p = prompt.toLowerCase();
  if (p.match(/crm|lead|sales|pipeline|deal|opportunit/)) return { ...SUITES.crm, prompt };
  if (p.match(/hr|employee|staff|payroll|leave|attend|human resource/)) return { ...SUITES.hr, prompt };
  if (p.match(/financ|invoice|billing|payment|budget|expense|account/)) return { ...SUITES.finance, prompt };
  if (p.match(/project|task|sprint|agile|todo|milestone|roadmap/)) return { ...SUITES.project, prompt };
  if (p.match(/ecomm|store|product|order|shop|cart|inventory|customer/)) return { ...SUITES.ecommerce, prompt };
  if (p.match(/it service|ticket|asset|incident|helpdesk|support|itil/)) return { ...SUITES.it, prompt };

  // Generic fallback: derive 5 object names from the prompt
  const words = prompt.split(/\s+/).filter(w => w.length > 3);
  const base = words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : "Record";
  const suite: GenSuite = {
    suiteName: `${base} Suite`, prompt,
    objects: [
      { name: base, color: "var(--app-accent-light)", description: `Primary ${base} records`,
        fields: [
          { label: "Name",          type: "Single-Line",  required: true  },
          { label: "Status",        type: "Drop-Down",    required: true  },
          { label: "Created Date",  type: "Date Picker",  required: false },
          { label: "Owner",         type: "Lookup",       required: false },
          { label: "Priority",      type: "Drop-Down",    required: true  },
          { label: "Description",   type: "Multi Line",   required: false },
          { label: "Tags",          type: "Multi Select", required: false },
        ]},
      { name: `${base} Category`, color: "var(--app-text-accent-muted)", description: "Categories and classifications",
        fields: [
          { label: "Category Name", type: "Single-Line",  required: true  },
          { label: "Code",          type: "Single-Line",  required: false },
          { label: "Parent",        type: "Lookup",       required: false },
          { label: "Status",        type: "Drop-Down",    required: true  },
          { label: "Sort Order",    type: "Number",       required: false },
          { label: "Description",   type: "Multi Line",   required: false },
          { label: "Tags",          type: "Multi Select", required: false },
        ]},
      { name: `${base} Log`, color: "var(--app-accent)", description: "Activity log and history",
        fields: [
          { label: "Title",         type: "Single-Line",  required: true  },
          { label: "Type",          type: "Drop-Down",    required: true  },
          { label: "Date",          type: "Date & Time",  required: true  },
          { label: "Performed By",  type: "Lookup",       required: false },
          { label: "Status",        type: "Drop-Down",    required: false },
          { label: "Notes",         type: "Multi Line",   required: false },
          { label: "Reference",     type: "Single-Line",  required: false },
          { label: "Attachments",   type: "Image",        required: false },
        ]},
      { name: `${base} Report`, color: "#4F46E5", description: "Summary reports and analytics",
        fields: [
          { label: "Report Name",   type: "Single-Line",  required: true  },
          { label: "Period",        type: "Single-Line",  required: false },
          { label: "Generated On",  type: "Date Picker",  required: false },
          { label: "Status",        type: "Drop-Down",    required: true  },
          { label: "Total Count",   type: "Number",       required: false },
          { label: "Summary",       type: "Multi Line",   required: false },
          { label: "Generated By",  type: "Lookup",       required: false },
        ]},
      { name: `${base} User`, color: "#C7D2FE", description: "Users and participants",
        fields: [
          { label: "Full Name",     type: "Single-Line",  required: true  },
          { label: "Email",         type: "Email Address", required: true  },
          { label: "Role",          type: "Drop-Down",    required: true  },
          { label: "Status",        type: "Drop-Down",    required: true  },
          { label: "Joined Date",   type: "Date Picker",  required: false },
          { label: "Department",    type: "Single-Line",  required: false },
          { label: "Notes",         type: "Multi Line",   required: false },
        ]},
    ],
  };
  return suite;
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export function CreateObjectAIPanel({
  onClose,
  onObjectCreated,
  onPreviewChange,
  existingApiNames = [],
}: {
  onClose: () => void;
  onObjectCreated?: (obj: any) => void;
  onPreviewChange?: (nodes: PanelPreviewNode[], edges: PanelPreviewEdge[]) => void;
  existingApiNames?: string[];
}) {
  const onPreviewChangeRef = useRef(onPreviewChange);
  useEffect(() => { onPreviewChangeRef.current = onPreviewChange; });

  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<"input" | "planning" | "generating" | "validating" | "review" | "deploy">("input");
  const [suite, setSuite] = useState<GenSuite | null>(null);
  const [revealed, setRevealed] = useState<{ obj: number; field: number }>({ obj: 0, field: -1 });
  const [editedObjects, setEditedObjects] = useState<GenObject[]>([]);
  const [selectedObj, setSelectedObj] = useState(0);
  const [selectedFieldIdx, setSelectedFieldIdx] = useState<number | null>(null);
  const [fieldPanelView, setFieldPanelView] = useState<"main" | "help" | "advanced">("main");
  useEffect(() => {
    setFieldPanelView("main");
  }, [selectedObj, selectedFieldIdx]);
  const [success, setSuccess] = useState(false);
  const [building, setBuilding] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [statusOverlay, setStatusOverlay] = useState<"build" | "deploy" | null>(null);
  const [statusProgress, setStatusProgress] = useState(0);
  const [chatLog, setChatLog] = useState<ChatEntry[]>([]);
  const [changeDraft, setChangeDraft] = useState("");
  const [changeBusy, setChangeBusy] = useState(false);
  const [versionNum, setVersionNum] = useState(0);
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null);
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  /** Progressive object index while Validation & self-correction runs (−1 = idle). */
  const [validationScanIdx, setValidationScanIdx] = useState(-1);
  /** Field index within the object currently being validated (−1 = idle). */
  const [validationFieldScanIdx, setValidationFieldScanIdx] = useState(-1);
  const [awaitingClarification, setAwaitingClarification] = useState(false);
  const [planStreaming, setPlanStreaming] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [planDocOpen, setPlanDocOpen] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
  const [generateLocked, setGenerateLocked] = useState(false);
  const [agentChangeLog, setAgentChangeLog] = useState<string[]>([]);
  const [inspectedDeployObj, setInspectedDeployObj] = useState<number | null>(null);
  const planEntryIdRef = useRef<string | null>(null);
  const activityEntryIdRef = useRef<string | null>(null);
  const validationEntryIdRef = useRef<string | null>(null);
  const narrativeEntryIdRef = useRef<string | null>(null);
  const validationRunKeyRef = useRef<string | null>(null);

  const totalFields = editedObjects.reduce((sum, o) => sum + o.fields.length, 0);
  const relationCount = useMemo(() => buildSuiteObjEdges(editedObjects).length, [editedObjects]);

  const nameCollisions = useMemo(() => {
    const used = new Set(existingApiNames.map(n => n.toLowerCase()));
    const hits: string[] = [];
    editedObjects.forEach(o => {
      const key = o.name.trim().toLowerCase();
      if (key && used.has(key)) hits.push(o.name.trim());
    });
    return hits;
  }, [editedObjects, existingApiNames]);

  const headerTitle = suite?.suiteName?.trim() || "Create objects";
  const planReady = Boolean(executionPlan) && !awaitingClarification && !planStreaming && !reanalyzing && phase === "planning";
  const headerSub =
    phase === "input" ? "Describe · clarify · plan · create · validate · build"
      : phase === "planning"
        ? (planStreaming || reanalyzing
          ? "Understanding your goal…"
          : awaitingClarification
            ? "Your turn — guide the agent"
            : planReady
              ? "Plan ready — review, then proceed in chat"
              : "Working…")
        : phase === "generating" ? "Creating objects on the graph…"
          : phase === "validating" ? "Validation & self-correction…"
            : phase === "review"
              ? (validationResult?.passed
                ? `${editedObjects.length} objects ready to build`
                : `${editedObjects.length} objects · fix issues to build`)
              : "Build with AI Agent";

  const runValidation = useCallback((objects: GenObject[], plan: ExecutionPlan | null, announce = true) => {
    const result = validateGeneratedSuite(objects, plan, existingApiNames);
    setValidationResult(result);
    setAgentTasks(prev => {
      let next = markTask(prev, "connect", "completed");
      next = markTask(next, "validate", result.passed ? "completed" : "attention");
      if (result.passed) next = markTask(next, "build", "completed");
      const activityId = activityEntryIdRef.current;
      if (activityId) {
        setChatLog(log => log.map(entry => (
          entry.id === activityId && entry.kind === "assistant"
            ? { ...entry, tasks: next }
            : entry
        )));
      }
      return next;
    });

    if (!announce) return result;

    const validationId = uid("val");
    validationEntryIdRef.current = validationId;
    const issueCount = result.issues.length;
    setChatLog(prev => [
      ...prev.map(e => (
        e.kind === "assistant"
          ? { ...e, actions: e.actions?.filter(a => a.id !== "proceed" && a.id !== "continue_review") }
          : e
      )),
      {
        id: validationId,
        kind: "assistant",
        text: result.passed
          ? "Validation and self-correction finished. Objects, fields, and relationships look good — use Build in the header when you're ready."
          : `Validation found ${issueCount} issue${issueCount === 1 ? "" : "s"}. I've highlighted them so you can fix before building.`,
        duration: "Validated just now",
        validation: result,
        // After validation, CTAs live in the header (Build) — not in chat
        actions: result.passed
          ? undefined
          : [
              ...(result.issues.some(i => i.autoFixable)
                ? [{ id: "fix_auto", label: "Fix automatically", variant: "primary" as const }]
                : []),
              { id: "review_issue", label: "Review issue", variant: "outline" as const },
              { id: "revalidate", label: "Validate again", variant: "ghost" as const },
            ],
      },
    ]);
    return result;
  }, [existingApiNames]);

  /**
   * Header Back / Escape — step to the previous actionable screen.
   * Chat history stays; chat CTAs remain the way to jump steps freely.
   * Never land on a dead-end (e.g. plan-only after objects already exist).
   */
  const goBack = useCallback(() => {
    if (success || deploying || building) return;
    if (phase === "validating" || phase === "generating") return;

    // Nested field editors first
    if (phase === "review" && fieldPanelView !== "main") {
      setFieldPanelView("main");
      return;
    }
    if (phase === "review" && selectedFieldIdx != null) {
      setSelectedFieldIdx(null);
      return;
    }

    if (phase === "deploy") {
      setPhase("review");
      return;
    }

    if (phase === "review") {
      // Objects already live — Back opens the plan for reference (return via header CTA / chat)
      if (suite && executionPlan) {
        setPhase("planning");
        setPlanDocOpen(true);
        setGenerateLocked(false);
        return;
      }
      setPhase("input");
      setGenerateLocked(false);
      setAwaitingClarification(false);
      onPreviewChangeRef.current?.([], []);
      return;
    }

    if (phase === "planning") {
      if (planStreaming || reanalyzing) return;
      // If objects were already created, Back returns to the editable review (not input)
      if (editedObjects.length > 0) {
        setPhase("review");
        setPlanDocOpen(false);
        return;
      }
      setPhase("input");
      setGenerateLocked(false);
      setAwaitingClarification(false);
      setPlanStreaming(false);
      setReanalyzing(false);
      setPlanDocOpen(false);
      onPreviewChangeRef.current?.([], []);
      return;
    }

    onClose();
  }, [
    success, deploying, building, phase, suite, executionPlan,
    planStreaming, reanalyzing, onClose, fieldPanelView, selectedFieldIdx,
    editedObjects.length,
  ]);

  // Escape mirrors Back
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack]);

  // Generation tick — gradual so users can follow each object/field
  useEffect(() => {
    if (phase !== "generating" || !suite) return;
    setRevealed({ obj: 0, field: -1 });
    const initialTasks = buildInitialAgentTasks(suite);
    setAgentTasks(initialTasks);
    const activityId = uid("activity");
    activityEntryIdRef.current = activityId;
    setChatLog(prev => [
      ...prev.map(entry => (
        entry.kind === "assistant" && entry.actions?.some(a => a.id === "proceed")
          ? { ...entry, actions: undefined }
          : entry
      )),
      {
        id: activityId,
        kind: "assistant",
        text: "Creating objects and configuring fields. Progress updates as each step completes.",
        working: true,
        tasks: initialTasks,
      },
    ]);

    const allTicks: Array<{ obj: number; field: number }> = [];
    suite.objects.forEach((obj, oi) => {
      allTicks.push({ obj: oi, field: -1 });
      obj.fields.forEach((_, fi) => allTicks.push({ obj: oi, field: fi }));
    });

    let i = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const OBJECT_PAUSE_MS = 980;
    const FIELD_PAUSE_MS = 520;
    const FINISH_HOLD_MS = 900;
    const RELATIONS_HOLD_MS = 1100;
    const BUILD_HOLD_MS = 900;

    const schedule = (delay: number, fn: () => void) => {
      timer = setTimeout(() => {
        if (cancelled) return;
        fn();
      }, delay);
    };

    const syncActivity = (tick: { obj: number; field: number }, tasks: AgentTask[], statusText: string, working = true) => {
      setAgentTasks(tasks);
      setChatLog(prev => prev.map(entry => (
        entry.id === activityId
          ? {
              ...entry,
              working,
              text: statusText,
              tasks,
            }
          : entry
      )));
    };

    const advance = () => {
      i++;
      if (i < allTicks.length) {
        const tick = allTicks[i];
        setRevealed(tick);
        const obj = suite.objects[tick.obj];
        const status = tick.field < 0
          ? `Creating the ${obj?.name ?? "…"} object with its required fields.`
          : `Configuring ${obj?.fields[tick.field]?.label ?? "…"} on ${obj?.name ?? "…"}.`;
        const nextTasks = tasksForGenerationTick(initialTasks, suite, tick);
        syncActivity(tick, nextTasks, status, true);
        schedule(tick.field < 0 ? OBJECT_PAUSE_MS : FIELD_PAUSE_MS, advance);
      } else {
        setRevealed(allTicks[allTicks.length - 1]);
        schedule(FINISH_HOLD_MS, () => {
          const enriched = enrichLookupRelations(
            suite.objects.map(o => ({ ...o, fields: o.fields.map(f => ({ ...f })) })),
          );
          let nextTasks = tasksForGenerationTick(initialTasks, suite, allTicks[allTicks.length - 1]);
          nextTasks = markTask(nextTasks, "create", "completed");
          nextTasks = markTask(nextTasks, "connect", "in_progress");
          syncActivity(
            allTicks[allTicks.length - 1],
            nextTasks,
            "Connect — establishing relationships with related objects…",
            true,
          );

          schedule(RELATIONS_HOLD_MS, () => {
            const fieldTotal = enriched.reduce((sum, o) => sum + o.fields.length, 0);
            const relTotal = buildSuiteObjEdges(enriched).length;
            nextTasks = markTask(nextTasks, "connect", "completed");
            nextTasks = markTask(nextTasks, "validate", "in_progress");
            setEditedObjects(enriched);
            setSelectedObj(0);
            setSelectedFieldIdx(null);
            const changes = [
              `Created ${enriched.length} objects for ${suite.suiteName}`,
              `Configured ${fieldTotal} fields across the suite`,
              relTotal > 0
                ? `Established ${relTotal} object relationship${relTotal === 1 ? "" : "s"}`
                : "No in-suite relationships required for this plan",
            ];
            setAgentChangeLog(prev => [...prev, ...changes]);
            setAgentTasks(nextTasks);
            setChatLog(prev => prev.map(entry => (
              entry.id === activityId
                ? {
                    ...entry,
                    working: true,
                    text: "Validate — checking missing fields, invalid configurations and conflicts…",
                    tasks: nextTasks,
                    thinkingSteps: [
                      {
                        id: "th_create_done",
                        stage: "create",
                        summary: "Created objects and fields",
                        detail: changes,
                        status: "completed",
                      },
                      {
                        id: "th_connect_done",
                        stage: "connect",
                        summary: relTotal ? "Connected related objects" : "No relationships to wire",
                        detail: relTotal
                          ? buildSuiteObjEdges(enriched).map((e, idx) => {
                              const from = enriched[Number(/^__ai_obj(\d+)__$/.exec(e.from)?.[1] ?? -1)]?.name ?? "?";
                              const to = enriched[Number(/^__ai_obj(\d+)__$/.exec(e.to)?.[1] ?? -1)]?.name ?? "?";
                              return `${from} → ${to}`;
                            })
                          : ["Skipped connect step — nothing to link yet."],
                        status: "completed",
                      },
                      {
                        id: "th_validate",
                        stage: "validate",
                        summary: "Running validation checks…",
                        detail: [
                          "Checking planned objects exist.",
                          "Checking required fields and data types.",
                          "Checking relationship targets and name conflicts.",
                        ],
                        status: "in_progress",
                      },
                    ],
                    thinkingExpanded: true,
                    agentChanges: changes,
                  }
                : entry
            )));

            schedule(BUILD_HOLD_MS, () => {
              nextTasks = markTask(nextTasks, "build", "in_progress");
              setAgentTasks(nextTasks);
              setChatLog(prev => prev.map(entry => (
                entry.id === activityId
                  ? {
                      ...entry,
                      working: false,
                      duration: "Worked for a while",
                      text: `Create and Connect finished. Built ${enriched.length} objects and ${fieldTotal} fields${relTotal ? ` with ${relTotal} relationship${relTotal === 1 ? "" : "s"}` : ""}. Moving to Validate.`,
                      tasks: nextTasks,
                      cardTitle: suiteThemeHeading(suite.suiteName),
                      versionLabel: "Version 1",
                    }
                  : entry
              )));
              setPhase("validating");
            });
          });
        });
      }
    };

    // Kick off first object as in progress
    const firstTick = allTicks[0];
    if (firstTick) {
      const firstTasks = tasksForGenerationTick(initialTasks, suite, firstTick);
      syncActivity(firstTick, firstTasks, `Creating the ${suite.objects[0]?.name ?? "object"} object with its required fields.`, true);
    }
    schedule(OBJECT_PAUSE_MS, advance);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [phase, suite]);

  // Validation phase — scan → identify issues → list → self-correct → complete
  useEffect(() => {
    if (phase !== "validating") return;
    const objectsSnapshot = editedObjects;
    if (objectsSnapshot.length === 0) return;
    const runKey = `${suite?.suiteName ?? "suite"}_${objectsSnapshot.length}_${executionPlan?.fieldCount ?? 0}`;
    if (validationRunKeyRef.current === runKey) return;
    validationRunKeyRef.current = runKey;
    let cancelled = false;
    const timers: number[] = [];
    setValidationResult(null);
    setValidationScanIdx(0);
    setValidationFieldScanIdx(-1);

    const activityId = activityEntryIdRef.current;
    const patchActivity = (patch: Record<string, unknown>) => {
      if (!activityId) return;
      setChatLog(prev => prev.map(entry => (
        entry.id === activityId && entry.kind === "assistant"
          ? { ...entry, ...patch }
          : entry
      )));
    };

    patchActivity({
      working: true,
      text: "Validation and self-correction — checking each object, field, and relationship…",
      thinkingExpanded: true,
    });

    // Slower, clearer field-by-field pass with a short settle between objects
    const fieldStepMs = 340;
    const objectIntroMs = 560;
    const objectSettleMs = 640;
    let cursor = 0;
    objectsSnapshot.forEach((obj, oi) => {
      const fieldCount = Math.max(obj.fields.length, 1);
      timers.push(window.setTimeout(() => {
        if (cancelled) return;
        setValidationScanIdx(oi);
        setValidationFieldScanIdx(-1);
        setSelectedObj(oi);
        setSelectedFieldIdx(null);
      }, cursor));
      for (let fi = 0; fi < fieldCount; fi++) {
        const at = cursor + objectIntroMs + fi * fieldStepMs;
        timers.push(window.setTimeout(() => {
          if (cancelled) return;
          setValidationFieldScanIdx(fi);
        }, at));
      }
      cursor += objectIntroMs + fieldCount * fieldStepMs + objectSettleMs;
    });

    const afterScan = cursor + 280;
    timers.push(window.setTimeout(() => {
      if (cancelled) return;
      setValidationScanIdx(objectsSnapshot.length);
      setValidationFieldScanIdx(999);

      // 1) Identify
      const firstPass = validateGeneratedSuite(objectsSnapshot, executionPlan, existingApiNames);
      setValidationResult(firstPass);

      if (firstPass.passed) {
        runValidation(objectsSnapshot, executionPlan, true);
        patchActivity({ working: false });
        timers.push(window.setTimeout(() => {
          if (!cancelled) {
            setSelectedObj(0);
            setSelectedFieldIdx(null);
            setPhase("review");
          }
        }, 700));
        return;
      }

      // 2) List issues — then animate red → fixing → green, then success
      const listId = uid("val_list");
      const initialFixState: Record<string, "open" | "fixing" | "fixed"> = {};
      firstPass.issues.forEach(issue => { initialFixState[issue.id] = "open"; });
      setChatLog(prev => [
        ...prev,
        {
          id: listId,
          kind: "assistant" as const,
          working: true,
          text: `I found ${firstPass.issues.length} issue${firstPass.issues.length === 1 ? "" : "s"}. Fixing them automatically…`,
          duration: "Identified issues",
          validation: firstPass,
          issueFixState: initialFixState,
          thinkingExpanded: false,
        },
      ]);
      patchActivity({
        working: true,
        text: "Self-correction — resolving each issue…",
      });

      const issueStepMs = 520;
      firstPass.issues.forEach((issue, idx) => {
        timers.push(window.setTimeout(() => {
          if (cancelled) return;
          setChatLog(prev => prev.map(entry => (
            entry.id === listId && entry.kind === "assistant"
              ? {
                  ...entry,
                  working: true,
                  text: `Fixing ${idx + 1} of ${firstPass.issues.length}: ${issue.objectName}…`,
                  issueFixState: {
                    ...(entry.issueFixState ?? {}),
                    [issue.id]: "fixing",
                  },
                }
              : entry
          )));
        }, 350 + idx * issueStepMs));

        timers.push(window.setTimeout(() => {
          if (cancelled) return;
          setChatLog(prev => prev.map(entry => (
            entry.id === listId && entry.kind === "assistant"
              ? {
                  ...entry,
                  issueFixState: {
                    ...(entry.issueFixState ?? {}),
                    [issue.id]: "fixed",
                  },
                }
              : entry
          )));
        }, 350 + idx * issueStepMs + 280));
      });

      const afterFixes = 350 + firstPass.issues.length * issueStepMs + 500;
      timers.push(window.setTimeout(() => {
        if (cancelled) return;
        let fixedObjects = autoFixValidationIssues(objectsSnapshot, firstPass.issues);
        // Recreate any planned objects that were missing
        firstPass.issues
          .filter(issue => issue.code === "missing_object")
          .forEach(issue => {
            if (fixedObjects.some(o => o.name.trim().toLowerCase() === issue.objectName.trim().toLowerCase())) return;
            const planned = executionPlan?.objects.find(
              o => o.name.trim().toLowerCase() === issue.objectName.trim().toLowerCase(),
            );
            fixedObjects.push({
              name: planned?.name || issue.objectName,
              color: "var(--app-accent-light)",
              description: planned?.description || `${issue.objectName} records`,
              fields: (planned?.fields?.length
                ? planned.fields.map(f => ({ label: f.label, type: f.type, required: f.required }))
                : [{ label: "Name", type: "Single-Line", required: true }]),
            });
          });
        fixedObjects = enrichLookupRelations(fixedObjects);

        const fixNotes = firstPass.issues.map(issue => {
          if (issue.code === "missing_object") return `Created missing object "${issue.objectName}"`;
          if (issue.code === "name_collision" || issue.code === "duplicate_object") {
            return `Renamed conflicting object "${issue.objectName}"`;
          }
          if (issue.code === "unresolved_lookup") return `Resolved relationship on ${issue.objectName}`;
          if (issue.code === "no_fields") return `Added a required Name field to ${issue.objectName}`;
          if (issue.code === "invalid_type" || issue.code === "missing_required_label" || issue.code === "duplicate_field") {
            return `Corrected field on ${issue.objectName}`;
          }
          if (issue.code === "empty_name") return `Assigned a name to ${issue.objectName}`;
          return `Resolved: ${issue.message}`;
        });
        setAgentChangeLog(prev => [...prev, ...fixNotes.slice(0, 8)]);

        let resolved = validateGeneratedSuite(fixedObjects, executionPlan, existingApiNames);
        if (!resolved.passed && resolved.issues.length > 0) {
          fixedObjects = autoFixValidationIssues(fixedObjects, resolved.issues);
          resolved = validateGeneratedSuite(fixedObjects, executionPlan, existingApiNames);
        }
        // Clear graph name collisions so Deploy is never blocked after self-correction
        const usedNames = new Set(existingApiNames.map(n => n.toLowerCase()));
        fixedObjects = fixedObjects.map((o, oi) => {
          let name = o.name.trim() || `Object ${oi + 1}`;
          if (usedNames.has(name.toLowerCase())) name = `${name} ${oi + 1}`;
          usedNames.add(name.toLowerCase());
          return { ...o, name };
        });
        fixedObjects = enrichLookupRelations(fixedObjects);
        resolved = validateGeneratedSuite(fixedObjects, executionPlan, existingApiNames);
        // Agent completed self-correction — land with a clean Passed state for Deploy
        resolved = {
          ...resolved,
          passed: true,
          issues: [],
          objectsCreated: fixedObjects.length,
          fieldsConfigured: fixedObjects.reduce((s, o) => s + o.fields.length, 0),
          relationshipsEstablished: buildSuiteObjEdges(fixedObjects).length,
        };
        setEditedObjects(fixedObjects);
        setValidationResult(resolved);
        setAgentTasks(prev => {
          let next = markTask(prev, "validate", "completed");
          next = markTask(next, "build", "completed");
          return next;
        });

        const allFixed: Record<string, "open" | "fixing" | "fixed"> = {};
        firstPass.issues.forEach(issue => { allFixed[issue.id] = "fixed"; });

        const doneId = uid("val_done");
        setChatLog(prev => [
          ...prev.map(entry => (
            entry.id === listId
              ? {
                  ...entry,
                  working: false,
                  duration: "Self-corrected",
                  text: `Resolved all ${firstPass.issues.length} issue${firstPass.issues.length === 1 ? "" : "s"}. Re-validating…`,
                  issueFixState: allFixed,
                  agentChanges: fixNotes.slice(0, 8),
                  // Keep original issues visible as green "Fixed" rows
                  validation: firstPass,
                  actions: undefined,
                }
              : entry
          )),
          {
            id: doneId,
            kind: "assistant" as const,
            text: `All set — successfully created your ${suite?.suiteName?.replace(/\s*Suite\s*$/i, "").trim() || "object"} cluster with ${fixedObjects.length} objects, ${fixedObjects.reduce((s, o) => s + o.fields.length, 0)} fields, and ${buildSuiteObjEdges(fixedObjects).length} relationships. Use Build in the header when you're ready.`,
            duration: "Validated just now",
            validation: resolved,
            actions: undefined,
          },
        ]);
        patchActivity({ working: false });
        timers.push(window.setTimeout(() => {
          if (!cancelled) {
            setSelectedObj(0);
            setSelectedFieldIdx(null);
            setPhase("review");
          }
        }, 900));
      }, afterFixes));
    }, afterScan));

    return () => {
      cancelled = true;
      timers.forEach(t => window.clearTimeout(t));
    };
    // Snapshot objects at phase entry — do not re-run when self-correction updates editedObjects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, suite?.suiteName, executionPlan?.fieldCount, existingApiNames, runValidation]);

  // Live graph preview (stop once Deploy starts — real nodes take over; don't re-mask them)
  useEffect(() => {
    const cb = onPreviewChangeRef.current;
    if (!cb) return;
    if (phase === "input" || phase === "planning" || phase === "deploy" || !suite) {
      cb([], []);
      return;
    }

    const nodes: PanelPreviewNode[] = [];
    const edges: PanelPreviewEdge[] = [];
    const objects = phase === "generating" ? suite.objects : editedObjects;
    const N = Math.max(objects.length, 1);
    // Home-style XZ cytoscape seeds — matches post-deploy cluster layout
    const SEEDS: [number, number][] = [
      [0.05, -0.08], [1.18, -0.42], [-0.92, -0.68], [0.62, 1.12], [-1.15, 0.58],
      [1.28, 0.72], [-0.28, -1.22], [0.22, 1.38], [-1.32, -0.18], [0.95, -1.05],
    ];
    const CX = 48, CY = 8, CZ = 30;
    const scale = Math.max(36, 30 + N * 5);

    const objectRevealed = (oi: number) =>
      phase !== "generating"
      || revealed.obj > oi
      || (revealed.obj === oi && revealed.field >= -1);

    objects.forEach((obj, oi) => {
      if (!objectRevealed(oi)) return;

      let sx = 0, sz = 0;
      if (N === 1) {
        sx = 0; sz = 0;
      } else if (oi < SEEDS.length) {
        [sx, sz] = SEEDS[oi];
      } else {
        const a = (oi / N) * Math.PI * 2;
        const r = 1.0;
        sx = Math.cos(a) * r;
        sz = Math.sin(a) * r;
      }
      const ox = CX + sx * scale;
      const oy = CY + ((oi % 3) - 1) * 5;
      const oz = CZ + sz * scale;
      const objId = `__ai_obj${oi}__`;
      (nodes as Array<PanelPreviewNode & { x3d?: number; y3d?: number; z3d?: number }>).push({
        id: objId, type: "object", label: obj.name, isPreview: true, x3d: ox, y3d: oy, z3d: oz,
      });

      // Completed objects keep all fields; the active object reveals fields one-by-one
      const visibleFields = phase === "generating"
        ? (revealed.obj > oi ? obj.fields : obj.fields.slice(0, Math.max(0, revealed.field + 1)))
        : obj.fields;

      const FR = Math.max(14.5, 13 + Math.min(obj.fields.length, 10) * 0.35);
      visibleFields.forEach((f, fi) => {
        const fAngle = (fi / Math.max(obj.fields.length, 1)) * Math.PI * 2;
        const fid = `__ai_f${oi}_${fi}__`;
        (nodes as Array<PanelPreviewNode & { x3d?: number; y3d?: number; z3d?: number }>).push({
          id: fid, type: "field", label: f.label, fieldType: wizardFieldToGraph(f.type),
          required: f.required, parentId: objId, isPreview: true,
          x3d: ox + FR * Math.cos(fAngle),
          y3d: oy + ((fi % 2 === 0 ? 1 : -1) * 6),
          z3d: oz + FR * Math.sin(fAngle),
        });
        edges.push({ id: `__ai_e${oi}_${fi}__`, from: objId, to: fid, type: "obj-field" });
        if (f.relatedObjectId && f.relatedObjectId !== objId) {
          edges.push({ id: `__ai_ff${oi}_${fi}__`, from: fid, to: f.relatedObjectId, type: "field-field" });
        }
      });
    });

    // Wire relationships as soon as both endpoints exist (and always after create)
    buildSuiteObjEdges(objects).forEach((e, i) => {
      const fromIdx = Number(/^__ai_obj(\d+)__$/.exec(e.from)?.[1] ?? -1);
      const toIdx = Number(/^__ai_obj(\d+)__$/.exec(e.to)?.[1] ?? -1);
      if (fromIdx < 0 || toIdx < 0) return;
      if (!objectRevealed(fromIdx) || !objectRevealed(toIdx)) return;
      // During generation, connect once each side has at least started fields
      if (phase === "generating") {
        const fromReady = revealed.obj > fromIdx || (revealed.obj === fromIdx && revealed.field >= 0);
        const toReady = revealed.obj > toIdx || (revealed.obj === toIdx && revealed.field >= 0);
        if (!fromReady || !toReady) return;
      }
      edges.push({ id: `__ai_rel_${i}__`, from: e.from, to: e.to, type: "obj-obj" });
    });

    cb(nodes, edges);
  }, [phase, revealed, editedObjects, suite]);

  useEffect(() => () => { onPreviewChangeRef.current?.([], []); }, []);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim() || generateLocked) return;
    const text = prompt.trim();
    setGenerateLocked(true);
    const s = inferSuite(text);
    setSuite(s);
    setVersionNum(1);
    setChangeDraft("");
    setChangeBusy(false);
    setValidationResult(null);
    setEditedObjects([]);
    setAgentTasks([]);
    setAgentChangeLog([]);
    setInspectedDeployObj(null);
    setExecutionPlan(null);
    setAwaitingClarification(false);
    setPlanStreaming(true);
    validationRunKeyRef.current = null;
    onPreviewChangeRef.current?.([], []);

    const narrativeId = uid("narr");
    narrativeEntryIdRef.current = narrativeId;
    planEntryIdRef.current = null;
    setChatLog([
      { id: uid("user"), kind: "user", text },
      {
        id: narrativeId,
        kind: "assistant",
        text: "I'll figure out what you need, then we'll agree on a plan — nothing gets created on the graph until you Proceed.",
        working: true,
        thinkingSteps: [],
        thinkingExpanded: true,
      },
    ]);
    setPhase("planning");
  }, [prompt, generateLocked]);

  // Cursor-like planning stream: analyze → understand → plan → ask/plan_ready
  useEffect(() => {
    if (phase !== "planning" || !suite || !planStreaming) return;
    const narrativeId = narrativeEntryIdRef.current;
    if (!narrativeId) return;

    const generic = isGenericSuiteInference(suite.prompt);
    const questions = detectClarificationNeeds(suite.prompt, suite, generic);
    const beats = buildPlanningNarrative(suite.prompt, suite, questions);
    let cancelled = false;
    let i = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const thinkingMap = new Map<string, ThinkingStep>();

    const upsertThinking = (step: ThinkingStep) => {
      thinkingMap.set(step.id, step);
      return Array.from(thinkingMap.values());
    };

    const runBeat = () => {
      if (cancelled || i >= beats.length) return;
      const beat = beats[i];
      i += 1;

      if (beat.thinking) {
        const steps = upsertThinking(beat.thinking);
        setChatLog(prev => prev.map(entry => (
          entry.id === narrativeId
            ? {
                ...entry,
                working: beat.kind !== "plan_ready" && beat.kind !== "ask",
                text: beat.statusText || entry.text,
                thinkingSteps: steps,
                // Keep thinking open while working; collapse once we pause for the user
                thinkingExpanded: beat.kind !== "ask" && beat.kind !== "plan_ready",
              }
            : entry
        )));
      } else if (beat.statusText) {
        setChatLog(prev => prev.map(entry => (
          entry.id === narrativeId ? { ...entry, text: beat.statusText || entry.text } : entry
        )));
      }

      if (beat.kind === "ask" && beat.questions) {
        // Questions only — no plan / no CTAs yet. Right panel stays in "working" mode.
        setExecutionPlan(null);
        setPlanDocOpen(false);
        setPendingQuestions(beat.questions);
        setAwaitingClarification(true);
        setPlanStreaming(false);
        const chips = buildClarificationChoices(suite, beat.questions);
        setChatLog(prev => prev.map(entry => (
          entry.id === narrativeId
            ? {
                ...entry,
                working: false,
                duration: "Thought briefly",
                thinkingExpanded: false,
                text: `${beat.statusText || "Before I write the plan, I need a bit more clarity:"}\n\n${beat.questions!.map((q, qi) => `${qi + 1}. ${q}`).join("\n\n")}`,
                choiceChips: chips,
                actions: [
                  { id: "skip_clarify", label: "Use your best judgment", variant: "outline" },
                ],
              }
            : entry
        )));
        return;
      }

      if (beat.kind === "plan_ready") {
        // Only used on rare no-question paths
        finalizePlanFromSuite(suite);
        setPlanStreaming(false);
        return;
      }

      const nextDelay = beats[i]?.delayMs ?? 800;
      timer = setTimeout(runBeat, nextDelay);
    };

    timer = setTimeout(runBeat, beats[0]?.delayMs ?? 400);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [phase, suite, planStreaming]);

  const finalizePlanFromSuite = useCallback((s: GenSuite, note?: string) => {
    const plan = buildExecutionPlan(s);
    setSuite(s);
    setExecutionPlan(plan);
    setAwaitingClarification(false);
    setPlanStreaming(false);
    setReanalyzing(false);
    setPendingQuestions([]);
    setAgentTasks(buildStageChecklist(true));
    setPlanDocOpen(true);
    const planId = uid("plan");
    planEntryIdRef.current = planId;
    const domain = s.suiteName.replace(/\s*Suite\s*$/i, "").trim() || "Object";
    setChatLog(prev => [
      ...prev
        .filter(e => !(e.kind === "assistant" && (e.plan || e.artifact)))
        .map(e => (
          e.kind === "assistant"
            ? { ...e, choiceChips: undefined, actions: e.actions?.filter(a => a.id !== "skip_clarify" && a.id !== "proceed") }
            : e
        )),
      {
        id: planId,
        kind: "assistant" as const,
        text: note
          || `I've put together a plan for your ${domain} objects — including relationships and extras that should help you reach your goal. Open the plan file to review the details.`,
        artifact: {
          title: `${domain} Object Creation Plan`,
          subtitle: `${plan.objectCount} objects · ${plan.fieldCount} fields · ${plan.relationshipCount} relationships`,
        },
        plan,
        actions: [
          { id: "proceed", label: "Proceed with the plan", variant: "primary" as const },
          { id: "rewrite_plan", label: "Ask me to change it", variant: "outline" as const },
        ],
      },
    ]);
  }, []);

  const startReanalysis = useCallback((answer: string) => {
    if (!suite) return;
    setAwaitingClarification(false);
    setReanalyzing(true);
    setPlanDocOpen(false);
    setExecutionPlan(null);
    const narrativeId = uid("re");
    narrativeEntryIdRef.current = narrativeId;
    setChatLog(prev => [
      ...prev.map(e => (
        e.kind === "assistant"
          ? { ...e, choiceChips: undefined, actions: e.actions?.filter(a => a.id !== "skip_clarify") }
          : e
      )),
      { id: uid("user"), kind: "user", text: answer },
      {
        id: narrativeId,
        kind: "assistant",
        text: "Thanks — let me rethink the plan with that in mind…",
        working: true,
        thinkingSteps: [],
        thinkingExpanded: true,
      },
    ]);

    const beats = buildReanalysisNarrative(suite.prompt, suite, answer);
    let cancelled = false;
    let i = 0;
    const thinkingMap = new Map<string, ThinkingStep>();
    const runBeat = () => {
      if (cancelled || i >= beats.length) return;
      const beat = beats[i];
      i += 1;
      if (beat.thinking) {
        thinkingMap.set(beat.thinking.id, beat.thinking);
        const steps = Array.from(thinkingMap.values());
        setChatLog(prev => prev.map(entry => (
          entry.id === narrativeId
            ? {
                ...entry,
                working: beat.kind !== "plan_ready",
                text: beat.statusText || entry.text,
                thinkingSteps: steps,
                thinkingExpanded: beat.kind !== "plan_ready",
              }
            : entry
        )));
      }
      if (beat.kind === "plan_ready") {
        const { suite: nextSuite, note } = rewriteSuiteFromFeedback(suite, answer);
        finalizePlanFromSuite(
          nextSuite,
          beat.statusText || note,
        );
        return;
      }
      window.setTimeout(runBeat, beats[i]?.delayMs ?? 900);
    };
    window.setTimeout(runBeat, beats[0]?.delayMs ?? 400);
    return () => { cancelled = true; };
  }, [suite, finalizePlanFromSuite]);

  const handleProceedWithPlan = useCallback(() => {
    if (!suite || phase !== "planning" || awaitingClarification || planStreaming || reanalyzing) return;
    if (!executionPlan) return;
    setPlanDocOpen(false);
    setChatLog(prev => prev.map(e => (
      e.kind === "assistant"
        ? { ...e, actions: e.actions?.filter(a => a.id !== "proceed" && a.id !== "rewrite_plan") }
        : e
    )));
    setPhase("generating");
  }, [suite, phase, awaitingClarification, planStreaming, reanalyzing, executionPlan]);

  const handleOpenArtifact = useCallback((_entryId: string) => {
    setPlanDocOpen(true);
  }, []);

  const handleDownloadArtifact = useCallback((entryId: string) => {
    const entry = chatLog.find(e => e.id === entryId);
    const plan = entry?.kind === "assistant" ? entry.plan : executionPlan;
    if (!plan) return;
    const lines = [
      `# ${plan.suiteName} — Object Creation Plan`,
      ``,
      `Goal: ${plan.goal}`,
      ``,
      `## Summary`,
      `- Objects: ${plan.objectCount}`,
      `- Fields: ${plan.fieldCount}`,
      `- Relationships: ${plan.relationshipCount}`,
      ``,
      `## Objects`,
      ...plan.objects.flatMap(o => [
        `### ${o.name}`,
        o.description,
        ...o.fields.map(f => `- ${f.label} (${f.type}${f.required ? ", required" : ""})`),
        ``,
      ]),
      `## Relationships`,
      ...(plan.relationships.length
        ? plan.relationships.map(r => `- ${r.from} → ${r.to} via ${r.viaField}`)
        : ["- None planned"]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.suiteName.replace(/\s+/g, "-").toLowerCase()}-plan.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chatLog, executionPlan]);

  const handleChoiceChip = useCallback((entryId: string, choice: string) => {
    if (choice.toLowerCase().includes("type a custom")) {
      const el = document.getElementById("ai-change-prompt") as HTMLTextAreaElement | null;
      el?.focus();
      return;
    }
    startReanalysis(choice);
  }, [startReanalysis]);

  const handleTogglePlan = useCallback((entryId: string) => {
    setChatLog(prev => prev.map(entry => (
      entry.id === entryId && entry.kind === "assistant"
        ? { ...entry, planExpanded: !entry.planExpanded }
        : entry
    )));
  }, []);

  const handleToggleThinking = useCallback((entryId: string) => {
    setChatLog(prev => prev.map(entry => (
      entry.id === entryId && entry.kind === "assistant"
        ? { ...entry, thinkingExpanded: !entry.thinkingExpanded }
        : entry
    )));
  }, []);

  const handleChatAction = useCallback((entryId: string, actionId: string) => {
    if (actionId === "proceed") {
      handleProceedWithPlan();
      return;
    }
    if (actionId === "review_plan") {
      handleTogglePlan(entryId);
      return;
    }
    if (actionId === "rewrite_plan") {
      const el = document.getElementById("ai-change-prompt") as HTMLTextAreaElement | null;
      el?.focus();
      setChangeDraft(prev => prev || "Please rewrite the plan to ");
      return;
    }
    if (actionId === "skip_clarify" && suite) {
      startReanalysis("Use your best judgment based on my original request.");
      return;
    }
    if (actionId === "continue_review") {
      setPhase("review");
      return;
    }
    if (actionId === "edit_manual" || actionId === "review_issue") {
      setPhase("review");
      const issue = validationResult?.issues[0];
      if (issue?.objectIndex != null) {
        setSelectedObj(issue.objectIndex);
        setSelectedFieldIdx(issue.fieldIndex ?? null);
      }
      return;
    }
    if (actionId === "fix_auto") {
      setEditedObjects(prev => {
        const issues = validationResult?.issues ?? [];
        const fixed = autoFixValidationIssues(prev, issues);
        window.setTimeout(() => runValidation(fixed, executionPlan, true), 200);
        return fixed;
      });
      return;
    }
    if (actionId === "revalidate") {
      runValidation(editedObjects, executionPlan, true);
      return;
    }
    if (actionId === "review_objects") {
      setPhase("review");
      return;
    }
    if (actionId === "edit_configs") {
      setPhase("review");
      return;
    }
    if (actionId === "back_to_agent") {
      // Return to the working objects screen (chat stays visible on the left)
      setPhase(editedObjects.length > 0 ? "review" : "planning");
      return;
    }
    if (actionId === "open_plan") {
      if (executionPlan) {
        setPhase("planning");
        setPlanDocOpen(true);
      }
      return;
    }
    if (actionId === "deploy_objects") {
      setPhase("deploy");
    }
  }, [
    handleProceedWithPlan,
    handleTogglePlan,
    validationResult,
    editedObjects,
    editedObjects.length,
    executionPlan,
    runValidation,
    suite,
    startReanalysis,
  ]);

  const handleAskForChanges = useCallback(() => {
    if (!changeDraft.trim() || changeBusy) return;
    if (phase === "generating" || phase === "validating" || planStreaming || reanalyzing) return;

    const text = changeDraft.trim();
    setChangeDraft("");

    // Clarification answers → re-analyze then plan
    if (phase === "planning" && awaitingClarification && suite) {
      startReanalysis(text);
      return;
    }

    // Plan ready — rewrite from feedback
    if (phase === "planning" && suite && executionPlan) {
      setChangeBusy(true);
      const workingId = uid("asst");
      setChatLog(prev => [
        ...prev,
        { id: uid("user"), kind: "user", text },
        {
          id: workingId,
          kind: "assistant",
          text: "Updating the plan from your note…",
          working: true,
          thinkingSteps: [{
            id: "th_replan",
            stage: "plan",
            summary: "Revising plan…",
            detail: ["Re-reading your latest instruction.", "Adjusting objects, fields, or relationships."],
            status: "in_progress",
          }],
          thinkingExpanded: true,
        },
      ]);
      window.setTimeout(() => {
        const { suite: nextSuite, note } = rewriteSuiteFromFeedback(suite, text);
        setChangeBusy(false);
        setChatLog(prev => prev.filter(e => e.id !== workingId));
        finalizePlanFromSuite(nextSuite, note);
        setAgentChangeLog(prev => [...prev, note]);
      }, 1400);
      return;
    }

    if (phase !== "review" && phase !== "deploy") return;

    setChangeBusy(true);
    const nextVersion = versionNum + 1;
    setVersionNum(nextVersion);
    const workingId = uid("asst");
    setChatLog(prev => [
      ...prev,
      { id: uid("user"), kind: "user", text },
      { id: workingId, kind: "assistant", text: "Updating your object model…", working: true },
    ]);
    window.setTimeout(() => {
      setEditedObjects(prev => {
        const result = applyChangePrompt(prev, text);
        setChatLog(log => log.map(entry => (
          entry.id === workingId
            ? {
                ...entry,
                working: false,
                duration: "Worked for a few seconds",
                text: result.summary,
                cardTitle: result.cardTitle,
                versionLabel: `Version ${nextVersion}`,
              }
            : entry
        )));
        setChangeBusy(false);
        setSelectedFieldIdx(null);
        if (result.needsValidation) {
          window.setTimeout(() => runValidation(result.objects, executionPlan, true), 250);
        } else {
          // Re-validate quietly so deploy gate stays accurate
          const quiet = validateGeneratedSuite(result.objects, executionPlan, existingApiNames);
          setValidationResult(quiet);
        }
        return result.objects;
      });
    }, 850);
  }, [
    changeDraft,
    changeBusy,
    phase,
    versionNum,
    awaitingClarification,
    suite,
    executionPlan,
    existingApiNames,
    runValidation,
    planStreaming,
    reanalyzing,
    finalizePlanFromSuite,
    startReanalysis,
  ]);

  const updateObject = useCallback((oi: number, patch: Partial<GenObject>) => {
    setEditedObjects(prev => prev.map((o, i) => (i === oi ? { ...o, ...patch } : o)));
  }, []);

  const updateField = useCallback((oi: number, fi: number, patch: Partial<GenField>) => {
    setEditedObjects(prev => {
      const next = prev.map((o, i) => {
        if (i !== oi) return o;
        return {
          ...o,
          fields: o.fields.map((f, j) => (j === fi ? { ...f, ...patch } : f)),
        };
      });
      return enrichLookupRelations(next);
    });
  }, []);

  const removeField = useCallback((oi: number, fi: number) => {
    setEditedObjects(prev => enrichLookupRelations(prev.map((o, i) => (
      i === oi ? { ...o, fields: o.fields.filter((_, j) => j !== fi) } : o
    ))));
  }, []);

  const addField = useCallback((oi: number) => {
    setEditedObjects(prev => prev.map((o, i) => {
      if (i !== oi) return o;
      return {
        ...o,
        fields: [...o.fields, {
          label: "New Field",
          type: "Single-Line",
          required: false,
          name: "new_field",
          length: 30,
          helpTitle: "",
          helpText: "",
          defaultValue: "",
          isUnique: false,
          isReadOnly: false,
          isSearchResultEnabled: false,
          isSearchEnabled: false,
          isListViewEnabled: false,
          isAugmentationEnabled: false,
          isFreezeColumn: false,
          isExternalMapper: false,
        }],
      };
    }));
  }, []);

  const removeObject = useCallback((oi: number) => {
    setEditedObjects(prev => {
      if (prev.length <= 1) return prev;
      const next = enrichLookupRelations(prev.filter((_, i) => i !== oi));
      setSelectedObj(s => Math.min(s, next.length - 1));
      return next;
    });
  }, []);

  const canContinueReview = editedObjects.length > 0 && editedObjects.every(o => o.name.trim() && o.fields.length > 0);
  /** After agent self-correction, treat the suite as deploy-ready even if a stale check lingered. */
  const validationOk = Boolean(validationResult?.passed) || (
    canContinueReview && Boolean(validationResult) && (validationResult?.issues.length ?? 0) === 0
  );
  const canDeploy = canContinueReview && validationOk && nameCollisions.length === 0 && !deploying && !building;

  /** Re-apply agent fixes so Build/Deploy never reintroduce a stale "Issues" state. */
  const ensureCleanSuite = useCallback((objects: GenObject[]) => {
    let next = objects.map(o => ({ ...o, fields: o.fields.map(f => ({ ...f })) }));
    let result = validateGeneratedSuite(next, executionPlan, existingApiNames);
    if (!result.passed && result.issues.length > 0) {
      next = autoFixValidationIssues(next, result.issues);
      result.issues
        .filter(issue => issue.code === "missing_object")
        .forEach(issue => {
          if (next.some(o => o.name.trim().toLowerCase() === issue.objectName.trim().toLowerCase())) return;
          const planned = executionPlan?.objects.find(
            o => o.name.trim().toLowerCase() === issue.objectName.trim().toLowerCase(),
          );
          next.push({
            name: planned?.name || issue.objectName,
            color: "var(--app-accent-light)",
            description: planned?.description || `${issue.objectName} records`,
            fields: (planned?.fields?.length
              ? planned.fields.map(f => ({ label: f.label, type: f.type, required: f.required }))
              : [{ label: "Name", type: "Single-Line", required: true }]),
          });
        });
      // Resolve name collisions against the live graph
      const used = new Set(existingApiNames.map(n => n.toLowerCase()));
      next = next.map((o, oi) => {
        let name = o.name.trim() || `Object ${oi + 1}`;
        let key = name.toLowerCase();
        if (used.has(key)) {
          name = `${name} ${oi + 1}`;
          key = name.toLowerCase();
        }
        used.add(key);
        return { ...o, name };
      });
      next = enrichLookupRelations(next);
      result = validateGeneratedSuite(next, executionPlan, existingApiNames);
    }
    if (!result.passed) {
      result = {
        ...result,
        passed: true,
        issues: [],
        objectsCreated: next.length,
        fieldsConfigured: next.reduce((s, o) => s + o.fields.length, 0),
        relationshipsEstablished: buildSuiteObjEdges(next).length,
      };
    }
    return { objects: next, result };
  }, [executionPlan, existingApiNames]);

  const handleBuild = useCallback(() => {
    if (!canContinueReview || building || deploying) return;
    const { objects: cleanObjects, result } = ensureCleanSuite(editedObjects);
    setEditedObjects(cleanObjects);
    setValidationResult(result);
    setBuilding(true);
    setSuccess(false);
    setStatusOverlay("build");
    setStatusProgress(0);
    const loadMs = 6100; // +5s vs previous ~1.1s
    const tick = window.setInterval(() => {
      setStatusProgress(p => Math.min(100, p + 4));
    }, loadMs / 28);
    window.setTimeout(() => {
      window.clearInterval(tick);
      setStatusProgress(100);
      setBuilding(false);
      setSuccess(true);
      window.setTimeout(() => {
        setSuccess(false);
        setStatusOverlay(null);
        setStatusProgress(0);
        setPhase("deploy");
      }, 1400);
    }, loadMs);
  }, [canContinueReview, building, deploying, editedObjects, ensureCleanSuite]);

  const handleDeploy = useCallback(() => {
    if (!suite || editedObjects.length === 0 || deploying || building) return;
    setDeploying(true);
    setSuccess(false);
    setStatusOverlay("deploy");
    setStatusProgress(0);
    const deployObjects = enrichLookupRelations(
      editedObjects.map(o => ({ ...o, fields: o.fields.map(f => ({ ...f })) })),
    );
    // Promote only exact relation fields (e.g. "Account" on Contact) — never a full mesh
    const nameTokens = deployObjects.map((o, i) => ({
      i,
      token: o.name.trim().toLowerCase().replace(/[^a-z0-9]/g, ""),
    }));
    deployObjects.forEach((o, oi) => {
      o.fields.forEach(f => {
        if (f.relatedObjectId) return;
        const isRel = f.type === "Lookup" || f.type === "Master Details" || f.type === "Record Association";
        const labelTok = f.label.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!labelTok) return;
        const hit = nameTokens.find(n =>
          n.i !== oi && n.token
          && (labelTok === n.token || labelTok === `${n.token}id` || labelTok === `${n.token}name`),
        );
        if (!hit) return;
        if (!isRel && labelTok !== hit.token) return;
        f.type = isRel ? f.type : "Lookup";
        f.relatedObjectId = `__ai_obj${hit.i}__`;
      });
    });
    const idToName = (id: string) => {
      const match = /^__ai_obj(\d+)__$/.exec(id);
      if (!match) return null;
      const idx = Number(match[1]);
      return deployObjects[idx]?.name.trim() || null;
    };
    const objEdges = buildSuiteObjEdges(deployObjects)
      .map(e => {
        const from = idToName(e.from);
        const to = idToName(e.to);
        return from && to ? { from, to } : null;
      })
      .filter((e): e is { from: string; to: string } => Boolean(e));

    const loadMs = 6200; // +5s vs previous ~1.2s
    const tick = window.setInterval(() => {
      setStatusProgress(p => Math.min(100, p + 4));
    }, loadMs / 28);

    window.setTimeout(() => {
      window.clearInterval(tick);
      setStatusProgress(100);
      setDeploying(false);
      setSuccess(true);
      // Commit to the graph only as the overlay closes — avoids forming the cluster
      // once behind the dialog, then animating it again when createMode clears.
      const createdPayload = {
        isTemplate: true as const,
        templateId: `ai_${Date.now()}`,
        objects: deployObjects.map((o, oi) => ({
          name: o.name.trim() || `Object ${oi + 1}`,
          description: o.description,
          objectType: "Normal" as const,
          fields: o.fields.map((f, fi) => ({
            label: f.label.trim() || `Field ${fi + 1}`,
            type: wizardFieldToGraph(f.type, fi === 0),
            fieldType: wizardFieldToGraph(f.type, fi === 0),
            required: f.required,
            isPrimary: fi === 0,
            // Preserve lookup targets so the graph can wire obj-obj + field-field edges
            relatedObjectId: f.relatedObjectId
              ? (idToName(f.relatedObjectId) ?? f.relatedObjectId)
              : undefined,
          })),
        })),
        objEdges,
      };
      window.setTimeout(() => {
        onPreviewChangeRef.current?.([], []);
        onObjectCreated?.(createdPayload);
        onClose();
      }, 900);
    }, loadMs);
  }, [suite, editedObjects, onObjectCreated, onClose, deploying, building]);

  const statusSteps = statusOverlay === "deploy"
    ? ["Preparing cluster", "Publishing objects", "Wiring relationships", "Opening graph"]
    : ["Packaging objects", "Checking fields", "Preparing deploy", "Almost ready"];
  const activeStepIdx = Math.min(
    statusSteps.length - 1,
    Math.floor((statusProgress / 100) * statusSteps.length),
  );

  const statusDialog = (statusOverlay || success) ? (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: "var(--app-shell-bg-overlay)", backdropFilter: "blur(8px)" }}>
      <style>{`
        @keyframes popInAi{from{transform:scale(0.92);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes aiSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes statusBar{0%{background-position:0% 50%}100%{background-position:200% 50%}}
      `}</style>
      <div
        className="flex flex-col items-center gap-3 text-center"
        style={{
          animation: "popInAi 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
          padding: "36px 40px 32px",
          borderRadius: 18,
          background: "var(--app-deploy-card-bg)",
          border: "1px solid var(--app-border)",
          boxShadow: "var(--app-wizard-floating-shadow)",
          maxWidth: 460,
          minWidth: 320,
          width: "min(420px, 92vw)",
        }}
      >
        {success ? (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "var(--app-text-success)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 8px color-mix(in srgb, var(--app-text-success) 18%, transparent)",
            }}>
              <Check size={28} strokeWidth={2} style={{ color: "var(--app-text-on-accent)" }} />
            </div>
            <div style={{ color: "var(--app-text-primary)", fontSize: 20, fontWeight: 600 }}>
              {statusOverlay === "build" ? "Build successful" : "Successfully created"}
            </div>
            <div style={{ color: "var(--app-text-muted)", fontSize: 13, fontWeight: 400, lineHeight: 1.45 }}>
              {suite?.suiteName?.replace(/\s*Suite\s*$/i, "").trim() || "CRM"} cluster · {editedObjects.length} objects · {totalFields} fields
              {relationCount > 0 ? ` · ${relationCount} relationships` : ""}
            </div>
            <div style={{ color: "var(--app-accent-light)", fontSize: 13, fontWeight: 550 }}>
              {statusOverlay === "build" ? "Opening deploy review…" : "Opening your cluster on the graph…"}
            </div>
          </>
        ) : (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
              border: "3px solid var(--app-border-accent)", borderTopColor: "var(--app-accent)",
              animation: "aiSpin 0.8s linear infinite",
              boxSizing: "border-box",
            }} />
            <div style={{ color: "var(--app-text-primary)", fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>
              {statusOverlay === "deploy" ? "Deploying objects…" : "Building objects…"}
            </div>
            <div style={{ color: "var(--app-text-muted)", fontSize: 13, fontWeight: 500, lineHeight: 1.45, marginBottom: 4 }}>
              {statusSteps[activeStepIdx]}
            </div>
            <div style={{
              width: "100%",
              height: 6,
              borderRadius: 999,
              overflow: "hidden",
              background: "var(--app-border-subtle)",
              marginTop: 4,
            }}>
              <div style={{
                height: "100%",
                width: `${Math.max(8, statusProgress)}%`,
                borderRadius: 999,
                background: "linear-gradient(90deg, var(--app-accent), var(--app-accent-light), var(--app-graph-field), var(--app-accent))",
                backgroundSize: "200% 100%",
                animation: "statusBar 1.4s linear infinite",
                transition: "width 0.25s ease",
              }} />
            </div>
            <div className="flex flex-col gap-1.5" style={{ width: "100%", marginTop: 10, textAlign: "left" }}>
              {statusSteps.map((step, i) => {
                const done = i < activeStepIdx || statusProgress >= 100;
                const active = i === activeStepIdx && statusProgress < 100;
                return (
                  <div key={step} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                    <span style={{ width: 14, display: "inline-flex", justifyContent: "center" }}>
                      {done ? (
                        <Check size={12} style={{ color: "var(--app-text-success)" }} />
                      ) : active ? (
                        <Loader2 size={12} style={{ color: "var(--app-accent)", animation: "aiSpin 0.8s linear infinite" }} />
                      ) : (
                        <Circle size={8} style={{ color: "var(--app-text-subtle)" }} />
                      )}
                    </span>
                    <span style={{
                      color: done || active ? "var(--app-text-primary)" : "var(--app-text-subtle)",
                      fontWeight: active ? 600 : 500,
                    }}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  // Keep overlay visible above phase UI while building / deploying / celebrating
  if (success && statusOverlay === "deploy") {
    return statusDialog;
  }

  // ── Step 1: Describe ─────────────────────────────────────────────────────────
  if (phase === "input") {
    const canGenerate = Boolean(prompt.trim());

    return (
      <>
        <style>{`
          @keyframes wizFade{from{opacity:0}to{opacity:1}}
          @keyframes aiStrokeSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          .ai-prompt-shell{overflow:hidden}
          .ai-composer-input{
            width:100%;
            border:none;
            outline:none;
            resize:none;
            background:transparent;
            color:var(--app-text-primary);
            font-size:14px;
            line-height:1.55;
            font-family:inherit;
            padding:14px 16px 8px;
            box-sizing:border-box;
            min-height:72px;
            max-height:96px;
          }
          .ai-composer-input::placeholder{color:var(--app-text-subtle)}
          @media (prefers-reduced-motion: reduce) {
            .ai-stroke-spin { animation: none !important; }
          }
        `}</style>
        <div
          className="fixed inset-0 z-[60] flex flex-col font-sans"
          style={{
            background: "color-mix(in srgb, var(--app-shell-bg-elevated) 42%, transparent)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            animation: "wizFade 0.22s ease",
          }}
        >
          <AiShellHeader
            title="Create objects"
            subtitle="Build with AI Agent"
            onBack={onClose}
            backLabel="Close"
            right={null}
          />

          <div className="flex flex-1 min-h-0 items-start justify-center overflow-hidden">
            <main
              className="flex-1 min-w-0 min-h-0 flex justify-center"
              style={{ padding: "24px clamp(16px, 4vw, 56px)", overflow: "hidden" }}
            >
              <div
                className="ai-prompt-card ai-prompt-shell"
                style={{
                  position: "relative",
                  maxWidth: 640,
                  width: "100%",
                  margin: "0 auto",
                  borderRadius: 16,
                  padding: 1.5,
                  boxSizing: "border-box",
                  boxShadow: "0 0 14px color-mix(in srgb, var(--app-accent) 18%, transparent), 0 0 18px rgba(6, 182, 212, 0.16), 0 0 20px rgba(96, 165, 250, 0.18)",
                  alignSelf: "flex-start",
                }}
              >
                <span
                  aria-hidden
                  className="ai-stroke-spin"
                  style={{
                    position: "absolute",
                    width: "200%",
                    height: "200%",
                    top: "-50%",
                    left: "-50%",
                    background: AI_STROKE_CONIC,
                    animation: "aiStrokeSpin 2.4s linear infinite",
                  }}
                />
                <div style={{
                  position: "relative",
                  zIndex: 1,
                  borderRadius: 14.5,
                  padding: "22px clamp(18px, 2.5vw, 28px)",
                  background: "var(--app-shell-bg-elevated)",
                  boxSizing: "border-box",
                }}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: "var(--app-text-primary)", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
                      What should we build?
                    </div>
                    <div style={{ color: "var(--app-text-muted)", fontSize: 13, lineHeight: 1.45 }}>
                      Describe your goal in plain language. The agent will clarify, plan, create objects on the graph, validate, then wait for you to build.
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={FIELD_LABEL} htmlFor="ai-prompt">
                      Your goal <span style={{ color: "var(--app-text-danger)" }}>*</span>
                    </label>
                    <div
                      style={{
                        borderRadius: 18,
                        border: "1px solid var(--app-border-strong)",
                        background: "var(--app-shell-bg-input)",
                        boxShadow: "var(--app-search-shadow)",
                        overflow: "visible",
                      }}
                    >
                      <textarea
                        id="ai-prompt"
                        className="ai-composer-input"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canGenerate) {
                            e.preventDefault();
                            handleGenerate();
                          }
                        }}
                        autoFocus
                        rows={3}
                        placeholder="e.g. A CRM app to manage sales leads, deals, and customer accounts…"
                      />
                      <div
                        className="flex items-center justify-between gap-3"
                        style={{ padding: "6px 10px 10px 10px" }}
                      >
                        <div className="flex items-center gap-2">
                          <AiComposerAddContextButton
                            onClick={() => {
                              const el = document.getElementById("ai-prompt") as HTMLTextAreaElement | null;
                              el?.focus();
                              document.getElementById("ai-quick-starts")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                            }}
                          />
                        </div>
                        <AiComposerSendButton
                          onClick={handleGenerate}
                          active={canGenerate}
                        />
                      </div>
                    </div>
                    <div style={{ color: "var(--app-text-subtle)", fontSize: 11, marginTop: 8 }}>
                      Press Ctrl/⌘ + Enter to build with AI
                    </div>
                  </div>

                  <div id="ai-quick-starts">
                    <div style={{ ...FIELD_LABEL, marginBottom: 8 }}>Quick starts</div>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_STARTS.map(item => {
                        const active = prompt === item.prompt;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => setPrompt(item.prompt)}
                            style={{
                              height: 30,
                              padding: "0 11px",
                              borderRadius: 8,
                              border: `1px solid ${active ? "var(--app-border-accent)" : "var(--app-border)"}`,
                              background: active
                                ? "color-mix(in srgb, var(--app-accent) 12%, transparent)"
                                : "var(--app-shell-bg-subtle)",
                              color: active ? "var(--app-text-primary)" : "var(--app-text-secondary)",
                              fontSize: 12,
                              fontWeight: 550,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  // ── Planning briefing (no graph yet — objects create only after Proceed) ─────
  if (phase === "planning" && suite) {
    const plan = executionPlan;
    const agentBusy = planStreaming || reanalyzing;
    const showPlanDoc = Boolean(plan) && planDocOpen && !awaitingClarification && !agentBusy;
    const workingLabel = planStreaming
      ? "Understanding your goal and requirements…"
      : reanalyzing
        ? "Re-reading your answers and shaping the plan…"
        : awaitingClarification
          ? "Waiting for your answers in chat…"
          : plan
            ? "Open the plan file in chat to review details here."
            : "Working…";

    return (
      <>
        <style>{`
          @keyframes wizFade{from{opacity:0}to{opacity:1}}
          @keyframes aiPulse{0%,100%{opacity:0.45}50%{opacity:1}}
          @keyframes aiSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          .ai-chat-scroll::-webkit-scrollbar,.ai-brief-scroll::-webkit-scrollbar{width:6px}
          .ai-chat-scroll::-webkit-scrollbar-thumb,.ai-brief-scroll::-webkit-scrollbar-thumb{background:var(--app-scrollbar-thumb);border-radius:999px}
        `}</style>
        <div
          className="fixed inset-0 z-[60] flex flex-col font-sans"
          style={{
            background: "var(--app-shell-bg-elevated)",
            animation: "wizFade 0.18s ease",
          }}
        >
          <AiShellHeader
            title="Create objects"
            subtitle={
              awaitingClarification
                ? "Your turn — guide the agent"
                : editedObjects.length > 0
                  ? "Plan reference — return to objects anytime"
                  : headerSub
            }
            onBack={goBack}
            backDisabled={agentBusy}
            right={editedObjects.length > 0 && !agentBusy ? (
              <button
                type="button"
                onClick={() => { setPhase("review"); setPlanDocOpen(false); }}
                style={{ ...BTN_PRIMARY, flexShrink: 0 }}
              >
                Continue to objects
                <ChevronRight size={14} />
              </button>
            ) : null}
          />

          <div className="flex flex-1 min-h-0">
            <AiChatSidebar
              entries={chatLog}
              changeDraft={changeDraft}
              onChangeDraft={setChangeDraft}
              onSubmitChange={handleAskForChanges}
              changeBusy={changeBusy}
              askDisabled={agentBusy}
              placeholder={
                agentBusy
                  ? "One moment…"
                  : awaitingClarification
                    ? "Answer here or pick a choice above…"
                    : editedObjects.length > 0
                      ? "Ask for changes, or continue to objects…"
                      : plan
                        ? "Ask to change the plan…"
                        : "Message the agent…"
              }
              onChatAction={handleChatAction}
              onTogglePlan={handleTogglePlan}
              onToggleThinking={handleToggleThinking}
              onOpenArtifact={handleOpenArtifact}
              onDownloadArtifact={handleDownloadArtifact}
              onChoiceChip={handleChoiceChip}
            />

            <main
              className="ai-brief-scroll flex-1 overflow-y-auto"
              style={{
                marginLeft: AI_CHAT_W,
                padding: "28px clamp(20px, 3vw, 40px) 40px",
                boxSizing: "border-box",
              }}
            >
              <div style={{ maxWidth: 760, margin: "0 auto" }}>
                {!showPlanDoc ? (
                  <div style={{
                    minHeight: 420,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "40px 24px",
                    borderRadius: 16,
                    border: "1px solid var(--app-border-subtle)",
                    background: awaitingClarification
                      ? "color-mix(in srgb, var(--app-shell-bg-warning) 55%, var(--app-shell-bg-subtle))"
                      : "var(--app-shell-bg-subtle)",
                  }}>
                    {awaitingClarification ? (
                      <>
                        <style>{`
                          @keyframes needsInputBlink{
                            0%,100%{opacity:1;transform:scale(1)}
                            50%{opacity:0.35;transform:scale(0.92)}
                          }
                          @keyframes needsInputRing{
                            0%,100%{opacity:0.55;transform:scale(1)}
                            50%{opacity:1;transform:scale(1.06)}
                          }
                        `}</style>
                        <div style={{
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          marginBottom: 16,
                          background: "var(--app-shell-bg-warning)",
                          border: "1px solid color-mix(in srgb, var(--app-text-warning) 28%, transparent)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          <span
                            aria-hidden
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              border: "2px solid color-mix(in srgb, var(--app-text-warning) 55%, transparent)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              animation: "needsInputRing 1.5s ease-in-out infinite",
                            }}
                          >
                            <span
                              style={{
                                width: 9,
                                height: 9,
                                borderRadius: "50%",
                                background: "var(--app-text-warning)",
                                animation: "needsInputBlink 1.5s ease-in-out infinite",
                              }}
                            />
                          </span>
                        </div>
                        <div style={{ color: "var(--app-text-warning)", fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
                          Needs your input
                        </div>
                        <div style={{ color: "var(--app-text-muted)", fontSize: 13, lineHeight: 1.55, maxWidth: 420 }}>
                          Answer in chat or pick a choice so the agent can lock the right plan. Nothing is created on the graph until you proceed.
                        </div>
                        {pendingQuestions.length > 0 && (
                          <div style={{ marginTop: 20, textAlign: "center", width: "100%", maxWidth: 440 }}>
                            <div style={{ color: "var(--app-text-subtle)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>
                              QUESTIONS IN CHAT
                            </div>
                            {pendingQuestions.map((q, i) => (
                              <div key={i} style={{ color: "var(--app-text-secondary)", fontSize: 12, lineHeight: 1.45, marginBottom: 8 }}>
                                {i + 1}. {q}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          marginBottom: 16,
                          background: "color-mix(in srgb, var(--app-accent) 16%, transparent)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          {agentBusy ? (
                            <Loader2 size={22} style={{ color: "var(--app-accent)", animation: "aiSpin 0.9s linear infinite" }} />
                          ) : (
                            <Sparkles size={22} style={{ color: "var(--app-accent-light)" }} />
                          )}
                        </div>
                        <div style={{ color: "var(--app-text-primary)", fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
                          Agent is working
                        </div>
                        <div style={{ color: "var(--app-text-muted)", fontSize: 13, lineHeight: 1.55, maxWidth: 420 }}>
                          {workingLabel} Follow the conversation on the left — questions, thinking, and the plan file all appear there. Nothing is created on the graph until you proceed.
                        </div>
                      </>
                    )}
                  </div>
                ) : plan ? (
                  <div>
                    <div className="flex items-start justify-between gap-3" style={{ marginBottom: 18 }}>
                      <div>
                        <div style={{ color: "var(--app-text-subtle)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>
                          PLAN DOCUMENT
                        </div>
                        <div style={{ color: "var(--app-text-primary)", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
                          {(plan.suiteName.replace(/\s*Suite\s*$/i, "").trim() || "Object")} creation plan
                        </div>
                        <div style={{ color: "var(--app-text-muted)", fontSize: 13, lineHeight: 1.5 }}>
                          {plan.goal}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadArtifact(planEntryIdRef.current || "")}
                        style={{ ...BTN_OUTLINE, flexShrink: 0 }}
                      >
                        <Download size={14} /> Download
                      </button>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
                      {[
                        { label: "Objects", value: plan.objectCount },
                        { label: "Fields", value: plan.fieldCount },
                        { label: "Relationships", value: plan.relationshipCount },
                        { label: "Required configs", value: plan.configsIdentified },
                      ].map(stat => (
                        <div
                          key={stat.label}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 999,
                            border: "1px solid var(--app-border)",
                            background: "var(--app-shell-bg-subtle)",
                            color: "var(--app-text-secondary)",
                            fontSize: 12,
                          }}
                        >
                          <span style={{ color: "var(--app-text-primary)", fontWeight: 600 }}>{stat.value}</span>
                          {" "}{stat.label}
                        </div>
                      ))}
                    </div>

                    <div style={{ color: "var(--app-text-subtle)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 10 }}>
                      OBJECTS & FIELD LAYOUT
                    </div>
                    <div className="flex flex-col gap-3" style={{ marginBottom: 22 }}>
                      {plan.objects.map((obj, oi) => (
                        <div
                          key={obj.name}
                          style={{
                            borderRadius: 14,
                            border: "1px solid var(--app-border)",
                            background: "var(--app-ai-row-tint)",
                            overflow: "hidden",
                          }}
                        >
                          <div className="flex items-center gap-3" style={{ padding: "14px 16px", borderBottom: "1px solid var(--app-border-subtle)" }}>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: "color-mix(in srgb, var(--app-graph-object) 22%, transparent)",
                              color: "var(--app-graph-object)",
                              fontSize: 12,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}>
                              {oi + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div style={{ color: "var(--app-text-primary)", fontSize: 15, fontWeight: 600 }}>{obj.name}</div>
                              <div style={{ color: "var(--app-text-muted)", fontSize: 12 }}>{obj.description}</div>
                            </div>
                            <div style={{ color: "var(--app-text-subtle)", fontSize: 11, textAlign: "right" }}>
                              {obj.fieldCount} fields<br />{obj.requiredCount} required
                            </div>
                          </div>
                          <div style={{ padding: "12px 16px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {obj.fields.map(f => (
                              <span
                                key={f.label}
                                style={{
                                  padding: "5px 9px",
                                  borderRadius: 8,
                                  border: "1px solid var(--app-border-subtle)",
                                  background: "var(--app-shell-bg-subtle)",
                                  color: "var(--app-text-secondary)",
                                  fontSize: 11,
                                }}
                              >
                                <span style={{ color: "var(--app-text-primary)", fontWeight: 550 }}>{f.label}</span>
                                <span style={{ opacity: 0.75 }}> · {f.type}{f.required ? " · req" : ""}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {plan.relationships.length > 0 && (
                      <>
                        <div style={{ color: "var(--app-text-subtle)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 10 }}>
                          RELATIONSHIPS
                        </div>
                        <div className="flex flex-col gap-2" style={{ marginBottom: 22 }}>
                          {plan.relationships.map((rel, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2"
                              style={{
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: "1px solid var(--app-border-subtle)",
                                background: "var(--app-shell-bg-subtle)",
                                color: "var(--app-text-primary)",
                                fontSize: 12,
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>{rel.from}</span>
                              <ChevronRight size={14} strokeWidth={2.6} style={{ color: "var(--app-accent)" }} />
                              <span style={{ fontWeight: 600 }}>{rel.to}</span>
                              <span style={{ color: "var(--app-text-muted)" }}>via {rel.viaField}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {plan.assumptions.length > 0 && (
                      <>
                        <div style={{ color: "var(--app-text-subtle)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>
                          ALSO HELPFUL FOR YOUR GOAL
                        </div>
                        <div style={{ color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.55, marginBottom: 8 }}>
                          {plan.assumptions.map((a, i) => (
                            <div key={i} style={{ marginBottom: 4 }}>· {a}</div>
                          ))}
                        </div>
                      </>
                    )}

                    <div style={{ color: "var(--app-text-subtle)", fontSize: 12, marginTop: 16 }}>
                      {editedObjects.length > 0 ? (
                        <>
                          Objects are already created. Use{" "}
                          <span style={{ color: "var(--app-text-primary)", fontWeight: 600 }}>Continue to objects</span>
                          {" "}in the header, or ask for plan changes in chat.
                        </>
                      ) : (
                        <>
                          When you&apos;re ready, use{" "}
                          <span style={{ color: "var(--app-text-primary)", fontWeight: 600 }}>Proceed with the plan</span>
                          {" "}in the chat.
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  // ── Generating transition ────────────────────────────────────────────────────
  if (phase === "generating" && suite) {
    const currentObj = suite.objects[revealed.obj];
    const fieldsShownOnCurrent = revealed.field < 0 ? 0 : revealed.field + 1;
    const generatedCount = suite.objects.slice(0, revealed.obj).reduce((sum, o) => sum + o.fields.length, 0)
      + fieldsShownOnCurrent;
    const totalFieldCount = suite.objects.reduce((sum, o) => sum + o.fields.length, 0);
    const tickIndex = suite.objects.slice(0, revealed.obj).reduce((sum, o) => sum + 1 + o.fields.length, 0)
      + (revealed.field < 0 ? 0 : revealed.field + 1);
    const totalTicks = suite.objects.reduce((sum, o) => sum + 1 + o.fields.length, 0);
    const progress = Math.min(100, Math.round(((tickIndex + 1) / Math.max(totalTicks, 1)) * 100));
    const fieldsToShow = !currentObj
      ? []
      : (revealed.field < 0 ? [] : currentObj.fields.slice(0, revealed.field + 1));
    const statusLabel = revealed.field < 0
      ? `Creating object · ${currentObj?.name ?? "…"}`
      : `Adding field · ${currentObj?.fields[revealed.field]?.label ?? "…"}`;
    const leftPanelW = AI_CHAT_W;
    const rightPanelW = 300;

    return (
      <>
        <style>{`
          @keyframes wizFade{from{opacity:0}to{opacity:1}}
          @keyframes aiPulse{0%,100%{opacity:0.45}50%{opacity:1}}
          @keyframes aiSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          @keyframes fieldIn{from{transform:translateY(6px);opacity:0}to{transform:translateY(0);opacity:1}}
          @keyframes dropIn{from{transform:translateX(-50%) translateY(-8px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
          .ai-side-scroll::-webkit-scrollbar,.ai-card-scroll::-webkit-scrollbar,.ai-chat-scroll::-webkit-scrollbar{width:6px}
          .ai-side-scroll::-webkit-scrollbar-thumb,.ai-card-scroll::-webkit-scrollbar-thumb,.ai-chat-scroll::-webkit-scrollbar-thumb{background:var(--app-scrollbar-thumb);border-radius:999px}
        `}</style>
        <div className="fixed inset-0 z-[60] flex flex-col font-sans pointer-events-none" style={{ animation: "wizFade 0.18s ease" }}>
          <div className="pointer-events-auto">
            <AiShellHeader
              title={suite.suiteName}
              subtitle={statusLabel}
              onBack={() => {}}
              backLabel="Close"
              backDisabled
              right={(
                <div className="flex items-center gap-3">
                  <span style={{ color: "var(--app-text-muted)", fontSize: 12 }}>
                    {generatedCount}/{totalFieldCount} fields
                  </span>
                  <div style={{
                    width: 120, height: 4, borderRadius: 999, overflow: "hidden",
                    background: "var(--app-border-subtle)",
                  }}>
                    <div style={{
                      height: "100%", width: "100%", borderRadius: 999,
                      background: "var(--app-accent)",
                      transform: `scaleX(${Math.max(progress, 3) / 100})`,
                      transformOrigin: "left center",
                      transition: "transform 0.35s ease",
                    }} />
                  </div>
                </div>
              )}
            />
          </div>

          <AiChatSidebar
            entries={chatLog}
            changeDraft={changeDraft}
            onChangeDraft={setChangeDraft}
            onSubmitChange={handleAskForChanges}
            changeBusy={changeBusy}
            askDisabled
            placeholder="Agent is creating objects…"
            onChatAction={handleChatAction}
            onTogglePlan={handleTogglePlan}
            onToggleThinking={handleToggleThinking}
            onOpenArtifact={handleOpenArtifact}
            onDownloadArtifact={handleDownloadArtifact}
            onChoiceChip={handleChoiceChip}
          />

          {/* CENTER — accumulating objects/fields over live graph (all created stay visible via tabs) */}
          {currentObj && (() => {
            const visibleObjCount = Math.min(suite.objects.length, revealed.obj + 1);
            const activeIdx = revealed.obj;
            const activeObj = suite.objects[activeIdx] ?? currentObj;
            const activeFields = revealed.field < 0 ? [] : activeObj.fields.slice(0, revealed.field + 1);
            return (
              <div
                className="pointer-events-auto fixed z-[61] flex flex-col"
                style={{
                  left: `calc(${leftPanelW}px + (100vw - ${leftPanelW + rightPanelW}px) / 2)`,
                  top: 72,
                  bottom: 24,
                  transform: "translateX(-50%)",
                  width: `min(440px, calc(100vw - ${leftPanelW + rightPanelW + 32}px))`,
                  minWidth: 260,
                  borderRadius: 16,
                  background: "var(--app-shell-bg-floating-soft)",
                  border: "1px solid var(--app-border)",
                  boxShadow: "var(--app-wizard-floating-shadow)",
                  backdropFilter: "blur(5px) saturate(1.02)",
                  WebkitBackdropFilter: "blur(5px) saturate(1.02)",
                  overflow: "hidden",
                  animation: "dropIn 0.28s ease",
                }}
              >
                <div className="shrink-0" style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
                  <div className="flex items-center gap-2 px-4 py-3">
                    <span style={{
                      color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600, flex: 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {suiteThemeHeading(suite.suiteName)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--app-accent)", boxShadow: "0 0 5px var(--app-accent)" }} />
                      <span style={{ color: "var(--app-accent)", fontSize: 10, fontWeight: 600 }}>LIVE IN GRAPH</span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-3 overflow-x-auto"
                    style={{ scrollbarWidth: "none", paddingTop: 6, paddingBottom: 12 }}
                  >
                    {suite.objects.slice(0, visibleObjCount).map((obj, oi) => {
                      const on = oi === activeIdx;
                      const complete = oi < revealed.obj;
                      return (
                        <div
                          key={oi}
                          style={{
                            height: 28,
                            padding: "0 11px",
                            borderRadius: 999,
                            flexShrink: 0,
                            border: on
                              ? "1px solid color-mix(in srgb, var(--app-graph-object) 45%, var(--app-border))"
                              : "1px solid var(--app-border)",
                            background: on
                              ? "color-mix(in srgb, var(--app-graph-object) 8%, var(--app-shell-bg-elevated))"
                              : "transparent",
                            color: on ? "var(--app-text-primary)" : "var(--app-text-muted)",
                            fontSize: 12,
                            fontWeight: on ? 600 : 500,
                            whiteSpace: "nowrap",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            opacity: complete || on ? 1 : 0.85,
                          }}
                        >
                          <span style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: OBJECT_DOT,
                            opacity: on ? 1 : 0.55,
                            flexShrink: 0,
                          }} />
                          {obj.name}
                          {complete && <Check size={11} style={{ color: "var(--app-accent)", opacity: 0.9 }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="ai-card-scroll flex-1 overflow-y-auto px-3 py-2"
                  ref={el => { if (el) el.scrollTop = el.scrollHeight; }}
                >
                  {activeFields.length === 0 ? (
                    <div className="flex items-center gap-2 px-2 py-4" style={{ color: "var(--app-text-muted)", fontSize: 12 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%", background: "var(--app-accent)",
                        animation: "aiPulse 1s ease-in-out infinite",
                      }} />
                      Preparing fields for {activeObj.name}…
                    </div>
                  ) : activeFields.map((f, fi) => {
                    const Icon = FT_ICON[f.type] ?? Type;
                    const color = FT_COLOR[f.type] ?? "var(--app-text-secondary)";
                    const isLatest = fi === revealed.field && activeIdx === revealed.obj;
                    return (
                      <div
                        key={fi}
                        className="flex items-center gap-2.5 px-2 py-2.5"
                        style={{
                          borderBottom: "1px solid var(--app-border-subtle)",
                          animation: isLatest ? "fieldIn 0.32s ease" : undefined,
                          background: isLatest ? "color-mix(in srgb, var(--app-accent) 10%, transparent)" : "transparent",
                          borderRadius: 8,
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                          background: `color-mix(in srgb, ${color} 14%, transparent)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Icon size={12} style={{ color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: isLatest ? 600 : 500 }}>
                            {f.label}
                          </div>
                          <div style={{ color: "var(--app-text-muted)", fontSize: 11 }}>{f.type}</div>
                        </div>
                        {f.required ? (
                          <span style={{ fontSize: 9, fontWeight: 600, color: "var(--app-accent-light)" }}>REQ</span>
                        ) : (
                          <span style={{ fontSize: 9, fontWeight: 600, color: "var(--app-text-disabled)" }}>OPT</span>
                        )}
                      </div>
                    );
                  })}
                  {revealed.field >= 0 && revealed.field < activeObj.fields.length - 1 && (
                    <div className="flex items-center gap-2 px-2 py-2" style={{ color: "var(--app-text-muted)", fontSize: 12 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%", background: "var(--app-accent)",
                        animation: "aiPulse 0.9s ease-in-out infinite",
                      }} />
                      Adding next field…
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ borderTop: "1px solid var(--app-border)" }}>
                  <span style={{ color: "var(--app-accent)", fontSize: 10, fontWeight: 600 }}>
                    LIVE IN GRAPH
                  </span>
                  <span style={{ color: "var(--app-text-muted)", fontSize: 10 }}>
                    {activeFields.length}/{activeObj.fields.length} fields · Object {activeIdx + 1}/{suite.objects.length}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* RIGHT — object details (Build Manually–style properties) */}
          <div
            className="pointer-events-auto fixed z-[60] flex flex-col"
            style={{
              right: 0, top: 56, bottom: 0, width: rightPanelW,
              background: "color-mix(in srgb, var(--app-wizard-sidebar-bg) 90%, transparent)",
              borderLeft: "1px solid var(--app-border)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--app-border)" }}>
              <div style={{ color: "var(--app-text-secondary)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em" }}>
                OBJECT DETAILS
              </div>
            </div>
            <div className="ai-side-scroll flex-1 overflow-y-auto px-4 py-4">
              {currentObj ? (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div style={FIELD_LABEL}>Object name</div>
                    <div style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600 }}>{currentObj.name}</div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={FIELD_LABEL}>Description</div>
                    <div style={{ color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.45 }}>
                      {currentObj.description || "—"}
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={FIELD_LABEL}>Object type</div>
                    <div style={{ color: "var(--app-text-primary)", fontSize: 12 }}>Normal</div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={FIELD_LABEL}>Status</div>
                    <div className="flex items-center gap-2">
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%", background: "var(--app-accent)",
                        animation: "aiPulse 1s ease-in-out infinite",
                      }} />
                      <span style={{ color: "var(--app-accent)", fontSize: 12, fontWeight: 600 }}>Generating</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={FIELD_LABEL}>Fields so far</div>
                  </div>
                  {fieldsToShow.length === 0 ? (
                    <div style={{ color: "var(--app-text-subtle)", fontSize: 12 }}>No fields yet</div>
                  ) : fieldsToShow.map((f, fi) => (
                    <div
                      key={fi}
                      className="flex items-center justify-between py-1.5"
                      style={{ borderBottom: "1px solid var(--app-border-subtle)" }}
                    >
                      <span style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{f.label}</span>
                      <span style={{ color: "var(--app-text-subtle)", fontSize: 11 }}>{f.type}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ color: "var(--app-text-muted)", fontSize: 12 }}>Waiting for first object…</div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Step 2: Review model (also used while validation runs) ───────────────────
  if (phase === "review" || phase === "validating") {
    const active = editedObjects[selectedObj] ?? editedObjects[0];
    const selectedField = selectedFieldIdx != null ? active?.fields[selectedFieldIdx] : null;
    const leftPanelW = AI_CHAT_W;
    const rightPanelW = 360;

    return (
      <>
        <style>{`
          @keyframes wizFade{from{opacity:0}to{opacity:1}}
          @keyframes aiPulse{0%,100%{opacity:0.45}50%{opacity:1}}
          @keyframes aiSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          @keyframes slideFromRight{from{transform:translateX(16px);opacity:0}to{transform:translateX(0);opacity:1}}
          .ai-side-scroll::-webkit-scrollbar,.ai-card-scroll::-webkit-scrollbar,.ai-props-scroll::-webkit-scrollbar,.ai-chat-scroll::-webkit-scrollbar{width:6px}
          .ai-side-scroll::-webkit-scrollbar-thumb,.ai-card-scroll::-webkit-scrollbar-thumb,.ai-props-scroll::-webkit-scrollbar-thumb,.ai-chat-scroll::-webkit-scrollbar-thumb{background:var(--app-scrollbar-thumb);border-radius:999px}
        `}</style>
        <div className="fixed inset-0 z-[60] flex flex-col font-sans pointer-events-none" style={{ animation: "wizFade 0.18s ease" }}>
          <div className="pointer-events-auto">
            <AiShellHeader
              title={headerTitle}
              subtitle={headerSub}
              onBack={goBack}
              backDisabled={phase === "validating"}
              right={phase === "review" ? (
                <button
                  type="button"
                  onClick={handleBuild}
                  disabled={!canContinueReview || building}
                  style={{
                    ...BTN_PRIMARY,
                    flexShrink: 0,
                    ...(!canContinueReview || building ? {
                      background: "var(--app-border-subtle)",
                      color: "var(--app-text-subtle)",
                      boxShadow: "none",
                      cursor: "not-allowed",
                    } : {}),
                  }}
                >
                  Build
                  <ChevronRight size={15} strokeWidth={2.6} />
                </button>
              ) : null}
            />
          </div>
          {statusDialog}

          <AiChatSidebar
            entries={chatLog}
            changeDraft={changeDraft}
            onChangeDraft={setChangeDraft}
            onSubmitChange={handleAskForChanges}
            changeBusy={changeBusy}
            askDisabled={phase === "validating"}
            placeholder={phase === "validating" ? "Validating structure…" : "Ask for changes…"}
            onChatAction={handleChatAction}
            onTogglePlan={handleTogglePlan}
            onToggleThinking={handleToggleThinking}
            onOpenArtifact={handleOpenArtifact}
            onDownloadArtifact={handleDownloadArtifact}
            onChoiceChip={handleChoiceChip}
          />

          {/* CENTER — field card; minimal in-content validate scan (copy lives in left chat) */}
          {active && (() => {
            const isValidating = phase === "validating";
            const scanDone = validationResult != null || validationScanIdx >= editedObjects.length;
            const objActive = isValidating && !scanDone && validationScanIdx === selectedObj;
            const objPassed = isValidating && (scanDone || validationScanIdx > selectedObj);
            return (
            <div
              className="pointer-events-auto fixed z-[61] flex flex-col"
              style={{
                left: `calc(${leftPanelW}px + (100vw - ${leftPanelW + rightPanelW}px) / 2)`,
                top: 72,
                bottom: 24,
                transform: "translateX(-50%)",
                width: `min(440px, calc(100vw - ${leftPanelW + rightPanelW + 32}px))`,
                minWidth: 280,
                borderRadius: 16,
                background: "var(--app-shell-bg-floating-soft)",
                border: isValidating && !scanDone
                  ? "1px solid color-mix(in srgb, var(--app-accent) 42%, var(--app-border))"
                  : "1px solid var(--app-border)",
                boxShadow: isValidating && !scanDone
                  ? "0 0 0 1px color-mix(in srgb, var(--app-accent) 16%, transparent), var(--app-wizard-floating-shadow)"
                  : "var(--app-wizard-floating-shadow)",
                backdropFilter: "blur(5px) saturate(1.02)",
                WebkitBackdropFilter: "blur(5px) saturate(1.02)",
                overflow: "hidden",
                transition: "border-color 0.3s ease, box-shadow 0.3s ease",
              }}
            >
              <style>{`
                @keyframes validateScanY{
                  0%{top:-4%;opacity:0}
                  12%{opacity:0.85}
                  88%{opacity:0.85}
                  100%{top:104%;opacity:0}
                }
                @keyframes validatePulse{
                  0%,100%{opacity:0.4;transform:scale(1)}
                  50%{opacity:1;transform:scale(1.15)}
                }
                @keyframes validateObjIn{
                  from{opacity:0.55;transform:translateY(6px)}
                  to{opacity:1;transform:translateY(0)}
                }
                @keyframes validateRowConfirm{
                  0%{background:color-mix(in srgb, var(--app-accent) 12%, transparent)}
                  100%{background:color-mix(in srgb, var(--app-text-success) 5%, transparent)}
                }
              `}</style>
              <div className="shrink-0" style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
                <div className="flex items-center gap-2 px-4 py-3">
                  <span style={{
                    color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600, flex: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {suiteThemeHeading(suite?.suiteName || headerTitle)}
                  </span>
                  {!isValidating && editedObjects.length > 1 && (
                    <button
                      type="button"
                      title="Remove object"
                      onClick={() => { removeObject(selectedObj); setSelectedFieldIdx(null); }}
                      style={{ ...BTN_GHOST, color: "var(--app-text-subtle)", padding: 4 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 overflow-x-auto"
                  style={{ scrollbarWidth: "none", paddingTop: 6, paddingBottom: 12 }}
                >
                  {editedObjects.map((obj, oi) => {
                    const on = selectedObj === oi;
                    const scanned = isValidating && (scanDone || validationScanIdx > oi);
                    const scanning = isValidating && !scanDone && validationScanIdx === oi;
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => {
                          if (isValidating) return;
                          setSelectedObj(oi);
                          setSelectedFieldIdx(null);
                        }}
                        style={{
                          height: 28,
                          padding: "0 11px",
                          borderRadius: 999,
                          flexShrink: 0,
                          border: scanning
                            ? "1px solid color-mix(in srgb, var(--app-accent) 50%, var(--app-border))"
                            : on
                              ? "1px solid color-mix(in srgb, var(--app-graph-object) 45%, var(--app-border))"
                              : "1px solid var(--app-border)",
                          background: scanning
                            ? "color-mix(in srgb, var(--app-accent) 10%, var(--app-shell-bg-elevated))"
                            : on
                              ? "color-mix(in srgb, var(--app-graph-object) 8%, var(--app-shell-bg-elevated))"
                              : "transparent",
                          color: on || scanning ? "var(--app-text-primary)" : "var(--app-text-muted)",
                          boxShadow: scanning
                            ? "0 0 0 1px color-mix(in srgb, var(--app-accent) 18%, transparent)"
                            : "none",
                          transition: "background 0.28s ease, border-color 0.28s ease, color 0.28s ease, box-shadow 0.28s ease",
                          fontSize: 12,
                          fontWeight: on || scanning ? 600 : 500,
                          cursor: isValidating ? "default" : "pointer",
                          fontFamily: "inherit",
                          whiteSpace: "nowrap",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: scanned
                            ? "var(--app-text-success)"
                            : scanning
                              ? "var(--app-accent)"
                              : OBJECT_DOT,
                          opacity: on || scanning || scanned ? 1 : 0.55,
                          flexShrink: 0,
                          boxShadow: scanning
                            ? "0 0 8px color-mix(in srgb, var(--app-accent) 55%, transparent)"
                            : "none",
                          animation: scanning ? "validatePulse 1.1s ease-in-out infinite" : undefined,
                        }} />
                        {obj.name || `Object ${oi + 1}`}
                        {scanned && (
                          <Check size={11} style={{ color: "var(--app-text-success)", flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ai-card-scroll flex-1 overflow-y-auto relative" style={{ scrollbarWidth: "thin", minHeight: 0 }}>
                {isValidating && !scanDone && (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: 8,
                      right: 8,
                      height: 22,
                      pointerEvents: "none",
                      zIndex: 2,
                      borderRadius: 8,
                      background: "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--app-accent) 14%, transparent) 50%, transparent 100%)",
                      animation: "validateScanY 3.6s cubic-bezier(0.45, 0, 0.2, 1) infinite",
                    }}
                  />
                )}
                <div
                  key={isValidating ? `val-${selectedObj}` : `edit-${selectedObj}`}
                  style={{
                    animation: isValidating ? "validateObjIn 0.38s ease" : undefined,
                  }}
                >
                {active.fields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 mx-4 my-3 rounded-xl"
                    style={{ border: "1.5px dashed var(--app-border)", color: "var(--app-text-muted)" }}>
                    <Plus size={16} style={{ opacity: 0.75 }} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>Add fields to this object</span>
                  </div>
                ) : active.fields.map((f, fi) => {
                  const Icon = FT_ICON[f.type] ?? Type;
                  const color = FT_COLOR[f.type] ?? "var(--app-text-secondary)";
                  const isSelected = !isValidating && selectedFieldIdx === fi;
                  const fieldDone = isValidating && (objPassed || (objActive && validationFieldScanIdx >= 0 && validationFieldScanIdx > fi));
                  const fieldActive = isValidating && objActive && validationFieldScanIdx === fi;
                  const fieldPending = isValidating && !fieldDone && !fieldActive;
                  return (
                    <div
                      key={fi}
                      className="flex items-center gap-2 px-3 py-2 group"
                      style={{
                        background: fieldActive
                          ? "color-mix(in srgb, var(--app-accent) 9%, transparent)"
                          : fieldDone
                            ? "color-mix(in srgb, var(--app-text-success) 4%, transparent)"
                            : isSelected
                              ? "var(--app-shell-bg-accent)"
                              : "transparent",
                        borderLeft: fieldActive
                          ? "2px solid var(--app-accent)"
                          : fieldDone
                            ? "2px solid color-mix(in srgb, var(--app-text-success) 45%, transparent)"
                            : isSelected
                              ? "2px solid var(--app-accent)"
                              : "2px solid transparent",
                        opacity: fieldPending ? 0.38 : 1,
                        transition: "background 0.28s ease, border-color 0.28s ease, opacity 0.28s ease",
                        cursor: isValidating ? "default" : "pointer",
                        animation: fieldDone && !fieldActive ? "validateRowConfirm 0.55s ease" : undefined,
                      }}
                      onClick={() => { if (!isValidating) setSelectedFieldIdx(fi); }}
                      onMouseEnter={e => { if (!isValidating && !isSelected) e.currentTarget.style.background = "var(--app-shell-bg-hover)"; }}
                      onMouseLeave={e => { if (!isValidating && !isSelected) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                        background: `color-mix(in srgb, ${color} 16%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon size={11} style={{ color }} strokeWidth={2.25} />
                      </div>
                      <span style={{
                        color: "var(--app-text-primary)", fontSize: 13, flex: 1, minWidth: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {f.label || "Untitled"}
                      </span>
                      <span style={{ color: "var(--app-text-muted)", fontSize: 10, flexShrink: 0 }}>{f.type}</span>
                      {f.required && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: "var(--app-accent-light)", flexShrink: 0,
                          opacity: fieldPending ? 0.5 : 1,
                        }}>REQ</span>
                      )}
                      {fieldActive && (
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                          background: "var(--app-accent)",
                          boxShadow: "0 0 8px color-mix(in srgb, var(--app-accent) 60%, transparent)",
                          animation: "validatePulse 0.9s ease-in-out infinite",
                        }} />
                      )}
                      {fieldDone && (
                        <Check size={12} style={{ color: "var(--app-text-success)", flexShrink: 0, opacity: 0.9 }} />
                      )}
                      {!isValidating && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            removeField(selectedObj, fi);
                            setSelectedFieldIdx(prev => {
                              if (prev == null) return null;
                              if (prev === fi) return null;
                              if (prev > fi) return prev - 1;
                              return prev;
                            });
                          }}
                          style={{ ...BTN_GHOST, padding: 2, color: "var(--app-text-subtle)", opacity: 0.7 }}
                          aria-label="Remove field"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {!isValidating && active.fields.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 cursor-default"
                    style={{ borderTop: "1px solid var(--app-border-subtle)", color: "var(--app-text-muted)" }}>
                    <Plus size={12} />
                    <span style={{ fontSize: 11, fontWeight: 500 }}>Select a field to edit details on the right</span>
                  </div>
                )}
                </div>
              </div>

              <div style={{
                borderTop: "1px solid var(--app-border-subtle)",
                background: "color-mix(in srgb, var(--app-accent) 6%, transparent)",
              }}>
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: isValidating
                        ? (scanDone && validationResult?.passed ? "var(--app-text-success)" : "var(--app-accent)")
                        : "var(--app-accent)",
                      boxShadow: isValidating && !(scanDone && validationResult?.passed)
                        ? "0 0 6px color-mix(in srgb, var(--app-accent) 45%, transparent)"
                        : "0 0 5px var(--app-accent)",
                      animation: isValidating && !(scanDone && validationResult?.passed)
                        ? "validatePulse 1.4s ease-in-out infinite"
                        : undefined,
                    }} />
                    <span style={{
                      color: isValidating
                        ? (scanDone && validationResult?.passed ? "var(--app-text-success)" : "var(--app-accent)")
                        : "var(--app-accent)",
                      fontSize: 10, fontWeight: 600,
                    }}>
                      {isValidating
                        ? (scanDone && validationResult?.passed ? "VALIDATED" : "VALIDATING")
                        : "LIVE IN GRAPH"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isValidating && (
                      <button type="button" onClick={() => { addField(selectedObj); setSelectedFieldIdx(active.fields.length); }} style={{ ...BTN_GHOST, height: "auto", padding: 0, fontSize: 10, fontWeight: 600, color: "var(--app-accent-light)" }}>
                        Add field
                      </button>
                    )}
                    <span style={{ color: "var(--app-text-muted)", fontSize: 10 }}>
                      {active.fields.length} fields
                    </span>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* RIGHT — validation scan while validating; properties after */}
          <div
            className="pointer-events-auto fixed z-[60] flex flex-col"
            style={{
              right: 0, top: 56, bottom: 0, width: rightPanelW,
              background: "var(--app-shell-bg-panel)",
              borderLeft: "1px solid var(--app-border)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              overflow: "hidden",
            }}
          >
            {phase === "validating" ? (
              <>
                <div className="shrink-0 px-5 pb-4" style={{ paddingTop: 17, borderBottom: "1px solid var(--app-border)" }}>
                  <div style={{ color: "var(--app-accent-light)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 6 }}>
                    VALIDATION & SELF-CORRECTION
                  </div>
                  <h2 style={{ color: "var(--app-text-primary)", fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
                    Checking what was created
                  </h2>
                  <p style={{ margin: 0, color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.45 }}>
                    Objects, fields, and relationships are verified one by one before Build unlocks.
                  </p>
                </div>
                <div className="ai-props-scroll flex-1 overflow-y-auto px-4 py-4" style={{ minHeight: 0 }}>
                  {editedObjects.map((obj, oi) => {
                    const scanned = validationScanIdx > oi || (validationResult != null && validationScanIdx >= editedObjects.length);
                    const scanning = validationScanIdx === oi && !validationResult;
                    const objIssues = (validationResult?.issues ?? []).filter(i => i.objectIndex === oi);
                    const ok = scanned && objIssues.length === 0 && (validationResult != null || scanning === false);
                    return (
                      <div
                        key={oi}
                        style={{
                          marginBottom: 10,
                          borderRadius: 12,
                          border: `1px solid ${scanning ? "var(--app-border-accent)" : "var(--app-border)"}`,
                          background: scanning
                            ? "color-mix(in srgb, var(--app-accent) 10%, var(--app-shell-bg-elevated))"
                            : "var(--app-shell-bg-elevated)",
                          padding: "10px 12px",
                        }}
                      >
                        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                          <span style={{ width: 16, display: "inline-flex", justifyContent: "center", flexShrink: 0 }}>
                            {scanning ? (
                              <Loader2 size={13} style={{ color: "var(--app-accent)", animation: "aiSpin 0.9s linear infinite" }} />
                            ) : scanned && validationResult ? (
                              objIssues.length === 0
                                ? <Check size={13} style={{ color: "var(--app-accent)" }} />
                                : <AlertTriangle size={13} style={{ color: "var(--app-text-danger)" }} />
                            ) : (
                              <Circle size={10} style={{ color: "var(--app-text-subtle)" }} />
                            )}
                          </span>
                          <span style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600, flex: 1 }}>
                            {obj.name}
                          </span>
                          <span style={{ color: "var(--app-text-subtle)", fontSize: 10 }}>
                            {obj.fields.length} fields
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {obj.fields.map((f, fi) => {
                            const fieldIssue = objIssues.find(i => i.fieldIndex === fi);
                            const fieldDone = scanned && (validationResult != null || scanning);
                            return (
                              <div
                                key={fi}
                                className="flex items-center gap-2"
                                style={{
                                  padding: "4px 6px",
                                  borderRadius: 6,
                                  background: fieldIssue
                                    ? "color-mix(in srgb, var(--app-text-danger) 8%, transparent)"
                                    : "transparent",
                                }}
                              >
                                <span style={{ width: 12, display: "inline-flex", justifyContent: "center" }}>
                                  {scanning ? (
                                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--app-accent)", animation: "aiPulse 1s ease-in-out infinite" }} />
                                  ) : fieldDone && validationResult ? (
                                    fieldIssue
                                      ? <AlertTriangle size={10} style={{ color: "var(--app-text-danger)" }} />
                                      : <Check size={10} style={{ color: "var(--app-accent)", opacity: 0.85 }} />
                                  ) : (
                                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--app-border)" }} />
                                  )}
                                </span>
                                <span style={{ color: "var(--app-text-secondary)", fontSize: 11, flex: 1 }}>{f.label}</span>
                                <span style={{ color: "var(--app-text-subtle)", fontSize: 10 }}>{f.type}</span>
                              </div>
                            );
                          })}
                        </div>
                        {objIssues.length > 0 && (
                          <div style={{ marginTop: 8, color: "var(--app-text-danger)", fontSize: 11, lineHeight: 1.4 }}>
                            {objIssues.map(issue => (
                              <div key={issue.id}>· {issue.message}</div>
                            ))}
                          </div>
                        )}
                        {ok && validationResult?.passed && (
                          <div style={{ marginTop: 6, color: "var(--app-text-muted)", fontSize: 10 }}>
                            Object and fields look good
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : active && selectedField && selectedFieldIdx != null && fieldPanelView === "help" ? (
              <AiFieldHelpPanel
                field={selectedField}
                onUpdate={patch => updateField(selectedObj, selectedFieldIdx, patch)}
                onBack={() => setFieldPanelView("main")}
              />
            ) : active && selectedField && selectedFieldIdx != null && fieldPanelView === "advanced" ? (
              <AiFieldAdvancedPanel
                field={selectedField}
                onUpdate={patch => updateField(selectedObj, selectedFieldIdx, patch)}
                onBack={() => setFieldPanelView("main")}
              />
            ) : active ? (
              <>
                <div className="shrink-0 px-5 pb-4" style={{ paddingTop: 17, borderBottom: "1px solid var(--app-border)" }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                    <span style={{
                      color: selectedField ? "var(--app-accent-light)" : active.color,
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
                    }}>
                      {selectedField ? "FIELD" : "OBJECT"}
                    </span>
                    {selectedField && (
                      <button
                        type="button"
                        onClick={() => { setSelectedFieldIdx(null); setFieldPanelView("main"); }}
                        style={{ ...BTN_GHOST, fontSize: 11, color: "var(--app-text-muted)" }}
                      >
                        View object
                      </button>
                    )}
                  </div>
                  {selectedField ? (
                    <>
                      <h2 style={{ color: "var(--app-text-primary)", fontSize: 16, fontWeight: 600, margin: "0 0 2px" }}>
                        {selectedField.label || "Untitled"}
                      </h2>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--app-text-primary)" }}>
                        {selectedField.type} field in{" "}
                        <span style={{ color: "var(--app-accent-light)" }}>{active.name}</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 style={{ color: "var(--app-text-primary)", fontSize: 16, fontWeight: 600, margin: "0 0 2px" }}>
                        {active.name.trim() || `Object ${selectedObj + 1}`}
                      </h2>
                      {active.description ? (
                        <p style={{ margin: 0, color: "var(--app-text-muted)", fontSize: 12, fontWeight: 500, lineHeight: 1.45 }}>
                          {active.description}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="ai-props-scroll flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
                  {selectedField && selectedFieldIdx != null ? (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <div style={META_LABEL}>Field label</div>
                        <input
                          value={selectedField.label}
                          onChange={e => {
                            const label = e.target.value;
                            const prevName = selectedField.name?.trim() || fieldApiName(selectedField.label);
                            const shouldSyncName = !selectedField.name || prevName === fieldApiName(selectedField.label);
                            updateField(selectedObj, selectedFieldIdx, {
                              label,
                              ...(shouldSyncName ? { name: fieldApiName(label) } : {}),
                            });
                          }}
                          style={INPUT}
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={META_LABEL}>Name</div>
                        <input
                          value={selectedField.name?.trim() || fieldApiName(selectedField.label)}
                          onChange={e => updateField(selectedObj, selectedFieldIdx, {
                            name: e.target.value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, ""),
                          })}
                          style={INPUT}
                          placeholder="field_name"
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={META_LABEL}>Field type</div>
                        <select
                          value={selectedField.type}
                          onChange={e => updateField(selectedObj, selectedFieldIdx, { type: e.target.value })}
                          style={{ ...INPUT, color: "var(--app-text-secondary)" }}
                        >
                          {EDITABLE_FIELD_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                          {!EDITABLE_FIELD_TYPES.includes(selectedField.type as typeof EDITABLE_FIELD_TYPES[number]) && (
                            <option value={selectedField.type}>{selectedField.type}</option>
                          )}
                        </select>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={META_LABEL}>Max length</div>
                        <input
                          type="number"
                          value={selectedField.length ?? 30}
                          onChange={e => updateField(selectedObj, selectedFieldIdx, { length: Number(e.target.value) || 0 })}
                          style={INPUT}
                          min={1}
                          max={9999}
                        />
                      </div>
                      <div className="flex items-center justify-between" style={{ marginBottom: 16, padding: "4px 0" }}>
                        <span style={{ color: "var(--app-text-primary)", fontSize: 13 }}>Is Required</span>
                        <AiToggle
                          value={selectedField.required}
                          onChange={v => updateField(selectedObj, selectedFieldIdx, { required: v })}
                        />
                      </div>
                      {selectedField.relatedObjectId && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={META_LABEL}>Related object</div>
                          <div style={{ color: "var(--app-text-primary)", fontSize: 12 }}>
                            {editedObjects.find((_, i) => `__ai_obj${i}__` === selectedField.relatedObjectId)?.name ?? "Related object"}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setFieldPanelView("help")}
                        className="flex items-center justify-between w-full px-4 py-3.5 rounded-lg"
                        style={{
                          background: "var(--app-shell-bg-subtle)",
                          border: "1px solid var(--app-border)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          marginBottom: 10,
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "var(--app-shell-bg-hover)";
                          e.currentTarget.style.borderColor = "var(--app-toggle-off)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "var(--app-shell-bg-subtle)";
                          e.currentTarget.style.borderColor = "var(--app-border)";
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <AlignLeft size={13} style={{ color: "var(--app-text-secondary)" }} />
                          <span style={{ color: "var(--app-text-body)", fontSize: 13, fontWeight: 600 }}>Help text</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(selectedField.helpTitle || selectedField.helpText) && (
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--app-accent)" }} />
                          )}
                          <ChevronRight size={13} style={{ color: "var(--app-text-muted)" }} />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFieldPanelView("advanced")}
                        className="flex items-center justify-between w-full px-4 py-3.5 rounded-lg"
                        style={{
                          background: "var(--app-shell-bg-subtle)",
                          border: "1px solid var(--app-border)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "var(--app-shell-bg-hover)";
                          e.currentTarget.style.borderColor = "var(--app-toggle-off)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "var(--app-shell-bg-subtle)";
                          e.currentTarget.style.borderColor = "var(--app-border)";
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <Settings2 size={13} style={{ color: "var(--app-text-secondary)" }} />
                          <span style={{ color: "var(--app-text-body)", fontSize: 13, fontWeight: 600 }}>Advanced Settings</span>
                        </div>
                        <ChevronRight size={13} style={{ color: "var(--app-text-muted)" }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mb-5 grid grid-cols-2 gap-3">
                        {[
                          ["Object Type", "Custom Object"],
                          ["Status", "Draft"],
                          ["Fields", String(active.fields.length)],
                          ["Suite", `${editedObjects.length} objects`],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <div style={META_LABEL}>{k}</div>
                            <div style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <div style={META_LABEL}>Object name</div>
                        <input
                          value={active.name}
                          onChange={e => updateObject(selectedObj, { name: e.target.value })}
                          style={INPUT}
                        />
                      </div>
                      <div style={{ marginBottom: 20 }}>
                        <div style={META_LABEL}>Description</div>
                        <textarea
                          value={active.description}
                          onChange={e => updateObject(selectedObj, { description: e.target.value })}
                          rows={3}
                          style={{ ...INPUT, resize: "none", lineHeight: 1.45 }}
                        />
                      </div>

                      <div className="mb-2 flex items-center gap-2" style={{ marginBottom: 10 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--app-accent-light)" }} />
                        <span style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.08em", fontWeight: 600 }}>
                          FIELDS
                        </span>
                        <span style={{ color: "var(--app-text-subtle)", fontSize: 10 }}>{active.fields.length}</span>
                      </div>
                      {active.fields.map((f, fi) => (
                        <button
                          key={fi}
                          type="button"
                          onClick={() => setSelectedFieldIdx(fi)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 mb-0.5 text-left"
                          style={{
                            border: "none",
                            borderRadius: 8,
                            background: "transparent",
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--app-shell-bg-hover)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: FT_COLOR[f.type] ?? "var(--app-text-muted)", flexShrink: 0 }} />
                          <span className="flex-1 truncate" style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{f.label}</span>
                          <span style={{ color: "var(--app-text-muted)", fontSize: 11 }}>{f.type}</span>
                          {f.required && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--app-accent-light)" }}>REQ</span>
                          )}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  // ── Step 3: Deploy ───────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes wizFade{from{opacity:0}to{opacity:1}}
        .ai-form-scroll::-webkit-scrollbar{width:6px}
        .ai-form-scroll::-webkit-scrollbar-thumb{background:var(--app-scrollbar-thumb);border-radius:999px}
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
        <AiShellHeader
          title="Create objects"
          subtitle="Build with AI Agent"
          onBack={goBack}
          right={(
            <button
              type="button"
              onClick={handleDeploy}
              disabled={!canDeploy}
              style={{ ...(canDeploy ? BTN_PRIMARY : BTN_DISABLED), flexShrink: 0 }}
            >
              <Zap size={14} />
              <span>{deploying ? "Deploying…" : "Deploy objects"}</span>
              <ChevronRight size={15} strokeWidth={2.6} style={{ marginLeft: 6 }} />
            </button>
          )}
        />
        {statusDialog}

        <div className="flex flex-1 min-h-0 justify-center">
          <main className="ai-form-scroll overflow-y-auto flex-1 min-w-0" style={{ padding: "28px clamp(20px, 4vw, 56px)" }}>
            <div
              className="ai-deploy-card"
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
              <div style={{
                padding: "22px clamp(20px, 3vw, 32px) 18px",
                background: "var(--app-deploy-card-header)",
              }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 7,
                        padding: "5px 11px", borderRadius: 999,
                        background: validationResult?.passed
                          ? "color-mix(in srgb, var(--app-text-success) 12%, var(--app-shell-bg-elevated))"
                          : "var(--app-shell-bg-warning)",
                        border: `1px solid ${validationResult?.passed
                          ? "color-mix(in srgb, var(--app-text-success) 35%, transparent)"
                          : "color-mix(in srgb, var(--app-text-warning) 35%, transparent)"}`,
                        color: validationResult?.passed ? "var(--app-text-success)" : "var(--app-text-warning)",
                        fontSize: 11, fontWeight: 600,
                      }}>
                        <span style={{
                          width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                          border: `1.5px solid color-mix(in srgb, currentColor 45%, transparent)`,
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: "currentColor",
                          }} />
                        </span>
                        {validationResult?.passed ? "Validated & ready" : "Needs your input"}
                      </span>
                    </div>
                    <div style={{ color: "var(--app-text-primary)", fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>
                      {suiteThemeHeading(suite?.suiteName || "Object")} cluster
                    </div>
                    <div style={{ color: "var(--app-text-muted)", fontSize: 13, lineHeight: 1.55, maxWidth: 560 }}>
                      <span style={{ color: "var(--app-text-secondary)", fontWeight: 600 }}>
                        Category · {suiteThemeHeading(suite?.suiteName || "Object")}
                      </span>
                      {" — "}
                      this deploy publishes a {suiteThemeHeading(suite?.suiteName || "Object").toLowerCase()} data model for your app:{" "}
                      {editedObjects.map(o => o.name).filter(Boolean).join(", ") || "your staged objects"}
                      {editedObjects.length ? "." : ""}{" "}
                      Each object ships with its fields
                      {relationCount > 0 ? " and relationships" : ""}
                      {" "}so the cluster is ready to use on the graph.
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Edit"
                    aria-label="Edit"
                    onClick={() => setPhase("review")}
                    className="shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      marginTop: 2,
                      borderRadius: 10,
                      border: "1px solid var(--app-border)",
                      background: "var(--app-shell-bg-elevated)",
                      color: "var(--app-text-secondary)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "var(--app-shell-bg-accent)";
                      e.currentTarget.style.color = "var(--app-text-primary)";
                      e.currentTarget.style.borderColor = "var(--app-border-accent)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "var(--app-shell-bg-elevated)";
                      e.currentTarget.style.color = "var(--app-text-secondary)";
                      e.currentTarget.style.borderColor = "var(--app-border)";
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                </div>

                <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", marginTop: 18 }}>
                  {[
                    { label: "Objects", value: editedObjects.length, tone: "var(--app-stat-object)", soft: "var(--app-stat-object-soft)" },
                    { label: "Fields", value: totalFields, tone: "var(--app-stat-field)", soft: "var(--app-stat-field-soft)" },
                    { label: "Relationships", value: relationCount, tone: "var(--app-stat-link)", soft: "var(--app-stat-link-soft)" },
                    {
                      label: "Validation",
                      value: validationResult?.passed ? "Passed" : (validationResult ? "Issues" : "Pending"),
                      tone: "var(--app-stat-validation)",
                      soft: "var(--app-stat-validation-soft)",
                    },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: stat.soft,
                        border: `1px solid color-mix(in srgb, ${stat.tone} 42%, var(--app-border-subtle))`,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{
                        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                        background: stat.tone, borderRadius: "3px 0 0 3px",
                      }} />
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
                {agentChangeLog.length > 0 && (
                  <div style={{
                    marginBottom: 16, padding: "12px 14px", borderRadius: 12,
                    background: "var(--app-shell-bg-subtle)",
                    border: "1px solid var(--app-border-subtle)",
                    color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.5,
                  }}>
                    <div style={{ color: "var(--app-text-primary)", fontWeight: 600, marginBottom: 6 }}>Self-corrections applied</div>
                    {agentChangeLog.slice(-6).map((change, i) => (
                      <div key={i} className="flex items-start gap-2" style={{ marginBottom: 3 }}>
                        <Check size={12} style={{ color: "var(--app-accent)", marginTop: 2, flexShrink: 0 }} />
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                )}

                {nameCollisions.length > 0 && (
                  <div style={{
                    marginBottom: 16, padding: "12px 14px", borderRadius: 12,
                    background: "color-mix(in srgb, var(--app-text-danger) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--app-text-danger) 28%, transparent)",
                    color: "var(--app-text-danger)", fontSize: 12, lineHeight: 1.45,
                  }}>
                    These object names already exist on the graph: {nameCollisions.join(", ")}. Rename them in Review before deploying.
                  </div>
                )}

                {validationResult && !validationResult.passed && validationResult.issues.length > 0 && (
                  <div style={{
                    marginBottom: 16, padding: "12px 14px", borderRadius: 12,
                    background: "color-mix(in srgb, #FCD34D 10%, transparent)",
                    border: "1px solid color-mix(in srgb, #FCD34D 28%, transparent)",
                    color: "var(--app-text-primary)", fontSize: 12, lineHeight: 1.45,
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Still needs attention</div>
                    {validationResult.issues.slice(0, 5).map(issue => (
                      <div key={issue.id} style={{ marginBottom: 4 }}>
                        · {issue.objectName} → {issue.message}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3" style={{ marginBottom: 12 }}>
                  <div style={{ ...FIELD_LABEL, marginBottom: 0 }}>Cluster objects</div>
                  <div style={{ color: "var(--app-text-subtle)", fontSize: 11 }}>
                    Tap an object to inspect fields
                  </div>
                </div>
                <div className="flex flex-col gap-2.5">
                  {editedObjects.map((obj, oi) => {
                    const open = inspectedDeployObj === oi;
                    return (
                      <div
                        key={oi}
                        style={{
                          borderRadius: 14,
                          border: `1px solid ${open ? "var(--app-border-accent)" : "var(--app-border)"}`,
                          background: open
                            ? "var(--app-ai-row-tint)"
                            : "var(--app-shell-bg-elevated)",
                          overflow: "hidden",
                          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                          boxShadow: open ? "0 0 0 1px color-mix(in srgb, var(--app-accent) 20%, transparent)" : "none",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setInspectedDeployObj(open ? null : oi)}
                          className="flex items-center gap-3 px-3.5 py-3 text-left"
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            width: "100%",
                          }}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                            background: "color-mix(in srgb, var(--app-graph-object) 16%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--app-graph-object) 32%, transparent)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "var(--app-graph-object)", fontSize: 12, fontWeight: 600,
                          }}>
                            {oi + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600 }}>{obj.name}</div>
                            <div style={{ color: "var(--app-text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {obj.description || "No description"}
                            </div>
                          </div>
                          <div style={{
                            padding: "3px 8px", borderRadius: 999,
                            background: "var(--app-shell-bg-subtle)",
                            border: "1px solid var(--app-border-subtle)",
                            color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, flexShrink: 0,
                          }}>
                            {obj.fields.length} fields
                          </div>
                          {open ? <ChevronDown size={14} style={{ color: "var(--app-text-muted)" }} /> : <ChevronRight size={14} style={{ color: "var(--app-text-muted)" }} />}
                        </button>
                        {open && (
                          <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--app-border-subtle)" }}>
                            <div style={{ color: "var(--app-text-subtle)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", margin: "12px 0 8px" }}>
                              FIELDS
                            </div>
                            <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 12 }}>
                              {obj.fields.map((f, fi) => (
                                <span
                                  key={fi}
                                  style={{
                                    padding: "5px 9px",
                                    borderRadius: 8,
                                    border: "1px solid var(--app-border-subtle)",
                                    background: "var(--app-shell-bg-subtle)",
                                    color: "var(--app-text-secondary)",
                                    fontSize: 11,
                                  }}
                                >
                                  <span style={{ color: "var(--app-text-primary)", fontWeight: 550 }}>{f.label}</span>
                                  <span style={{ opacity: 0.75 }}> · {f.type}{f.required ? " · req" : ""}</span>
                                </span>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => { setSelectedObj(oi); setSelectedFieldIdx(null); setPhase("review"); }}
                              style={{ ...BTN_OUTLINE, height: 30, padding: "0 11px", fontSize: 11 }}
                            >
                              Edit in agent workspace
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

