import { useState, useCallback, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";

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
  Wand2, Building2, Users, Briefcase, ShoppingCart,
  Server, FileCheck, BarChart3, Package, RefreshCw,
} from "lucide-react";

// ─── TYPES ─────────────────────────────────────────────────────────────────────
interface DroppedField {
  id: string;
  label: string;
  name: string;
  fieldType: string;
  required: boolean;
  length: number;
  isUnique: boolean;
  isReadOnly: boolean;
  isSearchResultEnabled: boolean;
  isSearchEnabled: boolean;
  isListViewEnabled: boolean;
  isAugmentationEnabled: boolean;
  isFreezeColumn: boolean;
  isExternalMapper: boolean;
  helpText: string;
}
interface TemplateField { label: string; fieldType: string; required: boolean; }
interface TemplateObject { name: string; description: string; fields: TemplateField[]; }
interface Template {
  id: string; name: string; icon: React.ElementType; color: string; bgColor: string;
  description: string; objects: TemplateObject[];
}
interface GeneratedObject { name: string; description: string; fields: TemplateField[]; }

export interface CreateObjectModalProps {
  onClose: () => void;
  onObjectCreated?: (obj: GeneratedObject) => void;
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

const PALETTE_GROUPS = ["Basic", "Contact", "Choice", "Relation", "Media"];

// ─── AI SUGGESTIONS ────────────────────────────────────────────────────────────
const AI_SUGGESTIONS = [
  "Customer feedback with satisfaction ratings",
  "Support ticket tracking with SLA",
  "Product catalog with inventory",
  "Sales pipeline with deal stages",
  "Event registration form",
  "Asset maintenance log",
  "Employee onboarding checklist",
  "Budget request and approval",
];

// ─── TEMPLATES ─────────────────────────────────────────────────────────────────
const TEMPLATES: Template[] = [
  {
    id: "crm", name: "CRM", icon: Users, color: "var(--app-accent-light)", bgColor: "var(--app-shell-bg-accent)",
    description: "Contacts, Leads, Deals & Accounts for full sales management",
    objects: [
      { name: "Contact", description: "Individual contacts and relationships", fields: [
        { label: "Full Name", fieldType: "Text", required: true }, { label: "Email", fieldType: "Email", required: true },
        { label: "Phone", fieldType: "Phone", required: false }, { label: "Company", fieldType: "Text", required: false },
        { label: "Status", fieldType: "Select", required: true }, { label: "Lead Source", fieldType: "Select", required: false },
      ]},
      { name: "Lead", description: "Potential sales opportunities", fields: [
        { label: "Title", fieldType: "Text", required: true }, { label: "Company", fieldType: "Text", required: false },
        { label: "Value", fieldType: "Currency", required: false }, { label: "Stage", fieldType: "Select", required: true },
        { label: "Close Date", fieldType: "Date", required: false }, { label: "Owner", fieldType: "Lookup", required: true },
      ]},
      { name: "Deal", description: "Active and closed sales deals", fields: [
        { label: "Deal Name", fieldType: "Text", required: true }, { label: "Value", fieldType: "Currency", required: true },
        { label: "Stage", fieldType: "Select", required: true }, { label: "Probability", fieldType: "Number", required: false },
        { label: "Close Date", fieldType: "Date", required: false }, { label: "Contact", fieldType: "Lookup", required: false },
      ]},
      { name: "Account", description: "Company and organization records", fields: [
        { label: "Company Name", fieldType: "Text", required: true }, { label: "Industry", fieldType: "Select", required: false },
        { label: "Website", fieldType: "URL", required: false }, { label: "Annual Revenue", fieldType: "Currency", required: false },
        { label: "Owner", fieldType: "Lookup", required: false },
      ]},
    ]
  },
  {
    id: "hrms", name: "HRMS", icon: Building2, color: "#34D399", bgColor: "var(--app-shell-bg-success)",
    description: "Employees, Leave, Payroll & Performance Reviews",
    objects: [
      { name: "Employee", description: "Core employee profiles", fields: [
        { label: "Full Name", fieldType: "Text", required: true }, { label: "Email", fieldType: "Email", required: true },
        { label: "Department", fieldType: "Lookup", required: true }, { label: "Job Role", fieldType: "Lookup", required: true },
        { label: "Joining Date", fieldType: "Date", required: true }, { label: "Status", fieldType: "Select", required: true },
        { label: "Salary", fieldType: "Currency", required: false },
      ]},
      { name: "Leave Request", description: "Employee leave applications", fields: [
        { label: "Employee", fieldType: "Lookup", required: true }, { label: "Leave Type", fieldType: "Select", required: true },
        { label: "Start Date", fieldType: "Date", required: true }, { label: "End Date", fieldType: "Date", required: true },
        { label: "Status", fieldType: "Select", required: true }, { label: "Reason", fieldType: "Long Text", required: false },
      ]},
      { name: "Performance Review", description: "Employee evaluation cycles", fields: [
        { label: "Employee", fieldType: "Lookup", required: true }, { label: "Period", fieldType: "Text", required: true },
        { label: "Rating", fieldType: "Number", required: true }, { label: "Goals", fieldType: "Long Text", required: false },
        { label: "Status", fieldType: "Select", required: true },
      ]},
    ]
  },
  {
    id: "pm", name: "Project Management", icon: Briefcase, color: "#60A5FA", bgColor: "rgba(59,130,246,0.12)",
    description: "Projects, Tasks, Milestones & Team Collaboration",
    objects: [
      { name: "Project", description: "Top-level project containers", fields: [
        { label: "Project Name", fieldType: "Text", required: true }, { label: "Description", fieldType: "Long Text", required: false },
        { label: "Start Date", fieldType: "Date", required: false }, { label: "End Date", fieldType: "Date", required: false },
        { label: "Status", fieldType: "Select", required: true }, { label: "Manager", fieldType: "Lookup", required: false },
      ]},
      { name: "Task", description: "Individual work items", fields: [
        { label: "Title", fieldType: "Text", required: true }, { label: "Status", fieldType: "Select", required: true },
        { label: "Priority", fieldType: "Select", required: false }, { label: "Assignee", fieldType: "Lookup", required: false },
        { label: "Due Date", fieldType: "Date", required: false }, { label: "Project", fieldType: "Lookup", required: true },
      ]},
      { name: "Milestone", description: "Key project checkpoints", fields: [
        { label: "Name", fieldType: "Text", required: true }, { label: "Due Date", fieldType: "Date", required: true },
        { label: "Status", fieldType: "Select", required: true }, { label: "Project", fieldType: "Lookup", required: true },
      ]},
    ]
  },
  {
    id: "finance", name: "Finance", icon: BarChart3, color: "#FCD34D", bgColor: "rgba(245,158,11,0.12)",
    description: "Invoices, Expenses & Budget Management",
    objects: [
      { name: "Invoice", description: "Customer billing records", fields: [
        { label: "Invoice Number", fieldType: "Text", required: true }, { label: "Issue Date", fieldType: "Date", required: true },
        { label: "Due Date", fieldType: "Date", required: true }, { label: "Amount", fieldType: "Currency", required: true },
        { label: "Status", fieldType: "Select", required: true }, { label: "Customer", fieldType: "Lookup", required: true },
      ]},
      { name: "Expense", description: "Company expense tracking", fields: [
        { label: "Category", fieldType: "Select", required: true }, { label: "Amount", fieldType: "Currency", required: true },
        { label: "Date", fieldType: "Date", required: true }, { label: "Receipt", fieldType: "File", required: false },
        { label: "Status", fieldType: "Select", required: true }, { label: "Notes", fieldType: "Long Text", required: false },
      ]},
      { name: "Budget", description: "Budget allocation by department", fields: [
        { label: "Budget Name", fieldType: "Text", required: true }, { label: "Period", fieldType: "Text", required: true },
        { label: "Allocated", fieldType: "Currency", required: true }, { label: "Spent", fieldType: "Currency", required: false },
        { label: "Department", fieldType: "Lookup", required: false },
      ]},
    ]
  },
  {
    id: "itsm", name: "IT Service Desk", icon: Server, color: "var(--app-text-danger)", bgColor: "rgba(239,68,68,0.12)",
    description: "Tickets, Assets & SLA Tracking",
    objects: [
      { name: "Ticket", description: "IT support requests and incidents", fields: [
        { label: "Title", fieldType: "Text", required: true }, { label: "Priority", fieldType: "Select", required: true },
        { label: "Status", fieldType: "Select", required: true }, { label: "Reporter", fieldType: "Lookup", required: true },
        { label: "Assignee", fieldType: "Lookup", required: false }, { label: "Description", fieldType: "Long Text", required: true },
        { label: "Category", fieldType: "Select", required: false },
      ]},
      { name: "Asset", description: "IT hardware and software assets", fields: [
        { label: "Asset Name", fieldType: "Text", required: true }, { label: "Type", fieldType: "Select", required: true },
        { label: "Serial Number", fieldType: "Text", required: false }, { label: "Status", fieldType: "Select", required: true },
        { label: "Assigned To", fieldType: "Lookup", required: false }, { label: "Purchase Date", fieldType: "Date", required: false },
      ]},
    ]
  },
  {
    id: "ecommerce", name: "E-Commerce", icon: ShoppingCart, color: "#FB923C", bgColor: "rgba(249,115,22,0.12)",
    description: "Products, Orders & Customer Management",
    objects: [
      { name: "Product", description: "Product catalog with inventory", fields: [
        { label: "Product Name", fieldType: "Text", required: true }, { label: "SKU", fieldType: "Text", required: true },
        { label: "Price", fieldType: "Currency", required: true }, { label: "Stock", fieldType: "Number", required: true },
        { label: "Category", fieldType: "Select", required: false }, { label: "Description", fieldType: "Long Text", required: false },
      ]},
      { name: "Order", description: "Customer purchase records", fields: [
        { label: "Order Number", fieldType: "Text", required: true }, { label: "Date", fieldType: "Date", required: true },
        { label: "Status", fieldType: "Select", required: true }, { label: "Total", fieldType: "Currency", required: true },
        { label: "Customer", fieldType: "Lookup", required: true }, { label: "Shipping Address", fieldType: "Text", required: false },
      ]},
      { name: "Customer", description: "Buyer profiles", fields: [
        { label: "Full Name", fieldType: "Text", required: true }, { label: "Email", fieldType: "Email", required: true },
        { label: "Phone", fieldType: "Phone", required: false }, { label: "Address", fieldType: "Text", required: false },
      ]},
    ]
  },
  {
    id: "inventory", name: "Inventory", icon: Package, color: "#A3E635", bgColor: "rgba(132,204,22,0.12)",
    description: "Items, Warehouses & Supplier Management",
    objects: [
      { name: "Item", description: "Warehouse stock items", fields: [
        { label: "Item Name", fieldType: "Text", required: true }, { label: "SKU", fieldType: "Text", required: true },
        { label: "Quantity", fieldType: "Number", required: true }, { label: "Unit", fieldType: "Select", required: false },
        { label: "Min Stock", fieldType: "Number", required: false }, { label: "Supplier", fieldType: "Lookup", required: false },
      ]},
      { name: "Supplier", description: "Vendor and supplier records", fields: [
        { label: "Company Name", fieldType: "Text", required: true }, { label: "Email", fieldType: "Email", required: false },
        { label: "Phone", fieldType: "Phone", required: false }, { label: "Payment Terms", fieldType: "Select", required: false },
        { label: "Status", fieldType: "Select", required: true },
      ]},
    ]
  },
  {
    id: "compliance", name: "Compliance", icon: FileCheck, color: "#C084FC", bgColor: "rgba(168,85,247,0.12)",
    description: "Policies, Audits & Regulatory Tracking",
    objects: [
      { name: "Policy", description: "Company policies and procedures", fields: [
        { label: "Policy Name", fieldType: "Text", required: true }, { label: "Category", fieldType: "Select", required: true },
        { label: "Effective Date", fieldType: "Date", required: true }, { label: "Status", fieldType: "Select", required: true },
        { label: "Owner", fieldType: "Lookup", required: true }, { label: "Description", fieldType: "Long Text", required: false },
      ]},
      { name: "Audit", description: "Internal and external audit records", fields: [
        { label: "Audit Name", fieldType: "Text", required: true }, { label: "Type", fieldType: "Select", required: true },
        { label: "Date", fieldType: "Date", required: true }, { label: "Status", fieldType: "Select", required: true },
        { label: "Auditor", fieldType: "Lookup", required: false }, { label: "Findings", fieldType: "Long Text", required: false },
      ]},
    ]
  },
];

// ─── AI GENERATION ─────────────────────────────────────────────────────────────
function generateFromPrompt(prompt: string): GeneratedObject {
  const lower = prompt.toLowerCase();
  if (lower.match(/feedback|rating|satisfaction|survey/)) return {
    name: "Customer Feedback",
    description: "Captures satisfaction ratings, comments, and follow-up actions from customers.",
    fields: [
      { label: "Customer Name", fieldType: "Text", required: true }, { label: "Email", fieldType: "Email", required: false },
      { label: "Satisfaction Rating", fieldType: "Number", required: true }, { label: "Category", fieldType: "Select", required: false },
      { label: "Comments", fieldType: "Long Text", required: false }, { label: "Submitted Date", fieldType: "Date", required: true },
      { label: "Status", fieldType: "Select", required: true }, { label: "Assigned To", fieldType: "Lookup", required: false },
    ]
  };
  if (lower.match(/ticket|support|issue|incident|help\s*desk/)) return {
    name: "Support Ticket",
    description: "Tracks support requests from submission through resolution with SLA monitoring.",
    fields: [
      { label: "Title", fieldType: "Text", required: true }, { label: "Description", fieldType: "Long Text", required: true },
      { label: "Priority", fieldType: "Select", required: true }, { label: "Status", fieldType: "Select", required: true },
      { label: "Reporter", fieldType: "Email", required: true }, { label: "Assignee", fieldType: "Lookup", required: false },
      { label: "Created Date", fieldType: "Date", required: true }, { label: "Resolved Date", fieldType: "Date", required: false },
      { label: "Resolution", fieldType: "Long Text", required: false },
    ]
  };
  if (lower.match(/product|catalog|item|inventory|stock/)) return {
    name: "Product Catalog",
    description: "Manages product listings with pricing, stock levels, and categorization.",
    fields: [
      { label: "Product Name", fieldType: "Text", required: true }, { label: "SKU", fieldType: "Text", required: true },
      { label: "Description", fieldType: "Long Text", required: false }, { label: "Price", fieldType: "Currency", required: true },
      { label: "Stock Quantity", fieldType: "Number", required: true }, { label: "Category", fieldType: "Select", required: false },
      { label: "Status", fieldType: "Select", required: true }, { label: "Image", fieldType: "File", required: false },
    ]
  };
  if (lower.match(/sales|pipeline|deal|opportunity|lead/)) return {
    name: "Sales Pipeline",
    description: "Tracks deals through the sales funnel with probability and value forecasting.",
    fields: [
      { label: "Deal Name", fieldType: "Text", required: true }, { label: "Company", fieldType: "Text", required: false },
      { label: "Value", fieldType: "Currency", required: true }, { label: "Stage", fieldType: "Select", required: true },
      { label: "Probability", fieldType: "Number", required: false }, { label: "Close Date", fieldType: "Date", required: false },
      { label: "Owner", fieldType: "Lookup", required: true }, { label: "Notes", fieldType: "Long Text", required: false },
    ]
  };
  if (lower.match(/event|registration|attendee|conference|meeting/)) return {
    name: "Event Registration",
    description: "Manages event sign-ups, seat tracking, and attendee communications.",
    fields: [
      { label: "Attendee Name", fieldType: "Text", required: true }, { label: "Email", fieldType: "Email", required: true },
      { label: "Phone", fieldType: "Phone", required: false }, { label: "Event", fieldType: "Lookup", required: true },
      { label: "Registration Date", fieldType: "Date", required: true }, { label: "Status", fieldType: "Select", required: true },
      { label: "Dietary Requirements", fieldType: "Text", required: false }, { label: "Notes", fieldType: "Long Text", required: false },
    ]
  };
  if (lower.match(/asset|equipment|maintenance|device|hardware/)) return {
    name: "Asset Management",
    description: "Tracks company assets, maintenance schedules, and assignment history.",
    fields: [
      { label: "Asset Name", fieldType: "Text", required: true }, { label: "Asset Type", fieldType: "Select", required: true },
      { label: "Serial Number", fieldType: "Text", required: false }, { label: "Status", fieldType: "Select", required: true },
      { label: "Assigned To", fieldType: "Lookup", required: false }, { label: "Location", fieldType: "Text", required: false },
      { label: "Purchase Date", fieldType: "Date", required: false }, { label: "Next Service", fieldType: "Date", required: false },
    ]
  };
  if (lower.match(/onboard|checklist|task|process|workflow/)) return {
    name: "Onboarding Checklist",
    description: "Manages structured task checklists for employee or customer onboarding.",
    fields: [
      { label: "Person Name", fieldType: "Text", required: true }, { label: "Email", fieldType: "Email", required: true },
      { label: "Start Date", fieldType: "Date", required: true }, { label: "Manager", fieldType: "Lookup", required: false },
      { label: "Department", fieldType: "Lookup", required: false }, { label: "Status", fieldType: "Select", required: true },
      { label: "Completion %", fieldType: "Number", required: false }, { label: "Notes", fieldType: "Long Text", required: false },
    ]
  };
  if (lower.match(/budget|request|approval|spend|expense/)) return {
    name: "Budget Request",
    description: "Manages departmental budget requests and multi-level approval workflows.",
    fields: [
      { label: "Request Title", fieldType: "Text", required: true }, { label: "Amount", fieldType: "Currency", required: true },
      { label: "Category", fieldType: "Select", required: true }, { label: "Requestor", fieldType: "Lookup", required: true },
      { label: "Department", fieldType: "Lookup", required: false }, { label: "Justification", fieldType: "Long Text", required: true },
      { label: "Status", fieldType: "Select", required: true }, { label: "Approved By", fieldType: "Lookup", required: false },
    ]
  };
  const words = prompt.trim().split(/\s+/).filter(w => w.length > 2);
  const name = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || "Custom Object";
  return {
    name, description: `Stores and manages ${prompt.toLowerCase().replace(/\s+/g,' ')} records.`,
    fields: [
      { label: "Name", fieldType: "Text", required: true }, { label: "Description", fieldType: "Long Text", required: false },
      { label: "Status", fieldType: "Select", required: true }, { label: "Owner", fieldType: "Lookup", required: false },
      { label: "Created Date", fieldType: "Date", required: true },
    ]
  };
}

// ─── DRAGGABLE FIELD CHIP ──────────────────────────────────────────────────────
const DND_FIELD = "FIELD_TYPE";

function DraggableFieldChip({ type, color, Icon }: { type: string; color: string; Icon: React.ElementType }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_FIELD,
    item: { fieldType: type },
    collect: m => ({ isDragging: m.isDragging() }),
  }));
  return (
    <div ref={drag as any}
      className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-grab select-none mb-1"
      style={{ opacity: isDragging ? 0.35 : 1, transition: "background 0.12s, opacity 0.12s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--app-border-subtle)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${color}20` }}>
        <Icon size={12} style={{ color }} />
      </div>
      <span style={{ color: "var(--app-text-body)", fontSize: 12 }}>{type}</span>
      <GripVertical size={10} style={{ color: "var(--app-text-disabled)", marginLeft: "auto" }} />
    </div>
  );
}

// ─── FIELD DROP ZONE ───────────────────────────────────────────────────────────
function FieldDropZone({ onDrop, isEmpty, children }: {
  onDrop: (ft: string) => void; isEmpty: boolean; children: React.ReactNode;
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: DND_FIELD,
    drop: (item: { fieldType: string }) => onDrop(item.fieldType),
    collect: m => ({ isOver: m.isOver() }),
  }));
  return (
    <div ref={drop as any} className="flex-1 overflow-y-auto rounded-xl transition-all duration-150"
      style={{
        minHeight: 180,
        border: isOver ? "1.5px dashed var(--app-accent)" : isEmpty ? "1.5px dashed var(--app-border)" : "1.5px solid var(--app-border-subtle)",
        background: isOver ? "rgba(99,102,241,0.06)" : "rgba(0,0,0,0.2)",
        scrollbarWidth: "none",
      }}>
      {isEmpty && (
        <div className="flex flex-col items-center justify-center h-full py-12"
          style={{ color: isOver ? "var(--app-accent-light)" : "var(--app-text-disabled)", transition: "color 0.15s" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ border: `1.5px dashed ${isOver ? "var(--app-accent)" : "var(--app-text-disabled)"}`, transition: "all 0.15s" }}>
            <Plus size={18} />
          </div>
          <span style={{ fontSize: 13 }}>{isOver ? "Release to add field" : "Drag fields here"}</span>
          <span style={{ fontSize: 11, marginTop: 4, color: "var(--app-text-subtle)" }}>Pick from the palette on the left</span>
        </div>
      )}
      {!isEmpty && <div className="p-2">{children}</div>}
    </div>
  );
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

