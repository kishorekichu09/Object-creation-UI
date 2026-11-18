import React, { useMemo, useState } from "react";




import {
  ArrowLeft, Bell, Box, Check, ChevronDown, ChevronLeft, ChevronRight, GitBranch, Globe,
  Mail, MessageCircle, MessageSquare,
  Paperclip, Pencil, Plus, Search, Smartphone, Trash2, Zap,
} from "lucide-react";
import {
  type NotificationEntry,
  type NotificationPlatform,
  type NotificationRecordEvent,
  type NotificationScheduleFrequency,
  type NotificationTemplateMode,
  type NotificationTriggerSource,
  type SettingsFieldRef,
  createBlankNotificationEntry,
  serializeCriteriaTokens,
} from "../types/object-settings";
import { CriteriaBuilder } from "./criteria-builder";

type NotifView = "list" | "detail" | "form";
type NotifStep = "general" | "objects" | "trigger" | "conditions";

const INPUT: React.CSSProperties = {
  width: "100%", background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border-strong)",
  borderRadius: 8, padding: "8px 11px", color: "var(--app-text-primary)", fontSize: 13, outline: "none",
  transition: "border-color 0.2s", fontFamily: "inherit",
};

const FIELD_LABEL: React.CSSProperties = {
  color: "var(--app-text-secondary)", fontSize: 11, marginBottom: 7,
};

const RECORD_EVENTS: { id: NotificationRecordEvent; label: string }[] = [
  { id: "created", label: "Created" },
  { id: "createdAndEdited", label: "Created and every time its edited" },
  { id: "createdAndEditedMeetCriteria", label: "Created and any time its edited to subsequently meet criteria" },
];

const PLATFORMS: {
  id: NotificationPlatform;
  label: string;
  Icon: React.ElementType;
}[] = [
  { id: "email", label: "Email", Icon: Mail },
  { id: "browser", label: "Browser", Icon: Globe },
  { id: "push", label: "Push", Icon: Smartphone },
  { id: "googleChat", label: "Google Chat", Icon: MessageSquare },
  { id: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
];

/** Shared product accent for all notification channels / platform chrome */
const PLATFORM_ACCENT = "var(--app-accent)";
const PLATFORM_ACCENT_SOFT = "var(--app-accent-light)";
const PLATFORM_ACCENT_BG = "var(--app-shell-bg-accent)";
const PLATFORM_ACCENT_BORDER = "var(--app-border-accent)";
const PLATFORM_ACCENT_TEXT = "var(--app-text-accent)";
const PLATFORM_ACCENT_TEXT_MUTED = "var(--app-text-accent-muted)";
const PLATFORM_INFO_BG = "var(--app-shell-bg-info)";
const PLATFORM_INFO_BORDER = "var(--app-border-info)";
const PLATFORM_INFO_TEXT = "var(--app-text-info)";
const PLATFORM_NOTICE_BG = "var(--app-shell-bg-accent)";
const PLATFORM_NOTICE_BORDER = "var(--app-border-accent)";
const PLATFORM_NOTICE_TEXT = "var(--app-text-accent-muted)";

const STEPS: { id: NotifStep; label: string }[] = [
  { id: "general", label: "General" },
  { id: "objects", label: "Objects" },
  { id: "trigger", label: "Trigger Event" },
  { id: "conditions", label: "Conditions" },
];

type RecipientCategory = "all" | "users" | "groups" | "roles" | "responsibilities";

const DEFAULT_EMAIL_TEMPLATES = [
  "Status change alert",
  "Assignment notice",
  "Approval request",
  "Reminder digest",
];

const RECIPIENT_DIRECTORY: Record<Exclude<RecipientCategory, "all">, string[]> = {
  users: ["Alex Morgan", "Priya Shah", "Jordan Lee", "Sam Okonkwo", "Casey Nguyen"],
  groups: ["Sales Team", "Support Desk", "Finance Ops", "Field Engineers"],
  roles: ["Manager", "Approver", "Contributor", "Viewer"],
  responsibilities: ["Record Owner", "Queue Handler", "Escalation Contact", "On-call Lead"],
};

const LAYOUT_OPTIONS = [
  { id: "list", label: "List Layout" },
  { id: "detail", label: "Detail Layout" },
  { id: "create", label: "Create Layout" },
  { id: "edit", label: "Edit Layout" },
  { id: "mobile", label: "Mobile Layout" },
];

const RECIPIENT_CATEGORY_TABS: { id: RecipientCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "users", label: "Users" },
  { id: "groups", label: "Groups" },
  { id: "roles", label: "Roles" },
  { id: "responsibilities", label: "Responsibilities" },
];

function parseRecipients(value: string): string[] {
  return value.split(",").map(s => s.trim()).filter(Boolean);
}

function joinRecipients(parts: string[]): string {
  return parts.join(", ");
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      style={{ width: 38, height: 20, borderRadius: 9999, position: "relative", flexShrink: 0, background: value ? "var(--app-accent)" : "var(--app-toggle-off)", border: "none", cursor: "pointer", transition: "background 0.2s" }}>
      <div style={{ position: "absolute", top: 2, left: value ? 19 : 2, width: 16, height: 16, borderRadius: "50%", background: "var(--app-text-on-accent)", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }} />
    </button>
  );
}

function Radio({ label, checked, onChange, block }: {
  label: string; checked: boolean; onChange: () => void; block?: boolean;
}) {
  return (
    <button type="button" onClick={onChange} className="flex items-start gap-2.5"
      style={{
        background: "none", border: "none", cursor: "pointer", padding: "6px 0",
        textAlign: "left", width: block ? "100%" : "auto",
      }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 2,
        border: `2px solid ${checked ? "var(--app-accent)" : "rgba(255,255,255,0.3)"}`,
        background: checked ? "var(--app-accent)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {checked && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--app-text-on-accent)" }} />}
      </div>
      <span style={{ color: checked ? "var(--app-text-primary)" : "var(--app-text-secondary)", fontSize: 13, lineHeight: 1.4, fontWeight: checked ? 600 : 500 }}>
        {label}
      </span>
    </button>
  );
}

function platformMeta(platform: NotificationPlatform) {
  return PLATFORMS.find(p => p.id === platform) ?? PLATFORMS[0];
}

