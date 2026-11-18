import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Pencil, ChevronRight, ChevronUp, ChevronDown,
  Calendar, Clock, Lock, Bird, Undo2, History, Share2, Loader, Database, AppWindow, Star, Check,
} from "lucide-react";




import { summarizeEnabledFeatures, summarizeSettingsSections, type ObjectSettings } from "../types/object-settings";
import { MetaChangeHistoryView, ObjectShareView, getObjectAssetLists } from "./object-panel-views";

const INPUT: React.CSSProperties = {
  width: "100%", background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border-strong)",
  borderRadius: 8, padding: "8px 11px", color: "var(--app-text-primary)", fontSize: 13, outline: "none",
  transition: "border-color 0.2s", fontFamily: "inherit",
};

const ICON_BTN: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent",
  cursor: "pointer", color: "var(--app-text-muted)", padding: 0,
  transition: "background 0.15s, color 0.15s",
};

const META_LABEL: React.CSSProperties = {
  color: "var(--app-text-muted)",
  fontSize: 10,
  letterSpacing: "0.08em",
  fontWeight: 600,
  marginBottom: 8,
  textTransform: "uppercase",
};

const BTN_OUTLINE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px",
  borderRadius: 8, cursor: "pointer", background: "transparent",
  border: "1px solid var(--app-border)", color: "var(--app-text-primary)",
  fontSize: 12, fontWeight: 500, fontFamily: "inherit",
  transition: "background 0.15s, border-color 0.15s, filter 0.15s",
};

function IconBtn({
  onClick, title, "aria-label": ariaLabel, children,
}: {
  onClick: () => void;
  title?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      style={ICON_BTN}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.background = "var(--app-shell-bg-hover)";
        e.currentTarget.style.color = "var(--app-text-primary)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--app-text-muted)";
      }}
    >
      {children}
    </button>
  );
}

function OutlineBtn({
  onClick, style, children, tone = "accent",
}: {
  onClick: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
  tone?: "accent" | "danger" | "neutral";
}) {
  const toneStyles: Record<"accent" | "danger" | "neutral", {
    background: string; borderColor: string; color: string;
    hoverBg: string; hoverBorder: string;
  }> = {
    accent: {
      background: "var(--app-shell-bg-accent)",
      borderColor: "var(--app-border-accent)",
      color: "var(--app-text-primary)",
      hoverBg: "var(--app-shell-bg-accent-strong)",
      hoverBorder: "var(--app-border-accent-strong)",
    },
    danger: {
      background: "var(--app-shell-bg-danger)",
      borderColor: "var(--app-border-danger)",
      color: "var(--app-text-danger)",
      hoverBg: "rgba(239,68,68,0.18)",
      hoverBorder: "rgba(239,68,68,0.55)",
    },
    neutral: {
      background: "transparent",
      borderColor: "var(--app-border)",
      color: "var(--app-text-primary)",
      hoverBg: "var(--app-shell-bg-hover)",
      hoverBorder: "var(--app-border-strong)",
    },
  };
  const t = toneStyles[tone];
  return (
    <button
      type="button"
      style={{
        ...BTN_OUTLINE,
        background: t.background,
        borderColor: t.borderColor,
        color: t.color,
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.background = t.hoverBg;
        e.currentTarget.style.borderColor = t.hoverBorder;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = (style?.background as string | undefined) ?? t.background;
        e.currentTarget.style.borderColor = (style?.borderColor as string | undefined) ?? t.borderColor;
      }}
    >
      {children}
    </button>
  );
}

function SectionHeader({ title, count, icon: Icon, iconColor }: {
  title: string; count?: number; icon?: React.ElementType; iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
      {Icon && <Icon size={11} style={{ color: iconColor ?? "var(--app-text-muted)", flexShrink: 0 }} />}
      <span style={{
        color: "var(--app-text-muted)",
        fontSize: 10,
        letterSpacing: "0.08em",
        fontWeight: 600,
        textTransform: "uppercase",
      }}>
        {title}
        {count !== undefined ? ` ${count}` : ""}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--app-border)" }} />
    </div>
  );
}

