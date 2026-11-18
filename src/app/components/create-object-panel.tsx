import { useState, useCallback, useEffect, useRef } from "react";
import { useDrag } from "react-dnd";

const INPUT: React.CSSProperties = {
  width: "100%", background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border-strong)",
  borderRadius: 8, padding: "8px 11px", color: "var(--app-text-primary)", fontSize: 13, outline: "none",
  transition: "border-color 0.2s", fontFamily: "inherit",
};

const FIELD_LABEL: React.CSSProperties = {
  color: "var(--app-text-secondary)", fontSize: 11, marginBottom: 6, display: "block",
};
import {
  Sparkles, Layers, Copy, X, ArrowLeft, Plus, Trash2,
  Loader2, CheckCircle2, GripVertical, AlignLeft, Hash,
  Mail, Phone, Calendar, ListFilter, Link2, DollarSign,
  Paperclip, ToggleLeft, Globe, Clock, Type, ChevronRight,
  ChevronDown, Wand2, Building2, Users, Briefcase, ShoppingCart,
  Server, FileCheck, BarChart3, Package, RefreshCw, Zap,
} from "lucide-react";

// ─── TYPES ─────────────────────────────────────────────────────────────────────
interface DroppedField {
  id: string; label: string; name: string; fieldType: string;
  required: boolean; length: number; isUnique: boolean; isReadOnly: boolean;
  isSearchResultEnabled: boolean; isSearchEnabled: boolean;
  isListViewEnabled: boolean; isAugmentationEnabled: boolean;
  isFreezeColumn: boolean; isExternalMapper: boolean; helpText: string;
}
interface TemplateField  { label: string; fieldType: string; required: boolean; }
interface TemplateObject { name: string; description: string; fields: TemplateField[]; }
interface Template {
  id: string; name: string; icon: React.ElementType; color: string; bgColor: string;
  description: string; objects: TemplateObject[];
}
interface GeneratedObject { name: string; description: string; fields: TemplateField[]; }

export interface PanelPreviewNode {
  id: string; type: "object" | "field" | "layout";
  label: string; fieldType?: string; required?: boolean;
  parentId?: string; isPreview: boolean;
}
export interface PanelPreviewEdge {
  id: string; from: string; to: string; type: "obj-field";
}

export interface CreateObjectPanelProps {
  onClose: () => void;
  onObjectCreated?: (obj: GeneratedObject) => void;
  onPreviewChange?: (nodes: PanelPreviewNode[], edges: PanelPreviewEdge[]) => void;
}

// ─── FIELD PALETTE ─────────────────────────────────────────────────────────────
const FIELD_PALETTE = [
  { type: "Text",       icon: Type,       color: "var(--app-text-secondary)", group: "Basic"    },
  { type: "Long Text",  icon: AlignLeft,  color: "var(--app-text-secondary)", group: "Basic"    },
  { type: "Number",     icon: Hash,       color: "#60A5FA", group: "Basic"    },
  { type: "Currency",   icon: DollarSign, color: "#FCD34D", group: "Basic"    },
  { type: "Date",       icon: Calendar,   color: "#FCD34D", group: "Basic"    },
  { type: "Time",       icon: Clock,      color: "#FCD34D", group: "Basic"    },
  { type: "Email",      icon: Mail,       color: "#C084FC", group: "Contact"  },
  { type: "Phone",      icon: Phone,      color: "#34D399", group: "Contact"  },
  { type: "URL",        icon: Globe,      color: "#60A5FA", group: "Contact"  },
  { type: "Select",     icon: ListFilter, color: "var(--app-text-danger)", group: "Choice"   },
  { type: "Checkbox",   icon: ToggleLeft, color: "#34D399", group: "Choice"   },
  { type: "Lookup",     icon: Link2,      color: "var(--app-accent-light)", group: "Relation" },
  { type: "File",       icon: Paperclip,  color: "var(--app-text-secondary)", group: "Media"    },
];

const FT_COLOR: Record<string, string> = Object.fromEntries(FIELD_PALETTE.map(f => [f.type, f.color]));
const FT_ICON:  Record<string, React.ElementType> = Object.fromEntries(FIELD_PALETTE.map(f => [f.type, f.icon]));

const AI_SUGGESTIONS = [
  "Customer feedback with satisfaction ratings",
  "Support ticket tracking with SLA",
  "Product catalog with inventory",
  "Sales pipeline with deal stages",
  "Event registration form",
  "Asset maintenance log",
];

