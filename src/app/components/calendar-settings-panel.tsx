import React, { useState } from "react";





import {
  ArrowLeft, Calendar, Check, ChevronLeft, ChevronRight, ChevronDown,
  Mail, MessageSquare, Pencil, Phone, Plus, Share2, Trash2,
} from "lucide-react";
import {
  type CalendarEntry,
  type CalendarRecurrence,
  type SettingsFieldRef,
  createBlankCalendarEntry,
  serializeCriteriaTokens,
} from "../types/object-settings";
import { CriteriaBuilder } from "./criteria-builder";

type CalendarView = "list" | "detail" | "form";
type CalendarFormStep = "basic" | "schedule" | "criteria" | "platform";

const CAL_STEPS: { id: CalendarFormStep; label: string }[] = [
  { id: "basic", label: "Basic details" },
  { id: "schedule", label: "Schedule" },
  { id: "criteria", label: "Criteria" },
  { id: "platform", label: "Platform" },
];

/** Match Create Object → Build Manually opener field styles. */
const INPUT: React.CSSProperties = {
  width: "100%", background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border-strong)",
  borderRadius: 8, padding: "8px 11px", color: "var(--app-text-primary)", fontSize: 13, outline: "none",
  transition: "border-color 0.2s", fontFamily: "inherit",
};

const FIELD_LABEL: React.CSSProperties = {
  color: "var(--app-text-secondary)", fontSize: 11, marginBottom: 7,
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      style={{ width: 38, height: 20, borderRadius: 9999, position: "relative", flexShrink: 0, background: value ? "var(--app-accent)" : "var(--app-toggle-off)", border: "none", cursor: "pointer", transition: "background 0.2s" }}>
      <div style={{ position: "absolute", top: 2, left: value ? 19 : 2, width: 16, height: 16, borderRadius: "50%", background: "var(--app-text-on-accent)", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }} />
    </button>
  );
}

