import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Heart,
  Layers,
  Loader2,
  Monitor,
  Package,
  Pencil,
  ShoppingCart,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import {
  OBJECT_TEMPLATES,
  buildTemplateDrafts,
  templateFieldCount,
  type ObjectTemplate,
  type ObjectTemplateEdge,
  type TemplateObjectDraft,
} from "../data/object-templates";
import {
  CreateObjectWizard,
  wizardFieldToGraph,
  type PanelPreviewEdge,
  type PanelPreviewNode,
  type WizardDraftPayload,
  type WizardEditInitial,
} from "./create-object-wizard";

type Phase = "catalog" | "suite" | "editing" | "deploy";

const TEMPLATE_ICON_MAP = {
  users: Users,
  briefcase: Briefcase,
  barChart: BarChart2,
  layers: Layers,
  cart: ShoppingCart,
  monitor: Monitor,
  heart: Heart,
  package: Package,
} as const;

/** Match Build with AI Agent overlay steps exactly */
const BUILD_STEPS = [
  "Packaging objects",
  "Checking fields",
  "Preparing deploy",
  "Almost ready",
];

const DEPLOY_STEPS = [
  "Preparing cluster",
  "Publishing objects",
  "Wiring relationships",
  "Opening graph",
];

const HEADER_TOP = 0;
const HEADER_H = 56;

const GLASS_CARD = {
  background: "color-mix(in srgb, var(--app-shell-bg-elevated) 78%, transparent)",
  backdropFilter: "blur(14px) saturate(1.1)",
  WebkitBackdropFilter: "blur(14px) saturate(1.1)",
  border: "1px solid var(--app-border)",
  // Elevation only — no inset top highlight (that blocked full hover stroke)
  boxShadow: "var(--app-wizard-floating-shadow)",
} as const;

/** Match Build with AI Agent primary CTA */
const BTN_PRIMARY = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 14px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  background: "var(--app-btn-primary-bg)",
  color: "var(--app-btn-primary-text)",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
  boxShadow: "0 2px 8px var(--app-btn-primary-shadow)",
} as const;

/** Match AI Agent choice chips — accent surface; hover matches selected step tabs */
const CUSTOMIZE_BTN: React.CSSProperties = {
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
  transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease",
};

/** Hover: same filled language as selected customize step tabs */
const CUSTOMIZE_BTN_HOVER = {
  background: "color-mix(in srgb, var(--app-accent) 18%, transparent)",
  borderColor: "color-mix(in srgb, var(--app-accent) 28%, var(--app-border))",
  boxShadow: "none",
  color: "var(--app-accent)",
  fontWeight: "500",
} as const;

function computeSuitePositions(count: number): Array<{ x: number; y: number; z: number }> {
  const N = Math.max(count, 1);
  const CX = 140;
  const CY = 5;
  const CZ = 100;
  const R = Math.min(72, 28 + N * 6);
  return Array.from({ length: N }, (_, i) => ({
    x: CX + R * Math.cos((i / N) * Math.PI * 2),
    y: CY,
    z: CZ + R * Math.sin((i / N) * Math.PI * 2),
  }));
}

function computeFieldPositions(
  ox: number,
  oy: number,
  oz: number,
  totalFields: number,
): Array<{ x: number; y: number; z: number }> {
  const R = 20;
  return Array.from({ length: totalFields }, (_, fi) => ({
    x: ox + R * Math.cos((fi / Math.max(totalFields, 1)) * Math.PI * 2),
    y: oy + (fi % 2 === 0 ? 5 : -5),
    z: oz + R * Math.sin((fi / Math.max(totalFields, 1)) * Math.PI * 2),
  }));
}

function normalizeTemplateEdges(
  tpl: ObjectTemplate,
  drafts: TemplateObjectDraft[],
): ObjectTemplateEdge[] {
  const nameToTitle = Object.fromEntries(
    tpl.objects.map((o, i) => [o.name, drafts[i]?.title ?? o.title ?? o.name]),
  );
  return tpl.objEdges.map(e => ({
    from: nameToTitle[e.from] ?? e.from,
    to: nameToTitle[e.to] ?? e.to,
  }));
}

function draftToEditInitial(d: TemplateObjectDraft): WizardEditInitial {
  return {
    name: d.name,
    title: d.title,
    description: d.description,
    objectType: d.objectType,
    objectSettings: d.objectSettings,
    fields: d.fields.map(f => ({
      id: f.id,
      label: f.label,
      fieldType: f.fieldType,
      required: f.required,
      starred: f.starred,
      tracked: f.tracked,
      isPrimary: f.isPrimary,
      relatedObjectId: f.relatedObjectId,
    })),
  };
}