const TEMPLATES: Template[] = [
  {
    id: "crm", name: "CRM", icon: Users, color: "var(--app-accent-light)", bgColor: "var(--app-shell-bg-accent)",
    description: "Contacts, Leads, Deals & Accounts",
    objects: [
      { name: "Contact", description: "Individual contacts", fields: [
        { label: "Full Name", fieldType: "Text", required: true }, { label: "Email", fieldType: "Email", required: true },
        { label: "Phone", fieldType: "Phone", required: false }, { label: "Company", fieldType: "Text", required: false },
        { label: "Status", fieldType: "Select", required: true },
      ]},
      { name: "Lead", description: "Potential opportunities", fields: [
        { label: "Title", fieldType: "Text", required: true }, { label: "Value", fieldType: "Currency", required: false },
        { label: "Stage", fieldType: "Select", required: true }, { label: "Close Date", fieldType: "Date", required: false },
      ]},
      { name: "Deal", description: "Active sales deals", fields: [
        { label: "Deal Name", fieldType: "Text", required: true }, { label: "Value", fieldType: "Currency", required: true },
        { label: "Stage", fieldType: "Select", required: true }, { label: "Contact", fieldType: "Lookup", required: false },
      ]},
    ]
  },
  {
    id: "hrms", name: "HRMS", icon: Building2, color: "#34D399", bgColor: "var(--app-shell-bg-success)",
    description: "Employees, Leave & Performance",
    objects: [
      { name: "Employee", description: "Core employee profiles", fields: [
        { label: "Full Name", fieldType: "Text", required: true }, { label: "Email", fieldType: "Email", required: true },
        { label: "Department", fieldType: "Lookup", required: true }, { label: "Job Role", fieldType: "Lookup", required: true },
        { label: "Status", fieldType: "Select", required: true },
      ]},
      { name: "Leave Request", description: "Leave applications", fields: [
        { label: "Employee", fieldType: "Lookup", required: true }, { label: "Leave Type", fieldType: "Select", required: true },
        { label: "Start Date", fieldType: "Date", required: true }, { label: "Status", fieldType: "Select", required: true },
      ]},
    ]
  },
  {
    id: "pm", name: "Project Management", icon: Briefcase, color: "#60A5FA", bgColor: "rgba(59,130,246,0.12)",
    description: "Projects, Tasks & Milestones",
    objects: [
      { name: "Project", description: "Top-level project containers", fields: [
        { label: "Project Name", fieldType: "Text", required: true }, { label: "Start Date", fieldType: "Date", required: false },
        { label: "Status", fieldType: "Select", required: true }, { label: "Manager", fieldType: "Lookup", required: false },
      ]},
      { name: "Task", description: "Individual work items", fields: [
        { label: "Title", fieldType: "Text", required: true }, { label: "Status", fieldType: "Select", required: true },
        { label: "Priority", fieldType: "Select", required: false }, { label: "Due Date", fieldType: "Date", required: false },
      ]},
    ]
  },
  {
    id: "finance", name: "Finance", icon: BarChart3, color: "#FCD34D", bgColor: "rgba(245,158,11,0.12)",
    description: "Invoices, Expenses & Budgets",
    objects: [
      { name: "Invoice", description: "Customer billing records", fields: [
        { label: "Invoice Number", fieldType: "Text", required: true }, { label: "Amount", fieldType: "Currency", required: true },
        { label: "Due Date", fieldType: "Date", required: true }, { label: "Status", fieldType: "Select", required: true },
      ]},
      { name: "Expense", description: "Company expenses", fields: [
        { label: "Category", fieldType: "Select", required: true }, { label: "Amount", fieldType: "Currency", required: true },
        { label: "Date", fieldType: "Date", required: true }, { label: "Status", fieldType: "Select", required: true },
      ]},
    ]
  },
  {
    id: "itsm", name: "IT Service Desk", icon: Server, color: "var(--app-text-danger)", bgColor: "rgba(239,68,68,0.12)",
    description: "Tickets, Assets & SLA",
    objects: [
      { name: "Ticket", description: "IT support requests", fields: [
        { label: "Title", fieldType: "Text", required: true }, { label: "Priority", fieldType: "Select", required: true },
        { label: "Status", fieldType: "Select", required: true }, { label: "Description", fieldType: "Long Text", required: true },
      ]},
    ]
  },
  {
    id: "ecommerce", name: "E-Commerce", icon: ShoppingCart, color: "#FB923C", bgColor: "rgba(249,115,22,0.12)",
    description: "Products, Orders & Customers",
    objects: [
      { name: "Product", description: "Product catalog", fields: [
        { label: "Product Name", fieldType: "Text", required: true }, { label: "Price", fieldType: "Currency", required: true },
        { label: "Stock", fieldType: "Number", required: true }, { label: "Category", fieldType: "Select", required: false },
      ]},
      { name: "Order", description: "Customer purchases", fields: [
        { label: "Order Number", fieldType: "Text", required: true }, { label: "Total", fieldType: "Currency", required: true },
        { label: "Status", fieldType: "Select", required: true }, { label: "Customer", fieldType: "Lookup", required: true },
      ]},
    ]
  },
  {
    id: "inventory", name: "Inventory", icon: Package, color: "#A3E635", bgColor: "rgba(132,204,22,0.12)",
    description: "Items, Warehouses & Suppliers",
    objects: [
      { name: "Item", description: "Warehouse stock", fields: [
        { label: "Item Name", fieldType: "Text", required: true }, { label: "Quantity", fieldType: "Number", required: true },
        { label: "Min Stock", fieldType: "Number", required: false }, { label: "Supplier", fieldType: "Lookup", required: false },
      ]},
    ]
  },
  {
    id: "compliance", name: "Compliance", icon: FileCheck, color: "#C084FC", bgColor: "rgba(168,85,247,0.12)",
    description: "Policies, Audits & Regulatory",
    objects: [
      { name: "Policy", description: "Company policies", fields: [
        { label: "Policy Name", fieldType: "Text", required: true }, { label: "Category", fieldType: "Select", required: true },
        { label: "Effective Date", fieldType: "Date", required: true }, { label: "Status", fieldType: "Select", required: true },
      ]},
    ]
  },
];

