import React, { useState, useMemo, useEffect } from "react";

import {
  ArrowLeft, AlignLeft, Calendar, Check, Filter, GitBranch, Globe, Hash, Layers,
  Link2, Lock, Paperclip, Pencil, RotateCcw, Settings2, Zap,
} from "lucide-react";
import {
  type ObjectSettings,
  type ObjAdvSection,
  type ObjectIdentityContext,
  type SettingsFieldRef,
  type WizardObjectType,
  DEFERRED_SETTINGS_SLICES,
  MOCK_DATA_CONNECTIONS,
  getSuggestedSettings,
  defaultObjectSettings,
} from "../types/object-settings";
import { CalendarSettingsPanel } from "./calendar-settings-panel";
import { ConstraintsSettingsPanel } from "./constraints-settings-panel";
import { NotificationSettingsPanel } from "./notification-settings-panel";
import { FileManagerSettingsPanel } from "./file-manager-settings-panel";

const INPUT: React.CSSProperties = {
  width: "100%", background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border-strong)",
  borderRadius: 8, padding: "8px 11px", color: "var(--app-text-primary)", fontSize: 13, outline: "none",
  transition: "border-color 0.2s", fontFamily: "inherit",
};

const FIELD_LABEL: React.CSSProperties = {
  color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8, display: "block",
};

/** Stable outside the panel so checkbox toggles do not remount and reset scroll. */
function FieldMultiSelect({ label, selectedIds, onToggle, options, emptyHint }: {
  label: string;
  selectedIds: string[];
  onToggle: (id: string) => void;
  options: SettingsFieldRef[];
  emptyHint: string;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={FIELD_LABEL}>{label}</div>
      {options.length === 0 && <div style={{ color: "var(--app-text-subtle)", fontSize: 11 }}>{emptyHint}</div>}
      {options.map(f => {
        const selected = selectedIds.includes(f.id);
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onToggle(f.id)}
            aria-pressed={selected}
            className="flex items-center gap-2 w-full px-2 py-2 rounded-md mb-1"
            style={{
              background: selected ? "var(--app-shell-bg-accent-strong)" : "var(--app-shell-bg-subtle)",
              border: `1px solid ${selected ? "var(--app-border-accent)" : "var(--app-border)"}`,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 14, height: 14, flexShrink: 0, borderRadius: 3,
                border: `1.5px solid ${selected ? "var(--app-accent)" : "var(--app-text-subtle)"}`,
                background: selected ? "var(--app-accent)" : "transparent",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {selected && <Check size={9} strokeWidth={3} style={{ color: "var(--app-text-on-accent)" }} />}
            </span>
            <span style={{ color: "var(--app-text-body)", fontSize: 12, flex: 1 }}>{f.label}</span>
            <span style={{ color: "var(--app-text-muted)", fontSize: 10 }}>{f.fieldType}</span>
          </button>
        );
      })}
    </div>
  );
}

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
    <button type="button" onClick={onChange} className="flex items-center gap-2" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, border: `2px solid ${checked ? "var(--app-accent)" : "rgba(255,255,255,0.3)"}`, background: checked ? "var(--app-accent)" : "transparent", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {checked && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--app-text-on-accent)" }} />}
      </div>
      <span style={{ color: checked ? "var(--app-text-primary)" : "var(--app-text-secondary)", fontSize: 13, transition: "color 0.15s" }}>{label}</span>
    </button>
  );
}