function StatusOverlay({
  mode,
  steps,
  progress,
  success,
  subtitle,
  successTitle,
}: {
  mode: "build" | "deploy";
  steps: string[];
  progress: number;
  success: boolean;
  subtitle: string;
  successTitle: string;
}) {
  const activeStepIdx = Math.min(
    steps.length - 1,
    Math.floor((progress / 100) * steps.length),
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{ background: "var(--app-shell-bg-overlay)", backdropFilter: "blur(8px)" }}
    >
      <style>{`
        @keyframes tplPopIn{from{transform:scale(0.92);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes tplSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes tplStatusBar{0%{background-position:0% 50%}100%{background-position:200% 50%}}
      `}</style>
      <div
        className="flex flex-col items-center gap-3 text-center"
        style={{
          animation: "tplPopIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
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
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--app-text-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 8px color-mix(in srgb, var(--app-text-success) 18%, transparent)",
              }}
            >
              <Check size={28} strokeWidth={2} style={{ color: "var(--app-text-on-accent)" }} />
            </div>
            <div style={{ color: "var(--app-text-primary)", fontSize: 20, fontWeight: 600 }}>
              {successTitle}
            </div>
            <div
              style={{
                color: "var(--app-text-muted)",
                fontSize: 13,
                fontWeight: 400,
                lineHeight: 1.45,
              }}
            >
              {subtitle}
            </div>
            <div style={{ color: "var(--app-accent-light)", fontSize: 13, fontWeight: 550 }}>
              {mode === "build" ? "Opening deploy review…" : "Opening your cluster on the graph…"}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                flexShrink: 0,
                border: "3px solid var(--app-border-accent)",
                borderTopColor: "var(--app-accent)",
                animation: "tplSpin 0.8s linear infinite",
                boxSizing: "border-box",
              }}
            />
            <div style={{ color: "var(--app-text-primary)", fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>
              {mode === "deploy" ? "Deploying objects…" : "Building objects…"}
            </div>
            <div
              style={{
                color: "var(--app-text-muted)",
                fontSize: 13,
                fontWeight: 500,
                lineHeight: 1.45,
                marginBottom: 4,
              }}
            >
              {steps[activeStepIdx]}
            </div>
            <div
              style={{
                width: "100%",
                height: 6,
                borderRadius: 999,
                overflow: "hidden",
                background: "var(--app-border-subtle)",
                marginTop: 4,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(8, progress)}%`,
                  borderRadius: 999,
                  background:
                    "linear-gradient(90deg, var(--app-accent), var(--app-accent-light), var(--app-graph-field), var(--app-accent))",
                  backgroundSize: "200% 100%",
                  animation: "tplStatusBar 1.4s linear infinite",
                  transition: "width 0.25s ease",
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5" style={{ width: "100%", marginTop: 10, textAlign: "left" }}>
              {steps.map((step, i) => {
                const done = i < activeStepIdx || progress >= 100;
                const active = i === activeStepIdx && progress < 100;
                return (
                  <div key={step} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                    <span style={{ width: 14, display: "inline-flex", justifyContent: "center" }}>
                      {done ? (
                        <Check size={12} style={{ color: "var(--app-text-success)" }} />
                      ) : active ? (
                        <Loader2
                          size={12}
                          style={{ color: "var(--app-accent)", animation: "tplSpin 0.8s linear infinite" }}
                        />
                      ) : (
                        <Circle size={8} style={{ color: "var(--app-text-subtle)" }} />
                      )}
                    </span>
                    <span
                      style={{
                        color: done || active ? "var(--app-text-primary)" : "var(--app-text-subtle)",
                        fontWeight: active ? 600 : 500,
                      }}
                    >
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
  );
}

export function CreateObjectTemplatePanel({
  onClose,
  onObjectCreated,
  onPreviewChange,
  onCameraFlyTo: _onCameraFlyTo,
  existingApiNames = [],
}: {
  onClose: () => void;
  onObjectCreated?: (obj: unknown) => void;
  onPreviewChange?: (nodes: PanelPreviewNode[], edges: PanelPreviewEdge[]) => void;
  onCameraFlyTo?: (x: number, y: number, z: number) => void;
  existingApiNames?: string[];
}) {
  const onPreviewChangeRef = useRef(onPreviewChange);
  useEffect(() => {
    onPreviewChangeRef.current = onPreviewChange;
  });

  const [phase, setPhase] = useState<Phase>("catalog");
  const [selected, setSelected] = useState<ObjectTemplate | null>(null);
  const [drafts, setDrafts] = useState<TemplateObjectDraft[]>([]);
  const [suiteEdges, setSuiteEdges] = useState<ObjectTemplateEdge[]>([]);
  const [editingIndex, setEditingIndex] = useState(0);

  const [suiteBuilt, setSuiteBuilt] = useState(false);
  const [building, setBuilding] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [statusOverlay, setStatusOverlay] = useState<"build" | "deploy" | null>(null);
  const [statusProgress, setStatusProgress] = useState(0);
  const [statusSuccess, setStatusSuccess] = useState(false);
  const [inspectedDeployObj, setInspectedDeployObj] = useState<number | null>(0);

  const editingDraft = drafts[editingIndex] ?? null;

  const totalFields = useMemo(
    () => drafts.reduce((sum, d) => sum + d.fields.length, 0),
    [drafts],
  );

  const customizedCount = useMemo(
    () => drafts.filter(d => d.customized).length,
    [drafts],
  );

  const emitSuitePreview = useCallback(
    (tpl: ObjectTemplate, draftList: TemplateObjectDraft[], edges: ObjectTemplateEdge[]) => {
      const cb = onPreviewChangeRef.current;
      if (!cb || draftList.length === 0) {
        cb?.([], []);
        return;
      }

      const nodes: PanelPreviewNode[] = [];
      const previewEdges: PanelPreviewEdge[] = [];
      const positions = computeSuitePositions(draftList.length);
      const titleToId: Record<string, string> = {};

      draftList.forEach((obj, oi) => {
        const pos = positions[oi];
        const objId = `__tpl_${tpl.id}_obj${oi}__`;
        titleToId[obj.title] = objId;

        nodes.push({
          id: objId,
          type: "object",
          label: obj.title,
          isPreview: true,
          x3d: pos.x,
          y3d: pos.y,
          z3d: pos.z,
        } as PanelPreviewNode & { x3d: number; y3d: number; z3d: number });

        const fieldPositions = computeFieldPositions(pos.x, pos.y, pos.z, obj.fields.length);
        obj.fields.forEach((f, fi) => {
          const fid = `__tpl_${tpl.id}_obj${oi}_f${fi}__`;
          const fpos = fieldPositions[fi];
          const graphType = wizardFieldToGraph(f.fieldType, f.isPrimary);
          nodes.push({
            id: fid,
            type: "field",
            label: f.label,
            fieldType: graphType,
            required: f.required,
            parentId: objId,
            isPreview: true,
            x3d: fpos.x,
            y3d: fpos.y,
            z3d: fpos.z,
          } as PanelPreviewNode & { x3d: number; y3d: number; z3d: number });
          previewEdges.push({
            id: `__tpl_ef_${tpl.id}_${oi}_${fi}__`,
            from: objId,
            to: fid,
            type: "obj-field",
          });
        });
      });

      edges.forEach((e, i) => {
        const fromId = titleToId[e.from];
        const toId = titleToId[e.to];
        if (fromId && toId) {
          previewEdges.push({
            id: `__tpl_eo_${tpl.id}_${i}__`,
            from: fromId,
            to: toId,
            type: "obj-obj",
          });
        }
      });

      cb(nodes, previewEdges);
    },
    [],
  );

  useEffect(() => {
    if (phase === "catalog") {
      onPreviewChangeRef.current?.([], []);
      return;
    }
    if ((phase === "suite" || phase === "deploy") && selected) {
      emitSuitePreview(selected, drafts, suiteEdges);
    }
  }, [phase, selected, drafts, suiteEdges, emitSuitePreview]);

  useEffect(() => () => onPreviewChangeRef.current?.([], []), []);

  const clearSuite = useCallback(() => {
    setSelected(null);
    setDrafts([]);
    setSuiteEdges([]);
    setEditingIndex(0);
    setSuiteBuilt(false);
  }, []);

  const backToCatalog = useCallback(() => {
    clearSuite();
    setPhase("catalog");
    onPreviewChangeRef.current?.([], []);
  }, [clearSuite]);

  const selectTemplate = useCallback((tpl: ObjectTemplate) => {
    const nextDrafts = buildTemplateDrafts(tpl);
    const edges = normalizeTemplateEdges(tpl, nextDrafts);
    setSelected(tpl);
    setDrafts(nextDrafts);
    setSuiteEdges(edges);
    setEditingIndex(0);
    setSuiteBuilt(false);
    setPhase("suite");
  }, []);

  const openCustomize = useCallback((index: number) => {
    setEditingIndex(index);
    setPhase("editing");
  }, []);

  const handleSaveDraft = useCallback(
    (payload: WizardDraftPayload) => {
      const idx = editingIndex;
      const current = drafts[idx];
      if (!current) return;

      const updated: TemplateObjectDraft = {
        ...current,
        name: payload.name.trim() || current.name,
        title: payload.title.trim() || current.title,
        description: payload.description,
        objectType: payload.objectType as TemplateObjectDraft["objectType"],
        objectSettings: payload.objectSettings,
        fields: payload.fields.map((f, fi) => ({
          id: current.fields[fi]?.id ?? `${current.key}_f${fi}`,
          label: f.label,
          fieldType: f.fieldType,
          required: f.required,
          starred: f.starred,
          tracked: f.tracked,
          isPrimary: f.isPrimary,
          relatedObjectId: f.relatedObjectId,
        })),
        customized: true,
      };

      setDrafts(prev => prev.map((d, i) => (i === idx ? updated : d)));
      setSuiteBuilt(false);
      // Return to suite via wizard onClose after save confirmation
    },
    [editingIndex, drafts],
  );

  const wizardExistingNames = useMemo(() => {
    const others = drafts
      .filter((_, i) => i !== editingIndex)
      .map(d => d.name.trim().toLowerCase())
      .filter(Boolean);
    return [...existingApiNames.map(n => n.toLowerCase()), ...others];
  }, [drafts, editingIndex, existingApiNames]);

  const wizardAvailableObjects = useMemo(
    () =>
      drafts
        .filter((_, i) => i !== editingIndex)
        .map(d => ({
          id: d.title,
          label: d.title,
          apiName: d.name,
        })),
    [drafts, editingIndex],
  );

  const handleWizardClose = useCallback(() => {
    setPhase("suite");
  }, []);

  const handleBuild = useCallback(() => {
    if (!selected || building || deploying || drafts.length === 0) return;
    setBuilding(true);
    setStatusSuccess(false);
    setStatusOverlay("build");
    setStatusProgress(0);
    const loadMs = 6100;
    const tick = window.setInterval(() => {
      setStatusProgress(p => Math.min(100, p + 4));
    }, loadMs / 28);
    window.setTimeout(() => {
      window.clearInterval(tick);
      setStatusProgress(100);
      setBuilding(false);
      setStatusSuccess(true);
      setSuiteBuilt(true);
      window.setTimeout(() => {
        setStatusSuccess(false);
        setStatusOverlay(null);
        setStatusProgress(0);
        setInspectedDeployObj(0);
        setPhase("deploy");
      }, 1400);
    }, loadMs);
  }, [selected, building, deploying, drafts.length]);

  const handleDeploy = useCallback(() => {
    if (!selected || !suiteBuilt || deploying || building) return;
    setDeploying(true);
    setStatusSuccess(false);
    setStatusOverlay("deploy");
    setStatusProgress(0);
    const loadMs = 6200;
    const tick = window.setInterval(() => {
      setStatusProgress(p => Math.min(100, p + 4));
    }, loadMs / 28);

    const payload = {
      isTemplate: true as const,
      templateId: selected.id,
      objects: drafts.map(d => ({
        name: d.title,
        description: d.description,
        objectType: d.objectType,
        objectSettings: d.objectSettings,
        fields: d.fields.map((f, fi) => ({
          label: f.label,
          type: wizardFieldToGraph(f.fieldType, f.isPrimary),
          fieldType: wizardFieldToGraph(f.fieldType, f.isPrimary),
          required: f.required,
          starred: f.starred,
          tracked: f.tracked,
          isPrimary: f.isPrimary || fi === 0,
          relatedObjectId: f.relatedObjectId,
        })),
      })),
      objEdges: suiteEdges,
    };

    window.setTimeout(() => {
      window.clearInterval(tick);
      setStatusProgress(100);
      setDeploying(false);
      setStatusSuccess(true);

      window.setTimeout(() => {
        onPreviewChangeRef.current?.([], []);
        onObjectCreated?.(payload);
        onClose();
      }, 900);
    }, loadMs);
  }, [selected, suiteBuilt, deploying, building, drafts, suiteEdges, onObjectCreated, onClose]);

  const TemplateIcon = selected ? TEMPLATE_ICON_MAP[selected.icon] : null;

  const overlaySubtitle = selected
    ? `${selected.name} · ${drafts.length} objects · ${totalFields} fields · ${suiteEdges.length} relationships`
    : "";

  const suiteMeta = selected
    ? `${drafts.length} objects · ${totalFields} fields · ${suiteEdges.length} relationships`
    : "";

  return (
    <>
      <style>{`
        @keyframes tplCardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes wizFade{from{opacity:0}to{opacity:1}}
        .tpl-suite-scroll::-webkit-scrollbar{width:6px}
        .tpl-suite-scroll::-webkit-scrollbar-thumb{background:var(--app-scrollbar-thumb);border-radius:999px}
      `}</style>

      {phase === "catalog" && (
        <div
          aria-hidden
          className="fixed inset-0 z-[59] pointer-events-none"
          style={{
            background: "color-mix(in srgb, var(--app-shell-bg) 55%, transparent)",
            backdropFilter: "blur(6px) saturate(0.85)",
            WebkitBackdropFilter: "blur(6px) saturate(0.85)",
          }}
        />
      )}

      {phase === "catalog" && (
        <div
          className="fixed z-[62] left-0 right-0 flex items-center gap-3 px-5 font-sans"
          style={{
            top: HEADER_TOP,
            height: HEADER_H,
            background: "var(--app-shell-bg-elevated)",
            borderBottom: "1px solid var(--app-border)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 shrink-0"
            style={{
              color: "var(--app-text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              padding: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "var(--app-text-primary)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "var(--app-text-muted)";
            }}
          >
            <ArrowLeft size={13} />
            Back
          </button>

          <div style={{ width: 1, height: 20, background: "var(--app-border)", flexShrink: 0 }} />

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Sparkles size={14} style={{ color: "var(--app-accent)", flexShrink: 0 }} />
            <span style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600 }}>
              Use Template
            </span>
            <span style={{ color: "var(--app-text-muted)", fontSize: 11, fontWeight: 400 }}>
              ERP & SaaS starters
            </span>
          </div>
        </div>
      )}

      {phase === "catalog" && (
        <div
          className="fixed z-[60] left-0 right-0 overflow-y-auto font-sans"
          style={{
            top: HEADER_TOP + HEADER_H,
            bottom: 0,
            background: "color-mix(in srgb, var(--app-shell-bg-elevated) 12%, transparent)",
          }}
        >
          <div className="max-w-[1120px] mx-auto px-6 py-6">
            <p
              style={{
                color: "var(--app-text-muted)",
                fontSize: 13,
                fontWeight: 400,
                lineHeight: 1.55,
                margin: "0 0 20px",
              }}
            >
              Pick a pre-built object suite for your app. You&apos;ll review the full package together on the
              graph, customize individual objects only if you need to, then build and deploy the cluster.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 14,
              }}
            >
              {OBJECT_TEMPLATES.map((tpl, i) => {
                const Icon = TEMPLATE_ICON_MAP[tpl.icon];
                const objCount = tpl.objects.length;
                const fieldCount = templateFieldCount(tpl);
                const chips = tpl.objects.slice(0, 3).map(o => o.title?.trim() || o.name);
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => selectTemplate(tpl)}
                    className="text-left"
                    style={{
                      animation: `tplCardIn 0.28s ease ${i * 0.04}s both`,
                      padding: "16px 16px 14px",
                      borderRadius: 14,
                      cursor: "pointer",
                      transition: "border-color 0.15s, transform 0.15s",
                      ...GLASS_CARD,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = tpl.accentColor;
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--app-border)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 11,
                          background: `color-mix(in srgb, ${tpl.accentColor} 14%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${tpl.accentColor} 30%, var(--app-border))`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={18} style={{ color: tpl.accentColor }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600 }}>
                            {tpl.name}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              padding: "2px 7px",
                              borderRadius: 999,
                              background: "var(--app-border-subtle)",
                              color: "var(--app-text-secondary)",
                              border: "1px solid var(--app-border)",
                            }}
                          >
                            {tpl.category}
                          </span>
                        </div>
                        <div
                          style={{
                            color: "var(--app-text-secondary)",
                            fontSize: 12,
                            fontWeight: 400,
                            marginTop: 4,
                          }}
                        >
                          {tpl.tagline}
                        </div>
                      </div>
                      <ChevronRight size={14} style={{ color: "var(--app-text-subtle)", marginTop: 4 }} />
                    </div>
                    <p
                      title={tpl.description}
                      style={{
                        color: "var(--app-text-muted)",
                        fontSize: 11,
                        fontWeight: 400,
                        lineHeight: 1.45,
                        margin: "10px 0 0",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        wordBreak: "break-word",
                        maxHeight: "calc(1.45em * 2)",
                      }}
                    >
                      {tpl.description}
                    </p>
                    <div
                      style={{
                        color: "var(--app-text-subtle)",
                        fontSize: 10,
                        fontWeight: 400,
                        marginTop: 10,
                      }}
                    >
                      {objCount} objects · {fieldCount} fields · {tpl.objEdges.length} relationships
                    </div>
                    <div className="flex flex-wrap gap-1.5" style={{ marginTop: 10 }}>
                      {chips.map(chip => (
                        <span
                          key={chip}
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: `color-mix(in srgb, ${tpl.accentColor} 12%, var(--app-shell-bg-input))`,
                            border: `1px solid color-mix(in srgb, ${tpl.accentColor} 22%, var(--app-border))`,
                            color: "var(--app-text-secondary)",
                          }}
                        >
                          {chip}
                        </span>
                      ))}
                      {objCount > 3 && (
                        <span style={{ fontSize: 10, color: "var(--app-text-subtle)", alignSelf: "center" }}>
                          +{objCount - 3} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {phase === "suite" && selected && TemplateIcon && (
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
            className="flex items-center gap-3 px-5 shrink-0"
            style={{
              top: HEADER_TOP,
              height: HEADER_H,
              background: "var(--app-shell-bg-elevated)",
              borderBottom: "1px solid var(--app-border)",
            }}
          >
            <button
              type="button"
              onClick={backToCatalog}
              className="flex items-center gap-1.5 shrink-0"
              style={{
                color: "var(--app-text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                padding: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "var(--app-text-primary)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "var(--app-text-muted)";
              }}
            >
              <ArrowLeft size={13} />
              Templates
            </button>

            <div style={{ width: 1, height: 20, background: "var(--app-border)", flexShrink: 0 }} />

            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `color-mix(in srgb, ${selected.accentColor} 18%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${selected.accentColor} 28%, var(--app-border))`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <TemplateIcon size={14} style={{ color: selected.accentColor }} />
              </div>
              <span
                style={{
                  color: "var(--app-text-primary)",
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {selected.name}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "var(--app-border-subtle)",
                  color: "var(--app-text-secondary)",
                  border: "1px solid var(--app-border)",
                  flexShrink: 0,
                }}
              >
                {selected.category}
              </span>
              <span
                className="hidden sm:inline"
                style={{
                  color: "var(--app-text-subtle)",
                  fontSize: 11,
                  fontWeight: 500,
                  marginLeft: 4,
                  whiteSpace: "nowrap",
                }}
              >
                {suiteMeta}
              </span>
              {suiteBuilt && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: "var(--app-text-success)",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={11} />
                  BUILT
                </span>
              )}
              {customizedCount > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: "color-mix(in srgb, var(--app-accent) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--app-accent) 28%, var(--app-border))",
                    color: "var(--app-accent-light)",
                    flexShrink: 0,
                  }}
                >
                  {customizedCount} edited
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!suiteBuilt ? (
                <button
                  type="button"
                  onClick={handleBuild}
                  disabled={building || deploying}
                  style={{
                    ...BTN_PRIMARY,
                    flexShrink: 0,
                    ...(building || deploying
                      ? {
                          background: "var(--app-border-subtle)",
                          color: "var(--app-text-subtle)",
                          boxShadow: "none",
                          cursor: "not-allowed",
                        }
                      : {}),
                  }}
                >
                  {building ? "Building…" : "Build"}
                  {!building && <ChevronRight size={15} strokeWidth={2.6} />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPhase("deploy")}
                  style={{ ...BTN_PRIMARY, flexShrink: 0 }}
                >
                  Review deploy
                  <ChevronRight size={15} strokeWidth={2.6} />
                </button>
              )}
            </div>
          </div>

          <main
            className="tpl-suite-scroll flex-1 min-h-0 overflow-y-auto"
            style={{ padding: "28px 24px 40px" }}
          >
            <div className="mx-auto" style={{ maxWidth: 960, width: "100%" }}>
              <div
                style={{
                  marginBottom: 28,
                  padding: "22px 24px",
                  borderRadius: 16,
                  background: "var(--app-deploy-card-bg)",
                  border: "1px solid var(--app-border)",
                  boxShadow: "var(--app-wizard-floating-shadow)",
                }}
              >
                <div
                  style={{
                    color: "var(--app-text-secondary)",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  {selected.tagline}
                </div>
                <p
                  style={{
                    color: "var(--app-text-muted)",
                    fontSize: 14,
                    fontWeight: 400,
                    lineHeight: 1.6,
                    margin: "0 0 14px",
                  }}
                >
                  {selected.description}
                </p>
                <p
                  style={{
                    color: "var(--app-text-muted)",
                    fontSize: 12,
                    fontWeight: 400,
                    lineHeight: 1.55,
                    margin: 0,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "var(--app-shell-bg-subtle)",
                    border: "1px solid var(--app-border-subtle)",
                  }}
                >
                  This starter adds a connected set of objects. Review the package, customize any object if
                  needed, then build and deploy.
                </p>
              </div>

              {suiteEdges.length > 0 && (
                <section style={{ marginBottom: 28 }}>
                  <h2
                    style={{
                      color: "var(--app-text-primary)",
                      fontSize: 13,
                      fontWeight: 600,
                      margin: "0 0 12px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Relationships
                  </h2>
                  <div
                    className="flex flex-wrap gap-2"
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "color-mix(in srgb, var(--app-stat-link-soft) 55%, var(--app-shell-bg-elevated))",
                      border: "1px solid color-mix(in srgb, var(--app-stat-link) 22%, var(--app-border))",
                    }}
                  >
                    {suiteEdges.map((edge, i) => (
                      <div
                        key={`${edge.from}-${edge.to}-${i}`}
                        className="inline-flex items-center gap-2"
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: "var(--app-shell-bg-elevated)",
                          border: "1px solid var(--app-border)",
                          color: "var(--app-text-secondary)",
                        }}
                      >
                        <span style={{ color: "var(--app-text-primary)" }}>{edge.from}</span>
                        <ArrowRight size={12} style={{ color: "var(--app-stat-link)", flexShrink: 0 }} />
                        <span style={{ color: "var(--app-text-primary)" }}>{edge.to}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-end justify-between gap-3" style={{ marginBottom: 14 }}>
                  <h2
                    style={{
                      color: "var(--app-text-primary)",
                      fontSize: 13,
                      fontWeight: 600,
                      margin: 0,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Object package
                  </h2>
                  <span style={{ color: "var(--app-text-subtle)", fontSize: 11, fontWeight: 500 }}>
                    {suiteMeta}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 14,
                  }}
                >
                  {drafts.map((draft, oi) => {
                    const fieldChips = draft.fields.slice(0, 4).map(f => f.label);
                    return (
                      <article
                        key={draft.key}
                        style={{
                          padding: "16px 16px 14px",
                          borderRadius: 14,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          height: "100%",
                          minHeight: 0,
                          boxSizing: "border-box",
                          ...GLASS_CARD,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3
                                style={{
                                  color: "var(--app-text-primary)",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  margin: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  minWidth: 0,
                                  maxWidth: "100%",
                                }}
                                title={draft.title}
                              >
                                {draft.title}
                              </h3>
                              {draft.customized && (
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    letterSpacing: "0.07em",
                                    padding: "2px 6px",
                                    borderRadius: 999,
                                    background: "color-mix(in srgb, var(--app-accent) 14%, transparent)",
                                    color: "var(--app-accent-light)",
                                    border: "1px solid color-mix(in srgb, var(--app-accent) 30%, var(--app-border))",
                                  }}
                                >
                                  Edited
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 6 }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "3px 8px",
                                  borderRadius: 999,
                                  background: "var(--app-border-subtle)",
                                  border: "1px solid var(--app-border)",
                                  color: "var(--app-text-secondary)",
                                }}
                              >
                                {draft.objectType}
                              </span>
                              <span style={{ color: "var(--app-text-subtle)", fontSize: 10, fontWeight: 500 }}>
                                {draft.fields.length} fields
                              </span>
                            </div>
                          </div>
                        </div>

                        <p
                          title={draft.description || "No description"}
                          style={{
                            color: "var(--app-text-muted)",
                            fontSize: 12,
                            fontWeight: 400,
                            lineHeight: 1.45,
                            margin: 0,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            wordBreak: "break-word",
                            flex: "0 0 auto",
                            maxHeight: "calc(1.45em * 2)",
                          }}
                        >
                          {draft.description || "No description"}
                        </p>

                        <div className="flex flex-wrap gap-1.5" style={{ flex: "1 1 auto", alignContent: "flex-start" }}>
                          {fieldChips.map(label => (
                            <span
                              key={label}
                              title={label}
                              style={{
                                fontSize: 10,
                                fontWeight: 500,
                                padding: "3px 8px",
                                borderRadius: 999,
                                background: "transparent",
                                border: "1px solid var(--app-border)",
                                color: "var(--app-text-secondary)",
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {label}
                            </span>
                          ))}
                          {draft.fields.length > 4 && (
                            <span style={{ fontSize: 10, color: "var(--app-text-subtle)", alignSelf: "center" }}>
                              +{draft.fields.length - 4}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => openCustomize(oi)}
                          style={{ ...CUSTOMIZE_BTN, marginTop: "auto", flexShrink: 0 }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = CUSTOMIZE_BTN_HOVER.background;
                            e.currentTarget.style.borderColor = CUSTOMIZE_BTN_HOVER.borderColor;
                            e.currentTarget.style.boxShadow = CUSTOMIZE_BTN_HOVER.boxShadow;
                            e.currentTarget.style.color = CUSTOMIZE_BTN_HOVER.color;
                            e.currentTarget.style.fontWeight = CUSTOMIZE_BTN_HOVER.fontWeight;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = String(CUSTOMIZE_BTN.background);
                            e.currentTarget.style.borderColor = "var(--app-border-accent)";
                            e.currentTarget.style.boxShadow = String(CUSTOMIZE_BTN.boxShadow);
                            e.currentTarget.style.color = String(CUSTOMIZE_BTN.color);
                            e.currentTarget.style.fontWeight = String(CUSTOMIZE_BTN.fontWeight);
                          }}
                        >
                          <Pencil size={14} style={{ color: "var(--app-accent)", flexShrink: 0 }} />
                          <span style={{ flex: 1, minWidth: 0, fontWeight: "inherit" }}>Customize</span>
                          <ChevronRight size={15} strokeWidth={2.6} style={{ color: "var(--app-accent)", flexShrink: 0 }} />
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>

              {suiteBuilt && (
                <div
                  style={{
                    marginTop: 28,
                    padding: "16px 18px",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    background: "color-mix(in srgb, var(--app-text-success) 8%, var(--app-shell-bg-elevated))",
                    border: "1px solid color-mix(in srgb, var(--app-text-success) 28%, var(--app-border))",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "var(--app-text-success)",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Package built
                    </div>
                    <div style={{ color: "var(--app-text-muted)", fontSize: 12, fontWeight: 400 }}>
                      Review the validated cluster, then deploy objects to your graph.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhase("deploy")}
                    style={{ ...BTN_PRIMARY }}
                  >
                    Review deploy
                    <ChevronRight size={14} strokeWidth={2.6} />
                  </button>
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {phase === "deploy" && selected && (
        <div
          className="fixed inset-0 z-[60] flex flex-col font-sans"
          style={{
            background: "color-mix(in srgb, var(--app-shell-bg-elevated) 86%, transparent)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            animation: "wizFade 0.22s ease",
          }}
        >
          <style>{`
            @keyframes wizFade{from{opacity:0}to{opacity:1}}
            .tpl-deploy-scroll::-webkit-scrollbar{width:6px}
            .tpl-deploy-scroll::-webkit-scrollbar-thumb{background:var(--app-scrollbar-thumb);border-radius:999px}
          `}</style>
          <div
            className="flex items-center gap-3 px-5 shrink-0"
            style={{
              height: HEADER_H,
              background: "var(--app-shell-bg-elevated)",
              borderBottom: "1px solid var(--app-border)",
            }}
          >
            <button
              type="button"
              onClick={() => setPhase("suite")}
              className="flex items-center gap-1.5 shrink-0"
              style={{
                color: "var(--app-text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                padding: 0,
              }}
            >
              <ArrowLeft size={13} />
              Suite
            </button>
            <div style={{ width: 1, height: 20, background: "var(--app-border)", flexShrink: 0 }} />
            <div className="min-w-0 flex-1">
              <div style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600 }}>
                Create objects
              </div>
              <div style={{ color: "var(--app-text-muted)", fontSize: 12 }}>
                Use Template · {selected.name}
              </div>
            </div>
            <button
              type="button"
              onClick={handleDeploy}
              disabled={deploying || building || !suiteBuilt}
              style={{
                ...BTN_PRIMARY,
                flexShrink: 0,
                ...(deploying || building || !suiteBuilt
                  ? {
                      background: "var(--app-border-subtle)",
                      color: "var(--app-text-subtle)",
                      boxShadow: "none",
                      cursor: "not-allowed",
                    }
                  : {}),
              }}
            >
              <Zap size={14} />
              <span>{deploying ? "Deploying…" : "Deploy objects"}</span>
              <ChevronRight size={15} strokeWidth={2.6} style={{ marginLeft: 6 }} />
            </button>
          </div>

          <div className="flex flex-1 min-h-0 justify-center">
            <main
              className="tpl-deploy-scroll overflow-y-auto flex-1 min-w-0"
              style={{ padding: "28px clamp(20px, 4vw, 56px)" }}
            >
              <div
                style={{
                  maxWidth: 760,
                  width: "100%",
                  margin: "0 auto",
                  borderRadius: 18,
                  background: "var(--app-deploy-card-bg)",
                  border: "1px solid var(--app-border)",
                  boxShadow: "var(--app-wizard-floating-shadow)",
                  boxSizing: "border-box",
                  overflow: "hidden",
                  animation: "wizFade 0.28s ease",
                }}
              >
                <div
                  style={{
                    padding: "22px clamp(20px, 3vw, 32px) 18px",
                    background: "var(--app-deploy-card-header)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            padding: "5px 11px",
                            borderRadius: 999,
                            background:
                              "color-mix(in srgb, var(--app-text-success) 12%, var(--app-shell-bg-elevated))",
                            border:
                              "1px solid color-mix(in srgb, var(--app-text-success) 35%, transparent)",
                            color: "var(--app-text-success)",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              flexShrink: 0,
                              border: "1.5px solid color-mix(in srgb, currentColor 45%, transparent)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "currentColor",
                              }}
                            />
                          </span>
                          Validated & ready
                        </span>
                      </div>
                      <div
                        style={{
                          color: "var(--app-text-primary)",
                          fontSize: 22,
                          fontWeight: 600,
                          letterSpacing: "-0.02em",
                          marginBottom: 6,
                        }}
                      >
                        {selected.name.replace(/\s*Suite\s*$/i, "").trim() || selected.name} cluster
                      </div>
                      <div
                        style={{
                          color: "var(--app-text-muted)",
                          fontSize: 13,
                          lineHeight: 1.55,
                          maxWidth: 560,
                        }}
                      >
                        <span style={{ color: "var(--app-text-secondary)", fontWeight: 600 }}>
                          Category · {selected.category}
                        </span>
                        {" — "}
                        this deploy publishes a {selected.category.toLowerCase()} data model for your
                        app:{" "}
                        {drafts.map(d => d.title).filter(Boolean).join(", ") || "your staged objects"}
                        {drafts.length ? "." : ""} Each object ships with its fields
                        {suiteEdges.length > 0 ? " and relationships" : ""} so the cluster is ready to
                        use on the graph.
                      </div>
                    </div>
                    <button
                      type="button"
                      title="Customize suite"
                      aria-label="Customize suite"
                      onClick={() => setPhase("suite")}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        border: "1px solid var(--app-border)",
                        background: "var(--app-shell-bg-elevated)",
                        color: "var(--app-text-secondary)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                  </div>

                  <div
                    className="grid gap-2.5"
                    style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", marginTop: 18 }}
                  >
                    {[
                      {
                        label: "Objects",
                        value: drafts.length,
                        tone: "var(--app-stat-object)",
                        soft: "var(--app-stat-object-soft)",
                      },
                      {
                        label: "Fields",
                        value: totalFields,
                        tone: "var(--app-stat-field)",
                        soft: "var(--app-stat-field-soft)",
                      },
                      {
                        label: "Relationships",
                        value: suiteEdges.length,
                        tone: "var(--app-stat-link)",
                        soft: "var(--app-stat-link-soft)",
                      },
                      {
                        label: "Validation",
                        value: "Passed",
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
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 3,
                            background: stat.tone,
                            borderRadius: "3px 0 0 3px",
                          }}
                        />
                        <div
                          style={{
                            color: "var(--app-stat-label)",
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            marginBottom: 4,
                          }}
                        >
                          {stat.label.toUpperCase()}
                        </div>
                        <div
                          style={{
                            color:
                              typeof stat.value === "string"
                                ? stat.tone
                                : "var(--app-text-primary)",
                            fontSize: typeof stat.value === "number" ? 24 : 15,
                            fontWeight: 600,
                            letterSpacing:
                              typeof stat.value === "number" ? "-0.02em" : undefined,
                          }}
                        >
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: "20px clamp(20px, 3vw, 32px) 28px" }}>
                  <div
                    className="flex items-center justify-between gap-3"
                    style={{ marginBottom: 12 }}
                  >
                    <div
                      style={{
                        color: "var(--app-text-secondary)",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                      }}
                    >
                      Cluster objects
                    </div>
                    <div style={{ color: "var(--app-text-subtle)", fontSize: 11 }}>
                      Tap an object to inspect fields
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {drafts.map((obj, oi) => {
                      const open = inspectedDeployObj === oi;
                      return (
                        <div
                          key={obj.key}
                          style={{
                            borderRadius: 14,
                            border: "1px solid var(--app-border)",
                            background: open
                              ? "var(--app-ai-row-tint)"
                              : "var(--app-shell-bg-elevated)",
                            overflow: "hidden",
                            boxShadow: "none",
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
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 9,
                                flexShrink: 0,
                                background:
                                  "color-mix(in srgb, var(--app-graph-object) 16%, transparent)",
                                border:
                                  "1px solid color-mix(in srgb, var(--app-graph-object) 32%, transparent)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--app-graph-object)",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {oi + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                style={{
                                  color: "var(--app-text-primary)",
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                {obj.title}
                              </div>
                              <div
                                style={{
                                  color: "var(--app-text-muted)",
                                  fontSize: 11,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {obj.description || "No description"}
                              </div>
                            </div>
                            <div
                              style={{
                                padding: "3px 8px",
                                borderRadius: 999,
                                background: "var(--app-shell-bg-subtle)",
                                border: "1px solid var(--app-border-subtle)",
                                color: "var(--app-text-muted)",
                                fontSize: 10,
                                fontWeight: 600,
                                flexShrink: 0,
                              }}
                            >
                              {obj.fields.length} fields
                            </div>
                            {open ? (
                              <ChevronDown size={14} style={{ color: "var(--app-text-muted)" }} />
                            ) : (
                              <ChevronRight size={14} style={{ color: "var(--app-text-muted)" }} />
                            )}
                          </button>
                          {open && (
                            <div
                              style={{
                                padding: "0 14px 14px",
                                borderTop: "1px solid var(--app-border-subtle)",
                              }}
                            >
                              <div
                                style={{
                                  color: "var(--app-text-subtle)",
                                  fontSize: 10,
                                  fontWeight: 600,
                                  letterSpacing: "0.06em",
                                  margin: "12px 0 8px",
                                }}
                              >
                                FIELDS
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {obj.fields.map(f => (
                                  <span
                                    key={f.id}
                                    style={{
                                      padding: "5px 9px",
                                      borderRadius: 8,
                                      border: "1px solid var(--app-border-subtle)",
                                      background: "var(--app-shell-bg-subtle)",
                                      color: "var(--app-text-secondary)",
                                      fontSize: 11,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {f.label}
                                  </span>
                                ))}
                              </div>
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
      )}

      {phase === "editing" && editingDraft && (
        <CreateObjectWizard
          key={editingDraft.key}
          onClose={handleWizardClose}
          onPreviewChange={onPreviewChange}
          editInitial={draftToEditInitial(editingDraft)}
          existingApiNames={wizardExistingNames}
          availableObjects={wizardAvailableObjects}
          onSaveDraft={handleSaveDraft}
          draftSaveLabel="Save object"
        />
      )}

      {statusOverlay && (
        <StatusOverlay
          mode={statusOverlay}
          steps={statusOverlay === "build" ? BUILD_STEPS : DEPLOY_STEPS}
          progress={statusProgress}
          success={statusSuccess}
          successTitle={statusOverlay === "build" ? "Build successful" : "Successfully created"}
          subtitle={overlaySubtitle}
        />
      )}
    </>
  );
}