function RowBtn({ onClick, children, className }: {
  onClick: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={className}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", marginBottom: 2,
        padding: "6px 8px", borderRadius: 8, border: "none", background: "transparent",
        cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 400, textAlign: "left",
        color: "var(--app-text-primary)",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--app-shell-bg-hover)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
      {children}
    </button>
  );
}

export type NodeType = "object" | "field" | "layout";

export interface PropNode {
  id: string;
  type: NodeType;
  label: string;
  parentId?: string;
  fieldType?: string;
  required?: boolean;
  layoutType?: string;
  description?: string;
  objectType?: string;
  objectApiName?: string;
  starred?: boolean;
  tracked?: boolean;
  isPrimary?: boolean;
  lifecycleStatus?: "Draft" | "Built" | "Deployed";
  relatedObjectId?: string;
  objectSettings?: ObjectSettings;
}

const COLOR = {
  object: "var(--app-graph-object)",
  objectBright: "var(--app-graph-object-bright)",
  field: "var(--app-graph-field)",
  fieldLookup: "var(--app-graph-field-lookup)",
  layout: "var(--app-graph-layout)",
  layoutBright: "var(--app-graph-layout-bright)",
};

function fieldDot(fieldType?: string) {
  return fieldType === "Lookup" || fieldType === "Master Details" ? COLOR.fieldLookup : COLOR.field;
}

/** Compact zigzag glyph matching the wizard field-tracking icon. */
function FieldTrackBadge({ active }: { active: boolean }) {
  const stroke = active ? "var(--app-accent-light)" : "var(--app-text-subtle)";
  return (
    <svg width={12} height={12} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 14.5 L7 6.5 L12 13 L17 5.5" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="3" cy="14.5" r="1.5" fill={stroke} />
      <circle cx="7" cy="6.5" r="2.2" stroke={stroke} strokeWidth="1.2" fill={active ? `${stroke}22` : "none"} />
      <circle cx="7" cy="6.5" r="1" fill={stroke} />
      <circle cx="12" cy="13" r="1.5" fill={stroke} />
      <circle cx="17" cy="5.5" r="1.5" fill={stroke} />
    </svg>
  );
}

/** Deterministic demo audit meta per object (prototype â€” mirrors SAB owner / lock / git strip). */
function objectAuditMeta(objectId: string, label: string) {
  let h = 0;
  for (let i = 0; i < objectId.length; i++) h = ((h << 5) - h + objectId.charCodeAt(i)) | 0;
  const hex = Math.abs(h).toString(16).padStart(8, "0") + Math.abs(h * 7).toString(16).padStart(8, "0");
  const gitHash = `${hex.slice(0, 11)}â€¦`;
  const owners = [
    { name: "Alex Rivera", initials: "AR", tone: "var(--app-accent)" },
    { name: "Priya Shah", initials: "PS", tone: "#10B981" },
    { name: "Jordan Lee", initials: "JL", tone: "#F59E0B" },
  ];
  const lockers = [
    { name: "Sam Okonkwo", initials: "SO", tone: "#3B82F6" },
    { name: "Casey Nguyen", initials: "CN", tone: "#8B5CF6" },
  ];
  const owner = owners[Math.abs(h) % owners.length];
  const locker = lockers[Math.abs(h >> 3) % lockers.length];
  return {
    owner,
    locker,
    gitHash,
    createdDate: "01-Feb-2019",
    createdTime: "04:30pm",
    lockedDate: "01-Feb-2019",
    lockedTime: "04:30pm",
    versionLabel: label ? `v1.0 Â· ${label.slice(0, 18)}` : "v1.0",
  };
}