function DeferredNotice({ text }: { text: string }) {
  return (
    <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.22)" }}>
      <div style={{ color: "#FCD34D", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>COMING IN LATER SLICE</div>
      <div style={{ color: "var(--app-text-secondary)", fontSize: 11, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

const OBJ_ADV_NAV: { id: ObjAdvSection; icon: React.ElementType; label: string }[] = [
  { id: "primary",        icon: Pencil,     label: "Primary Info"   },
  { id: "calendar",       icon: Calendar,   label: "Calendar"       },
  { id: "constraints",    icon: Lock,       label: "Constraints"    },
  { id: "addinfo",        icon: AlignLeft,  label: "Add Info"       },
  { id: "notification",   icon: Zap,        label: "Notification"   },
  { id: "dataprovider",   icon: Link2,      label: "Data Provider"  },
  { id: "filemanager",    icon: Paperclip,  label: "File Manager"   },
  { id: "places",         icon: Globe,      label: "Places"         },
  { id: "fieldtracking",  icon: GitBranch,  label: "Field Tracking" },
  { id: "autoassignment", icon: Filter,     label: "Auto Assign"    },
  { id: "compositekey",   icon: Hash,       label: "Composite Key"  },
  { id: "fieldupdate",    icon: RotateCcw,  label: "Field Update"   },
  { id: "questionnaire",  icon: Layers,     label: "Questionnaire"  },
];

/** Grouped navigation for progressive disclosure in the object wizard. */
export const OBJ_ADV_NAV_GROUPS: { label: string; sections: ObjAdvSection[] }[] = [
  { label: "Data & records", sections: ["addinfo", "fieldtracking", "compositekey", "constraints"] },
  { label: "Automation", sections: ["notification", "calendar", "fieldupdate", "autoassignment"] },
  { label: "Integrations", sections: ["dataprovider", "filemanager", "places"] },
  { label: "Type-specific", sections: ["questionnaire"] },
];

export const OBJ_ADV_SECTION_DESC: Record<ObjAdvSection, string> = {
  primary: "Label, API name, and type for the record identifier.",
  calendar: "Schedule views and events tied to date fields on this object.",
  constraints: "Validation rules that must pass before a record can be saved.",
  addinfo: "Notes, attachments, sharing, mobile, and record history options.",
  notification: "Email, push, and in-app alerts when records change.",
  dataprovider: "Connect to external web services or sync inbound/outbound data.",
  filemanager: "Attachment and document upload rules for this object.",
  places: "Geolocation capture and map display for location fields.",
  fieldtracking: "Audit who created, modified, or deleted records.",
  autoassignment: "Automatically route new records to users.",
  compositekey: "Unique combinations of fields that identify a record.",
  fieldupdate: "Automatically set field values when records are created or updated.",
  questionnaire: "Multi-step survey behaviour for questionnaire objects.",
};

export function isObjAdvSectionConfigured(settings: ObjectSettings, section: ObjAdvSection): boolean {
  switch (section) {
    case "primary":
      return false;
    case "calendar":
      return settings.calendar.entries.length > 0;
    case "constraints":
      return Boolean(
        settings.constraints.constraintName?.trim()
        || settings.constraints.enableCriteria
        || settings.constraints.enableResultCount,
      );
    case "addinfo": {
      // Only mark configured when the user changes something from defaults
      // (Store is on by default and must not show a green dot on its own).
      const defaults = defaultObjectSettings().addInfo;
      return (Object.keys(settings.addInfo) as (keyof ObjectSettings["addInfo"])[]).some(
        key => settings.addInfo[key] !== defaults[key],
      );
    }
    case "notification":
      return settings.notification.entries.length > 0;
    case "dataprovider":
      return settings.dataProvider.enabled;
    case "filemanager":
      return settings.fileManager.attachment.extensions.length > 0
        || Boolean(settings.fileManager.document.documentName?.trim())
        || settings.fileManager.document.extensions.length > 0;
    case "places":
      return settings.places.enableGeo;
    case "fieldtracking":
      return settings.fieldTracking.trackCreated
        || settings.fieldTracking.trackModified
        || settings.fieldTracking.trackDeleted
        || settings.fieldTracking.logHistory;
    case "autoassignment":
      return settings.autoAssignment.enabled;
    case "compositekey":
      return settings.compositeKey.enabled;
    case "fieldupdate":
      return settings.fieldUpdate.enabled;
    case "questionnaire":
      return settings.questionnaire.enabled;
    default:
      return false;
  }
}

export type PrimaryFieldTypeOption = "Text" | "Auto number";

export interface PrimaryFieldEditorProps {
  label: string;
  name: string;
  fieldType: PrimaryFieldTypeOption;
  fieldTracking: boolean;
  onLabelChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onFieldTypeChange: (value: PrimaryFieldTypeOption) => void;
  onFieldTrackingChange: (value: boolean) => void;
}

/** Left nav width — 10% wider than the original 190px so labels breathe; config takes the rest. */
export const OBJ_ADV_NAV_WIDTH = Math.round(190 * 1.1) + 16; // ~225 — room for icon alignment with wizard back

/** Left inset so nav icons share a vertical axis with the Create Object wizard back control (px-8 → 32px). */
export const OBJ_ADV_NAV_ICON_INSET = 30;

export interface ObjectAdvancedPanelProps {
  settings: ObjectSettings;
  onChange: (settings: ObjectSettings) => void;
  onBack: () => void;
  objectType: WizardObjectType;
  fields?: SettingsFieldRef[];
  identityContext?: ObjectIdentityContext;
  primaryField?: PrimaryFieldEditorProps;
  onPluralManualEdit?: () => void;
  initialSection?: ObjAdvSection;
  hideBack?: boolean;
  /** Hide the entire top chrome (back + title). Keeps panel height; content fills from the top. */
  hideHeader?: boolean;
  title?: string;
  /** Controlled active section (wizard provides external nav). */
  controlledActive?: ObjAdvSection;
  onActiveChange?: (section: ObjAdvSection) => void;
  /** Hide internal left nav — parent renders section picker. */
  hideNav?: boolean;
  /** Omit sections from nav (e.g. primary when configured elsewhere). */
  excludeSections?: ObjAdvSection[];
  /** Collapse nav into labelled groups. */
  groupedNav?: boolean;
  /** Render only the scrollable content pane (no nav, no header). */
  contentOnly?: boolean;
}

export function ObjectAdvancedPanel({
  settings,
  onChange,
  onBack,
  objectType,
  fields = [],
  identityContext,
  primaryField,
  onPluralManualEdit: _onPluralManualEdit,
  initialSection = "primary",
  hideBack = false,
  hideHeader = false,
  title = "Advanced Settings",
  controlledActive,
  onActiveChange,
  hideNav = false,
  excludeSections = [],
  groupedNav = false,
  contentOnly = false,
}: ObjectAdvancedPanelProps) {
  const [active, setActive] = useState<ObjAdvSection>(controlledActive ?? initialSection);

  useEffect(() => {
    if (controlledActive) setActive(controlledActive);
  }, [controlledActive]);

  useEffect(() => {
    if (initialSection && !controlledActive) setActive(initialSection);
  }, [initialSection, controlledActive]);

  const selectSection = (section: ObjAdvSection) => {
    if (controlledActive === undefined) setActive(section);
    onActiveChange?.(section);
  };

  const visibleNav = useMemo(
    () => OBJ_ADV_NAV.filter(item => !excludeSections.includes(item.id)),
    [excludeSections],
  );

  const patch = (partial: Partial<ObjectSettings>) => {
    onChange({ ...settings, ...partial } as ObjectSettings);
  };

  const patchSection = <K extends keyof ObjectSettings>(key: K, partial: Partial<ObjectSettings[K]>) => {
    onChange({ ...settings, [key]: { ...settings[key], ...partial } });
  };

  const dateFields = useMemo(
    () => fields.filter(f => f.fieldType === "Date Picker" || f.fieldType === "Date & Time" || f.fieldType === "Date"),
    [fields],
  );
  const textFields = useMemo(() => fields.filter(f => !f.isPrimary), [fields]);
  const lookupFields = useMemo(
    () => fields.filter(f => f.fieldType === "Lookup" || f.fieldType === "Master Details"),
    [fields],
  );
  const geoFields = useMemo(() => fields.filter(f => f.fieldType === "Geolocation"), [fields]);
  const nonPrimaryFields = useMemo(() => fields.filter(f => !f.isPrimary), [fields]);
  const suggestions = useMemo(() => getSuggestedSettings(objectType, fields), [objectType, fields]);

  const Inp = ({ label, value, onChange: onInp, placeholder, type = "text" }: {
    label: string; value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string; type?: string;
  }) => (
    <div className="mb-3.5">
      <div style={FIELD_LABEL}>{label}</div>
      <input style={INPUT} type={type} value={value} onChange={onInp} placeholder={placeholder} />
    </div>
  );

  const TRow = ({ label, sub, value, onChange: onToggle }: {
    label: string; sub?: string; value: boolean; onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-2.5"
      style={{ borderBottom: "1px solid var(--app-shell-bg-input)" }}>
      <div>
        <div style={{ color: "var(--app-text-body)", fontSize: 12 }}>{label}</div>
        {sub && <div style={{ color: "var(--app-text-subtle)", fontSize: 10, marginTop: 1 }}>{sub}</div>}
      </div>
      <Toggle value={value} onChange={onToggle} />
    </div>
  );

  const SectionTitle = ({ desc }: { desc: string }) => (
    <div style={{ color: "var(--app-text-subtle)", fontSize: 11, lineHeight: 1.5, marginBottom: 14 }}>{desc}</div>
  );

  const FieldSelect = ({ label, value, onSelect, options, emptyHint }: {
    label: string; value?: string;
    onSelect: (id: string) => void;
    options: SettingsFieldRef[];
    emptyHint: string;
  }) => (
    <div className="mb-3.5">
      <div style={FIELD_LABEL}>{label}</div>
      <select style={INPUT} value={value ?? ""} onChange={e => onSelect(e.target.value)}>
        <option value="">Select field…</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.label} ({o.fieldType})</option>
        ))}
      </select>
      {options.length === 0 && (
        <div className="mt-1.5 text-xs text-muted-foreground">{emptyHint}</div>
      )}
    </div>
  );

  const toggleCompositeField = (fieldId: string) => {
    const ids = settings.compositeKey.fieldIds;
    const next = ids.includes(fieldId) ? ids.filter(id => id !== fieldId) : [...ids, fieldId];
    patchSection("compositeKey", { fieldIds: next });
  };

  const toggleMultiField = (
    key: "fieldTracking",
    fieldKey: "trackedFieldIds",
    fieldId: string,
  ) => {
    const ids = settings[key][fieldKey] as string[];
    const next = ids.includes(fieldId) ? ids.filter(id => id !== fieldId) : [...ids, fieldId];
    patchSection(key, { [fieldKey]: next });
  };

  const renderContent = () => {
    switch (active) {
      case "primary":
        return (
          <>
            {primaryField ? (
              <>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 8,
                }}>
                  <Inp
                    label="LABEL"
                    value={primaryField.label}
                    onChange={e => primaryField.onLabelChange(e.target.value)}
                    placeholder="e.g. Name, ID, Title"
                  />
                  <Inp
                    label="NAME"
                    value={primaryField.name}
                    onChange={e => primaryField.onNameChange(e.target.value)}
                    placeholder="e.g. name"
                  />
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>
                      FIELD TYPE
                    </div>
                    <div className="flex items-center gap-5 flex-wrap">
                      {(["Text", "Auto number"] as const).map(t => (
                        <Radio
                          key={t}
                          label={t}
                          checked={primaryField.fieldType === t}
                          onChange={() => primaryField.onFieldTypeChange(t)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <TRow
                      label="Field Tracking"
                      value={primaryField.fieldTracking}
                      onChange={primaryField.onFieldTrackingChange}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.5 }}>
                Primary field is configured in the object creation flow.
              </div>
            )}
          </>
        );
      case "calendar":
        return (
          <CalendarSettingsPanel
            entries={settings.calendar.entries}
            onChange={entries => patchSection("calendar", { entries })}
            fields={fields}
          />
        );
      case "constraints":
        return (
          <ConstraintsSettingsPanel
            settings={settings.constraints}
            onChange={next => patchSection("constraints", next)}
            fields={fields}
          />
        );
      case "addinfo":
        return (
          <>
            <TRow label="Is Store Enable" value={settings.addInfo.isStoreEnable}
              onChange={v => patchSection("addInfo", { isStoreEnable: v })} />
            <TRow label="Track Record History" value={settings.addInfo.trackRecordHistory}
              onChange={v => patchSection("addInfo", { trackRecordHistory: v })} />
            <TRow label="Enable Report" value={settings.addInfo.enableReport}
              onChange={v => patchSection("addInfo", { enableReport: v })} />
            <TRow label="Add Notes & Attachments" value={settings.addInfo.addNotesAndAttachments}
              onChange={v => patchSection("addInfo", { addNotesAndAttachments: v })} />
            <TRow label="Allow Cross Application Sharing" value={settings.addInfo.allowCrossApplicationSharing}
              onChange={v => patchSection("addInfo", { allowCrossApplicationSharing: v })} />
            <TRow label="Allow Record Sharing" value={settings.addInfo.allowRecordSharing}
              onChange={v => patchSection("addInfo", { allowRecordSharing: v })} />
            <TRow label="Is Mobile Enabled" value={settings.addInfo.isMobileEnabled}
              onChange={v => patchSection("addInfo", { isMobileEnabled: v })} />
          </>
        );
      case "notification":
        return (
          <NotificationSettingsPanel
            entries={settings.notification.entries}
            onChange={next => patchSection("notification", { entries: next })}
            fields={fields}
            objectLabel={identityContext?.displayName || "This object"}
            objectId={identityContext?.apiName || "current"}
          />
        );
      case "dataprovider":
        return (
          <>
            <SectionTitle desc="Connect to external data — WSDP, inbound, or outbound (§5.11)." />
            <TRow label="Enable External Provider" value={settings.dataProvider.enabled} onChange={v => patchSection("dataProvider", { enabled: v })} sub="Fetch or sync data from a remote source" />
            {settings.dataProvider.enabled && (
              <>
                <div style={{ paddingTop: 14 }}>
                  <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>PROVIDER TYPE</div>
                  <div className="flex flex-wrap gap-4">
                    {(["wsdp", "inbound", "outbound"] as const).map(v => (
                      <Radio key={v} label={v === "wsdp" ? "Web Service" : v[0].toUpperCase() + v.slice(1)}
                        checked={settings.dataProvider.providerType === v}
                        onChange={() => patchSection("dataProvider", { providerType: v, onTheFlyRetrieval: v === "wsdp" })} />
                    ))}
                  </div>
                </div>
                <div className="mb-3.5">
                  <div style={{ ...FIELD_LABEL, textTransform: "uppercase", letterSpacing: "0.06em" }}>Connection</div>
                  <select style={INPUT} value={settings.dataProvider.connectionId} onChange={e => patchSection("dataProvider", { connectionId: e.target.value })}>
                    <option value="">Select connection…</option>
                    {MOCK_DATA_CONNECTIONS.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <Inp label="DATA OBJECT NAME" value={settings.dataProvider.dataObjectName}
                  onChange={e => patchSection("dataProvider", { dataObjectName: e.target.value })} placeholder="e.g. EmployeeFeed" />
                {settings.dataProvider.providerType === "wsdp" && (
                  <TRow label="On-the-fly Retrieval" value={settings.dataProvider.onTheFlyRetrieval}
                    onChange={v => patchSection("dataProvider", { onTheFlyRetrieval: v })} sub="Fetch without staging table (§4.7)" />
                )}
                <TRow label="Sync on Load" value={settings.dataProvider.syncOnLoad} onChange={v => patchSection("dataProvider", { syncOnLoad: v })} sub="Refresh data each page load" />
                <TRow label="Cache Results" value={settings.dataProvider.cacheResults} onChange={v => patchSection("dataProvider", { cacheResults: v })} sub="Store results for faster access" />
              </>
            )}
            <DeferredNotice text={DEFERRED_SETTINGS_SLICES.wsdpMapping} />
          </>
        );
      case "filemanager":
        return (
          <FileManagerSettingsPanel
            settings={settings.fileManager}
            onChange={next => patchSection("fileManager", next)}
          />
        );
      case "places":
        return (
          <>
            <SectionTitle desc="Geolocation and map features tied to Geolocation fields." />
            <TRow label="Enable Geolocation" value={settings.places.enableGeo} onChange={v => patchSection("places", { enableGeo: v })} sub="Capture lat / lng on records" />
            <TRow label="Auto-detect Location" value={settings.places.autoDetect} onChange={v => patchSection("places", { autoDetect: v })} sub="Use browser geolocation API" />
            <TRow label="Show Map View" value={settings.places.showMap} onChange={v => patchSection("places", { showMap: v })} sub="Display records on a map" />
            {settings.places.enableGeo && (
              <>
                <FieldSelect label="GEOLOCATION FIELD" value={settings.places.geolocationFieldId}
                  onSelect={id => patchSection("places", { geolocationFieldId: id || undefined })}
                  options={geoFields} emptyHint="Add a Geolocation field on step 2." />
                <Inp label="DEFAULT MAP ZOOM (1–20)" value={settings.places.defaultMapZoom} type="number"
                  onChange={e => patchSection("places", { defaultMapZoom: Math.min(20, Math.max(1, Number(e.target.value) || 12)) })} placeholder="12" />
              </>
            )}
          </>
        );
      case "fieldtracking":
        return (
          <>
            <SectionTitle desc="Audit who created, modified, or deleted records." />
            <TRow label="Track Created By" value={settings.fieldTracking.trackCreated} onChange={v => patchSection("fieldTracking", { trackCreated: v })} sub="Store the creator of each record" />
            <TRow label="Track Modified By" value={settings.fieldTracking.trackModified} onChange={v => patchSection("fieldTracking", { trackModified: v })} sub="Store who last edited a record" />
            <TRow label="Track Deleted By" value={settings.fieldTracking.trackDeleted} onChange={v => patchSection("fieldTracking", { trackDeleted: v })} sub="Store who deleted a record" />
            <TRow label="Log Field History" value={settings.fieldTracking.logHistory} onChange={v => patchSection("fieldTracking", { logHistory: v })} sub="Keep a changelog per field per record" />
            {settings.fieldTracking.logHistory && (
              <>
                <FieldMultiSelect label="TRACKED FIELDS (OPTIONAL — ALL IF EMPTY)" selectedIds={settings.fieldTracking.trackedFieldIds}
                  onToggle={id => toggleMultiField("fieldTracking", "trackedFieldIds", id)}
                  options={nonPrimaryFields} emptyHint="Add fields on step 2 to limit audit scope." />
                <Inp label="RETENTION DAYS (OPTIONAL)" value={settings.fieldTracking.retentionDays ?? ""} type="number"
                  onChange={e => patchSection("fieldTracking", { retentionDays: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="e.g. 365" />
              </>
            )}
          </>
        );
      case "autoassignment":
        return (
          <>
            <SectionTitle desc="Automatically assign records to users (Records Assignment)." />
            <TRow label="Enable Auto Assignment" value={settings.autoAssignment.enabled} onChange={v => patchSection("autoAssignment", { enabled: v })} sub="Turn on automatic assignment" />
            {settings.autoAssignment.enabled && (
              <>
                <div style={{ paddingTop: 14 }}>
                  <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>ASSIGNMENT MODE</div>
                  <div className="flex flex-col gap-3">
                    {([["roundRobin", "Round Robin"], ["capacityBased", "Capacity Based"], ["manualDefault", "Manual Default"]] as const).map(([v, label]) => (
                      <Radio key={v} label={label} checked={settings.autoAssignment.assignmentMode === v}
                        onChange={() => patchSection("autoAssignment", { assignmentMode: v })} />
                    ))}
                  </div>
                </div>
                <FieldSelect label="ASSIGNEE LOOKUP FIELD" value={settings.autoAssignment.assigneeLookupFieldId}
                  onSelect={id => patchSection("autoAssignment", { assigneeLookupFieldId: id || undefined })}
                  options={lookupFields} emptyHint="Add a Lookup field for user assignment." />
                <Inp label="DEFAULT ASSIGNEE (SIMULATED)" value={settings.autoAssignment.defaultAssignee}
                  onChange={e => patchSection("autoAssignment", { defaultAssignee: e.target.value })} placeholder="e.g. user@example.com" />
              </>
            )}
          </>
        );
      case "compositekey":
        return (
          <>
            <SectionTitle desc="Define a unique constraint across multiple fields." />
            <TRow label="Enable Composite Key" value={settings.compositeKey.enabled} onChange={v => patchSection("compositeKey", { enabled: v })} sub="Use multiple fields as a primary key" />
            {settings.compositeKey.enabled && (
              <div style={{ marginTop: 14 }}>
                <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>KEY FIELDS (MIN 2, EXCLUDE PRIMARY)</div>
                {fields.length === 0 && (
                  <div style={{ color: "var(--app-text-subtle)", fontSize: 11 }}>Add fields on step 2, then select key fields here.</div>
                )}
                {fields.filter(f => !f.isPrimary).map(f => {
                  const selected = settings.compositeKey.fieldIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleCompositeField(f.id)}
                      aria-pressed={selected}
                      className="flex items-center gap-2 w-full px-2 py-2 rounded-md mb-1"
                      style={{
                        background: selected ? "var(--app-shell-bg-accent-strong)" : "var(--app-shell-bg-subtle)",
                        border: `1px solid ${selected ? "var(--app-border-accent)" : "var(--app-border)"}`,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "inherit",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 14, height: 14, flexShrink: 0, borderRadius: 3,
                          border: `1.5px solid ${selected ? "var(--app-accent)" : "var(--app-text-subtle)"}`,
                          background: selected ? "var(--app-accent)" : "transparent",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {selected && <Check size={9} strokeWidth={3} style={{ color: "var(--app-text-on-accent)" }} />}
                      </span>
                      <span style={{ color: "var(--app-text-body)", fontSize: 12, flex: 1 }}>{f.label}</span>
                      <span style={{ color: "var(--app-text-muted)", fontSize: 10 }}>{f.fieldType}</span>
                    </button>
                  );
                })}
                {settings.compositeKey.fieldIds.length >= 2 && (
                  <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 6, background: "var(--app-shell-bg-accent)", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <div style={{ color: "var(--app-text-accent-muted)", fontSize: 11 }}>
                      Unique together: {settings.compositeKey.fieldIds.map(id => fields.find(f => f.id === id)?.label ?? id).join(" + ")}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        );
      case "fieldupdate":
        return (
          <>
            <SectionTitle desc="Automatically update field values on record events (§5.6/§5.7)." />
            <TRow label="Enable Field Update Rules" value={settings.fieldUpdate.enabled} onChange={v => patchSection("fieldUpdate", { enabled: v })} sub="Activate update rule engine" />
            <TRow label="Trigger on Create" value={settings.fieldUpdate.onCreate} onChange={v => patchSection("fieldUpdate", { onCreate: v })} sub="Run rules when record is created" />
            <TRow label="Trigger on Update" value={settings.fieldUpdate.onUpdate} onChange={v => patchSection("fieldUpdate", { onUpdate: v })} sub="Run rules when record is updated" />
            <TRow label="Run Before Save" value={settings.fieldUpdate.runBeforeSave} onChange={v => patchSection("fieldUpdate", { runBeforeSave: v })} sub="Execute rules before persisting the record" />
            {settings.fieldUpdate.enabled && (
              <div style={{ marginTop: 16, padding: "12px 12px", borderRadius: 8, background: "var(--app-shell-bg-subtle)", border: "1px solid var(--app-border)" }}>
                <div style={{ color: "var(--app-text-muted)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>STUB RULE (PROTOTYPE)</div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>TRIGGER</div>
                  <div className="flex gap-5">
                    <Radio label="Create" checked={settings.fieldUpdate.stubRule.trigger === "create"}
                      onChange={() => patchSection("fieldUpdate", { stubRule: { ...settings.fieldUpdate.stubRule, trigger: "create" } })} />
                    <Radio label="Update" checked={settings.fieldUpdate.stubRule.trigger === "update"}
                      onChange={() => patchSection("fieldUpdate", { stubRule: { ...settings.fieldUpdate.stubRule, trigger: "update" } })} />
                  </div>
                </div>
                <FieldSelect label="TARGET FIELD" value={settings.fieldUpdate.stubRule.targetFieldId}
                  onSelect={id => patchSection("fieldUpdate", { stubRule: { ...settings.fieldUpdate.stubRule, targetFieldId: id || undefined } })}
                  options={nonPrimaryFields} emptyHint="Select a field to update." />
                <Inp label="VALUE EXPRESSION" value={settings.fieldUpdate.stubRule.valueExpression}
                  onChange={e => patchSection("fieldUpdate", { stubRule: { ...settings.fieldUpdate.stubRule, valueExpression: e.target.value } })}
                  placeholder="e.g. TODAY(), Owner.Email" />
              </div>
            )}
            <DeferredNotice text={DEFERRED_SETTINGS_SLICES.fieldUpdateRules} />
          </>
        );
      case "questionnaire":
        return (
          <>
            <SectionTitle desc="Multi-step survey behaviour (Wizard / Likert)." />
            <TRow label="Enable Questionnaire Mode" value={settings.questionnaire.enabled} onChange={v => patchSection("questionnaire", { enabled: v })} sub="Present fields as survey questions" />
            <TRow label="Allow Partial Save" value={settings.questionnaire.allowPartialSave} onChange={v => patchSection("questionnaire", { allowPartialSave: v })} sub="Let users save and resume later" />
            <TRow label="Show Progress Bar" value={settings.questionnaire.showProgressBar} onChange={v => patchSection("questionnaire", { showProgressBar: v })} sub="Display completion percentage" />
            <TRow label="Randomise Questions" value={settings.questionnaire.randomiseQuestions} onChange={v => patchSection("questionnaire", { randomiseQuestions: v })} sub="Shuffle question order each session" />
            <TRow label="Multi-step Form" value={settings.questionnaire.multiStepEnabled} onChange={v => patchSection("questionnaire", { multiStepEnabled: v })} sub="Split questions across steps" />
            {settings.questionnaire.multiStepEnabled && (
              <Inp label="STEP COUNT" value={settings.questionnaire.stepsCount} type="number"
                onChange={e => patchSection("questionnaire", { stepsCount: Math.max(2, Number(e.target.value) || 2) })} placeholder="3" />
            )}
            <TRow label="Likert Scale Mode" value={settings.questionnaire.likertScaleEnabled} onChange={v => patchSection("questionnaire", { likertScaleEnabled: v })} sub="Optimise layout for Likert scale fields" />
            {objectType !== "Questionnaire" && settings.questionnaire.enabled && (
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "var(--app-shell-bg-danger)", border: "1px solid var(--app-border-danger)" }}>
                <div style={{ color: "var(--app-text-danger-soft)", fontSize: 11 }}>Questionnaire mode requires object type Questionnaire.</div>
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  const activeNav = OBJ_ADV_NAV.find(n => n.id === active) ?? visibleNav[0] ?? OBJ_ADV_NAV[0];
  const ActiveNavIcon = activeNav.icon;

  const renderNavItem = (item: (typeof OBJ_ADV_NAV)[number]) => {
    const NavIcon = item.icon;
    const isActive = active === item.id;
    const suggested = suggestions.some(s => s.section === item.id);
    const configured = isObjAdvSectionConfigured(settings, item.id);
    return (
      <button key={item.id} type="button" onClick={() => selectSection(item.id)}
        className="flex items-center gap-2.5 w-full"
        style={{
          padding: `10px 12px 10px ${OBJ_ADV_NAV_ICON_INSET}px`,
          background: isActive ? "var(--app-shell-bg-accent)" : "transparent",
          borderTop: "none", borderRight: "none", borderBottom: "none",
          borderLeft: `2px solid ${isActive ? "var(--app-accent)" : "transparent"}`,
          cursor: "pointer", transition: "all 0.14s",
        }}>
        <NavIcon size={13} style={{ color: isActive ? "var(--app-accent-light)" : "var(--app-text-subtle)", flexShrink: 0 }} />
        <span style={{ color: isActive ? "var(--app-text-primary)" : "var(--app-text-muted)", fontSize: 12, textAlign: "left", lineHeight: 1.35, flex: 1 }}>
          {item.label}
        </span>
        {configured && !isActive && (
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: "#34D399", flexShrink: 0,
          }} title="Configured" />
        )}
        {suggested && (
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FCD34D", flexShrink: 0 }} title="Suggested" />
        )}
      </button>
    );
  };

  const renderNav = () => (
    <>
      {groupedNav
        ? OBJ_ADV_NAV_GROUPS.map(group => {
            const items = group.sections
              .map(id => visibleNav.find(n => n.id === id))
              .filter(Boolean) as typeof visibleNav;
            if (items.length === 0) return null;
            return (
              <div key={group.label} style={{ marginBottom: 4 }}>
                <div style={{
                  padding: `8px 12px 6px ${OBJ_ADV_NAV_ICON_INSET}px`,
                  color: "var(--app-text-subtle)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                }}>
                  {group.label.toUpperCase()}
                </div>
                {items.map(renderNavItem)}
              </div>
            );
          })
        : visibleNav.map(renderNavItem)}
      {suggestions.length > 0 && (
        <div style={{
          marginTop: "auto",
          padding: `10px 12px 10px ${OBJ_ADV_NAV_ICON_INSET}px`,
          borderTop: "1px solid var(--app-border-subtle)",
        }}>
          <div style={{ color: "#FCD34D", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>SUGGESTED</div>
          {suggestions.slice(0, 3).map(s => (
            <button key={s.section} type="button" onClick={() => selectSection(s.section)}
              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "var(--app-text-secondary)", fontSize: 10, lineHeight: 1.5, padding: "2px 0" }}>
              {OBJ_ADV_NAV.find(n => n.id === s.section)?.label}: {s.reason}
            </button>
          ))}
        </div>
      )}
    </>
  );

  const paneUsesInternalScroll =
    active === "calendar" || active === "notification" || active === "constraints";

  const renderContentPane = () => (
    <div className="obj-adv-nav-scroll"
      style={{
        flex: 1, minWidth: 0, minHeight: 0,
        overflowY: paneUsesInternalScroll ? "hidden" : "auto",
        padding: (active === "calendar" || active === "notification") ? 0 : "18px 28px 28px",
        display: paneUsesInternalScroll ? "flex" : undefined,
        flexDirection: "column",
        scrollbarWidth: "thin",
        scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent",
        overscrollBehavior: "contain",
      }}>
      {(active !== "calendar" && active !== "notification") && (
        <div style={{ marginBottom: 18, flexShrink: 0 }}>
          <div className="flex items-center gap-2.5" style={{ marginBottom: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--app-shell-bg-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ActiveNavIcon size={14} style={{ color: "var(--app-accent-light)" }} />
            </div>
            <span style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600 }}>
              {activeNav.label}
            </span>
          </div>
          <p style={{ color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.55, margin: 0, maxWidth: 560 }}>
            {OBJ_ADV_SECTION_DESC[active]}
          </p>
        </div>
      )}
      {renderContent()}
    </div>
  );

  if (contentOnly) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0, fontFamily: "Inter, system-ui, sans-serif" }}>
        {renderContentPane()}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, animation: "wizFade 0.18s ease", fontFamily: "Inter, system-ui, sans-serif" }}>
      {!hideHeader && (
      <div className="flex items-center gap-2.5 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
        {!hideBack && (
          <button type="button" onClick={onBack}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md"
            style={{ color: "var(--app-text-secondary)", background: "var(--app-shell-bg-input)", border: "none", cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--app-text-primary)"; (e.currentTarget as HTMLElement).style.background = "var(--app-border)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--app-text-secondary)"; (e.currentTarget as HTMLElement).style.background = "var(--app-shell-bg-input)"; }}>
            <ArrowLeft size={11} /> Back
          </button>
        )}
        {!hideBack && <div style={{ width: 1, height: 14, background: "var(--app-border)", flexShrink: 0 }} />}
        <Settings2 size={12} style={{ color: "var(--app-accent)", flexShrink: 0 }} />
        <span style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600, flex: 1 }}>{title}</span>
        <span style={{ color: "var(--app-text-subtle)", fontSize: 10 }}>{visibleNav.length} sections</span>
      </div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {!hideNav && (
        <div className="obj-adv-nav-scroll"
          style={{
            width: OBJ_ADV_NAV_WIDTH, flexShrink: 0, minHeight: 0,
            borderRight: "1px solid var(--app-border-subtle)",
            overflowY: "auto", overflowX: "hidden",
            scrollbarWidth: "thin",
            scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent",
            overscrollBehavior: "contain",
            paddingTop: 8, paddingBottom: 8,
            display: "flex", flexDirection: "column",
          }}>
          {renderNav()}
        </div>
        )}

        {renderContentPane()}
      </div>
    </div>
  );
}

export { OBJ_ADV_NAV };