function generateFromPrompt(prompt: string): GeneratedObject {
  const lower = prompt.toLowerCase();
  if (lower.match(/feedback|rating|satisfaction|survey/)) return {
    name: "Customer Feedback",
    description: "Captures satisfaction ratings and comments from customers.",
    fields: [
      { label: "Customer Name", fieldType: "Text", required: true }, { label: "Email", fieldType: "Email", required: false },
      { label: "Rating", fieldType: "Number", required: true }, { label: "Category", fieldType: "Select", required: false },
      { label: "Comments", fieldType: "Long Text", required: false }, { label: "Status", fieldType: "Select", required: true },
    ]
  };
  if (lower.match(/ticket|support|issue|incident/)) return {
    name: "Support Ticket",
    description: "Tracks support requests with SLA monitoring.",
    fields: [
      { label: "Title", fieldType: "Text", required: true }, { label: "Description", fieldType: "Long Text", required: true },
      { label: "Priority", fieldType: "Select", required: true }, { label: "Status", fieldType: "Select", required: true },
      { label: "Reporter", fieldType: "Email", required: true }, { label: "Resolved Date", fieldType: "Date", required: false },
    ]
  };
  if (lower.match(/product|catalog|item|inventory|stock/)) return {
    name: "Product Catalog",
    description: "Manages product listings with pricing and stock levels.",
    fields: [
      { label: "Product Name", fieldType: "Text", required: true }, { label: "Price", fieldType: "Currency", required: true },
      { label: "Stock", fieldType: "Number", required: true }, { label: "Category", fieldType: "Select", required: false },
      { label: "Status", fieldType: "Select", required: true },
    ]
  };
  if (lower.match(/sales|pipeline|deal|opportunity|lead/)) return {
    name: "Sales Pipeline",
    description: "Tracks deals through the funnel.",
    fields: [
      { label: "Deal Name", fieldType: "Text", required: true }, { label: "Value", fieldType: "Currency", required: true },
      { label: "Stage", fieldType: "Select", required: true }, { label: "Close Date", fieldType: "Date", required: false },
      { label: "Owner", fieldType: "Lookup", required: true },
    ]
  };
  if (lower.match(/event|registration|attendee|conference/)) return {
    name: "Event Registration",
    description: "Manages event sign-ups and attendee tracking.",
    fields: [
      { label: "Attendee Name", fieldType: "Text", required: true }, { label: "Email", fieldType: "Email", required: true },
      { label: "Event", fieldType: "Lookup", required: true }, { label: "Status", fieldType: "Select", required: true },
    ]
  };
  if (lower.match(/asset|equipment|maintenance|device/)) return {
    name: "Asset Management",
    description: "Tracks company assets and maintenance schedules.",
    fields: [
      { label: "Asset Name", fieldType: "Text", required: true }, { label: "Type", fieldType: "Select", required: true },
      { label: "Status", fieldType: "Select", required: true }, { label: "Assigned To", fieldType: "Lookup", required: false },
    ]
  };
  const words = prompt.trim().split(/\s+/).filter(w => w.length > 2);
  const name = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || "Custom Object";
  return {
    name, description: `Stores and manages ${prompt.toLowerCase()} records.`,
    fields: [
      { label: "Name", fieldType: "Text", required: true }, { label: "Description", fieldType: "Long Text", required: false },
      { label: "Status", fieldType: "Select", required: true }, { label: "Created Date", fieldType: "Date", required: true },
    ]
  };
}

// ─── TOGGLE ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      style={{ width: 38, height: 20, borderRadius: 9999, position: "relative", flexShrink: 0, background: value ? "var(--app-accent)" : "var(--app-toggle-off)", border: "none", cursor: "pointer", transition: "background 0.2s" }}>
      <div style={{ position: "absolute", top: 2, left: value ? 19 : 2, width: 16, height: 16, borderRadius: "50%", background: "var(--app-text-on-accent)", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }} />
    </button>
  );
}

// ─── DRAGGABLE FIELD CHIP ──────────────────────────────────────────────────────
const DND_FIELD = "FIELD_TYPE";

function FieldTypeButton({ type, color, Icon, onClick }: {
  type: string; color: string; Icon: React.ElementType; onClick: () => void;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_FIELD, item: { fieldType: type }, collect: m => ({ isDragging: m.isDragging() }),
  }));
  return (
    <div ref={drag as any} onClick={onClick}
      className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer select-none"
      style={{
        opacity: isDragging ? 0.35 : 1,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--app-border-subtle)",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => {
        (e.currentTarget.style.background = `${color}18`);
        (e.currentTarget.style.borderColor = `${color}44`);
      }}
      onMouseLeave={e => {
        (e.currentTarget.style.background = "rgba(255,255,255,0.04)");
        (e.currentTarget.style.borderColor = "var(--app-border-subtle)");
      }}>
      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
        <Icon size={11} style={{ color }} />
      </div>
      <span style={{ color: "var(--app-text-body)", fontSize: 11 }}>{type}</span>
    </div>
  );
}