// ─── FIELD BUILDER ROW ─────────────────────────────────────────────────────────
function FieldBuilderRow({ field, isSelected, onSelect, onDelete }: {
  field: DroppedField;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = FT_ICON[field.fieldType] ?? Type;
  const color = FT_COLOR[field.fieldType] ?? "var(--app-text-secondary)";
  return (
    <div
      onClick={() => onSelect(field.id)}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-1.5 group cursor-pointer"
      style={{
        background: isSelected ? "var(--app-shell-bg-accent)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${isSelected ? "var(--app-border-accent-strong)" : "var(--app-border-subtle)"}`,
        transition: "all 0.12s",
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--app-border-subtle)"; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
      <GripVertical size={12} style={{ color: "var(--app-text-disabled)", cursor: "grab", flexShrink: 0 }} />
      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
        <Icon size={11} style={{ color }} />
      </div>
      <span style={{ color: "var(--app-text-primary)", fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {field.label || "Untitled Field"}
      </span>
      <span style={{ fontSize: 9, letterSpacing: "0.1em", color, flexShrink: 0, opacity: 0.7 }}>
        {field.fieldType.toUpperCase()}
      </span>
      {field.required && (
        <span style={{ fontSize: 8, letterSpacing: "0.06em", color: "#34D399", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", padding: "1px 4px", borderRadius: 3 }}>REQ</span>
      )}
      <button
        onClick={e => { e.stopPropagation(); onDelete(field.id); }}
        className="opacity-0 group-hover:opacity-100 shrink-0"
        style={{ color: "var(--app-text-muted)", transition: "all 0.15s", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--app-text-danger)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--app-text-muted)")}>
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ─── FIELD PROPERTIES PANEL ────────────────────────────────────────────────────
function FieldPropertiesPanel({
  field, onUpdate, onClose,
  advExpanded, setAdvExpanded,
  helpExpanded, setHelpExpanded,
  advTab, setAdvTab,
}: {
  field: DroppedField;
  onUpdate: (id: string, u: Partial<DroppedField>) => void;
  onClose: () => void;
  advExpanded: boolean; setAdvExpanded: (v: boolean) => void;
  helpExpanded: boolean; setHelpExpanded: (v: boolean) => void;
  advTab: "lead" | "event"; setAdvTab: (v: "lead" | "event") => void;
}) {
  const Icon = FT_ICON[field.fieldType] ?? Type;
  const color = FT_COLOR[field.fieldType] ?? "var(--app-text-secondary)";

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid var(--app-border)",
    borderRadius: 8, padding: "8px 11px", color: "var(--app-text-primary)", fontSize: 13, outline: "none",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    color: "var(--app-text-muted)", fontSize: 11, letterSpacing: "0.06em", display: "block", marginBottom: 5, fontWeight: 500,
  };

  const sectionLabelStyle: React.CSSProperties = {
    color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8, marginTop: 16,
  };

  const rowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "9px 0", borderBottom: "1px solid var(--app-shell-bg-input)",
  };

  const rowLabelStyle: React.CSSProperties = { color: "var(--app-text-body)", fontSize: 12 };

  return (
    <div style={{
      width: 270, borderLeft: "1px solid var(--app-border)",
      display: "flex", flexDirection: "column", background: "var(--app-shell-bg-footer)", flexShrink: 0,
    }}>
      {/* Panel header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid var(--app-border-subtle)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
          <Icon size={11} style={{ color }} />
        </div>
        <span style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Field Properties
        </span>
        <button onClick={onClose} style={{ color: "var(--app-text-subtle)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--app-text-secondary)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--app-text-subtle)")}>
          <X size={13} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", scrollbarWidth: "none" }}>

        {/* Label */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Label</label>
          <input
            value={field.label}
            onChange={e => onUpdate(field.id, { label: e.target.value })}
            style={inputStyle}
            placeholder="Field label"
            onFocus={e => (e.target.style.borderColor = "var(--app-accent)")}
            onBlur={e => (e.target.style.borderColor = "var(--app-border)")}
          />
        </div>

        {/* Name (auto-derived) */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Name</label>
          <input
            value={field.name}
            onChange={e => onUpdate(field.id, { name: e.target.value })}
            style={{ ...inputStyle, color: "var(--app-text-secondary)" }}
            placeholder="field_name"
            onFocus={e => (e.target.style.borderColor = "var(--app-accent)")}
            onBlur={e => (e.target.style.borderColor = "var(--app-border)")}
          />
        </div>

        {/* Length */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Length</label>
          <input
            type="number"
            value={field.length}
            onChange={e => onUpdate(field.id, { length: Number(e.target.value) })}
            style={{ ...inputStyle, width: "100%" }}
            min={1} max={9999}
            onFocus={e => (e.target.style.borderColor = "var(--app-accent)")}
            onBlur={e => (e.target.style.borderColor = "var(--app-border)")}
          />
        </div>

        {/* Is Required */}
        <div style={{ ...rowStyle, marginBottom: 4 }}>
          <span style={rowLabelStyle}>Is Required</span>
          <Toggle value={field.required} onChange={v => onUpdate(field.id, { required: v })} />
        </div>

        {/* Advanced settings row */}
        <button
          onClick={() => { setAdvExpanded(!advExpanded); if (!advExpanded) setHelpExpanded(false); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", padding: "10px 0", background: "none", border: "none",
            borderBottom: "1px solid var(--app-shell-bg-input)", cursor: "pointer",
          }}>
          <span style={{ color: "var(--app-text-body)", fontSize: 12 }}>Advanced settings</span>
          <ChevronRight size={13} style={{
            color: "var(--app-text-muted)", transition: "transform 0.2s",
            transform: advExpanded ? "rotate(90deg)" : "rotate(0deg)",
          }} />
        </button>

        {/* Advanced settings expanded */}
        {advExpanded && (
          <div style={{ paddingTop: 12, paddingBottom: 4, animation: "fadeResult 0.2s ease" }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
              <button onClick={() => setAdvExpanded(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--app-text-muted)", padding: 0, display: "flex", alignItems: "center" }}>
                <ArrowLeft size={11} style={{ color: "var(--app-text-muted)" }} />
              </button>
              <span style={{ color: "var(--app-text-muted)", fontSize: 10 }}>{field.label || "Field"} - Advanced settings</span>
              <span style={{ color: "var(--app-text-disabled)", fontSize: 10 }}>/ {field.fieldType}</span>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, marginBottom: 14, borderBottom: "1px solid var(--app-border-subtle)" }}>
              {([["lead", "Lead"], ["event", "Event info"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setAdvTab(key)}
                  style={{
                    padding: "6px 12px", background: "none", border: "none", cursor: "pointer",
                    borderBottom: advTab === key ? "2px solid var(--app-accent)" : "2px solid transparent",
                    color: advTab === key ? "var(--app-text-primary)" : "var(--app-text-muted)", fontSize: 12, marginBottom: -1,
                    transition: "color 0.15s",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* General section */}
            <div style={sectionLabelStyle}>GENERAL</div>
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Is unique</span>
              <Toggle value={field.isUnique} onChange={v => onUpdate(field.id, { isUnique: v })} />
            </div>
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Is read only</span>
              <Toggle value={field.isReadOnly} onChange={v => onUpdate(field.id, { isReadOnly: v })} />
            </div>

            {/* Specification section */}
            <div style={sectionLabelStyle}>SPECIFICATION</div>
            {([
              ["isSearchResultEnabled", "Is search result enabled"],
              ["isSearchEnabled",       "Is search enabled"],
              ["isListViewEnabled",     "Is list view enabled"],
              ["isAugmentationEnabled", "Is augmentation enabled"],
              ["isFreezeColumn",        "Is freeze column"],
              ["isExternalMapper",      "Is External mapper"],
            ] as const).map(([key, lbl]) => (
              <div key={key} style={rowStyle}>
                <span style={rowLabelStyle}>{lbl}</span>
                <Toggle value={field[key] as boolean} onChange={v => onUpdate(field.id, { [key]: v })} />
              </div>
            ))}
          </div>
        )}

        {/* Help text row */}
        <button
          onClick={() => { setHelpExpanded(!helpExpanded); if (!helpExpanded) setAdvExpanded(false); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", padding: "10px 0", background: "none", border: "none",
            borderBottom: "1px solid var(--app-shell-bg-input)", cursor: "pointer",
          }}>
          <span style={{ color: "var(--app-text-body)", fontSize: 12 }}>Help text</span>
          <ChevronRight size={13} style={{
            color: "var(--app-text-muted)", transition: "transform 0.2s",
            transform: helpExpanded ? "rotate(90deg)" : "rotate(0deg)",
          }} />
        </button>

        {/* Help text expanded */}
        {helpExpanded && (
          <div style={{ paddingTop: 10, animation: "fadeResult 0.2s ease" }}>
            <textarea
              value={field.helpText}
              onChange={e => onUpdate(field.id, { helpText: e.target.value })}
              placeholder="Add a helper description for this field…"
              rows={3}
              style={{
                width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid var(--app-border)",
                borderRadius: 8, padding: "8px 11px", color: "var(--app-text-primary)", fontSize: 12,
                outline: "none", resize: "none", lineHeight: 1.5, scrollbarWidth: "none",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--app-accent)")}
              onBlur={e => (e.target.style.borderColor = "var(--app-border)")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN MODAL ────────────────────────────────────────────────────────────────
export function CreateObjectModal({ onClose, onObjectCreated }: CreateObjectModalProps) {
  const [step, setStep] = useState<"method" | "ai" | "manual" | "template">("method");

  // AI state
  const [aiPrompt,     setAiPrompt]     = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult,     setAiResult]     = useState<GeneratedObject | null>(null);

  // Manual state
  const [objName,        setObjName]        = useState("");
  const [objDesc,        setObjDesc]        = useState("");
  const [manualFields,   setManualFields]   = useState<DroppedField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [advExpanded,    setAdvExpanded]    = useState(false);
  const [helpExpanded,   setHelpExpanded]   = useState(false);
  const [advTab,         setAdvTab]         = useState<"lead" | "event">("lead");

  // Template state
  const [selectedTplId,  setSelectedTplId]  = useState<string | null>(null);
  const [previewObjIdx,  setPreviewObjIdx]  = useState(0);

  // Common
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const goBack = useCallback(() => {
    setStep("method"); setAiResult(null); setAiPrompt("");
    setManualFields([]); setObjName(""); setObjDesc("");
    setSelectedFieldId(null); setAdvExpanded(false); setHelpExpanded(false);
    setSelectedTplId(null); setPreviewObjIdx(0);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true); setAiResult(null);
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 600));
    setAiResult(generateFromPrompt(aiPrompt));
    setAiGenerating(false);
  }, [aiPrompt]);

  const addField = useCallback((fieldType: string) => {
    const defaultLabel: Record<string, string> = {
      Text: "Name", Email: "Email", Phone: "Phone", Date: "Date", Select: "Status",
      Number: "Amount", Currency: "Amount", Lookup: "Related Record", "Long Text": "Description",
    };
    const lbl = defaultLabel[fieldType] ?? `${fieldType} Field`;
    const newField: DroppedField = {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      label: lbl,
      name: lbl.toLowerCase().replace(/\s+/g, ""),
      fieldType,
      required: false,
      length: 30,
      isUnique: false,
      isReadOnly: false,
      isSearchResultEnabled: false,
      isSearchEnabled: false,
      isListViewEnabled: false,
      isAugmentationEnabled: false,
      isFreezeColumn: false,
      isExternalMapper: false,
      helpText: "",
    };
    setManualFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
  }, []);

  const updateField = useCallback((id: string, u: Partial<DroppedField>) => {
    setManualFields(prev => prev.map(f => {
      if (f.id !== id) return f;
      const merged = { ...f, ...u };
      if (u.label !== undefined) {
        merged.name = u.label.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
      }
      return merged;
    }));
  }, []);

  const deleteField = useCallback((id: string) => {
    setManualFields(prev => prev.filter(f => f.id !== id));
    setSelectedFieldId(prev => prev === id ? null : prev);
  }, []);

  const finishAndClose = useCallback((obj: GeneratedObject) => {
    setSuccess(true);
    onObjectCreated?.(obj);
    setTimeout(onClose, 1800);
  }, [onObjectCreated, onClose]);

  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTplId);

  // ── SUCCESS OVERLAY ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}>
        <div className="flex flex-col items-center gap-4" style={{ animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <style>{`@keyframes popIn{from{transform:scale(0.6);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.15)", border: "2px solid #10B981", boxShadow: "0 0 40px rgba(16,185,129,0.3)" }}>
            <CheckCircle2 size={38} style={{ color: "#10B981" }} />
          </div>
          <div style={{ color: "var(--app-text-primary)", fontSize: 20, fontWeight: 600 }}>Object Created!</div>
          <div style={{ color: "var(--app-text-muted)", fontSize: 13 }}>Adding to your relationship graph…</div>
        </div>
      </div>
    );
  }

  const isWide = step === "manual" || step === "template";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)", animation: "fadeOverlay 0.2s ease" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{`
        @keyframes fadeOverlay{from{opacity:0}to{opacity:1}}
        @keyframes slideModal{from{transform:translateY(20px) scale(0.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
      `}</style>
      <div style={{
        width: isWide ? (step === "manual" && selectedFieldId ? "min(1160px, 96vw)" : "min(1100px, 95vw)") : "min(820px, 95vw)",
        height: isWide ? "min(760px, 92vh)" : "auto",
        maxHeight: "92vh",
        background: "var(--app-shell-bg-muted)",
        border: "1px solid var(--app-border)",
        borderRadius: 18,
        backdropFilter: "blur(32px)",
        boxShadow: "0 32px 100px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.04) inset",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        fontFamily: "Inter, system-ui, sans-serif",
        animation: "slideModal 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",
        transition: "width 0.3s ease, height 0.3s ease",
      }}>

        {/* ── HEADER */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
          <div className="flex items-center gap-3">
            {step !== "method" && (
              <button onClick={goBack}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ color: "var(--app-text-muted)", transition: "all 0.15s", border: "1px solid var(--app-border)" }}
                onMouseEnter={e => { (e.currentTarget.style.color = "var(--app-text-primary)"); (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"); }}
                onMouseLeave={e => { (e.currentTarget.style.color = "var(--app-text-muted)"); (e.currentTarget.style.borderColor = "var(--app-border)"); }}>
                <ArrowLeft size={13} />
              </button>
            )}
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,var(--app-accent-light),var(--app-accent))", boxShadow: "0 0 12px var(--app-accent)33" }}>
              <Plus size={14} style={{ color: "var(--app-text-on-accent)" }} />
            </div>
            <div>
              <div style={{ color: "var(--app-text-primary)", fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>
                {step === "method"   ? "New Object"
                : step === "ai"      ? "Build with AI Agent"
                : step === "manual"  ? "Build Manually"
                :                     "Use Template"}
              </div>
              {step === "method" && <div style={{ color: "var(--app-text-muted)", fontSize: 11, marginTop: 1 }}>Choose how you'd like to create your object</div>}
              {step === "ai"     && <div style={{ color: "var(--app-text-muted)", fontSize: 11, marginTop: 1 }}>Describe requirements — the agent plans, builds and validates</div>}
              {step === "manual" && <div style={{ color: "var(--app-text-muted)", fontSize: 11, marginTop: 1 }}>Drag field types to build your custom object</div>}
              {step === "template" && <div style={{ color: "var(--app-text-muted)", fontSize: 11, marginTop: 1 }}>Start from a pre-built industry schema</div>}
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ color: "var(--app-text-muted)", transition: "all 0.15s", border: "1px solid var(--app-border)" }}
            onMouseEnter={e => { (e.currentTarget.style.color = "var(--app-text-primary)"); (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"); }}
            onMouseLeave={e => { (e.currentTarget.style.color = "var(--app-text-muted)"); (e.currentTarget.style.borderColor = "var(--app-border)"); }}>
            <X size={13} />
          </button>
        </div>

        {/* ── BODY */}
        <div className="flex-1 overflow-hidden">

          {/* ── METHOD SELECTION ──────────────────────────────────────────── */}
          {step === "method" && (
            <div className="p-7 overflow-y-auto h-full" style={{ scrollbarWidth: "none" }}>
              <div className="grid grid-cols-3 gap-4 h-full">
                {[
                  {
                    key: "ai" as const, Icon: Sparkles, color: "var(--app-accent-light)", bg: "var(--app-shell-bg-accent)",
                    border: "var(--app-border-accent)", glow: "rgba(99,102,241,0.15)",
                    title: "Build with AI Agent",
                    subtitle: "Describe your business requirements",
                    badge: "Recommended", badgeColor: "var(--app-accent-light)",
                    features: [
                      "Natural language input",
                      "Understand · plan · create · connect",
                      "Validate · build · deploy",
                      "Live graph preview",
                    ],
                    cta: "Build with AI",
                  },
                  {
                    key: "manual" as const, Icon: Layers, color: "#34D399", bg: "rgba(16,185,129,0.08)",
                    border: "rgba(16,185,129,0.2)", glow: "var(--app-shell-bg-success)",
                    title: "Build Manually",
                    subtitle: "Drag and drop fields to configure",
                    badge: "Full Control", badgeColor: "#34D399",
                    features: [
                      "Drag-and-drop builder",
                      "13 field types",
                      "Live field editing",
                      "Required field toggles",
                    ],
                    cta: "Open Builder",
                  },
                  {
                    key: "template" as const, Icon: Copy, color: "#F59E0B", bg: "rgba(245,158,11,0.08)",
                    border: "rgba(245,158,11,0.2)", glow: "rgba(245,158,11,0.12)",
                    title: "Use Template",
                    subtitle: "Start from a pre-built industry schema",
                    badge: "8 Templates", badgeColor: "#F59E0B",
                    features: [
                      "CRM, HRMS, Finance",
                      "Project Management",
                      "E-Commerce, IT & more",
                      "Multiple objects at once",
                    ],
                    cta: "Browse Templates",
                  },
                ].map(({ key, Icon, color, bg, border, glow, title, subtitle, badge, badgeColor, features, cta }) => (
                  <button key={key}
                    className="flex flex-col items-start text-left rounded-2xl p-6 group"
                    style={{ background: bg, border: `1px solid ${border}`, transition: "all 0.22s", cursor: "pointer" }}
                    onMouseEnter={e => {
                      (e.currentTarget.style.background = glow);
                      (e.currentTarget.style.borderColor = color);
                      (e.currentTarget.style.boxShadow = `0 0 28px ${glow}`);
                      (e.currentTarget.style.transform = "translateY(-2px)");
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget.style.background = bg);
                      (e.currentTarget.style.borderColor = border);
                      (e.currentTarget.style.boxShadow = "none");
                      (e.currentTarget.style.transform = "translateY(0)");
                    }}
                    onClick={() => setStep(key)}>
                    {/* Icon + Badge */}
                    <div className="flex items-start justify-between w-full mb-5">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                        <Icon size={22} style={{ color }} />
                      </div>
                      <span style={{ fontSize: 10, letterSpacing: "0.08em", color: badgeColor, background: `${badgeColor}15`, border: `1px solid ${badgeColor}30`, padding: "3px 8px", borderRadius: 20 }}>
                        {badge}
                      </span>
                    </div>
                    {/* Title */}
                    <div style={{ color: "#F9FAFB", fontSize: 16, fontWeight: 700, marginBottom: 5 }}>{title}</div>
                    <div style={{ color: "var(--app-text-secondary)", fontSize: 12, marginBottom: 20, lineHeight: 1.5 }}>{subtitle}</div>
                    {/* Features */}
                    <div className="flex flex-col gap-2 mb-6 w-full">
                      {features.map(f => (
                        <div key={f} className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
                          <span style={{ color: "var(--app-text-body)", fontSize: 12 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    {/* CTA */}
                    <div className="flex items-center gap-1.5 mt-auto" style={{ color, fontSize: 13, fontWeight: 500 }}>
                      {cta} <ChevronRight size={14} style={{ transition: "transform 0.15s" }} className="group-hover:translate-x-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── AI FLOW ───────────────────────────────────────────────────── */}
          {step === "ai" && (
            <div className="flex flex-col h-full overflow-y-auto p-6 gap-5" style={{ scrollbarWidth: "none" }}>
              {/* Prompt area */}
              <div>
                <label style={{ color: "var(--app-text-secondary)", fontSize: 11, letterSpacing: "0.1em", display: "block", marginBottom: 8, fontWeight: 600 }}>
                  DESCRIBE YOUR OBJECT
                </label>
                <div className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid var(--app-border)", background: "rgba(0,0,0,0.35)", transition: "border-color 0.2s" }}>
                  <textarea
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
                    placeholder='e.g., "A customer feedback form that captures satisfaction scores, written comments, and response categories with follow-up tracking"'
                    rows={4}
                    style={{
                      width: "100%", background: "transparent", border: "none", outline: "none",
                      color: "var(--app-text-primary)", fontSize: 13, padding: "14px 16px", resize: "none",
                      lineHeight: 1.6, scrollbarWidth: "none",
                    }}
                    onFocus={e => { e.currentTarget.parentElement!.style.borderColor = "var(--app-accent)"; e.currentTarget.parentElement!.style.boxShadow = "0 0 16px rgba(99,102,241,0.15)"; }}
                    onBlur={e => { e.currentTarget.parentElement!.style.borderColor = "var(--app-border)"; e.currentTarget.parentElement!.style.boxShadow = "none"; }}
                  />
                  <div className="flex items-center justify-between px-4 py-2" style={{ borderTop: "1px solid var(--app-border-subtle)" }}>
                    <span style={{ color: "var(--app-text-subtle)", fontSize: 11 }}>Ctrl+Enter to generate</span>
                    <span style={{ color: "var(--app-text-subtle)", fontSize: 11 }}>{aiPrompt.length} chars</span>
                  </div>
                </div>
              </div>
              {/* Quick suggestions */}
              <div>
                <div style={{ color: "var(--app-text-muted)", fontSize: 11, letterSpacing: "0.08em", marginBottom: 8 }}>QUICK SUGGESTIONS</div>
                <div className="flex flex-wrap gap-2">
                  {AI_SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => setAiPrompt(s)}
                      className="px-3 py-1.5 rounded-full"
                      style={{ background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border)", color: "var(--app-text-secondary)", fontSize: 12, transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget.style.color = "var(--app-text-primary)"); (e.currentTarget.style.borderColor = "var(--app-accent)55"); (e.currentTarget.style.background = "var(--app-shell-bg-accent)"); }}
                      onMouseLeave={e => { (e.currentTarget.style.color = "var(--app-text-secondary)"); (e.currentTarget.style.borderColor = "var(--app-border)"); (e.currentTarget.style.background = "var(--app-shell-bg-input)"); }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {/* Generate button */}
              <button onClick={handleGenerate} disabled={!aiPrompt.trim() || aiGenerating}
                className="flex items-center justify-center gap-2.5 py-3 rounded-xl"
                style={{
                  background: aiPrompt.trim() && !aiGenerating ? "linear-gradient(135deg,var(--app-accent),var(--app-accent-light))" : "var(--app-border-subtle)",
                  color: aiPrompt.trim() && !aiGenerating ? "#fff" : "var(--app-text-subtle)",
                  fontSize: 14, fontWeight: 600, border: "none", cursor: aiPrompt.trim() && !aiGenerating ? "pointer" : "not-allowed",
                  transition: "all 0.2s", boxShadow: aiPrompt.trim() && !aiGenerating ? "0 4px 20px var(--app-border-accent)" : "none",
                }}>
                {aiGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {aiGenerating ? "Generating schema…" : "Generate with AI"}
              </button>

              {/* AI Generating animation */}
              {aiGenerating && (
                <div className="rounded-xl p-5" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div style={{ display: "flex", gap: 5 }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{
                          width: 7, height: 7, borderRadius: "50%", background: "var(--app-accent-light)",
                          animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                    <span style={{ color: "var(--app-accent-light)", fontSize: 13 }}>AI is analyzing your prompt…</span>
                    <style>{`@keyframes aiDot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
                  </div>
                  <div className="flex flex-col gap-2">
                    {["Identifying object type…", "Inferring required fields…", "Determining field types…"].map((s, i) => (
                      <div key={s} className="flex items-center gap-2.5">
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(99,102,241,0.3)", border: "1px solid var(--app-accent)44" }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--app-accent-light)",
                            animation: `aiDot 1.2s ease-in-out ${i * 0.35}s infinite` }} />
                        </div>
                        <span style={{ color: "var(--app-text-muted)", fontSize: 12 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Result */}
              {aiResult && !aiGenerating && (
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.05)", animation: "fadeResult 0.3s ease" }}>
                  <style>{`@keyframes fadeResult{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
                  {/* Result header */}
                  <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)" }}>
                      <Wand2 size={15} style={{ color: "var(--app-accent-light)" }} />
                    </div>
                    <div>
                      <div style={{ color: "#F9FAFB", fontSize: 15, fontWeight: 700 }}>{aiResult.name}</div>
                      <div style={{ color: "var(--app-text-muted)", fontSize: 11, marginTop: 1 }}>{aiResult.description}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                      <CheckCircle2 size={11} style={{ color: "#34D399" }} />
                      <span style={{ color: "#34D399", fontSize: 10, letterSpacing: "0.08em" }}>GENERATED</span>
                    </div>
                  </div>
                  {/* Fields list */}
                  <div className="px-5 py-3">
                    <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600 }}>
                      FIELDS · {aiResult.fields.length}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {aiResult.fields.map((f, i) => {
                        const FIcon = FT_ICON[f.fieldType] ?? Type;
                        const fcolor = FT_COLOR[f.fieldType] ?? "var(--app-text-secondary)";
                        return (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--app-border-subtle)" }}>
                            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: `${fcolor}20` }}>
                              <FIcon size={10} style={{ color: fcolor }} />
                            </div>
                            <span style={{ color: "var(--app-text-body)", fontSize: 12, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {f.label}
                            </span>
                            {f.required && <span style={{ color: "#34D399", fontSize: 8, letterSpacing: "0.08em", opacity: 0.8 }}>REQ</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Action row */}
                  <div className="flex items-center gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--app-border-subtle)" }}>
                    <button onClick={handleGenerate}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl"
                      style={{ background: "var(--app-border-subtle)", border: "1px solid var(--app-border)", color: "var(--app-text-secondary)", fontSize: 13, transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget.style.color = "var(--app-text-primary)"); }}
                      onMouseLeave={e => { (e.currentTarget.style.color = "var(--app-text-secondary)"); }}>
                      <RefreshCw size={13} /> Regenerate
                    </button>
                    <button onClick={() => finishAndClose(aiResult)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl"
                      style={{ background: "linear-gradient(135deg,var(--app-accent),var(--app-accent-light))", color: "var(--app-text-on-accent)", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "0 4px 16px var(--app-border-accent)", transition: "all 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 24px rgba(99,102,241,0.55)")}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 4px 16px var(--app-border-accent)")}>
                      <CheckCircle2 size={15} /> Create Object
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MANUAL FLOW ───────────────────────────────────────────────── */}
          {step === "manual" && (
            <div className="flex h-full overflow-hidden">
              {/* Left: field palette */}
              <div className="shrink-0 overflow-y-auto py-5 px-3"
                style={{ width: 185, borderRight: "1px solid var(--app-border-subtle)", scrollbarWidth: "none" }}>
                <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 600, marginBottom: 12, paddingLeft: 4 }}>
                  FIELD TYPES
                </div>
                {PALETTE_GROUPS.map(group => {
                  const items = FIELD_PALETTE.filter(f => f.group === group);
                  if (!items.length) return null;
                  return (
                    <div key={group} style={{ marginBottom: 16 }}>
                      <div style={{ color: "var(--app-text-disabled)", fontSize: 10, letterSpacing: "0.08em", marginBottom: 6, paddingLeft: 4 }}>
                        {group.toUpperCase()}
                      </div>
                      {items.map(f => <DraggableFieldChip key={f.type} type={f.type} color={f.color} Icon={f.icon} />)}
                    </div>
                  );
                })}
                <div style={{ marginTop: 12, borderTop: "1px solid var(--app-border-subtle)", paddingTop: 12 }}>
                  <div style={{ color: "var(--app-text-subtle)", fontSize: 10, lineHeight: 1.5, paddingLeft: 4 }}>
                    Drag any field into the builder →
                  </div>
                </div>
              </div>

              {/* Center: builder */}
              <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: "none", minWidth: 0 }}>
                {/* Object name + description */}
                <div className="mb-4">
                  <label style={{ color: "var(--app-text-secondary)", fontSize: 10, letterSpacing: "0.1em", display: "block", marginBottom: 6, fontWeight: 600 }}>
                    OBJECT NAME
                  </label>
                  <input value={objName} onChange={e => setObjName(e.target.value)}
                    placeholder="e.g., Customer Feedback, Support Ticket…"
                    style={{
                      width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid var(--app-border)",
                      borderRadius: 10, padding: "9px 13px", color: "var(--app-text-primary)", fontSize: 13, outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--app-accent)")}
                    onBlur={e => (e.target.style.borderColor = "var(--app-border)")} />
                </div>
                <div className="mb-4">
                  <label style={{ color: "var(--app-text-secondary)", fontSize: 10, letterSpacing: "0.1em", display: "block", marginBottom: 6, fontWeight: 600 }}>
                    DESCRIPTION <span style={{ color: "var(--app-text-subtle)" }}>(optional)</span>
                  </label>
                  <input value={objDesc} onChange={e => setObjDesc(e.target.value)}
                    placeholder="What does this object represent?"
                    style={{
                      width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid var(--app-border)",
                      borderRadius: 10, padding: "9px 13px", color: "var(--app-text-primary)", fontSize: 12, outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--app-accent)")}
                    onBlur={e => (e.target.style.borderColor = "var(--app-border)")} />
                </div>

                {/* Fields section */}
                <div className="flex items-center justify-between mb-3">
                  <label style={{ color: "var(--app-text-secondary)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 600 }}>
                    FIELDS {manualFields.length > 0 && <span style={{ color: "var(--app-text-muted)" }}>· {manualFields.length}</span>}
                  </label>
                  {manualFields.length > 0 && (
                    <span style={{ color: "var(--app-text-subtle)", fontSize: 10 }}>Click a field to configure</span>
                  )}
                </div>

                <FieldDropZone onDrop={addField} isEmpty={manualFields.length === 0}>
                  {manualFields.map(f => (
                    <FieldBuilderRow
                      key={f.id}
                      field={f}
                      isSelected={selectedFieldId === f.id}
                      onSelect={id => {
                        setSelectedFieldId(id);
                        setAdvExpanded(false);
                        setHelpExpanded(false);
                      }}
                      onDelete={deleteField}
                    />
                  ))}
                </FieldDropZone>

                {/* Save button */}
                {(objName.trim() || manualFields.length > 0) && (
                  <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid var(--app-border-subtle)" }}>
                    <div style={{ color: "var(--app-text-muted)", fontSize: 11 }}>
                      {manualFields.length} field{manualFields.length !== 1 ? "s" : ""} configured
                    </div>
                    <button
                      onClick={() => finishAndClose({
                        name: objName.trim() || "Untitled Object",
                        description: objDesc.trim() || "Custom object built manually.",
                        fields: manualFields.map(f => ({ label: f.label, fieldType: f.fieldType, required: f.required })),
                      })}
                      disabled={!objName.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl"
                      style={{
                        background: objName.trim() ? "linear-gradient(135deg,#10B981,#34D399)" : "var(--app-border-subtle)",
                        color: objName.trim() ? "#fff" : "var(--app-text-subtle)",
                        fontSize: 13, fontWeight: 600, border: "none",
                        cursor: objName.trim() ? "pointer" : "not-allowed",
                        boxShadow: objName.trim() ? "0 4px 16px rgba(16,185,129,0.3)" : "none",
                        transition: "all 0.2s",
                      }}>
                      <CheckCircle2 size={14} /> Create Object
                    </button>
                  </div>
                )}
              </div>

              {/* Right: field properties panel */}
              {selectedFieldId && (() => {
                const selField = manualFields.find(f => f.id === selectedFieldId);
                if (!selField) return null;
                return (
                  <FieldPropertiesPanel
                    field={selField}
                    onUpdate={updateField}
                    onClose={() => setSelectedFieldId(null)}
                    advExpanded={advExpanded}
                    setAdvExpanded={setAdvExpanded}
                    helpExpanded={helpExpanded}
                    setHelpExpanded={setHelpExpanded}
                    advTab={advTab}
                    setAdvTab={setAdvTab}
                  />
                );
              })()}

              {/* Placeholder when no field selected but fields exist */}
              {!selectedFieldId && manualFields.length > 0 && (
                <div style={{
                  width: 270, borderLeft: "1px solid var(--app-border)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: "var(--app-shell-bg-footer)", flexShrink: 0, gap: 8,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Layers size={15} style={{ color: "var(--app-text-disabled)" }} />
                  </div>
                  <div style={{ color: "var(--app-text-subtle)", fontSize: 12, textAlign: "center", padding: "0 20px" }}>
                    Select a field to view its properties
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TEMPLATE FLOW ─────────────────────────────────────────────── */}
          {step === "template" && (
            <div className="flex h-full overflow-hidden">
              {/* Left: template grid */}
              <div className="overflow-y-auto p-5" style={{ width: 420, borderRight: "1px solid var(--app-border-subtle)", scrollbarWidth: "none" }}>
                <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 600, marginBottom: 14 }}>CHOOSE TEMPLATE</div>
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.map(t => {
                    const Icon = t.icon;
                    const isSel = selectedTplId === t.id;
                    return (
                      <button key={t.id} onClick={() => { setSelectedTplId(t.id); setPreviewObjIdx(0); }}
                        className="flex flex-col items-start p-4 rounded-xl text-left"
                        style={{
                          background: isSel ? t.bgColor : "var(--app-shell-bg-subtle)",
                          border: `1.5px solid ${isSel ? t.color + "66" : "var(--app-border)"}`,
                          transition: "all 0.2s", cursor: "pointer",
                          boxShadow: isSel ? `0 0 16px ${t.bgColor}` : "none",
                        }}
                        onMouseEnter={e => { if (!isSel) { (e.currentTarget.style.background = t.bgColor); (e.currentTarget.style.borderColor = t.color + "44"); }}}
                        onMouseLeave={e => { if (!isSel) { (e.currentTarget.style.background = "var(--app-shell-bg-subtle)"); (e.currentTarget.style.borderColor = "var(--app-border)"); }}}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                          style={{ background: `${t.color}20`, border: `1px solid ${t.color}30` }}>
                          <Icon size={16} style={{ color: t.color }} />
                        </div>
                        <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{t.name}</div>
                        <div style={{ color: "var(--app-text-muted)", fontSize: 11, lineHeight: 1.4 }}>{t.objects.length} objects</div>
                        {isSel && (
                          <div className="mt-2 flex items-center gap-1"
                            style={{ color: t.color, fontSize: 11 }}>
                            <CheckCircle2 size={11} /> Selected
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: template preview */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {!selectedTemplate ? (
                  <div className="flex-1 flex flex-col items-center justify-center" style={{ color: "var(--app-text-disabled)" }}>
                    <Copy size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <div style={{ fontSize: 14, color: "var(--app-text-subtle)" }}>Select a template to preview</div>
                  </div>
                ) : (
                  <>
                    {/* Template header */}
                    <div className="px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: `${selectedTemplate.color}20`, border: `1px solid ${selectedTemplate.color}30` }}>
                          {(() => { const Icon = selectedTemplate.icon; return <Icon size={18} style={{ color: selectedTemplate.color }} />; })()}
                        </div>
                        <div>
                          <div style={{ color: "#F9FAFB", fontSize: 16, fontWeight: 700 }}>{selectedTemplate.name}</div>
                          <div style={{ color: "var(--app-text-muted)", fontSize: 12, marginTop: 1 }}>{selectedTemplate.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-3">
                        {selectedTemplate.objects.map((obj, i) => (
                          <button key={i} onClick={() => setPreviewObjIdx(i)}
                            className="px-3 py-1 rounded-full"
                            style={{
                              fontSize: 11, fontWeight: 500, transition: "all 0.15s",
                              background: previewObjIdx === i ? `${selectedTemplate.color}20` : "var(--app-shell-bg-input)",
                              border: `1px solid ${previewObjIdx === i ? selectedTemplate.color + "55" : "var(--app-border)"}`,
                              color: previewObjIdx === i ? selectedTemplate.color : "var(--app-text-secondary)",
                              cursor: "pointer",
                            }}>
                            {obj.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Object preview */}
                    <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: "none" }}>
                      {(() => {
                        const obj = selectedTemplate.objects[previewObjIdx];
                        if (!obj) return null;
                        return (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <div style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600 }}>{obj.name}</div>
                                <div style={{ color: "var(--app-text-muted)", fontSize: 12, marginTop: 2 }}>{obj.description}</div>
                              </div>
                              <div style={{ color: "var(--app-text-muted)", fontSize: 11 }}>{obj.fields.length} fields</div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {obj.fields.map((f, i) => {
                                const FIcon = FT_ICON[f.fieldType] ?? Type;
                                const fcolor = FT_COLOR[f.fieldType] ?? "var(--app-text-secondary)";
                                return (
                                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                                    style={{ background: "var(--app-shell-bg-subtle)", border: "1px solid var(--app-border-subtle)" }}>
                                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                                      style={{ background: `${fcolor}18` }}>
                                      <FIcon size={11} style={{ color: fcolor }} />
                                    </div>
                                    <span style={{ color: "var(--app-text-body)", fontSize: 13, flex: 1 }}>{f.label}</span>
                                    <span style={{ color: fcolor, fontSize: 10, letterSpacing: "0.08em", opacity: 0.75 }}>
                                      {f.fieldType.toUpperCase()}
                                    </span>
                                    {f.required && (
                                      <span style={{ color: "#34D399", fontSize: 9, letterSpacing: "0.06em", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", padding: "1px 5px", borderRadius: 4 }}>REQ</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Apply button */}
                    <div className="px-6 py-4 shrink-0" style={{ borderTop: "1px solid var(--app-border-subtle)" }}>
                      <div className="flex items-center justify-between">
                        <div style={{ color: "var(--app-text-muted)", fontSize: 12 }}>
                          Will create <span style={{ color: selectedTemplate.color }}>{selectedTemplate.objects.length} objects</span> with{" "}
                          {selectedTemplate.objects.reduce((acc, o) => acc + o.fields.length, 0)} fields total
                        </div>
                        <button
                          onClick={() => finishAndClose({
                            name: `${selectedTemplate.name} Template`,
                            description: selectedTemplate.description,
                            fields: selectedTemplate.objects[0]?.fields ?? [],
                          })}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl"
                          style={{
                            background: `linear-gradient(135deg, ${selectedTemplate.color}, ${selectedTemplate.color}dd)`,
                            color: "var(--app-text-on-accent)", fontSize: 14, fontWeight: 600,
                            border: "none", cursor: "pointer",
                            boxShadow: `0 4px 16px ${selectedTemplate.bgColor}`,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 6px 24px ${selectedTemplate.color}55`)}
                          onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 4px 16px ${selectedTemplate.bgColor}`)}>
                          <CheckCircle2 size={15} /> Apply Template
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
