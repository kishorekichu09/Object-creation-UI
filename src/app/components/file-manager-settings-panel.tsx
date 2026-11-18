import React, { useState } from "react";
import { Check, ChevronDown, FileText, Paperclip, Plus, Trash2 } from "lucide-react";



import {
  type DocumentAccess,
  type DocumentCardinality,
  type DocumentCategory,
  type DocumentFrequency,
  type FileManagerTab,
  type FileSaveAs,
  type FileSizeUnit,
  type ObjectSettings,
  defaultDocumentFormatParts,
  previewDocumentFormat,
} from "../types/object-settings";

const INPUT: React.CSSProperties = {
  width: "100%",
  background: "var(--app-shell-bg-input)",
  border: "1px solid var(--app-border-strong)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "var(--app-text-primary)",
  fontSize: 13,
  outline: "none",
  transition: "border-color 0.2s",
  fontFamily: "inherit",
  lineHeight: 1.4,
  boxSizing: "border-box",
};

const FIELD_LABEL: React.CSSProperties = {
  color: "var(--app-text-secondary)",
  fontSize: 11,
  marginBottom: 8,
  fontWeight: 500,
};

const FIELD_GAP = 20;

const SAVE_AS: { id: FileSaveAs; label: string }[] = [
  { id: "file", label: "File" },
  { id: "table", label: "Table" },
  { id: "git", label: "Git" },
];

const CATEGORIES: { id: DocumentCategory; label: string }[] = [
  { id: "customer", label: "Customer" },
  { id: "client", label: "Client" },
  { id: "HR", label: "HR" },
  { id: "server", label: "Server" },
  { id: "IT", label: "IT" },
];

const FREQUENCIES: { id: DocumentFrequency; label: string }[] = [
  { id: "anyDate", label: "Any Date" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly", label: "Yearly" },
];

const TOKEN_OPTIONS = ["DD", "MM", "YY", "YYYY", "W", "Q", "{0}", "HH", "mm"];
const SEPARATOR_OPTIONS = ["-", "/", "_", ".", " "];

function isSeparator(value: string): boolean {
  return SEPARATOR_OPTIONS.includes(value);
}

function Field({
  label,
  children,
  style,
}: {
  label?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="mb-5" style={style}>
      {label && <div style={{ ...FIELD_LABEL, marginBottom: 8 }}>{label}</div>}
      {children}
    </div>
  );
}

function SelectControl({
  value,
  onChange,
  children,
  style,
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  compact?: boolean;
}) {
  const chevronSize = compact ? 12 : 14;
  const padRight = compact ? 26 : 36;

  return (
    <div style={{ position: "relative", ...style }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          ...INPUT,
          width: "100%",
          cursor: "pointer",
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          paddingTop: compact ? 8 : 10,
          paddingBottom: compact ? 8 : 10,
          paddingLeft: compact ? 10 : 12,
          paddingRight: padRight,
          fontSize: compact ? 12 : 13,
          textAlign: "left",
        }}
        onFocus={e => { e.target.style.borderColor = "var(--app-accent)"; }}
        onBlur={e => { e.target.style.borderColor = "var(--app-border-strong)"; }}
      >
        {children}
      </select>
      <ChevronDown
        size={chevronSize}
        aria-hidden
        style={{
          position: "absolute",
          right: compact ? 8 : 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--app-text-secondary)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      marginBottom: 18,
      padding: "18px 16px 16px",
      borderRadius: 10,
      border: "1px solid var(--app-border)",
      background: "var(--app-shell-bg-subtle)",
    }}>
      <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600, marginBottom: 18 }}>{title}</div>
      {children}
    </div>
  );
}

