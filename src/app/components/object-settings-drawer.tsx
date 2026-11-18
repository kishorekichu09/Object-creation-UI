import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { ObjectAdvancedPanel } from "./object-advanced-panel";
import {
  type ObjectSettings,
  type ObjAdvSection,
  type SettingsFieldRef,
  type WizardObjectType,
  mergeObjectSettings,
  countConfiguredSections,
} from "../types/object-settings";

export interface ObjectSettingsDrawerProps {
  objectId: string;
  objectLabel: string;
  objectType?: string;
  settings: ObjectSettings;
  fields: SettingsFieldRef[];
  onClose: () => void;
  onSave: (objectId: string, settings: ObjectSettings) => void;
}

export function ObjectSettingsDrawer({
  objectId,
  objectLabel,
  objectType = "Normal",
  settings: initialSettings,
  fields,
  onClose,
  onSave,
}: ObjectSettingsDrawerProps) {
  const [settings, setSettings] = useState(() => mergeObjectSettings(initialSettings, objectType));
  const configuredCount = countConfiguredSections(settings);
  const wizType = (["Normal", "Assignment", "Collection", "Questionnaire"] as const).includes(objectType as WizardObjectType)
    ? (objectType as WizardObjectType)
    : "Normal";

  return (
    <>
      <div className="fixed inset-0 z-[70]" style={{ background: "var(--app-overlay-blur)", backdropFilter: "blur(3px)" }} onClick={onClose} />
      <div className="fixed z-[71] flex flex-col"
        style={{
          top: 52, right: 400, bottom: 0, width: "min(676px, calc(100vw - 420px))",
          background: "var(--app-shell-bg-muted)", borderLeft: "1px solid var(--app-border)",
          boxShadow: "-12px 0 40px var(--app-shell-bg-overlay)", fontFamily: "Inter, system-ui, sans-serif",
        }}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
          <div>
            <div style={{ color: "var(--app-accent)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>OBJECT SETTINGS</div>
            <div style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600 }}>{objectLabel}</div>
            <div style={{ color: "var(--app-text-muted)", fontSize: 10, marginTop: 2 }}>{configuredCount} section{configuredCount === 1 ? "" : "s"} configured</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onSave(objectId, settings)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: "linear-gradient(135deg,var(--app-accent),var(--app-accent-light))", color: "var(--app-text-on-accent)", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer" }}>
              <Check size={12} /> Save settings
            </button>
            <button type="button" onClick={onClose} style={{ color: "var(--app-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <X size={16} />
            </button>
          </div>
        </div>
        <ObjectAdvancedPanel
          settings={settings}
          onChange={setSettings}
          onBack={onClose}
          objectType={wizType}
          fields={fields}
          hideBack
          title="Object Settings"
        />
      </div>
    </>
  );
}

export type { ObjAdvSection };