function AvatarChip({
  initials, tone, locked,
}: { initials: string; tone: string; locked?: boolean }) {
  return (
    <div style={{ position: "relative", width: 28, height: 28, flexShrink: 0 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: `linear-gradient(135deg, ${tone}55, ${tone}22)`,
        border: "1px solid var(--app-border-subtle)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--app-text-primary)", fontSize: 9, fontWeight: 700, letterSpacing: "0.02em",
      }}>
        {initials}
      </div>
      {locked && (
        <div style={{
          position: "absolute", right: -2, bottom: -2, width: 14, height: 14, borderRadius: "50%",
          background: "#1E3A8A", border: "1.5px solid var(--app-shell-bg-panel)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Lock size={7} style={{ color: "#93C5FD" }} />
        </div>
      )}
    </div>
  );
}

function ObjectAuditBar({ objectId, label }: { objectId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const meta = useMemo(() => objectAuditMeta(objectId, label), [objectId, label]);

  return (
    <div
      className="shrink-0"
      style={{
        borderTop: "1px solid var(--app-border)",
        background: "var(--app-audit-bar-bg)",
        boxShadow: "var(--app-audit-bar-shadow)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "12px 20px", border: "none", background: "transparent",
          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        }}
      >
        <AvatarChip initials={meta.owner.initials} tone={meta.owner.tone} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold uppercase tracking-wide" style={{ color: "var(--app-text-secondary)", fontSize: 12, lineHeight: "21px" }}>
            Record ownership
          </div>
          <div className="mt-0.5 truncate" style={{ color: "var(--app-text-muted)", fontSize: 12, lineHeight: "21px" }}>
            {meta.owner.name} · {meta.createdDate}
          </div>
        </div>
        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, border: "1px solid var(--app-border-accent)", background: "var(--app-shell-bg-accent)", color: "var(--app-accent)", flexShrink: 0 }}>
          GIT
        </span>
        {open
          ? <ChevronDown size={14} style={{ color: "var(--app-text-secondary)", flexShrink: 0 }} />
          : <ChevronUp size={14} style={{ color: "var(--app-text-secondary)", flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{
          padding: "0 16px 14px",
          borderTop: "1px solid var(--app-border-subtle)",
          animation: "auditDrop 0.18s ease",
        }}>
          <style>{`@keyframes auditDrop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

          <div className="flex items-center gap-2.5 pb-2.5 pt-3">
            <AvatarChip initials={meta.owner.initials} tone={meta.owner.tone} />
            <span className="min-w-0 flex-1" style={{ fontSize: 12, lineHeight: "18px", color: "var(--app-text-secondary)" }}>Record of the owner</span>
            <Bird className="size-3 shrink-0" style={{ color: "var(--app-text-secondary)" }} />
            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, border: "1px solid var(--app-border-accent)", background: "var(--app-shell-bg-accent)", color: "var(--app-accent)" }}>GIT</span>
            <span className="max-w-[92px] shrink-0 truncate font-mono" style={{ fontSize: 12, color: "var(--app-text-primary)" }}>
              {meta.gitHash}
            </span>
          </div>

          <div className="flex items-center gap-2.5 pb-2.5">
            <AvatarChip initials={meta.owner.initials} tone={meta.owner.tone} />
            <span className="min-w-0 flex-1" style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>Created On</span>
            <span className="flex shrink-0 items-center gap-1.5" style={{ fontSize: 12, color: "var(--app-text-primary)" }}>
              <Calendar className="size-3 text-blue-400" />
              {meta.createdDate}
            </span>
            <span className="flex shrink-0 items-center gap-1.5" style={{ fontSize: 12, color: "var(--app-text-primary)" }}>
              <Clock className="size-3 text-orange-400" />
              {meta.createdTime}
            </span>
          </div>

          <div className="flex items-center gap-2.5 pb-3">
            <AvatarChip initials={meta.locker.initials} tone={meta.locker.tone} locked />
            <span className="min-w-0 flex-1" style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>Locked By</span>
            <span className="flex shrink-0 items-center gap-1.5" style={{ fontSize: 12, color: "var(--app-text-primary)" }}>
              <Calendar className="size-3 text-blue-400" />
              {meta.lockedDate}
            </span>
            <span className="flex shrink-0 items-center gap-1.5" style={{ fontSize: 12, color: "var(--app-text-primary)" }}>
              <Clock className="size-3 text-orange-400" />
              {meta.lockedTime}
            </span>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                window.alert(`Version Info\n\nObject: ${label}\nGit: ${meta.gitHash}\n${meta.versionLabel}`);
              }}
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, fontSize: 13, color: "var(--app-accent)", fontFamily: "inherit" }}
            >
              Version Info
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


export interface ObjectPropertiesPanelProps {
  node: PropNode;
  relatedNodes: PropNode[];
  isUserCreated?: boolean;
  onClose: () => void;
  onNodeSelect: (id: string) => void;
  onDeleteObject: (id: string) => void;
  onEditObject: (objectId: string) => void;
  onDeleteField?: (id: string) => void;
}

export function ObjectPropertiesPanel({
  node,
  relatedNodes,
  isUserCreated = false,
  onClose,
  onNodeSelect,
  onDeleteObject,
  onEditObject,
}: ObjectPropertiesPanelProps) {
  const [panelView, setPanelView] = useState<"main" | "history" | "share">("main");
  const [shareToast, setShareToast] = useState<{ message: string; detail: string } | null>(null);
  const [undeployConfirmOpen, setUndeployConfirmOpen] = useState(false);

  useEffect(() => {
    setPanelView("main");
    setUndeployConfirmOpen(false);
  }, [node.id]);

  useEffect(() => {
    if (!shareToast) return;
    const t = window.setTimeout(() => setShareToast(null), 3400);
    return () => window.clearTimeout(t);
  }, [shareToast]);

  const fields = relatedNodes.filter(n => n.type === "field" && n.parentId === node.id);
  const parentObj = node.type === "field" && node.parentId
    ? relatedNodes.find(n => n.id === node.parentId)
    : null;
  const focusObject = node.type === "object" ? node : parentObj;
  const layouts = relatedNodes.filter(n =>
    n.type === "layout" && n.parentId === (focusObject?.id ?? node.id),
  );
  const siblingFields = parentObj
    ? relatedNodes.filter(n => n.type === "field" && n.parentId === parentObj.id)
    : [];

  /** Sibling objects from the same create/deploy batch (e.g. AI suite). */
  const suiteObjectSiblings = useMemo(() => {
    if (!focusObject || !isUserCreated) return [];
    const m = /^(created_\d+)_/.exec(focusObject.id);
    if (!m) return [];
    const prefix = `${m[1]}_`;
    return relatedNodes
      .filter(n => n.type === "object" && n.id.startsWith(prefix))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [focusObject, isUserCreated, relatedNodes]);

  const typeColor = node.type === "object"
    ? COLOR.objectBright
    : node.type === "layout"
      ? COLOR.layoutBright
      : COLOR.fieldLookup;

  const objectStatus = node.lifecycleStatus ?? (isUserCreated ? "Deployed" : "Active");
  const objectIdForEdit = node.type === "object"
    ? node.id
    : (node.parentId ?? null);

  const enabledFeatures = node.type === "object" && node.objectSettings
    ? summarizeEnabledFeatures(node.objectSettings)
    : [];

  const settings = node.objectSettings;
  const settingsFieldRefs = fields.map(f => ({
    id: f.id, label: f.label, fieldType: f.fieldType ?? "Text", isPrimary: f.isPrimary,
  }));
  const sectionSummaries = settings ? summarizeSettingsSections(settings, settingsFieldRefs) : [];
  const assetLists = focusObject && !isUserCreated
    ? getObjectAssetLists(focusObject.id, focusObject.label, layouts)
    : null;

  return (
    <div
      className="absolute right-0 bottom-0 z-20 flex flex-col"
      style={{
        top: 52,
        width: 400,
        maxHeight: "calc(100vh - 52px)",
        height: "calc(100vh - 52px)",
        background: "var(--app-shell-bg-panel)",
        borderLeft: "1px solid var(--app-border)",
        backdropFilter: "blur(20px)",
        animation: "panelIn 0.35s cubic-bezier(0.25,0.46,0.45,0.94)",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes panelIn{from{transform:translateX(28px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes toastIn{from{transform:translateX(-50%) translateY(6px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .props-scroll::-webkit-scrollbar{width:6px}
        .props-scroll::-webkit-scrollbar-thumb{background:var(--app-scrollbar-thumb);border-radius:999px}
        .props-scroll::-webkit-scrollbar-track{background:transparent}
      `}</style>

      {panelView === "history" && focusObject ? (
        <MetaChangeHistoryView
          objectId={focusObject.id}
          objectLabel={focusObject.label}
          onBack={() => setPanelView("main")}
          onClose={onClose}
        />
      ) : panelView === "share" && focusObject ? (
        <ObjectShareView
          objectLabel={focusObject.label}
          onBack={() => setPanelView("main")}
          onClose={onClose}
          onShared={({ objectLabel, peopleCount }) => {
            setPanelView("main");
            setShareToast({
              message: `${objectLabel} shared`,
              detail: peopleCount === 1
                ? "Shared with 1 person"
                : `Shared with ${peopleCount} people`,
            });
          }}
        />
      ) : (
      <>
      {shareToast && createPortal(
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            /* Horizontally centered on the graph; bottom aligned with MiniMap (CHROME_INSET = 20) */
            left: "50%",
            bottom: 20,
            top: "auto",
            transform: "translateX(-50%)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "max-content",
            minWidth: 260,
            maxWidth: "min(320px, calc(100vw - 48px))",
            boxSizing: "border-box",
            padding: "8px 12px",
            borderRadius: 10,
            background: "color-mix(in srgb, var(--app-shell-bg-elevated) 88%, var(--app-text-muted) 12%)",
            border: "1px solid var(--app-border)",
            boxShadow: "var(--app-shell-shadow-lg)",
            animation: "toastIn 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
            fontFamily: "inherit",
          }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: 7, flexShrink: 0,
            background: "color-mix(in srgb, var(--app-text-success) 14%, transparent)",
            border: "1px solid color-mix(in srgb, var(--app-text-success) 28%, var(--app-border))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Check size={12} style={{ color: "var(--app-text-success)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>
              {shareToast.message}
            </div>
            <div style={{ color: "var(--app-text-muted)", fontSize: 11, marginTop: 1, lineHeight: 1.3 }}>
              {shareToast.detail}
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setShareToast(null)}
            style={{
              ...ICON_BTN,
              width: 22, height: 22, flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--app-shell-bg-hover)";
              e.currentTarget.style.color = "var(--app-text-primary)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--app-text-muted)";
            }}
          >
            <X size={12} />
          </button>
        </div>,
        document.body,
      )}
      <div className="shrink-0 border-b border-border px-5 pb-4" style={{ paddingTop: 17 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <div className="flex items-center gap-2">
            <span className="font-semibold uppercase tracking-widest" style={{ color: typeColor, fontSize: 10 }}>
              {node.type.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            {focusObject && (
              <>
                <IconBtn onClick={() => setPanelView("history")} title="Meta change history" aria-label="Meta change history">
                  <History size={14} />
                </IconBtn>
                <IconBtn onClick={() => setPanelView("share")} title="Share" aria-label="Share">
                  <Share2 size={14} />
                </IconBtn>
              </>
            )}
            <IconBtn onClick={onClose} aria-label="Close panel">
              <X size={14} />
            </IconBtn>
          </div>
        </div>
        <h2 className="font-semibold text-foreground" style={{ fontSize: 16, margin: "0 0 2px" }}>{node.label}</h2>
        {node.type === "object" && node.description && (
          <p className="m-0 leading-relaxed" style={{
            color: "var(--app-text-muted)",
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.45,
          }}>{node.description}</p>
        )}
        {node.type === "field" && parentObj && (
          <p className="m-0" style={{ fontSize: 13, color: "var(--app-text-primary)" }}>
            {node.fieldType ?? "Field"} field in{" "}
            <button type="button" onClick={() => onNodeSelect(parentObj.id)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, fontSize: 13, fontFamily: "inherit", color: COLOR.objectBright }}>
              {parentObj.label}
            </button>
          </p>
        )}
        {node.type === "object" && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <OutlineBtn tone="accent" onClick={() => onEditObject(node.id)}>
              <Pencil size={12} /> Edit object
            </OutlineBtn>
            <OutlineBtn
              tone="danger"
              onClick={() => setUndeployConfirmOpen(true)}
            >
              <Undo2 size={12} /> Un-deploy
            </OutlineBtn>
          </div>
        )}
        {node.type === "field" && objectIdForEdit && (
          <div className="mt-3 flex items-center gap-2">
            <OutlineBtn tone="accent" onClick={() => onEditObject(objectIdForEdit)}>
              <Pencil size={12} /> Edit parent object
            </OutlineBtn>
          </div>
        )}
      </div>

      <div
        className="props-scroll flex-1 overflow-y-auto overflow-x-hidden px-5 py-4"
        style={{ minHeight: 0, flex: "1 1 auto", scrollbarWidth: "thin", scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent" }}
      >
        {node.type === "object" && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3">
              {[
                ...(node.objectApiName && node.objectApiName !== node.label
                  ? [["Object name", node.objectApiName], ["Display name", node.label]]
                  : []),
                ["Object Type", node.objectType ?? "Custom Object"],
                ["Status", objectStatus],
              ].map(([k, v]) => (
                  <div key={k}>
                  <div style={META_LABEL}>{k}</div>
                  <div style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{v}</div>
                </div>
              ))}
            </div>

            {enabledFeatures.length > 0 && (
              <div className="mb-4">
                <div style={META_LABEL}>Enabled features</div>
                <div className="flex flex-wrap gap-1.5">
                  {enabledFeatures.map(f => (
                    <span key={f} style={{
                      display: "inline-block", padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                      border: "1px solid color-mix(in srgb, var(--app-accent) 32%, transparent)",
                      background: "var(--app-shell-bg-accent-strong)",
                      color: "var(--app-text-accent)",
                    }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {sectionSummaries.length > 0 && (
              <div className="mb-4">
                <div style={META_LABEL}>
                  Object settings ({sectionSummaries.length})
                </div>
                <div className="flex flex-col gap-1">
                  {sectionSummaries.map(s => (
                    <div key={s.section} className="flex items-baseline gap-2 py-0.5">
                      <span className="min-w-[88px] shrink-0 text-[11px] font-medium" style={{ color: "var(--app-text-muted)" }}>{s.section}</span>
                      <span className="text-[11px] leading-snug" style={{ color: "var(--app-text-secondary)" }}>{s.summary}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settings && !sectionSummaries.length && (
              <div className="mb-5 grid grid-cols-2 gap-3">
                {[
                  ...(settings.primaryInfo.pluralLabel ? [["Plural label", settings.primaryInfo.pluralLabel]] : []),
                  ...(settings.primaryInfo.moduleName ? [["Module", settings.primaryInfo.moduleName]] : []),
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={META_LABEL}>{k}</div>
                    <div style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-5">
              <SectionHeader title="Fields" count={fields.length} icon={Database} iconColor={COLOR.field} />
              {fields.length === 0 && (
                <div className="py-2 text-sm" style={{ color: "var(--app-text-muted)" }}>No fields on this object yet.</div>
              )}
              {fields.map(f => (
                <RowBtn key={f.id} onClick={() => onNodeSelect(f.id)}>
                  <div className="size-1.5 shrink-0 rounded-full" style={{ background: fieldDot(f.fieldType) }} />
                  <span className="flex-1 truncate" style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{f.label}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {f.starred && (
                      <span title="Prominent field" className="inline-flex text-amber-400">
                        <Star className="size-3" fill="currentColor" />
                      </span>
                    )}
                    {f.tracked && (
                      <span title="Field tracking on" className="inline-flex">
                        <FieldTrackBadge active />
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "var(--app-text-muted)" }}>
                      {f.isPrimary ? "Primary" : (f.fieldType ?? "Field")}
                    </span>
                    {f.required && (
                      <span className="text-[10px] font-bold text-destructive">REQ</span>
                    )}
                  </span>
                </RowBtn>
              ))}
            </div>

            {suiteObjectSiblings.length > 1 && (
              <div className="mb-5">
                <SectionHeader title="Suite objects" count={suiteObjectSiblings.length} icon={Database} iconColor={COLOR.objectBright} />
                {suiteObjectSiblings.map(obj => {
                  const active = obj.id === focusObject?.id;
                  const fieldCount = relatedNodes.filter(n => n.type === "field" && n.parentId === obj.id).length;
                  return (
                    <RowBtn
                      key={obj.id}
                      onClick={() => { if (!active) onNodeSelect(obj.id); }}
                      className={active ? "opacity-100" : undefined}
                    >
                      <div
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: "var(--app-graph-object)" }}
                      />
                      <span className="flex-1 truncate" style={{
                        color: "var(--app-text-primary)",
                        fontSize: 12,
                        fontWeight: active ? 650 : 500,
                      }}>
                        {obj.label}
                      </span>
                      <span className="text-xs" style={{ color: "var(--app-text-muted)" }}>
                        {fieldCount} fields
                      </span>
                      {!active && <ChevronRight className="size-2.5" style={{ color: "var(--app-text-muted)" }} />}
                    </RowBtn>
                  );
                })}
              </div>
            )}

            {!isUserCreated && (
              <>
                <div className="mb-5">
                  <SectionHeader title="Layouts" count={layouts.length} icon={AppWindow} iconColor={COLOR.layout} />
                  {layouts.length === 0 && (
                    <div className="py-2 text-sm" style={{ color: "var(--app-text-muted)" }}>No layouts linked yet.</div>
                  )}
                  {layouts.map(l => (
                    <RowBtn key={l.id} onClick={() => onNodeSelect(l.id)}>
                      <div className="size-1.5 shrink-0 rounded-full" style={{ background: COLOR.layout }} />
                      <span className="flex-1" style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{l.label}</span>
                      <span className="text-xs" style={{ color: "var(--app-text-muted)" }}>{l.layoutType ?? "Layout"}</span>
                    </RowBtn>
                  ))}
                </div>

                {assetLists && (
                  <>
                    <div className="mb-5">
                      <SectionHeader title="Loaders" count={assetLists.loaders.length} icon={Loader} iconColor="var(--app-accent-light)" />
                      {assetLists.loaders.map(item => (
                        <div key={item.id} className="mb-0.5 flex items-center gap-2 px-2 py-1.5">
                          <div className="size-1.5 shrink-0 rounded-full bg-primary" />
                          <span className="flex-1" style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{item.label}</span>
                          <span className="text-xs" style={{ color: "var(--app-text-muted)" }}>{item.sub}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mb-5">
                      <SectionHeader title="Data objects" count={assetLists.dataObjects.length} icon={Database} iconColor="var(--app-asset-data)" />
                      {assetLists.dataObjects.map(item => (
                        <div key={item.id} className="mb-0.5 flex items-center gap-2 px-2 py-1.5">
                          <div className="size-1.5 shrink-0 rounded-full" style={{ background: "var(--app-asset-data)" }} />
                          <span className="flex-1" style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{item.label}</span>
                          <span className="text-xs" style={{ color: "var(--app-text-muted)" }}>{item.sub}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mb-2">
                      <SectionHeader title="Applications" count={assetLists.applications.length} icon={AppWindow} iconColor="var(--app-asset-app)" />
                      {assetLists.applications.map(item => (
                        <div key={item.id} className="mb-0.5 flex items-center gap-2 px-2 py-1.5">
                          <div className="size-1.5 shrink-0 rounded-full" style={{ background: "var(--app-asset-app)" }} />
                          <span className="flex-1" style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{item.label}</span>
                          <span className="text-xs" style={{ color: "var(--app-text-muted)" }}>{item.sub}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {node.type === "field" && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3">
              {[
                ["Field Type", node.fieldType ?? "Text"],
                ["Required", node.required ? "Yes" : "No"],
                ...(node.relatedObjectId
                  ? [["Related Object", relatedNodes.find(n => n.id === node.relatedObjectId)?.label ?? node.relatedObjectId]]
                  : []),
                ["Unique", "No"],
                ["Indexed", node.required ? "Yes" : "No"],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={META_LABEL}>{k}</div>
                  <div style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{v}</div>
                </div>
              ))}
            </div>
            {parentObj && (
              <div className="mb-4">
                <SectionHeader title="Parent object" />
                <RowBtn onClick={() => onNodeSelect(parentObj.id)}>
                  <div className="size-2 shrink-0 rounded-full border-[1.5px] bg-transparent" style={{ borderColor: COLOR.objectBright }} />
                  <span className="flex-1" style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{parentObj.label}</span>
                  <ChevronRight className="size-2.5" style={{ color: "var(--app-text-muted)" }} />
                </RowBtn>
              </div>
            )}
            {siblingFields.length > 1 && (
              <div>
                <SectionHeader title="Sibling fields" />
                {siblingFields.filter(f => f.id !== node.id).map(f => (
                  <RowBtn key={f.id} onClick={() => onNodeSelect(f.id)}>
                    <div className="size-1.5 shrink-0 rounded-full" style={{ background: fieldDot(f.fieldType) }} />
                    <span className="flex-1" style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{f.label}</span>
                  </RowBtn>
                ))}
              </div>
            )}
          </>
        )}

        {node.type === "layout" && (
          <div className="mb-5 grid grid-cols-2 gap-3">
            {[
              ["Layout Type", node.layoutType ?? "Layout"],
              ["Status", "Active"],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={META_LABEL}>{k}</div>
                <div style={{ color: "var(--app-text-primary)", fontSize: 12 }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {node.type === "object" && (
        <ObjectAuditBar objectId={node.id} label={node.label} />
      )}
      </>
      )}

      {undeployConfirmOpen && createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center font-sans"
          style={{ background: "var(--app-overlay-blur)", backdropFilter: "blur(3px)", animation: "fadeIn 0.18s ease" }}
          onClick={() => setUndeployConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="undeploy-confirm-title"
            onClick={e => e.stopPropagation()}
            style={{
              width: "min(360px, calc(100% - 48px))",
              maxWidth: "100%",
              borderRadius: 14,
              background: "var(--app-shell-bg-floating)",
              border: "1px solid var(--app-border)",
              boxShadow: "var(--app-popup-shadow)",
              padding: "16px 16px 14px",
              animation: "panelIn 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
            }}
          >
            <div className="flex items-start gap-3" style={{ marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: "var(--app-shell-bg-danger)",
                border: "1px solid var(--app-border-danger)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Undo2 size={16} style={{ color: "var(--app-text-danger)" }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div id="undeploy-confirm-title" style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
                  Un-deploy object?
                </div>
                <p style={{ margin: "6px 0 0", color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.5 }}>
                  This will remove{" "}
                  <span style={{ color: "var(--app-text-primary)", fontWeight: 600 }}>{node.label}</span>
                  {" "}from the graph along with its fields and layouts. This action cannot be undone from here.
                </p>
              </div>
            </div>

            <div
              style={{
                marginBottom: 14,
                borderRadius: 10,
                border: "1px solid var(--app-border-danger)",
                background: "var(--app-shell-bg-danger)",
                padding: "10px 12px",
                color: "var(--app-text-danger)",
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 1.45,
              }}
            >
              Disclaimer: Un-deploying disconnects this object from the application model. Related layouts and field associations on the graph will be cleared.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUndeployConfirmOpen(false)}
                style={BTN_OUTLINE}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "var(--app-shell-bg-hover)";
                  e.currentTarget.style.borderColor = "var(--app-border-strong)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "var(--app-border)";
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setUndeployConfirmOpen(false);
                  onDeleteObject(node.id);
                }}
                style={{
                  ...BTN_OUTLINE,
                  background: "var(--app-text-danger)",
                  borderColor: "var(--app-text-danger)",
                  color: "var(--app-text-on-accent)",
                  fontWeight: 600,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.filter = "brightness(0.92)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.filter = "none";
                }}
              >
                Un-deploy
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