function SaveAsPicker({ value, onChange }: { value: FileSaveAs; onChange: (v: FileSaveAs) => void }) {
  return (
    <Field label="Save As">
      <div className="flex gap-2">
        {SAVE_AS.map(opt => {
          const on = value === opt.id;
          return (
            <button key={opt.id} type="button" onClick={() => onChange(opt.id)}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                border: `1px solid ${on ? "rgba(99,102,241,0.65)" : "var(--app-border-strong)"}`,
                background: on ? "rgba(99,102,241,0.2)" : "var(--app-shell-bg-subtle)",
                color: on ? "var(--app-text-primary)" : "var(--app-text-secondary)",
              }}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function ExtensionEditor({
  extensions,
  onChange,
}: {
  extensions: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    let ext = draft.trim().toLowerCase();
    if (!ext) return;
    if (!ext.startsWith(".")) ext = `.${ext}`;
    if (!/^\.[a-z0-9]+$/i.test(ext)) return;
    if (extensions.includes(ext)) {
      setDraft("");
      return;
    }
    onChange([...extensions, ext]);
    setDraft("");
  };

  return (
    <Field>
      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
        <span style={{ ...FIELD_LABEL, marginBottom: 0 }}>Allow file type</span>
        <span style={{
          padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700,
          background: "rgba(96,165,250,0.2)", color: "#93C5FD", border: "1px solid rgba(96,165,250,0.35)",
        }}>
          {extensions.length}
        </span>
      </div>
      <div className="flex items-center gap-2" style={{ marginBottom: extensions.length ? 12 : 0 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Enter file extension"
          style={{ ...INPUT, flex: 1 }}
        />
        <button type="button" onClick={add} title="Add extension"
          style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
            border: "1px solid var(--app-border-accent-strong)", background: "rgba(99,102,241,0.85)",
            color: "var(--app-text-on-accent)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          <Plus size={16} />
        </button>
      </div>
      {extensions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {extensions.map(ext => (
            <span key={ext} className="flex items-center gap-1.5" style={{
              padding: "4px 10px", borderRadius: 999, fontSize: 11,
              background: "var(--app-border-subtle)", color: "var(--app-text-body)",
              border: "1px solid var(--app-border)",
            }}>
              {ext}
              <button type="button"
                onClick={() => onChange(extensions.filter(e => e !== ext))}
                style={{ background: "none", border: "none", color: "var(--app-text-secondary)", cursor: "pointer", padding: 0, display: "flex" }}>
                <Trash2 size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}

function FileSizeEditor({
  unit,
  value,
  onUnitChange,
  onValueChange,
}: {
  unit: FileSizeUnit;
  value: number;
  onUnitChange: (u: FileSizeUnit) => void;
  onValueChange: (n: number) => void;
}) {
  return (
    <Field label="File size" style={{ marginBottom: 0 }}>
      <div className="flex gap-3 items-center">
        <SelectControl
          value={unit}
          onChange={v => onUnitChange(v as FileSizeUnit)}
          style={{ width: 96, flexShrink: 0 }}
        >
          <option value="KB">KB</option>
          <option value="MB">MB</option>
        </SelectControl>
        <input
          type="number"
          min={1}
          value={value}
          onChange={e => onValueChange(Math.max(0, Number(e.target.value) || 0))}
          style={{ ...INPUT, flex: 1 }}
        />
      </div>
    </Field>
  );
}

function FormatPartSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = isSeparator(value) || value === ""
    ? SEPARATOR_OPTIONS
    : TOKEN_OPTIONS.includes(value)
      ? TOKEN_OPTIONS
      : [...TOKEN_OPTIONS, value];

  return (
    <SelectControl
      value={value}
      onChange={onChange}
      compact
      style={{ width: isSeparator(value) ? 64 : 84, flexShrink: 0 }}
    >
      {options.map(o => (
        <option key={o === " " ? "space" : o} value={o}>{o === " " ? "(space)" : o}</option>
      ))}
    </SelectControl>
  );
}

export interface FileManagerSettingsPanelProps {
  settings: ObjectSettings["fileManager"];
  onChange: (next: ObjectSettings["fileManager"]) => void;
}

export function FileManagerSettingsPanel({ settings, onChange }: FileManagerSettingsPanelProps) {
  const patch = (partial: Partial<ObjectSettings["fileManager"]>) => {
    onChange({ ...settings, ...partial });
  };

  const patchAttachment = (partial: Partial<ObjectSettings["fileManager"]["attachment"]>) => {
    onChange({ ...settings, attachment: { ...settings.attachment, ...partial } });
  };

  const patchDocument = (partial: Partial<ObjectSettings["fileManager"]["document"]>) => {
    onChange({ ...settings, document: { ...settings.document, ...partial } });
  };

  const setFrequency = (frequency: DocumentFrequency) => {
    patchDocument({
      frequency,
      formatParts: defaultDocumentFormatParts(frequency),
    });
  };

  const updateFormatPart = (index: number, value: string) => {
    const next = [...settings.document.formatParts];
    next[index] = value;
    patchDocument({ formatParts: next });
  };

  const tabs: { id: FileManagerTab; label: string; Icon: React.ElementType; count: number }[] = [
    { id: "attachment", label: "Attachment", Icon: Paperclip, count: settings.attachment.extensions.length },
    { id: "document", label: "Document", Icon: FileText, count: settings.document.extensions.length },
  ];

  return (
    <div>
      <div style={{
        borderRadius: 8, border: "1px solid var(--app-border)", overflow: "hidden",
        background: "var(--app-shell-bg-subtle)", marginBottom: 18,
      }}>
        <div className="flex">
          {tabs.map(tab => {
            const on = settings.activeTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => patch({ activeTab: tab.id })}
                className="flex items-center justify-center gap-2"
                style={{
                  flex: 1, padding: "12px 8px", border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600,
                  background: on ? "rgba(99,102,241,0.15)" : "transparent",
                  color: on ? "#C7D2FE" : "var(--app-text-muted)",
                  borderBottom: on ? "2px solid var(--app-accent)" : "2px solid transparent",
                }}>
                <tab.Icon size={13} />
                {tab.label}
                <span style={{
                  padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                  background: on ? "rgba(96,165,250,0.25)" : "var(--app-border-subtle)",
                  color: on ? "#93C5FD" : "var(--app-text-muted)",
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {settings.activeTab === "attachment" && (
        <SectionCard title="Attachment">
          <SaveAsPicker
            value={settings.attachment.saveAs}
            onChange={v => patchAttachment({ saveAs: v })}
          />
          <div style={{ height: 1, background: "var(--app-border)", margin: "4px 0 20px" }} />
          <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>Validation</div>
          <ExtensionEditor
            extensions={settings.attachment.extensions}
            onChange={extensions => patchAttachment({ extensions })}
          />
          <FileSizeEditor
            unit={settings.attachment.sizeUnit}
            value={settings.attachment.sizeValue}
            onUnitChange={sizeUnit => patchAttachment({ sizeUnit })}
            onValueChange={sizeValue => patchAttachment({ sizeValue })}
          />
        </SectionCard>
      )}

      {settings.activeTab === "document" && (
        <>
          <SectionCard title="New creation">
            <Field label="Access">
              <SelectControl
                value={settings.document.access}
                onChange={v => patchDocument({ access: v as DocumentAccess })}
              >
                <option value="anyone">Anyone can access</option>
                <option value="assignUser">Assign user</option>
              </SelectControl>
            </Field>

            <Field label="Document name">
              <input style={INPUT}
                value={settings.document.documentName}
                onChange={e => patchDocument({ documentName: e.target.value })}
                placeholder="Enter document name"
               
              />
            </Field>

            <Field label="Category">
              <SelectControl
                value={settings.document.category}
                onChange={v => patchDocument({ category: v as DocumentCategory | "" })}
              >
                <option value="">Select the category</option>
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </SelectControl>
            </Field>

            <SaveAsPicker
              value={settings.document.saveAs}
              onChange={v => patchDocument({ saveAs: v })}
            />

            <Field label="Frequency">
              <div className="flex flex-wrap gap-2">
                {FREQUENCIES.map(f => {
                  const on = settings.document.frequency === f.id;
                  return (
                    <button key={f.id} type="button" onClick={() => setFrequency(f.id)}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        color: on ? "var(--app-text-primary)" : "var(--app-text-secondary)",
                        background: on ? "rgba(99,102,241,0.2)" : "var(--app-shell-bg-subtle)",
                        border: `1px solid ${on ? "rgba(99,102,241,0.65)" : "var(--app-border-strong)"}`,
                      }}>
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Select format">
              <div className="flex flex-wrap items-center gap-2.5">
                {settings.document.formatParts.map((part, i) => (
                  <FormatPartSelect
                    key={`${settings.document.frequency}-${i}`}
                    value={part}
                    onChange={v => updateFormatPart(i, v)}
                  />
                ))}
              </div>
            </Field>

            <div className="flex items-center gap-3" style={{ marginBottom: 0 }}>
              <span style={{ color: "var(--app-text-muted)", fontSize: 11, fontWeight: 500 }}>Preview</span>
              <span style={{
                padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: "rgba(99,102,241,0.15)", color: "#C7D2FE",
                border: "1px solid var(--app-border-accent)",
              }}>
                {previewDocumentFormat(settings.document.formatParts) || "—"}
              </span>
            </div>
          </SectionCard>

          <SectionCard title="Validation">
            <Field label="Files per upload">
              <div className="flex gap-3">
                {([
                  ["single", "Single"],
                  ["multiple", "Multiple"],
                ] as const).map(([id, label]) => {
                  const on = settings.document.cardinality === id;
                  return (
                    <button key={id} type="button"
                      onClick={() => patchDocument({ cardinality: id as DocumentCardinality })}
                      className="flex items-center gap-2"
                      style={{
                        flex: 1, padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                        border: `1px solid ${on ? "rgba(99,102,241,0.55)" : "var(--app-border-strong)"}`,
                        background: on ? "rgba(99,102,241,0.18)" : "var(--app-shell-bg-subtle)",
                      }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: `1.5px solid ${on ? "var(--app-accent-light)" : "rgba(255,255,255,0.25)"}`,
                        background: on ? "var(--app-accent)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {on && <Check size={9} style={{ color: "var(--app-text-on-accent)" }} />}
                      </span>
                      <span style={{ color: on ? "var(--app-text-primary)" : "var(--app-text-secondary)", fontSize: 12, fontWeight: 600 }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <ExtensionEditor
              extensions={settings.document.extensions}
              onChange={extensions => patchDocument({ extensions })}
            />
            <FileSizeEditor
              unit={settings.document.sizeUnit}
              value={settings.document.sizeValue}
              onUnitChange={sizeUnit => patchDocument({ sizeUnit })}
              onValueChange={sizeValue => patchDocument({ sizeValue })}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