function Radio({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className="flex items-center gap-2"
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${checked ? "var(--app-accent)" : "rgba(255,255,255,0.3)"}`,
        background: checked ? "var(--app-accent)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {checked && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--app-text-on-accent)" }} />}
      </div>
      <span style={{ color: checked ? "var(--app-text-primary)" : "var(--app-text-secondary)", fontSize: 13 }}>{label}</span>
    </button>
  );
}

function recurrenceLabel(r: CalendarRecurrence): string {
  return r === "none" ? "None" : r[0].toUpperCase() + r.slice(1);
}

function FormField({
  label, value, onChange: onVal, placeholder, required, as = "input",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; as?: "input" | "textarea";
}) {
  return (
    <div className="mb-4">
      <div style={FIELD_LABEL}>
        {label}{required && <span className="text-destructive"> *</span>}
      </div>
      {as === "textarea" ? (
        <textarea style={{ ...INPUT, resize: "vertical", minHeight: 72 }}
          value={value}
          onChange={e => onVal(e.target.value)}
          placeholder={placeholder}
          rows={3}
         
        />
      ) : (
        <input style={INPUT}
          value={value}
          onChange={e => onVal(e.target.value)}
          placeholder={placeholder}
         
        />
      )}
    </div>
  );
}

function FormSelect({
  label, value, onChange: onVal, options, placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { id: string; label: string }[]; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="mb-4">
      <div style={FIELD_LABEL}>
        {label}{required && <span className="text-destructive"> *</span>}
      </div>
      <select style={INPUT} value={value} onChange={e => onVal(e.target.value)}>
        <option value="">{placeholder ?? "Select…"}</option>
        {options.map(o => (
          <option key={o.id} value={o.label}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function SectionCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      marginBottom: 16, borderRadius: 10, padding: "14px 14px",
      border: "1px solid var(--app-border)", background: "var(--app-shell-bg-subtle)",
    }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600 }}>{title}</div>
        {subtitle && (
          <div style={{ color: "var(--app-text-subtle)", fontSize: 10, marginTop: 3, lineHeight: 1.4 }}>{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function PageHeader({
  title,
  onBack,
  actions,
}: {
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5" style={{ marginBottom: 14 }}>
      {onBack && (
        <button type="button" onClick={onBack}
          style={{ background: "none", border: "none", color: "var(--app-text-secondary)", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}
          aria-label="Back">
          <ArrowLeft size={14} />
        </button>
      )}
      <div style={{
        width: 24, height: 24, borderRadius: 6, background: "var(--app-shell-bg-accent)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Calendar size={12} style={{ color: "var(--app-accent-light)" }} />
      </div>
      <span style={{
        color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {title}
      </span>
      {actions}
    </div>
  );
}

export interface CalendarSettingsPanelProps {
  entries: CalendarEntry[];
  onChange: (entries: CalendarEntry[]) => void;
  fields: SettingsFieldRef[];
}

export function CalendarSettingsPanel({ entries, onChange, fields }: CalendarSettingsPanelProps) {
  const [view, setView] = useState<CalendarView>("list");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CalendarEntry | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formStep, setFormStep] = useState<CalendarFormStep>("basic");

  const active = entries.find(e => e.id === activeId) ?? null;
  const dateOptions = fields.filter(f =>
    f.fieldType === "Date Picker" || f.fieldType === "Date & Time" || f.fieldType === "Date",
  );
  const elementOptions = fields.length ? fields : [];

  const openCreate = () => {
    const blank = createBlankCalendarEntry();
    setDraft(blank);
    setIsNew(true);
    setActiveId(blank.id);
    setFormStep("basic");
    setView("form");
  };

  const openDetail = (id: string) => {
    setActiveId(id);
    setDraft(null);
    setIsNew(false);
    setView("detail");
  };

  const openEdit = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    setDraft({
      ...entry,
      actions: { ...entry.actions },
      criteriaTokens: [...(entry.criteriaTokens ?? [])],
    });
    setActiveId(id);
    setIsNew(false);
    setFormStep("basic");
    setView("form");
  };

  const removeEntry = (id: string) => {
    onChange(entries.filter(e => e.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setDraft(null);
      setView("list");
    }
  };

  const saveDraft = () => {
    if (!draft) return;
    const next = {
      ...draft,
      condition: serializeCriteriaTokens(draft.criteriaTokens),
    };
    if (isNew) onChange([...entries, next]);
    else onChange(entries.map(e => (e.id === next.id ? next : e)));
    setIsNew(false);
    setActiveId(next.id);
    setDraft(null);
    setView("detail");
  };

  const patchDraft = (partial: Partial<CalendarEntry>) => {
    setDraft(prev => (prev ? { ...prev, ...partial } : prev));
  };

  /* ── List ── */
  if (view === "list") {
    return (
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 24px 24px",
        scrollbarWidth: "thin", scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent",
      }}>
        <PageHeader
          title="Calendar"
          actions={
            <button type="button" onClick={openCreate} title="Add calendar"
              style={{
                width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--app-border-accent-strong)",
                background: "rgba(99,102,241,0.18)", color: "var(--app-text-accent-muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <Plus size={14} />
            </button>
          }
        />

        {entries.length === 0 && (
          <div style={{
            padding: "28px 16px", textAlign: "center", borderRadius: 10,
            border: "1px dashed var(--app-border-strong)", color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.5,
          }}>
            No calendars yet. Click + to create one.
          </div>
        )}

        <div className="flex flex-col gap-3">
          {entries.map(entry => (
            <div key={entry.id} style={{ position: "relative", paddingTop: 8 }}>
              <div className="flex justify-center gap-8" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 }}>
                {[0, 1].map(i => (
                  <div key={i} style={{
                    width: 14, height: 10, borderRadius: 4,
                    background: "rgba(96,165,250,0.55)", border: "1px solid rgba(96,165,250,0.7)",
                  }} />
                ))}
              </div>
              <button type="button" onClick={() => openDetail(entry.id)} className="w-full text-left"
                style={{
                  borderRadius: 8, overflow: "hidden", cursor: "pointer",
                  border: "1px solid rgba(96,165,250,0.35)", background: "rgba(15,23,42,0.65)",
                }}>
                <div style={{ padding: "14px 14px 10px", background: "rgba(96,165,250,0.12)", borderBottom: "1px solid var(--app-border-subtle)" }}>
                  <div style={{ color: "#F3F4F6", fontSize: 14, fontWeight: 700 }}>
                    {entry.calendarName || "Untitled calendar"}
                  </div>
                </div>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--app-border-subtle)" }}>
                  <div style={{ color: "var(--app-text-secondary)", fontSize: 12, marginBottom: 8 }}>
                    {entry.endDate || entry.displayName || "—"}
                  </div>
                  <span style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: 999,
                    background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)",
                    color: "#93C5FD", fontSize: 10, fontWeight: 600,
                  }}>
                    {recurrenceLabel(entry.recurrence)}
                  </span>
                </div>
                <div style={{ padding: "10px 14px 18px" }}>
                  <div style={{ color: "var(--app-text-secondary)", fontSize: 11, fontStyle: "italic", wordBreak: "break-word" }}>
                    {entry.condition ? `Condition = (${entry.condition})` : "Condition = (—)"}
                  </div>
                </div>
              </button>
              <div className="flex gap-2" style={{ position: "absolute", right: 10, bottom: -2 }}>
                <button type="button" onClick={() => openEdit(entry.id)} title="Edit"
                  style={{
                    width: 28, height: 28, borderRadius: "50%", background: "rgba(30,41,59,0.95)",
                    border: "1px solid var(--app-toggle-off)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "var(--app-text-secondary)",
                  }}>
                  <Pencil size={12} />
                </button>
                <button type="button" onClick={() => removeEntry(entry.id)} title="Delete"
                  style={{
                    width: 28, height: 28, borderRadius: "50%", background: "rgba(30,41,59,0.95)",
                    border: "1px solid rgba(248,113,113,0.35)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "var(--app-text-danger)",
                  }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Detail ── */
  if (view === "detail" && active) {
    const rows: [string, string][] = [
      ["CALENDAR NAME", active.calendarName || "—"],
      ["DISPLAY NAME", active.displayName || "—"],
      ["END DATE", active.endDate || "—"],
      ["WHOLE DAY EVENT", active.wholeDayEvent ? "Y" : "N"],
      ["TITLE", active.title || "—"],
      ["GEO LINK", active.geoLink || ""],
      ["RECURENCE", recurrenceLabel(active.recurrence)],
    ];
    return (
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 24px 24px",
        scrollbarWidth: "thin", scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent",
      }}>
        <PageHeader
          title={active.calendarName || "Details"}
          onBack={() => setView("list")}
          actions={
            <button type="button" onClick={openCreate}
              style={{
                width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--app-border-accent-strong)",
                background: "rgba(99,102,241,0.18)", color: "var(--app-text-accent-muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <Plus size={14} />
            </button>
          }
        />
        <div style={{
          borderRadius: 12, border: "1px solid var(--app-border)",
          background: "rgba(15,23,42,0.85)", overflow: "hidden",
        }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--app-border)" }}>
            <div style={{ color: "#F3F4F6", fontSize: 16, fontWeight: 700 }}>
              {active.endDate || active.displayName || active.calendarName || "Calendar"}
            </div>
            <button type="button" onClick={() => openEdit(active.id)}
              style={{ background: "none", border: "none", color: "var(--app-text-secondary)", cursor: "pointer", padding: 4 }}>
              <Pencil size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4">
            {rows.map(([k, v]) => (
              <div key={k}>
                <div style={{ color: "var(--app-text-muted)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 3 }}>{k}</div>
                <div style={{ color: "var(--app-text-primary)", fontSize: 12, minHeight: 16 }}>{v || "\u00A0"}</div>
              </div>
            ))}
          </div>
          <div style={{ margin: "0 12px 12px", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--app-border)", background: "var(--app-shell-bg-input)" }}>
            <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>
              Criteria (JavaScript)
            </div>
            <div style={{ color: "var(--app-text-secondary)", fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", wordBreak: "break-word" }}>
              {active.condition || "—"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Create / Edit form ── */
  if (view === "form" && draft) {
    const canSave = Boolean(draft.title.trim() && draft.calendarName.trim());
    const stepIndex = CAL_STEPS.findIndex(s => s.id === formStep);
    const isLastStep = stepIndex === CAL_STEPS.length - 1;
    const goNext = () => {
      if (stepIndex < CAL_STEPS.length - 1) {
        setFormStep(CAL_STEPS[stepIndex + 1].id);
      }
    };
    const goBackStep = () => {
      if (stepIndex > 0) {
        setFormStep(CAL_STEPS[stepIndex - 1].id);
      }
    };

    return (
      <div style={{
        flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
        padding: "18px 24px 0",
      }}>
        <div style={{ flexShrink: 0, paddingBottom: 14 }}>
        <PageHeader
          title={isNew ? "Create Calendar" : "Edit Calendar"}
          onBack={() => {
            setDraft(null);
            setPicker(null);
            setFormStep("basic");
            setView(isNew || !activeId ? "list" : "detail");
          }}
        />

        <div className="flex items-center" style={{ marginBottom: 0 }}>
          <div className="flex items-center" style={{ minWidth: 0, overflow: "hidden" }}>
            {CAL_STEPS.map((s, i) => {
              const on = formStep === s.id;
              const done = i < stepIndex;
              return (
                <div key={s.id} className="flex items-center" style={{ flexShrink: 0 }}>
                  <button type="button"
                    onClick={() => { setPicker(null); setFormStep(s.id); }}
                    className="flex items-center gap-2"
                    style={{
                      flexShrink: 0, padding: 0, border: "none", cursor: "pointer",
                      background: "transparent",
                    }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700,
                      background: on ? "var(--app-accent)" : done ? "rgba(52,211,153,0.2)" : "var(--app-border-subtle)",
                      border: `1px solid ${on ? "var(--app-accent-light)" : done ? "rgba(52,211,153,0.55)" : "var(--app-border-strong)"}`,
                      color: on ? "#fff" : done ? "#6EE7B7" : "var(--app-text-muted)",
                    }}>
                      {done ? <Check size={11} /> : i + 1}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: on ? 700 : 600, whiteSpace: "nowrap",
                      color: on ? "var(--app-text-primary)" : done ? "var(--app-text-secondary)" : "var(--app-text-muted)",
                    }}>
                      {s.label}
                    </span>
                  </button>
                  {i < CAL_STEPS.length - 1 && (
                    <div style={{
                      width: 14, height: 1, flexShrink: 0, margin: "0 8px",
                      background: done
                        ? "linear-gradient(90deg, rgba(52,211,153,0.55), var(--app-border-accent))"
                        : "var(--app-border)",
                    }} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4" style={{ flexShrink: 0, marginLeft: "auto", paddingLeft: 40 }}>
            <button type="button" onClick={goBackStep} disabled={stepIndex === 0}
              className="flex items-center gap-0.5"
              style={{
                background: "none", border: "none", padding: "6px 0", fontSize: 12, fontWeight: 600,
                cursor: stepIndex === 0 ? "not-allowed" : "pointer",
                color: stepIndex === 0 ? "var(--app-text-subtle)" : "var(--app-text-accent-muted)",
              }}>
              <ChevronLeft size={14} /> Back
            </button>
            {!isLastStep ? (
              <button type="button" onClick={goNext}
                className="flex items-center gap-0.5"
                style={{
                  background: "none", border: "none", padding: "6px 0", cursor: "pointer",
                  color: "var(--app-text-accent-muted)", fontSize: 12, fontWeight: 600,
                }}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button type="button" onClick={saveDraft} disabled={!canSave}
                className="flex items-center gap-1"
                style={{
                  background: "none", border: "none", padding: "6px 0", fontSize: 12, fontWeight: 700,
                  cursor: canSave ? "pointer" : "not-allowed",
                  color: canSave ? "#34D399" : "var(--app-text-subtle)",
                }}>
                <Check size={14} /> Save
              </button>
            )}
          </div>
        </div>
        </div>

        <div className="obj-adv-nav-scroll" style={{
          flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 24,
          scrollbarWidth: "thin",
          scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent",
        }}>
        {formStep === "basic" && (
        <SectionCard title="Basic details" subtitle="Name, fields, and appearance for this calendar">
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <FormField label="Title" value={draft.title} required
                onChange={v => patchDraft({ title: v })} placeholder="Enter the Title name here..." />
              <FormField label="Calendar name" value={draft.calendarName} required
                onChange={v => patchDraft({ calendarName: v })} placeholder="Enter Calendar Name" />
              <FormField label="Display name" value={draft.displayName}
                onChange={v => patchDraft({ displayName: v })} placeholder="Enter Display Name" />
              <FormField label="Description" value={draft.description} as="textarea"
                onChange={v => patchDraft({ description: v })} placeholder="Add any additional description" />
            </div>
            <div>
              <FormSelect label="Elements" value={draft.elements} required
                onChange={v => patchDraft({ elements: v })}
                options={elementOptions.map(f => ({ id: f.id, label: f.label }))}
                placeholder="Select Element" />
              <FormSelect label="End date" value={draft.endDate} required
                onChange={v => patchDraft({ endDate: v })}
                options={(dateOptions.length ? dateOptions : elementOptions).map(f => ({ id: f.id, label: f.label }))}
                placeholder="Enter End Date here..." />
              <FormField label="Geo-link" value={draft.geoLink}
                onChange={v => patchDraft({ geoLink: v })} placeholder="Enter Geolink here..." />
              <div className="flex items-start justify-between gap-4" style={{ marginBottom: 0 }}>
                <div>
                  <div style={FIELD_LABEL}>Select color</div>
                  <input type="color" value={draft.color}
                    onChange={e => patchDraft({ color: e.target.value })}
                    style={{ width: 40, height: 32, border: "none", background: "transparent", cursor: "pointer" }} />
                </div>
                <div>
                  <div style={FIELD_LABEL}>Select icon</div>
                  <button type="button" title="Select icon"
                    style={{
                      width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "var(--app-text-accent-muted)",
                      background: "var(--app-shell-bg-accent)", cursor: "pointer",
                    }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
        )}

        {formStep === "schedule" && (
        <SectionCard title="Schedule options" subtitle="How events repeat and whether they span the full day">
          <div className="flex flex-col gap-2" style={{ marginBottom: draft.recurrenceEnabled ? 12 : 0 }}>
            <div className="flex items-center justify-between gap-3" style={{
              padding: "10px 12px", borderRadius: 8,
              border: "1px solid var(--app-border-subtle)", background: "rgba(0,0,0,0.18)",
            }}>
              <div>
                <div style={{ color: "var(--app-text-secondary)", fontSize: 11, fontWeight: 500 }}>Recurrence</div>
                <div style={{ color: "var(--app-text-subtle)", fontSize: 10, marginTop: 2 }}>Repeat calendar events</div>
              </div>
              <Toggle value={draft.recurrenceEnabled} onChange={v => patchDraft({ recurrenceEnabled: v })} />
            </div>
            <div className="flex items-center justify-between gap-3" style={{
              padding: "10px 12px", borderRadius: 8,
              border: "1px solid var(--app-border-subtle)", background: "rgba(0,0,0,0.18)",
            }}>
              <div>
                <div style={{ color: "var(--app-text-secondary)", fontSize: 11, fontWeight: 500 }}>Whole Day Event</div>
                <div style={{ color: "var(--app-text-subtle)", fontSize: 10, marginTop: 2 }}>All-day without time slots</div>
              </div>
              <Toggle value={draft.wholeDayEvent} onChange={v => patchDraft({ wholeDayEvent: v })} />
            </div>
          </div>
          {draft.recurrenceEnabled && (
            <>
              <div style={{ height: 1, background: "var(--app-border)", marginBottom: 12 }} />
              <div style={{ color: "var(--app-text-secondary)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>
                FREQUENCY
              </div>
              <div className="flex items-center gap-4" style={{ flexWrap: "nowrap", overflowX: "auto" }}>
                {(["daily", "weekly", "monthly", "yearly", "none"] as const).map(r => (
                  <Radio key={r} label={recurrenceLabel(r)} checked={draft.recurrence === r}
                    onChange={() => patchDraft({ recurrence: r })} />
                ))}
              </div>
            </>
          )}
        </SectionCard>
        )}

        {formStep === "criteria" && (
        <SectionCard title="Criteria" subtitle="Build the condition by combining Field, Constant, Operator, Function, Condition, and Braces">
          <CriteriaBuilder
            embedded
            tokens={draft.criteriaTokens}
            fields={fields}
            onChange={(tokens, condition) => patchDraft({ criteriaTokens: tokens, condition })}
          />
        </SectionCard>
        )}

        {formStep === "platform" && (
        <SectionCard title="Platform settings" subtitle="Web Page controls event permissions; Mobile controls details and actions">
          <div style={{ borderRadius: 8, border: "1px solid var(--app-border)", overflow: "hidden" }}>
            <div className="flex">
              {(["web", "mobile"] as const).map(tab => (
                <button key={tab} type="button" onClick={() => patchDraft({ platformTab: tab })}
                  style={{
                    flex: 1, padding: "9px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                    background: draft.platformTab === tab ? "rgba(99,102,241,0.15)" : "transparent",
                    color: draft.platformTab === tab ? "#C7D2FE" : "var(--app-text-muted)",
                    borderBottom: draft.platformTab === tab ? "2px solid var(--app-accent)" : "2px solid transparent",
                  }}>
                  {tab === "web" ? "Web Page" : "Mobile"}
                </button>
              ))}
            </div>

            {draft.platformTab === "web" ? (
              <div style={{ padding: "4px 12px" }}>
                <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--app-shell-bg-input)" }}>
                  <span style={{ color: "var(--app-text-body)", fontSize: 12 }}>Enable Event Creation</span>
                  <Toggle value={draft.enableEventCreation} onChange={v => patchDraft({ enableEventCreation: v })} />
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span style={{ color: "var(--app-text-body)", fontSize: 12 }}>Enable Event Action</span>
                  <Toggle value={draft.enableEventAction} onChange={v => patchDraft({ enableEventAction: v })} />
                </div>
              </div>
            ) : (
              <div style={{ padding: "12px 12px 4px" }}>
                <FormSelect label="View details" value={draft.viewDetails}
                  onChange={v => patchDraft({ viewDetails: v })}
                  options={elementOptions.map(f => ({ id: f.id, label: f.label }))}
                  placeholder="Select Event Detail" />
                <div style={FIELD_LABEL}>Actions</div>
                <div className="flex gap-3" style={{ marginBottom: 8 }}>
                  {([
                    ["phone", Phone],
                    ["email", Mail],
                    ["message", MessageSquare],
                    ["share", Share2],
                  ] as const).map(([key, Icon]) => {
                    const on = draft.actions[key];
                    return (
                      <button key={key} type="button"
                        onClick={() => patchDraft({ actions: { ...draft.actions, [key]: !on } })}
                        style={{
                          width: 34, height: 34, borderRadius: 8, cursor: "pointer",
                          border: `1px solid ${on ? "rgba(99,102,241,0.5)" : "var(--app-border-strong)"}`,
                          background: on ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                          color: on ? "var(--app-text-accent-muted)" : "var(--app-text-muted)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                        <Icon size={14} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
        )}
        </div>
      </div>
    );
  }

  return null;
}