function triggerSummary(entry: NotificationEntry): string {
  if (entry.triggerSource === "processFlow") {
    if (!entry.enableScheduler) return "Process flow";
    if (entry.scheduleFrequency === "once") return "Process flow · Once";
    return "Process flow · Recurring";
  }
  const ev = RECORD_EVENTS.find(r => r.id === entry.recordEvent);
  return ev?.label ?? "Event";
}

function rulePreview(entry: NotificationEntry): string {
  const when = entry.triggerSource === "events"
    ? (RECORD_EVENTS.find(r => r.id === entry.recordEvent)?.label.split(" ")[0] ?? "Create")
    : (entry.enableScheduler
      ? (entry.scheduleFrequency === "once" ? "Once" : "Recurring")
      : "Process flow");
  const cond = entry.conditionSummary.trim() || "always";
  const via = platformMeta(entry.platform).label;
  return `When ${when} + ${cond} → ${via}`;
}

function FormField({
  label, value, onChange, placeholder, required, as,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  as?: "textarea";
}) {
  return (
    <div className="mb-3.5">
      <div style={FIELD_LABEL}>
        {label}{required ? <span className="text-destructive"> *</span> : null}
      </div>
      {as === "textarea" ? (
        <textarea style={{ ...INPUT, resize: "vertical", minHeight: 72 }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          />
      ) : (
        <input style={INPUT} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          />
      )}
    </div>
  );
}

function SectionCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      marginBottom: 14, padding: "14px 14px 10px", borderRadius: 10,
      border: "1px solid var(--app-border)", background: "var(--app-shell-bg-subtle)",
    }}>
      <div style={{ marginBottom: children ? 12 : 0 }}>
        <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600 }}>{title}</div>
        {subtitle && <div style={{ color: "var(--app-text-muted)", fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>{subtitle}</div>}
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
        <Bell size={12} style={{ color: "var(--app-accent-light)" }} />
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

/** Type + pick from Users / Groups / Roles / Responsibilities. */
function ToRecipientsField({
  value,
  onChange,
  required = true,
}: {
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<RecipientCategory>("all");
  const [search, setSearch] = useState("");
  const selected = parseRecipients(value);

  const directoryItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cats = category === "all"
      ? (Object.keys(RECIPIENT_DIRECTORY) as Exclude<RecipientCategory, "all">[])
      : [category];
    const rows: { category: string; name: string }[] = [];
    cats.forEach(cat => {
      RECIPIENT_DIRECTORY[cat].forEach(name => {
        if (!q || name.toLowerCase().includes(q)) {
          rows.push({ category: cat, name });
        }
      });
    });
    return rows;
  }, [category, search]);

  const addName = (name: string) => {
    if (selected.some(s => s.toLowerCase() === name.toLowerCase())) return;
    onChange(joinRecipients([...selected, name]));
  };

  const removeName = (name: string) => {
    onChange(joinRecipients(selected.filter(s => s !== name)));
  };

  return (
    <div style={{ marginBottom: 14, position: "relative" }}>
      <div style={FIELD_LABEL}>
        To{required ? <span style={{ color: "var(--app-text-danger)" }}> *</span> : null}
      </div>
      <div style={{
        ...INPUT, minHeight: 40, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
        padding: "6px 10px", cursor: "text",
      }}
        onClick={() => setOpen(true)}>
        {selected.map(name => (
          <span key={name} className="flex items-center gap-1" style={{
            padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: "rgba(99,102,241,0.2)", color: "#C7D2FE", border: "1px solid var(--app-border-accent)",
          }}>
            {name}
            <button type="button" onClick={e => { e.stopPropagation(); removeName(name); }}
              style={{ background: "none", border: "none", color: "var(--app-text-accent-muted)", cursor: "pointer", padding: 0, lineHeight: 1 }}>
              ×
            </button>
          </span>
        ))}
        <input
          value={open ? search : ""}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length ? "Add more…" : "Owner, Assigned user, email…"}
          style={{
            flex: 1, minWidth: 120, background: "transparent", border: "none", outline: "none",
            color: "var(--app-text-primary)", fontSize: 13, fontFamily: "inherit", padding: "4px 0",
          }}
        />
      </div>

      {open && (
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            position: "absolute", left: 0, right: 0, top: "100%", zIndex: 40, marginTop: 6,
            borderRadius: 10, border: "1px solid var(--app-border-strong)",
            background: "var(--app-shell-bg-floating)", boxShadow: "0 14px 32px var(--app-shell-bg-overlay)", overflow: "hidden",
          }}>
          <div className="flex" style={{ borderBottom: "1px solid var(--app-border)", overflowX: "auto" }}>
            {RECIPIENT_CATEGORY_TABS.map(tab => {
              const on = category === tab.id;
              return (
                <button key={tab.id} type="button" onClick={() => setCategory(tab.id)}
                  style={{
                    flexShrink: 0, padding: "8px 10px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                    background: on ? "rgba(99,102,241,0.15)" : "transparent",
                    color: on ? "#C7D2FE" : "var(--app-text-muted)",
                    borderBottom: on ? "2px solid var(--app-accent)" : "2px solid transparent",
                  }}>
                  {tab.label}
                </button>
              );
            })}
            <button type="button" onClick={() => { setOpen(false); setSearch(""); }}
              style={{
                marginLeft: "auto", padding: "8px 12px", border: "none", background: "none",
                color: "var(--app-text-muted)", cursor: "pointer", fontSize: 11,
              }}>
              Close
            </button>
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto", padding: "6px 4px" }}>
            {directoryItems.length === 0 && (
              <div style={{ color: "var(--app-text-muted)", fontSize: 11, padding: "12px 10px" }}>No matches</div>
            )}
            {directoryItems.map(item => {
              const already = selected.some(s => s.toLowerCase() === item.name.toLowerCase());
              return (
                <button key={`${item.category}-${item.name}`} type="button"
                  disabled={already}
                  onClick={() => addName(item.name)}
                  className="flex items-center justify-between w-full"
                  style={{
                    textAlign: "left", padding: "8px 10px", borderRadius: 6, border: "none",
                    background: "transparent", cursor: already ? "default" : "pointer",
                    opacity: already ? 0.45 : 1,
                  }}
                  onMouseEnter={e => { if (!already) e.currentTarget.style.background = "var(--app-border-subtle)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{item.name}</span>
                  <span style={{ color: "var(--app-text-muted)", fontSize: 10, textTransform: "capitalize" }}>{item.category}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateLookupField({
  value,
  templateMode,
  onSelect,
  onCreate,
}: {
  value: string;
  templateMode: NotificationTemplateMode;
  onSelect: (name: string) => void;
  onCreate: (name: string, mode: NotificationTemplateMode) => void;
}) {
  const [templates, setTemplates] = useState<string[]>(DEFAULT_EMAIL_TEMPLATES);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newMode, setNewMode] = useState<NotificationTemplateMode>("default");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter(t => !q || t.toLowerCase().includes(q));
  }, [templates, search]);

  const commitCreate = () => {
    const name = newName.trim();
    if (!name) return;
    setTemplates(prev => (prev.some(t => t.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name]));
    onCreate(name, newMode);
    setNewName("");
    setNewMode("default");
    setCreateOpen(false);
    setLookupOpen(false);
    setSearch("");
  };

  return (
    <div style={{ marginBottom: 14, position: "relative" }}>
      <div style={FIELD_LABEL}>Template</div>
      <div className="flex items-center gap-2">
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <button type="button" onClick={() => { setLookupOpen(o => !o); setCreateOpen(false); }}
            className="flex items-center gap-2"
            style={{
              ...INPUT, display: "flex", alignItems: "center", cursor: "pointer", textAlign: "left",
              paddingRight: 36,
            }}>
            <Search size={13} style={{ color: "var(--app-text-muted)", flexShrink: 0 }} />
            <span style={{
              flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              color: value ? "var(--app-text-primary)" : "var(--app-text-muted)",
            }}>
              {value || "Select a template"}
            </span>
            {value && templateMode === "upload" && (
              <span style={{
                flexShrink: 0, fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 999,
                background: PLATFORM_INFO_BG, color: PLATFORM_INFO_TEXT,
              }}>
                Upload
              </span>
            )}
            <ChevronDown size={14} style={{
              position: "absolute", right: 12, color: "var(--app-text-secondary)", pointerEvents: "none",
            }} />
          </button>

          {lookupOpen && (
            <div
              onMouseDown={e => e.preventDefault()}
              style={{
                position: "absolute", left: 0, right: 0, top: "100%", zIndex: 45, marginTop: 6,
                borderRadius: 10, border: "1px solid var(--app-border-strong)",
                background: "var(--app-shell-bg-floating)", boxShadow: "0 14px 32px var(--app-shell-bg-overlay)", overflow: "hidden",
              }}>
              <div style={{ padding: "8px 8px 6px" }}>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search templates…" autoFocus
                  style={{ ...INPUT, marginBottom: 0 }} />
              </div>
              <div style={{ maxHeight: 160, overflowY: "auto", padding: "4px 4px 8px" }}>
                {filtered.map(t => (
                  <button key={t} type="button"
                    onClick={() => {
                      onSelect(t);
                      setLookupOpen(false);
                      setSearch("");
                    }}
                    style={{
                      width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 6,
                      border: "none", background: value === t ? "rgba(99,102,241,0.18)" : "transparent",
                      color: "var(--app-text-primary)", fontSize: 12, cursor: "pointer",
                    }}
                    onMouseEnter={e => {
                      if (value !== t) e.currentTarget.style.background = "var(--app-border-subtle)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = value === t ? "rgba(99,102,241,0.18)" : "transparent";
                    }}>
                    {t}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div style={{ color: "var(--app-text-muted)", fontSize: 11, padding: "10px 10px" }}>No templates found</div>
                )}
              </div>
            </div>
          )}
        </div>

        <button type="button" title="Create template"
          onClick={() => { setCreateOpen(o => !o); setLookupOpen(false); }}
          style={{
            width: 36, height: 36, flexShrink: 0, borderRadius: 8, cursor: "pointer",
            border: "1px solid var(--app-border-accent-strong)", background: "rgba(99,102,241,0.15)",
            color: "var(--app-text-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          <Plus size={15} />
        </button>
      </div>

      {createOpen && (
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            marginTop: 8, padding: 12, borderRadius: 10,
            border: "1px solid var(--app-border-accent)", background: "rgba(15,23,42,0.95)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
          }}>
          <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>New template</div>
          <div style={{ marginBottom: 12 }}>
            <div style={FIELD_LABEL}>Template name</div>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Enter template name" style={INPUT}
              onFocus={e => (e.target.style.borderColor = "var(--app-accent)")}
              onBlur={e => (e.target.style.borderColor = "var(--app-border-strong)")} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <Radio label="Default template" checked={newMode === "default"}
              onChange={() => setNewMode("default")} block />
            <Radio label="Upload template" checked={newMode === "upload"}
              onChange={() => setNewMode("upload")} block />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => { setCreateOpen(false); setNewName(""); }}
              style={{
                background: "none", border: "none", color: "var(--app-text-secondary)", fontSize: 11,
                fontWeight: 600, cursor: "pointer", padding: "6px 8px",
              }}>
              Cancel
            </button>
            <button type="button" onClick={commitCreate} disabled={!newName.trim()}
              style={{
                padding: "7px 12px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600,
                cursor: newName.trim() ? "pointer" : "not-allowed",
                background: newName.trim() ? "var(--app-accent)" : "var(--app-border)",
                color: newName.trim() ? "#fff" : "var(--app-text-subtle)",
              }}>
              Add template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export interface NotificationSettingsPanelProps {
  entries: NotificationEntry[];
  onChange: (entries: NotificationEntry[]) => void;
  fields: SettingsFieldRef[];
  objectLabel?: string;
  objectId?: string;
}

export function NotificationSettingsPanel({
  entries,
  onChange,
  fields,
  objectLabel = "This object",
  objectId = "current",
}: NotificationSettingsPanelProps) {
  const [view, setView] = useState<NotifView>("list");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NotificationEntry | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [step, setStep] = useState<NotifStep>("general");
  const [newAction, setNewAction] = useState("");

  const active = entries.find(e => e.id === activeId) ?? null;

  const patchDraft = (partial: Partial<NotificationEntry>) => {
    setDraft(prev => (prev ? { ...prev, ...partial } : prev));
  };

  const openCreate = () => {
    const blank = createBlankNotificationEntry(objectId);
    blank.linkedObjectIds = [objectId];
    setDraft(blank);
    setIsNew(true);
    setStep("general");
    setActiveId(null);
    setView("form");
  };

  const openDetail = (id: string) => {
    setActiveId(id);
    setDraft(null);
    setView("detail");
  };

  const openEdit = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    setDraft({ ...entry, criteriaTokens: [...entry.criteriaTokens], notificationActions: [...entry.notificationActions], linkedObjectIds: [...entry.linkedObjectIds] });
    setIsNew(false);
    setActiveId(id);
    setStep("general");
    setView("form");
  };

  const removeEntry = (id: string) => {
    onChange(entries.filter(e => e.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setView("list");
    }
  };

  const saveDraft = () => {
    if (!draft) return;
    const next = {
      ...draft,
      conditionSummary: serializeCriteriaTokens(draft.criteriaTokens) || draft.conditionSummary,
    };
    if (isNew) onChange([...entries, next]);
    else onChange(entries.map(e => (e.id === next.id ? next : e)));
    setActiveId(next.id);
    setDraft(null);
    setView("detail");
  };

  const backToList = () => {
    setView("list");
    setDraft(null);
    setActiveId(null);
  };

  const toggleLinkedObject = (id: string) => {
    if (!draft) return;
    const has = draft.linkedObjectIds.includes(id);
    patchDraft({
      linkedObjectIds: has
        ? draft.linkedObjectIds.filter(x => x !== id)
        : [...draft.linkedObjectIds, id],
    });
  };

  const addAction = () => {
    if (!draft || !newAction.trim()) return;
    patchDraft({ notificationActions: [...draft.notificationActions, newAction.trim()] });
    setNewAction("");
  };

  const hasValidTrigger = (e: NotificationEntry) => {
    if (e.triggerSource === "events") return Boolean(e.recordEvent);
    if (!e.enableScheduler) return true;
    if (e.scheduleFrequency === "once") return Boolean(e.startDate.trim() && e.startTime.trim());
    return Boolean(
      e.startDate.trim() && e.startTime.trim() && e.endDate.trim() && e.endTime.trim() && e.intervalValue.trim(),
    );
  };

  /* ── List ── */
  if (view === "list") {
    return (
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 24px 24px",
        scrollbarWidth: "thin", scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent",
      }}>
        <PageHeader
          title="Notification"
          actions={
            <button type="button" onClick={openCreate} title="Add notification"
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
          marginBottom: 14, padding: "10px 12px", borderRadius: 8,
          background: "var(--app-shell-bg-accent)", border: "1px solid rgba(99,102,241,0.2)",
        }}>
          <div style={{ color: "#C7D2FE", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Rule model</div>
          <div style={{ color: "var(--app-text-secondary)", fontSize: 11, lineHeight: 1.45 }}>
            When a record event happens and conditions are met → notify recipients on the chosen channel.
          </div>
        </div>

        {entries.length === 0 && (
          <div style={{
            padding: "28px 16px", textAlign: "center", borderRadius: 10,
            border: "1px dashed var(--app-border-strong)", color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.5,
          }}>
            No notifications yet. Click + to create one.
          </div>
        )}

        <div className="flex flex-col gap-3">
          {entries.map(entry => {
            const meta = platformMeta(entry.platform);
            return (
              <div key={entry.id} style={{ position: "relative", paddingBottom: 10 }}>
                <button type="button" onClick={() => openDetail(entry.id)} className="w-full text-left"
                  style={{
                    borderRadius: 8, overflow: "hidden", cursor: "pointer",
                    border: `1px solid ${PLATFORM_ACCENT_BORDER}`, background: "var(--app-shell-bg-subtle)",
                  }}>
                  <div style={{
                    padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
                    background: PLATFORM_ACCENT_BG, borderBottom: "1px solid var(--app-border-subtle)",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: "var(--app-shell-bg-accent-strong)",
                      display: "flex", alignItems: "center", justifyContent: "center", color: PLATFORM_ACCENT_SOFT,
                    }}>
                      <meta.Icon size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.name || "Untitled notification"}
                      </div>
                      <div style={{ color: "var(--app-text-secondary)", fontSize: 10, marginTop: 2 }}>{meta.label}</div>
                    </div>
                  </div>
                  <div style={{ padding: "10px 14px 14px" }}>
                    <div style={{ color: "var(--app-text-secondary)", fontSize: 11, lineHeight: 1.45, fontStyle: "italic" }}>
                      {rulePreview(entry)}
                    </div>
                    {entry.recipients.trim() && (
                      <div style={{ color: "var(--app-text-muted)", fontSize: 10, marginTop: 6 }}>
                        To: {entry.recipients}
                      </div>
                    )}
                  </div>
                </button>
                <div className="flex gap-2" style={{ position: "absolute", right: 10, bottom: 0 }}>
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
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Detail ── */
  if (view === "detail" && active) {
    const meta = platformMeta(active.platform);
    const rows: [string, string][] = [
      ["NAME", active.name || "—"],
      ["CHANNEL", meta.label],
      ["TRIGGER", triggerSummary(active)],
      ["RECIPIENTS", active.recipients || (active.associateWithUserAssignment ? "User assignment" : "—")],
      ["CONDITION", active.conditionSummary || "Always"],
      ["NULL AS ZERO", active.treatNullAsZero ? "Yes" : "No"],
      ["USER ASSIGNMENT", active.associateWithUserAssignment ? "Yes" : "No"],
    ];
    return (
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 24px 24px",
        scrollbarWidth: "thin", scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent",
      }}>
        <PageHeader
          title={active.name || "Details"}
          onBack={backToList}
          actions={
            <button type="button" onClick={() => openEdit(active.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
                border: `1px solid ${PLATFORM_ACCENT_BORDER}`, background: PLATFORM_ACCENT_BG,
                color: PLATFORM_ACCENT_TEXT_MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
              <Pencil size={12} /> Edit
            </button>
          }
        />
        <div style={{
          padding: "14px", borderRadius: 10, border: `1px solid ${PLATFORM_ACCENT_BORDER}`,
          background: "var(--app-shell-bg-subtle)",
        }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
            <meta.Icon size={16} style={{ color: PLATFORM_ACCENT_SOFT }} />
            <span style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 700 }}>{active.name || "Untitled"}</span>
          </div>
          <div style={{ color: "var(--app-text-secondary)", fontSize: 11, fontStyle: "italic", marginBottom: 14 }}>
            {rulePreview(active)}
          </div>
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3" style={{
              padding: "8px 0", borderTop: "1px solid var(--app-border-subtle)",
            }}>
              <span style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em" }}>{k}</span>
              <span style={{ color: "var(--app-text-body)", fontSize: 12, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Form ── */
  if (view === "form" && draft) {
    const canSave = Boolean(draft.name.trim()) && hasValidTrigger(draft);
    const stepIndex = STEPS.findIndex(s => s.id === step);
    const isLastStep = stepIndex === STEPS.length - 1;
    const goNext = () => {
      if (stepIndex < STEPS.length - 1) {
        setStep(STEPS[stepIndex + 1].id);
      }
    };
    const goBackStep = () => {
      if (stepIndex > 0) {
        setStep(STEPS[stepIndex - 1].id);
      }
    };
    const objectChoices = [
      { id: objectId, label: objectLabel, sub: "Current object" },
      { id: "related_parent", label: "Parent object", sub: "Related parent" },
      { id: "related_child", label: "Child object", sub: "Related child" },
    ];

    return (
      <div style={{
        flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
        padding: "18px 24px 0",
      }}>
        <div style={{ flexShrink: 0 }}>
          <PageHeader
            title={isNew ? "Create Notification" : "Edit Notification"}
            onBack={backToList}
          />
        </div>

        <div className="obj-adv-nav-scroll" style={{
          flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 24,
          scrollbarWidth: "thin",
          scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent",
        }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, alignItems: "start",
          marginBottom: 4,
        }}>
          <FormField label="Notification name" value={draft.name} required
            onChange={v => patchDraft({ name: v })} placeholder="e.g. Status change alert" />
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            marginTop: 22,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600 }}>Associate with user assignment</div>
              <div style={{ color: "var(--app-text-subtle)", fontSize: 10, marginTop: 2 }}>
                Route recipients from the assignment path
              </div>
            </div>
            <Toggle value={draft.associateWithUserAssignment}
              onChange={v => patchDraft({ associateWithUserAssignment: v })} />
          </div>
        </div>

        <div style={{
          marginTop: 8, marginBottom: 14, paddingTop: 14,
          borderTop: "1px solid var(--app-border)",
        }}>
        <div className="flex items-center" style={{ marginBottom: 0 }}>
          <div className="flex items-center" style={{ minWidth: 0, overflow: "hidden" }}>
            {STEPS.map((s, i) => {
              const activeStep = step === s.id;
              const done = i < stepIndex;
              return (
                <div key={s.id} className="flex items-center" style={{ flexShrink: 0 }}>
                  <button type="button" onClick={() => { setStep(s.id); setPicker(null); }}
                    className="flex items-center gap-2"
                    style={{
                      flexShrink: 0, padding: 0, border: "none", cursor: "pointer",
                      background: "transparent",
                    }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700,
                      background: activeStep ? "var(--app-accent)" : done ? "rgba(52,211,153,0.2)" : "var(--app-border-subtle)",
                      border: `1px solid ${activeStep ? "var(--app-accent-light)" : done ? "rgba(52,211,153,0.55)" : "var(--app-border-strong)"}`,
                      color: activeStep ? "#fff" : done ? "#6EE7B7" : "var(--app-text-muted)",
                    }}>
                      {done ? <Check size={11} /> : i + 1}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: activeStep ? 700 : 600, whiteSpace: "nowrap",
                      color: activeStep ? "var(--app-text-primary)" : done ? "var(--app-text-secondary)" : "var(--app-text-muted)",
                    }}>
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
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
                  color: canSave ? PLATFORM_ACCENT_TEXT_MUTED : "var(--app-text-subtle)",
                }}>
                <Check size={14} /> Save
              </button>
            )}
          </div>
        </div>
        </div>

            {step === "general" && (
              <>
            <div style={{
              marginBottom: 14, borderRadius: 10, overflow: "hidden",
              border: "1px solid var(--app-border)",
              background: "var(--app-shell-bg-subtle)",
            }}>
              <div style={{
                padding: "12px 14px 0",
                borderBottom: "1px solid var(--app-border)",
                background: "rgba(15,23,42,0.35)",
              }}>
                <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600 }}>Digital platforms</div>
                <div style={{ color: "var(--app-text-muted)", fontSize: 11, marginTop: 2, marginBottom: 10 }}>
                  Pick a platform — each one has its own configuration
                </div>
                <div className="flex" style={{ gap: 0, overflow: "hidden" }}>
                  {PLATFORMS.map(p => {
                    const selected = draft.platform === p.id;
                    return (
                      <button key={p.id} type="button" onClick={() => patchDraft({ platform: p.id })}
                        className="flex items-center gap-1.5"
                        style={{
                          flexShrink: 0, padding: "10px 14px", border: "none", cursor: "pointer",
                          fontSize: 11, fontWeight: 600, background: "transparent",
                          color: selected ? "var(--app-text-primary)" : "var(--app-text-muted)",
                          borderBottom: selected ? `2px solid ${PLATFORM_ACCENT}` : "2px solid transparent",
                          marginBottom: -1,
                        }}>
                        <p.Icon size={13} style={{ color: selected ? PLATFORM_ACCENT_SOFT : "var(--app-text-muted)" }} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ padding: "14px 14px 10px" }}>
            {draft.platform === "email" && (
              <>
                {!draft.associateWithUserAssignment ? (
                  <>
                    <ToRecipientsField
                      value={draft.recipients}
                      onChange={v => patchDraft({ recipients: v })}
                    />
                    <button type="button"
                      onClick={() => patchDraft({ showCcBcc: !draft.showCcBcc })}
                      style={{
                        background: "none", border: "none", color: "var(--app-accent-light)", fontSize: 11,
                        cursor: "pointer", padding: 0, marginBottom: draft.showCcBcc ? 8 : 14,
                      }}>
                      {draft.showCcBcc ? "Hide Cc / Bcc" : "Add Cc / Bcc"}
                    </button>
                    {draft.showCcBcc && (
                      <>
                        <FormField label="Cc" value={draft.cc} onChange={v => patchDraft({ cc: v })}
                          placeholder="Optional carbon copy" />
                        <FormField label="Bcc" value={draft.bcc} onChange={v => patchDraft({ bcc: v })}
                          placeholder="Optional blind copy" />
                      </>
                    )}
                  </>
                ) : (
                  <div style={{
                    marginBottom: 14, padding: "10px 12px", borderRadius: 8,
                    background: PLATFORM_NOTICE_BG, border: `1px solid ${PLATFORM_NOTICE_BORDER}`,
                    color: PLATFORM_NOTICE_TEXT, fontSize: 11, lineHeight: 1.45,
                  }}>
                    Recipients follow the user-assignment path for this object. Fixed To/Cc/Bcc are hidden.
                  </div>
                )}
                <FormField label="Subject" value={draft.subject} required
                  onChange={v => patchDraft({ subject: v })} placeholder="Email subject line" />
                <div style={{ marginBottom: 14 }}>
                  <div style={FIELD_LABEL}>From</div>
                  <div style={{ position: "relative" }}>
                    <select value={draft.fromProfile}
                      onChange={e => patchDraft({ fromProfile: e.target.value as "org" | "user" })}
                      style={{
                        ...INPUT, cursor: "pointer", appearance: "none",
                        WebkitAppearance: "none", MozAppearance: "none", paddingRight: 36,
                      }}>
                      <option value="org">Org profile</option>
                      <option value="user">User profile</option>
                    </select>
                    <ChevronDown size={14} style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      color: "var(--app-text-secondary)", pointerEvents: "none",
                    }} />
                  </div>
                </div>
                <TemplateLookupField
                  value={draft.templateName}
                  templateMode={draft.templateMode}
                  onSelect={name => patchDraft({ templateName: name })}
                  onCreate={(name, mode) => patchDraft({ templateName: name, templateMode: mode })}
                />
                <div className="flex items-center justify-between" style={{ marginTop: 4, marginBottom: 4 }}>
                  <span style={{ color: "var(--app-text-secondary)", fontSize: 11 }}>Attachments</span>
                  <button type="button"
                    onClick={() => patchDraft({ attachmentCount: draft.attachmentCount + 1 })}
                    className="flex items-center gap-2"
                    style={{
                      padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${PLATFORM_INFO_BORDER}`, background: PLATFORM_INFO_BG,
                      color: PLATFORM_INFO_TEXT, fontSize: 11, fontWeight: 600,
                    }}>
                    <Paperclip size={12} />
                    {draft.attachmentCount}
                  </button>
                </div>
              </>
            )}

            {draft.platform === "browser" && (
              <>
                {!draft.associateWithUserAssignment ? (
                  <ToRecipientsField
                    value={draft.recipients}
                    onChange={v => patchDraft({ recipients: v })}
                  />
                ) : (
                  <div style={{
                    marginBottom: 14, padding: "10px 12px", borderRadius: 8,
                    background: PLATFORM_NOTICE_BG, border: `1px solid ${PLATFORM_NOTICE_BORDER}`,
                    color: PLATFORM_NOTICE_TEXT, fontSize: 11, lineHeight: 1.45,
                  }}>
                    Recipients follow the user-assignment path for this object.
                  </div>
                )}
                <FormField label="Browser comments" value={draft.messageBody} required as="textarea"
                  onChange={v => patchDraft({ messageBody: v })}
                  placeholder="Enter browser comments" />
                <div style={{ marginBottom: 8 }}>
                  <div style={FIELD_LABEL}>Layout</div>
                  <div style={{ position: "relative" }}>
                    <select
                      value={draft.layoutName}
                      onChange={e => patchDraft({ layoutName: e.target.value })}
                      style={{
                        ...INPUT, cursor: "pointer", appearance: "none",
                        WebkitAppearance: "none", MozAppearance: "none", paddingRight: 36,
                      }}
                    >
                      <option value="">Select layout</option>
                      {LAYOUT_OPTIONS.map(l => (
                        <option key={l.id} value={l.label}>{l.label}</option>
                      ))}
                    </select>
                    <ChevronRight size={14} style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(90deg)",
                      color: "var(--app-text-secondary)", pointerEvents: "none",
                    }} />
                  </div>
                </div>
              </>
            )}

            {draft.platform === "push" && (
              <>
                {!draft.associateWithUserAssignment ? (
                  <ToRecipientsField
                    value={draft.recipients}
                    onChange={v => patchDraft({ recipients: v })}
                  />
                ) : (
                  <div style={{
                    marginBottom: 14, padding: "10px 12px", borderRadius: 8,
                    background: PLATFORM_NOTICE_BG, border: `1px solid ${PLATFORM_NOTICE_BORDER}`,
                    color: PLATFORM_NOTICE_TEXT, fontSize: 11, lineHeight: 1.45,
                  }}>
                    Recipients follow the user-assignment path for this object.
                  </div>
                )}
                <FormField label="Subject" value={draft.subject} required
                  onChange={v => patchDraft({ subject: v })}
                  placeholder="Push notification subject" />
                <div style={{ marginBottom: 8 }}>
                  <div style={FIELD_LABEL}>Notification actions</div>
                  <div className="flex gap-2" style={{ marginBottom: 8 }}>
                    <input value={newAction} onChange={e => setNewAction(e.target.value)}
                      placeholder="Add action label" style={{ ...INPUT, flex: 1 }} />
                    <button type="button" onClick={addAction}
                      style={{
                        width: 36, borderRadius: 8, border: "1px solid rgba(99,102,241,0.4)",
                        background: "rgba(99,102,241,0.15)", color: "var(--app-text-accent-muted)", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {draft.notificationActions.map((a, i) => (
                      <span key={`${a}-${i}`} className="flex items-center gap-1" style={{
                        padding: "3px 8px", borderRadius: 999, fontSize: 11,
                        background: "var(--app-border-subtle)", color: "var(--app-text-body)",
                      }}>
                        {a}
                        <button type="button"
                          onClick={() => patchDraft({
                            notificationActions: draft.notificationActions.filter((_, idx) => idx !== i),
                          })}
                          style={{ background: "none", border: "none", color: "var(--app-text-secondary)", cursor: "pointer", padding: 0 }}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {draft.platform === "googleChat" && (
              <>
                {!draft.associateWithUserAssignment ? (
                  <ToRecipientsField
                    value={draft.recipients}
                    onChange={v => patchDraft({ recipients: v })}
                  />
                ) : (
                  <div style={{
                    marginBottom: 14, padding: "10px 12px", borderRadius: 8,
                    background: PLATFORM_NOTICE_BG, border: `1px solid ${PLATFORM_NOTICE_BORDER}`,
                    color: PLATFORM_NOTICE_TEXT, fontSize: 11, lineHeight: 1.45,
                  }}>
                    Recipients follow the user-assignment path for this object.
                  </div>
                )}
                <div style={{ marginBottom: 14 }}>
                  <div style={FIELD_LABEL}>From</div>
                  <div style={{ position: "relative" }}>
                    <select value={draft.fromProfile}
                      onChange={e => patchDraft({ fromProfile: e.target.value as "org" | "user" })}
                      style={{
                        ...INPUT, cursor: "pointer", appearance: "none",
                        WebkitAppearance: "none", MozAppearance: "none", paddingRight: 36,
                      }}>
                      <option value="org">Org profile</option>
                      <option value="user">User profile</option>
                    </select>
                    <ChevronDown size={14} style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      color: "var(--app-text-secondary)", pointerEvents: "none",
                    }} />
                  </div>
                </div>
                <FormField label="Message" value={draft.messageBody} required as="textarea"
                  onChange={v => patchDraft({ messageBody: v })}
                  placeholder="Chat message body" />
                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                  <span style={{ color: "var(--app-text-secondary)", fontSize: 11 }}>Attachments</span>
                  <button type="button"
                    onClick={() => patchDraft({ attachmentCount: draft.attachmentCount + 1 })}
                    className="flex items-center gap-2"
                    style={{
                      padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${PLATFORM_ACCENT_BORDER}`, background: PLATFORM_ACCENT_BG,
                      color: PLATFORM_ACCENT_TEXT_MUTED, fontSize: 11, fontWeight: 600,
                    }}>
                    <Paperclip size={12} />
                    {draft.attachmentCount}
                  </button>
                </div>
              </>
            )}

            {draft.platform === "whatsapp" && (
              <>
                {!draft.associateWithUserAssignment ? (
                  <ToRecipientsField
                    value={draft.recipients}
                    onChange={v => patchDraft({ recipients: v })}
                  />
                ) : (
                  <div style={{
                    marginBottom: 14, padding: "10px 12px", borderRadius: 8,
                    background: PLATFORM_NOTICE_BG, border: `1px solid ${PLATFORM_NOTICE_BORDER}`,
                    color: PLATFORM_NOTICE_TEXT, fontSize: 11, lineHeight: 1.45,
                  }}>
                    Recipients follow the user-assignment path for this object.
                  </div>
                )}
                <FormField label="Template name" value={draft.templateName} required
                  onChange={v => patchDraft({ templateName: v })}
                  placeholder="Select WhatsApp template" />
                <div className="flex items-center justify-between gap-3" style={{
                  padding: "12px 12px", borderRadius: 8, marginBottom: 4,
                  border: `1px solid ${PLATFORM_ACCENT_BORDER}`, background: PLATFORM_ACCENT_BG,
                }}>
                  <div>
                    <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600 }}>Attachment configuration</div>
                    <div style={{ color: "var(--app-text-muted)", fontSize: 10, marginTop: 2 }}>
                      Customize header and body parameters
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => patchDraft({ whatsappParamsConfigured: !draft.whatsappParamsConfigured })}
                    style={{
                      padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600,
                      border: `1px solid ${draft.whatsappParamsConfigured ? "var(--app-border-accent-strong)" : PLATFORM_ACCENT_BORDER}`,
                      background: draft.whatsappParamsConfigured ? "var(--app-shell-bg-accent-strong)" : PLATFORM_ACCENT_BG,
                      color: PLATFORM_ACCENT_TEXT_MUTED,
                    }}>
                    {draft.whatsappParamsConfigured ? "Configured" : "Configure"}
                  </button>
                </div>
              </>
            )}
              </div>
            </div>
          </>
        )}

        {step === "objects" && (
          <SectionCard title="Linked objects" subtitle="Choose which objects this notification applies to">
            <div className="grid grid-cols-3 gap-2">
              {objectChoices.map(obj => {
                const on = draft.linkedObjectIds.includes(obj.id);
                return (
                  <button key={obj.id} type="button" onClick={() => toggleLinkedObject(obj.id)}
                    style={{
                      padding: "14px 8px", borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${on ? "rgba(99,102,241,0.7)" : "var(--app-border)"}`,
                      background: on ? "rgba(99,102,241,0.18)" : "var(--app-shell-bg-subtle)",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: on ? "var(--app-border-accent)" : "var(--app-border-subtle)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: on ? "var(--app-text-accent-muted)" : "var(--app-text-muted)",
                    }}>
                      <Box size={16} />
                    </div>
                    <span style={{
                      color: on ? "var(--app-text-primary)" : "var(--app-text-secondary)", fontSize: 11, fontWeight: 600, textAlign: "center",
                    }}>
                      {obj.label}
                    </span>
                    <span style={{ color: "var(--app-text-subtle)", fontSize: 9, textAlign: "center" }}>{obj.sub}</span>
                  </button>
                );
              })}
            </div>
            {draft.linkedObjectIds.length === 0 && (
              <div style={{ color: "var(--app-text-danger)", fontSize: 11, marginTop: 10 }}>Select at least one object.</div>
            )}
          </SectionCard>
        )}

        {step === "trigger" && (
          <SectionCard title="Notification trigger" subtitle="Choose process flow scheduling or a record event">
            <div style={FIELD_LABEL}>Trigger type</div>
            <div className="grid grid-cols-2 gap-2" style={{ marginBottom: 16 }}>
              {([
                ["processFlow", "Process flow", GitBranch],
                ["events", "Events", Zap],
              ] as const).map(([id, label, Icon]) => {
                const on = draft.triggerSource === id;
                return (
                  <button key={id} type="button"
                    onClick={() => patchDraft({ triggerSource: id as NotificationTriggerSource })}
                    style={{
                      padding: "12px 10px", borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${on ? "rgba(99,102,241,0.7)" : "var(--app-border)"}`,
                      background: on ? "rgba(99,102,241,0.18)" : "var(--app-shell-bg-subtle)",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                    <Icon size={15} style={{ color: on ? "var(--app-text-accent-muted)" : "var(--app-text-muted)" }} />
                    <span style={{ color: on ? "var(--app-text-primary)" : "var(--app-text-secondary)", fontSize: 12, fontWeight: 600 }}>{label}</span>
                  </button>
                );
              })}
            </div>

            {draft.triggerSource === "processFlow" && (
              <>
                <div className="flex items-center justify-between gap-3" style={{
                  marginBottom: draft.enableScheduler ? 14 : 0, padding: "10px 0",
                  borderTop: "1px solid var(--app-border-subtle)",
                }}>
                  <div>
                    <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600 }}>Enable Scheduler</div>
                    <div style={{ color: "var(--app-text-subtle)", fontSize: 10, marginTop: 2 }}>
                      Run this notification on a schedule
                    </div>
                  </div>
                  <Toggle value={draft.enableScheduler}
                    onChange={v => patchDraft({ enableScheduler: v })} />
                </div>

                {draft.enableScheduler && (
                  <>
                    <div style={FIELD_LABEL}>Schedule</div>
                    <div className="flex gap-4" style={{ marginBottom: 14 }}>
                      <Radio label="Once" checked={draft.scheduleFrequency === "once"}
                        onChange={() => patchDraft({ scheduleFrequency: "once" as NotificationScheduleFrequency })} />
                      <Radio label="Recurring" checked={draft.scheduleFrequency === "recurring"}
                        onChange={() => patchDraft({ scheduleFrequency: "recurring" as NotificationScheduleFrequency })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div style={FIELD_LABEL}>Start date <span style={{ color: "var(--app-text-danger)" }}>*</span></div>
                        <input type="date" value={draft.startDate}
                          onChange={e => patchDraft({ startDate: e.target.value })} style={INPUT} />
                      </div>
                      <div>
                        <div style={FIELD_LABEL}>Start time <span style={{ color: "var(--app-text-danger)" }}>*</span></div>
                        <input type="time" value={draft.startTime}
                          onChange={e => patchDraft({ startTime: e.target.value })} style={INPUT} />
                      </div>
                    </div>
                    {draft.scheduleFrequency === "recurring" && (
                      <>
                        <div className="grid grid-cols-2 gap-3" style={{ marginTop: 12 }}>
                          <div>
                            <div style={FIELD_LABEL}>End date <span style={{ color: "var(--app-text-danger)" }}>*</span></div>
                            <input type="date" value={draft.endDate}
                              onChange={e => patchDraft({ endDate: e.target.value })} style={INPUT} />
                          </div>
                          <div>
                            <div style={FIELD_LABEL}>End time <span style={{ color: "var(--app-text-danger)" }}>*</span></div>
                            <input type="time" value={draft.endTime}
                              onChange={e => patchDraft({ endTime: e.target.value })} style={INPUT} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3" style={{ marginTop: 12 }}>
                          <div>
                            <div style={FIELD_LABEL}>Interval <span style={{ color: "var(--app-text-danger)" }}>*</span></div>
                            <input type="number" min={1} value={draft.intervalValue}
                              onChange={e => patchDraft({ intervalValue: e.target.value })}
                              placeholder="e.g. 1" style={INPUT} />
                          </div>
                          <div>
                            <div style={FIELD_LABEL}>Interval unit</div>
                            <select value={draft.intervalUnit}
                              onChange={e => patchDraft({
                                intervalUnit: e.target.value as NotificationEntry["intervalUnit"],
                              })}
                              style={{ ...INPUT, cursor: "pointer" }}>
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                              <option value="days">Days</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {draft.triggerSource === "events" && (
              <>
                <div style={{
                  ...FIELD_LABEL, borderTop: "1px solid var(--app-border-subtle)", paddingTop: 12,
                }}>
                  Event
                </div>
                <div className="flex flex-col gap-1" style={{ marginBottom: 4 }}>
                  {RECORD_EVENTS.map(ev => (
                    <Radio
                      key={ev.id}
                      block
                      label={ev.label}
                      checked={draft.recordEvent === ev.id}
                      onChange={() => patchDraft({ recordEvent: ev.id })}
                    />
                  ))}
                </div>
                {draft.recordEvent === "createdAndEditedMeetCriteria" && (
                  <div style={{
                    marginTop: 10, padding: "10px 12px", borderRadius: 8,
                    border: "1px solid rgba(99,102,241,0.35)", background: "var(--app-shell-bg-accent)",
                  }}>
                    <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      When should this notification trigger?
                    </div>
                    <div style={{ color: "var(--app-text-secondary)", fontSize: 11, lineHeight: 1.45, marginBottom: 10 }}>
                      This event needs criteria. Define the conditions that must be met.
                    </div>
                    <button type="button" onClick={() => setStep("conditions")}
                      style={{
                        padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: "var(--app-accent)", color: "var(--app-text-on-accent)",
                        fontSize: 11, fontWeight: 600,
                      }}>
                      Define criteria
                    </button>
                  </div>
                )}
              </>
            )}
          </SectionCard>
        )}

        {step === "conditions" && (
          <SectionCard title="Conditions" subtitle="Notify when these business rules are satisfied">
            <div className="flex items-center justify-between gap-3" style={{ marginBottom: 14 }}>
              <div>
                <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600 }}>Treat null as zero</div>
                <div style={{ color: "var(--app-text-subtle)", fontSize: 10, marginTop: 2 }}>
                  Treat null numeric values as 0 in criteria evaluation
                </div>
              </div>
              <Toggle value={draft.treatNullAsZero}
                onChange={v => patchDraft({ treatNullAsZero: v })} />
            </div>

            <CriteriaBuilder
              embedded
              tokens={draft.criteriaTokens}
              fields={fields}
              intentLabel="Trigger this notification when"
              onChange={(tokens, expression) => patchDraft({
                criteriaTokens: tokens,
                conditionSummary: expression,
              })}
            />
          </SectionCard>
        )}
        </div>
      </div>
    );
  }

  return null;
}