// ─── FIELD ROW ────────────────────────────────────────────────────────────────
function FieldRow({ field, isExpanded, onToggle, onUpdate, onDelete }: {
  field: DroppedField; isExpanded: boolean;
  onToggle: () => void; onUpdate: (id: string, u: Partial<DroppedField>) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = FT_ICON[field.fieldType] ?? Type;
  const color = FT_COLOR[field.fieldType] ?? "var(--app-text-secondary)";
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid var(--app-border)",
    borderRadius: 7, padding: "7px 10px", color: "var(--app-text-primary)", fontSize: 12, outline: "none",
  };
  return (
    <div className="rounded-xl mb-1.5 overflow-hidden"
      style={{ border: `1px solid ${isExpanded ? "var(--app-border-accent-strong)" : "var(--app-border-subtle)"}`, transition: "border-color 0.15s" }}>
      {/* Row header */}
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        style={{ background: isExpanded ? "var(--app-shell-bg-accent)" : "var(--app-shell-bg-subtle)" }}
        onClick={onToggle}>
        <GripVertical size={11} style={{ color: "var(--app-text-disabled)", flexShrink: 0 }} />
        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
          <Icon size={10} style={{ color }} />
        </div>
        <span style={{ color: "var(--app-text-primary)", fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {field.label || "Untitled Field"}
        </span>
        <span style={{ fontSize: 9, letterSpacing: "0.1em", color, opacity: 0.7, flexShrink: 0 }}>
          {field.fieldType.toUpperCase()}
        </span>
        {field.required && (
          <span style={{ fontSize: 8, color: "#34D399", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", padding: "1px 4px", borderRadius: 3, flexShrink: 0 }}>REQ</span>
        )}
        <button onClick={e => { e.stopPropagation(); onDelete(field.id); }}
          className="shrink-0 opacity-0 group-hover:opacity-100"
          style={{ color: "var(--app-text-subtle)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--app-text-danger)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--app-text-subtle)")}>
          <Trash2 size={11} />
        </button>
        <ChevronDown size={11} style={{ color: "var(--app-text-muted)", flexShrink: 0, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </div>
      {/* Expanded properties */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-2" style={{ borderTop: "1px solid var(--app-border-subtle)", background: "rgba(0,0,0,0.2)" }}>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.06em", marginBottom: 5 }}>LABEL</div>
              <input value={field.label} onChange={e => onUpdate(field.id, { label: e.target.value })}
                style={inputStyle} placeholder="Field label"
                onFocus={e => (e.target.style.borderColor = "var(--app-accent)")}
                onBlur={e => (e.target.style.borderColor = "var(--app-border)")} />
            </div>
            <div>
              <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.06em", marginBottom: 5 }}>TYPE</div>
              <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg"
                style={{ background: `${color}15`, border: `1px solid ${color}33` }}>
                <Icon size={11} style={{ color }} />
                <span style={{ color, fontSize: 11 }}>{field.fieldType}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between py-2"
            style={{ borderTop: "1px solid var(--app-shell-bg-input)" }}>
            <span style={{ color: "var(--app-text-body)", fontSize: 12 }}>Required</span>
            <Toggle value={field.required} onChange={v => onUpdate(field.id, { required: v })} />
          </div>
          <div className="flex items-center justify-between py-2"
            style={{ borderTop: "1px solid var(--app-shell-bg-input)" }}>
            <span style={{ color: "var(--app-text-body)", fontSize: 12 }}>Unique</span>
            <Toggle value={field.isUnique} onChange={v => onUpdate(field.id, { isUnique: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PANEL ────────────────────────────────────────────────────────────────
export function CreateObjectPanel({ onClose, onObjectCreated, onPreviewChange }: CreateObjectPanelProps) {
  // Keep a ref so the preview-broadcast effect never needs onPreviewChange in its dep array
  const onPreviewChangeRef = useRef(onPreviewChange);
  useEffect(() => { onPreviewChangeRef.current = onPreviewChange; });

  const [activeTab, setActiveTab] = useState<"build" | "ai" | "template">("build");

  // Build state
  const [objName,        setObjName]        = useState("");
  const [objDesc,        setObjDesc]        = useState("");
  const [manualFields,   setManualFields]   = useState<DroppedField[]>([]);
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);

  // AI state
  const [aiPrompt,     setAiPrompt]     = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult,     setAiResult]     = useState<GeneratedObject | null>(null);

  // Template state
  const [selectedTplId, setSelectedTplId] = useState<string | null>(null);
  const [previewObjIdx, setPreviewObjIdx] = useState(0);

  const [success, setSuccess] = useState(false);

  // Broadcast preview data whenever name/fields/tab changes — uses ref to avoid
  // including onPreviewChange in deps (would cause infinite re-render loop)
  useEffect(() => {
    const cb = onPreviewChangeRef.current;
    if (!cb) return;
    const name = objName.trim();

    if (!name) { cb([], []); return; }

    const fieldsToPreview = activeTab === "ai" && aiResult
      ? aiResult.fields.map((f, i) => ({ id: `ai_${i}`, label: f.label, fieldType: f.fieldType, required: f.required }))
      : activeTab === "template" && selectedTplId
      ? (() => {
          const tpl = TEMPLATES.find(t => t.id === selectedTplId);
          const obj = tpl?.objects[previewObjIdx];
          return (obj?.fields ?? []).map((f, i) => ({ id: `tpl_${i}`, label: f.label, fieldType: f.fieldType, required: f.required }));
        })()
      : manualFields.map(f => ({ id: f.id, label: f.label, fieldType: f.fieldType, required: f.required }));

    const objNode: PanelPreviewNode = {
      id: "__preview_object__", type: "object", label: name, isPreview: true,
    };
    const nodes: PanelPreviewNode[] = [objNode];
    const edges: PanelPreviewEdge[] = [];

    fieldsToPreview.forEach(f => {
      const nodeId = `__preview_field_${f.id}__`;
      nodes.push({ id: nodeId, type: "field", label: f.label || "Field", fieldType: f.fieldType, required: f.required, parentId: "__preview_object__", isPreview: true });
      edges.push({ id: `__preview_edge_${f.id}__`, from: "__preview_object__", to: nodeId, type: "obj-field" });
    });

    cb(nodes, edges);
  // onPreviewChange intentionally omitted — accessed via ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objName, manualFields, aiResult, selectedTplId, previewObjIdx, activeTab]);

  // Clear preview on unmount
  useEffect(() => () => { onPreviewChangeRef.current?.([], []); }, []);

  const addField = useCallback((fieldType: string) => {
    const defaultLabel: Record<string, string> = {
      Text: "Name", Email: "Email", Phone: "Phone", Date: "Date", Select: "Status",
      Number: "Amount", Currency: "Amount", Lookup: "Related Record", "Long Text": "Description",
    };
    const lbl = defaultLabel[fieldType] ?? `${fieldType} Field`;
    const newField: DroppedField = {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      label: lbl, name: lbl.toLowerCase().replace(/\s+/g, ""), fieldType,
      required: false, length: 30, isUnique: false, isReadOnly: false,
      isSearchResultEnabled: false, isSearchEnabled: false, isListViewEnabled: false,
      isAugmentationEnabled: false, isFreezeColumn: false, isExternalMapper: false, helpText: "",
    };
    setManualFields(prev => [...prev, newField]);
    setExpandedFieldId(newField.id);
  }, []);

  const updateField = useCallback((id: string, u: Partial<DroppedField>) => {
    setManualFields(prev => prev.map(f => {
      if (f.id !== id) return f;
      const merged = { ...f, ...u };
      if (u.label !== undefined) merged.name = u.label.toLowerCase().replace(/[^a-z0-9]/g, "");
      return merged;
    }));
  }, []);

  const deleteField = useCallback((id: string) => {
    setManualFields(prev => prev.filter(f => f.id !== id));
    setExpandedFieldId(prev => prev === id ? null : prev);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true); setAiResult(null);
    await new Promise(r => setTimeout(r, 1800 + Math.random() * 500));
    setAiResult(generateFromPrompt(aiPrompt));
    setAiGenerating(false);
  }, [aiPrompt]);

  const finishAndClose = useCallback((obj: GeneratedObject) => {
    setSuccess(true);
    onObjectCreated?.(obj);
    setTimeout(onClose, 1600);
  }, [onObjectCreated, onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTplId);
  const currentFields = activeTab === "build" ? manualFields.length : activeTab === "ai" && aiResult ? aiResult.fields.length : activeTab === "template" && selectedTemplate ? selectedTemplate.objects.reduce((a, o) => a + o.fields.length, 0) : 0;

  const canCreate = objName.trim() && (
    (activeTab === "build" && manualFields.length > 0) ||
    (activeTab === "ai" && !!aiResult) ||
    (activeTab === "template" && !!selectedTemplate)
  );

  // ── SUCCESS ───────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="fixed z-[60] flex flex-col items-center justify-center"
        style={{ right: 0, top: 52, bottom: 0, width: 460, background: "var(--app-shell-bg-muted)", borderLeft: "1px solid var(--app-border)" }}>
        <div className="flex flex-col items-center gap-4" style={{ animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <style>{`@keyframes popIn{from{transform:scale(0.6);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.15)", border: "2px solid #10B981", boxShadow: "0 0 40px rgba(16,185,129,0.3)" }}>
            <CheckCircle2 size={30} style={{ color: "#10B981" }} />
          </div>
          <div style={{ color: "var(--app-text-primary)", fontSize: 18, fontWeight: 600 }}>Object Created!</div>
          <div style={{ color: "var(--app-text-muted)", fontSize: 12 }}>Connecting to your graph…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed z-[60] flex flex-col"
      style={{
        right: 0, top: 52, bottom: 0, width: 460,
        background: "rgba(7,7,12,0.98)",
        borderLeft: "1px solid var(--app-border)",
        backdropFilter: "blur(20px)",
        animation: "panelSlideIn 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
      <style>{`
        @keyframes panelSlideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── HEADER */}
      <div className="flex items-center gap-3 px-5 py-3.5 shrink-0"
        style={{ borderBottom: "1px solid var(--app-border)" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,var(--app-accent-light),var(--app-accent))", boxShadow: "0 0 12px var(--app-accent)33" }}>
          <Plus size={13} style={{ color: "var(--app-text-on-accent)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>New Object</div>
          <div style={{ color: "var(--app-text-subtle)", fontSize: 10, marginTop: 1 }}>
            {objName.trim() ? (
              <span style={{ color: "var(--app-accent)" }}>{objName.trim()} <span style={{ color: "var(--app-text-subtle)" }}>· {currentFields} field{currentFields !== 1 ? "s" : ""} in graph</span></span>
            ) : "Type a name to start placing in graph"}
          </div>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg"
          style={{ color: "var(--app-text-muted)", border: "1px solid var(--app-border)", transition: "all 0.15s", background: "none", cursor: "pointer" }}
          onMouseEnter={e => { (e.currentTarget.style.color = "var(--app-text-primary)"); (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"); }}
          onMouseLeave={e => { (e.currentTarget.style.color = "var(--app-text-muted)"); (e.currentTarget.style.borderColor = "var(--app-border)"); }}>
          <X size={13} />
        </button>
      </div>

      {/* ── NAME INPUT */}
      <div className="px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
        <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>OBJECT NAME</div>
        <input
          value={objName}
          onChange={e => setObjName(e.target.value)}
          placeholder="e.g., Customer, Invoice, Task…"
          autoFocus
          style={{
            width: "100%", background: "var(--app-shell-bg-input)", border: "1.5px solid var(--app-border)",
            borderRadius: 10, padding: "10px 13px", color: "#F9FAFB", fontSize: 14,
            fontWeight: 500, outline: "none", transition: "all 0.2s",
            boxShadow: objName.trim() ? "0 0 0 3px var(--app-shell-bg-accent)" : "none",
          }}
          onFocus={e => { e.target.style.borderColor = "var(--app-accent)"; e.target.style.background = "var(--app-shell-bg-accent)"; }}
          onBlur={e => { e.target.style.borderColor = objName.trim() ? "rgba(99,102,241,0.5)" : "var(--app-border)"; e.target.style.background = "var(--app-shell-bg-input)"; }}
        />

        {/* Live graph indicator */}
        {objName.trim() && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg"
            style={{ background: "var(--app-shell-bg-accent)", border: "1px solid rgba(99,102,241,0.2)", animation: "fadeUp 0.2s ease" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "var(--app-accent)", boxShadow: "0 0 6px var(--app-accent)", animation: "pulseDot 1.5s ease-in-out infinite" }} />
            <style>{`@keyframes pulseDot{0%,100%{opacity:0.6;transform:scale(0.9)}50%{opacity:1;transform:scale(1.1)}}`}</style>
            <span style={{ color: "var(--app-accent-light)", fontSize: 11 }}>
              <span style={{ color: "var(--app-text-accent-muted)", fontWeight: 500 }}>{objName.trim()}</span> is live in the graph
              {currentFields > 0 && <span style={{ color: "var(--app-text-muted)" }}> · {currentFields} field node{currentFields !== 1 ? "s" : ""}</span>}
            </span>
          </div>
        )}
      </div>

      {/* ── METHOD TABS */}
      <div className="flex shrink-0 px-5 pt-4 gap-1"
        style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
        {([
          { key: "build"    as const, Icon: Layers,   label: "Build",    color: "#34D399" },
          { key: "ai"       as const, Icon: Sparkles,  label: "AI",       color: "var(--app-accent-light)" },
          { key: "template" as const, Icon: Copy,      label: "Template", color: "#F59E0B" },
        ]).map(({ key, Icon, label, color }) => {
          const isActive = activeTab === key;
          return (
            <button key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg mb-0"
              style={{
                background: isActive ? "var(--app-border-subtle)" : "transparent",
                borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
                color: isActive ? "var(--app-text-primary)" : "var(--app-text-muted)",
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                border: "none", cursor: "pointer", transition: "all 0.15s",
                borderRadius: "8px 8px 0 0",
                marginBottom: -1,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "var(--app-text-secondary)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "var(--app-text-muted)"; }}>
              <Icon size={12} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── TAB BODY */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

        {/* ── BUILD TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "build" && (
          <div className="px-5 py-4">

            {/* Field type grid */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>
                ADD FIELD — click to add
              </div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                {FIELD_PALETTE.map(f => (
                  <FieldTypeButton key={f.type} type={f.type} color={f.color} Icon={f.icon} onClick={() => addField(f.type)} />
                ))}
              </div>
            </div>

            {/* Fields list */}
            {manualFields.length > 0 && (
              <div style={{ borderTop: "1px solid var(--app-border-subtle)", paddingTop: 16 }}>
                <div className="flex items-center justify-between mb-3">
                  <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 600 }}>
                    FIELDS · {manualFields.length}
                  </div>
                  <span style={{ color: "var(--app-text-subtle)", fontSize: 10 }}>Click to configure</span>
                </div>
                {manualFields.map(f => (
                  <FieldRow
                    key={f.id}
                    field={f}
                    isExpanded={expandedFieldId === f.id}
                    onToggle={() => setExpandedFieldId(prev => prev === f.id ? null : f.id)}
                    onUpdate={updateField}
                    onDelete={deleteField}
                  />
                ))}
              </div>
            )}

            {manualFields.length === 0 && (
              <div className="flex flex-col items-center py-8 rounded-xl mt-2"
                style={{ border: "1.5px dashed var(--app-border)", color: "var(--app-text-disabled)" }}>
                <Plus size={20} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontSize: 12, color: "var(--app-text-subtle)" }}>Click a field type above to add it</div>
                <div style={{ fontSize: 11, color: "var(--app-text-disabled)", marginTop: 4 }}>Each field appears in the graph instantly</div>
              </div>
            )}
          </div>
        )}

        {/* ── AI TAB ────────────────────────────────────────────────────────── */}
        {activeTab === "ai" && (
          <div className="px-5 py-4 flex flex-col gap-4">
            <div>
              <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>
                DESCRIBE YOUR OBJECT
              </div>
              <div className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--app-border)", background: "rgba(0,0,0,0.3)", transition: "border-color 0.2s" }}>
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
                  placeholder='e.g., "A customer feedback form with ratings, comments, and follow-up tracking"'
                  rows={3}
                  style={{
                    width: "100%", background: "transparent", border: "none", outline: "none",
                    color: "var(--app-text-primary)", fontSize: 12, padding: "12px 14px", resize: "none",
                    lineHeight: 1.6, scrollbarWidth: "none",
                  }}
                  onFocus={e => { e.currentTarget.parentElement!.style.borderColor = "var(--app-accent)"; }}
                  onBlur={e => { e.currentTarget.parentElement!.style.borderColor = "var(--app-border)"; }}
                />
                <div className="flex items-center justify-between px-3 py-1.5" style={{ borderTop: "1px solid var(--app-border-subtle)" }}>
                  <span style={{ color: "var(--app-text-disabled)", fontSize: 10 }}>Ctrl+Enter to generate</span>
                  <span style={{ color: "var(--app-text-disabled)", fontSize: 10 }}>{aiPrompt.length}</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.08em", marginBottom: 8 }}>QUICK SUGGESTIONS</div>
              <div className="flex flex-wrap gap-1.5">
                {AI_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setAiPrompt(s)}
                    className="px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "var(--app-text-secondary)", fontSize: 11, transition: "all 0.15s", cursor: "pointer" }}
                    onMouseEnter={e => { (e.currentTarget.style.color = "var(--app-text-primary)"); (e.currentTarget.style.borderColor = "var(--app-accent)55"); (e.currentTarget.style.background = "var(--app-shell-bg-accent)"); }}
                    onMouseLeave={e => { (e.currentTarget.style.color = "var(--app-text-secondary)"); (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"); (e.currentTarget.style.background = "rgba(255,255,255,0.04)"); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleGenerate} disabled={!aiPrompt.trim() || aiGenerating}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl"
              style={{
                background: aiPrompt.trim() && !aiGenerating ? "linear-gradient(135deg,var(--app-accent),var(--app-accent-light))" : "var(--app-border-subtle)",
                color: aiPrompt.trim() && !aiGenerating ? "#fff" : "var(--app-text-subtle)",
                fontSize: 13, fontWeight: 600, border: "none",
                cursor: aiPrompt.trim() && !aiGenerating ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                boxShadow: aiPrompt.trim() && !aiGenerating ? "0 4px 16px var(--app-border-accent)" : "none",
              }}>
              {aiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {aiGenerating ? "Generating…" : "Generate with AI"}
            </button>

            {aiGenerating && (
              <div className="rounded-xl p-4" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--app-accent-light)", animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                  <span style={{ color: "var(--app-accent-light)", fontSize: 12 }}>Analyzing your prompt…</span>
                  <style>{`@keyframes aiDot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
                </div>
                {["Identifying object type…", "Inferring field types…", "Building schema…"].map((s, i) => (
                  <div key={s} className="flex items-center gap-2 mb-1.5">
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--app-accent)", animation: `aiDot 1.2s ease-in-out ${i * 0.35}s infinite` }} />
                    <span style={{ color: "var(--app-text-muted)", fontSize: 11 }}>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {aiResult && !aiGenerating && (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.05)", animation: "fadeUp 0.25s ease" }}>
                <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
                  <Wand2 size={14} style={{ color: "var(--app-accent-light)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#F9FAFB", fontSize: 13, fontWeight: 600 }}>{aiResult.name}</div>
                    <div style={{ color: "var(--app-text-muted)", fontSize: 10, marginTop: 1 }}>{aiResult.fields.length} fields generated</div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                    style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                    <CheckCircle2 size={10} style={{ color: "#34D399" }} />
                    <span style={{ color: "#34D399", fontSize: 9, letterSpacing: "0.08em" }}>LIVE</span>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {aiResult.fields.map((f, i) => {
                      const FIcon = FT_ICON[f.fieldType] ?? Type;
                      const fc = FT_COLOR[f.fieldType] ?? "var(--app-text-secondary)";
                      return (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                          style={{ background: "var(--app-shell-bg-subtle)" }}>
                          <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: `${fc}20` }}>
                            <FIcon size={10} style={{ color: fc }} />
                          </div>
                          <span style={{ color: "var(--app-text-body)", fontSize: 12, flex: 1 }}>{f.label}</span>
                          <span style={{ color: fc, fontSize: 9, letterSpacing: "0.08em", opacity: 0.7 }}>{f.fieldType.toUpperCase()}</span>
                          {f.required && <span style={{ color: "#34D399", fontSize: 8, opacity: 0.8 }}>REQ</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--app-border-subtle)" }}>
                  <button onClick={handleGenerate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                    style={{ background: "var(--app-border-subtle)", border: "1px solid var(--app-border)", color: "var(--app-text-secondary)", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--app-text-primary)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--app-text-secondary)")}>
                    <RefreshCw size={11} /> Retry
                  </button>
                  <span style={{ color: "var(--app-text-disabled)", fontSize: 10 }}>Object visible in graph above →</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TEMPLATE TAB ──────────────────────────────────────────────────── */}
        {activeTab === "template" && (
          <div className="px-5 py-4">
            <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 600, marginBottom: 10 }}>CHOOSE TEMPLATE</div>
            <div className="flex flex-col gap-2">
              {TEMPLATES.map(t => {
                const Icon = t.icon;
                const isSel = selectedTplId === t.id;
                return (
                  <div key={t.id}>
                    <button
                      onClick={() => { setSelectedTplId(isSel ? null : t.id); setPreviewObjIdx(0); }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left"
                      style={{
                        background: isSel ? t.bgColor : "var(--app-shell-bg-subtle)",
                        border: `1.5px solid ${isSel ? t.color + "66" : "var(--app-border-subtle)"}`,
                        cursor: "pointer", transition: "all 0.18s",
                      }}
                      onMouseEnter={e => { if (!isSel) { (e.currentTarget.style.background = t.bgColor); (e.currentTarget.style.borderColor = t.color + "44"); }}}
                      onMouseLeave={e => { if (!isSel) { (e.currentTarget.style.background = "var(--app-shell-bg-subtle)"); (e.currentTarget.style.borderColor = "var(--app-border-subtle)"); }}}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${t.color}20`, border: `1px solid ${t.color}30` }}>
                        <Icon size={15} style={{ color: t.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                        <div style={{ color: "var(--app-text-muted)", fontSize: 11, marginTop: 1 }}>{t.description}</div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span style={{ color: "var(--app-text-muted)", fontSize: 10 }}>{t.objects.length} obj</span>
                        <ChevronDown size={11} style={{ color: "var(--app-text-muted)", transform: isSel ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                      </div>
                    </button>

                    {/* Template expanded preview */}
                    {isSel && selectedTemplate && (
                      <div className="mt-1.5 rounded-xl overflow-hidden"
                        style={{ border: `1px solid ${selectedTemplate.color}33`, background: "rgba(0,0,0,0.2)", animation: "fadeUp 0.2s ease" }}>
                        {/* Object tabs */}
                        <div className="flex gap-1 p-2.5 pb-0" style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
                          {selectedTemplate.objects.map((obj, i) => (
                            <button key={i} onClick={() => setPreviewObjIdx(i)}
                              className="px-2.5 py-1.5 rounded-t-lg"
                              style={{
                                fontSize: 11, border: "none", cursor: "pointer", transition: "all 0.15s",
                                background: previewObjIdx === i ? `${selectedTemplate.color}20` : "transparent",
                                borderBottom: previewObjIdx === i ? `2px solid ${selectedTemplate.color}` : "2px solid transparent",
                                color: previewObjIdx === i ? selectedTemplate.color : "var(--app-text-muted)",
                                marginBottom: -1,
                              }}>
                              {obj.name}
                            </button>
                          ))}
                        </div>
                        {/* Fields for selected object */}
                        <div className="p-3">
                          {(() => {
                            const obj = selectedTemplate.objects[previewObjIdx];
                            if (!obj) return null;
                            return obj.fields.map((f, i) => {
                              const FIcon = FT_ICON[f.fieldType] ?? Type;
                              const fc = FT_COLOR[f.fieldType] ?? "var(--app-text-secondary)";
                              return (
                                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-1"
                                  style={{ background: "var(--app-shell-bg-subtle)" }}>
                                  <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: `${fc}20` }}>
                                    <FIcon size={10} style={{ color: fc }} />
                                  </div>
                                  <span style={{ color: "var(--app-text-body)", fontSize: 12, flex: 1 }}>{f.label}</span>
                                  <span style={{ color: fc, fontSize: 9, opacity: 0.7 }}>{f.fieldType.toUpperCase()}</span>
                                  {f.required && <span style={{ color: "#34D399", fontSize: 8, opacity: 0.8 }}>REQ</span>}
                                </div>
                              );
                            });
                          })()}
                        </div>
                        <div className="px-3 pb-3" style={{ color: "var(--app-text-muted)", fontSize: 10, textAlign: "center" }}>
                          {selectedTemplate.objects.reduce((a, o) => a + o.fields.length, 0)} fields · visible in graph →
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER */}
      <div className="px-5 py-4 shrink-0" style={{ borderTop: "1px solid var(--app-border)" }}>
        {/* Description input */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.08em", marginBottom: 6 }}>
            DESCRIPTION <span style={{ color: "var(--app-text-disabled)" }}>(optional)</span>
          </div>
          <input value={objDesc} onChange={e => setObjDesc(e.target.value)}
            placeholder="What does this object represent?"
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 8, padding: "8px 11px", color: "var(--app-text-body)", fontSize: 12, outline: "none", transition: "border-color 0.2s",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--app-accent)")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.09)")} />
        </div>

        <button
          onClick={() => {
            if (!objName.trim()) return;
            const obj: GeneratedObject = activeTab === "ai" && aiResult
              ? { name: objName.trim(), description: objDesc.trim() || aiResult.description, fields: aiResult.fields }
              : activeTab === "template" && selectedTemplate
              ? { name: objName.trim(), description: objDesc.trim() || selectedTemplate.description, fields: selectedTemplate.objects[previewObjIdx]?.fields ?? [] }
              : { name: objName.trim(), description: objDesc.trim() || `Custom object.`, fields: manualFields.map(f => ({ label: f.label, fieldType: f.fieldType, required: f.required })) };
            finishAndClose(obj);
          }}
          disabled={!canCreate}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl"
          style={{
            background: canCreate ? "linear-gradient(135deg,var(--app-accent),var(--app-accent-light))" : "var(--app-border-subtle)",
            color: canCreate ? "#fff" : "var(--app-text-subtle)",
            fontSize: 13, fontWeight: 600, border: "none",
            cursor: canCreate ? "pointer" : "not-allowed",
            boxShadow: canCreate ? "0 4px 20px rgba(99,102,241,0.4)" : "none",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { if (canCreate) (e.currentTarget.style.boxShadow = "0 6px 28px rgba(99,102,241,0.55)"); }}
          onMouseLeave={e => { if (canCreate) (e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.4)"); }}>
          <Zap size={14} />
          {objName.trim() ? `Create "${objName.trim()}"` : "Enter a name to continue"}
        </button>
        {!objName.trim() && (
          <div style={{ color: "var(--app-text-disabled)", fontSize: 10, textAlign: "center", marginTop: 8 }}>
            Type an object name — it will appear in the graph instantly
          </div>
        )}
      </div>
    </div>
  );
}
