/**
 * Object-creation templates for ERP / SaaS product starters.
 * Each suite is template-specific (fields, relationships, advanced settings).
 */

import {
  mergeObjectSettings,
  suggestPlural,
  type ObjectSettings,
  type WizardObjectType,
} from "../types/object-settings";

export type TemplateCategory = "ERP" | "SaaS";

export interface ObjectTemplateField {
  label: string;
  fieldType: string;
  required?: boolean;
  starred?: boolean;
  tracked?: boolean;
  /** Sibling object API name (snake_case) for Lookup / Master Details / Record Association */
  relatedObjectName?: string;
}

export interface ObjectTemplateObject {
  /** API name (snake_case) */
  name: string;
  /** Display title shown in the UI */
  title?: string;
  description: string;
  objectType: WizardObjectType;
  color: string;
  fields: ObjectTemplateField[];
  /** Deep-partial patches merged onto defaults for this object */
  settingsPatch?: Partial<ObjectSettings>;
}

export interface ObjectTemplateEdge {
  from: string;
  to: string;
}

export interface ObjectTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  tagline: string;
  description: string;
  /** Lucide icon key resolved in the template UI */
  icon: "users" | "briefcase" | "barChart" | "layers" | "cart" | "monitor" | "heart" | "package";
  accentColor: string;
  objects: ObjectTemplateObject[];
  objEdges: ObjectTemplateEdge[];
}

export interface TemplateObjectDraft {
  key: string;
  name: string;
  title: string;
  description: string;
  objectType: WizardObjectType;
  color: string;
  fields: Array<{
    id: string;
    label: string;
    fieldType: string;
    required: boolean;
    starred: boolean;
    tracked: boolean;
    isPrimary: boolean;
    relatedObjectId?: string;
  }>;
  objectSettings: ObjectSettings;
  customized: boolean;
}

function fieldId(objKey: string, index: number) {
  return `${objKey}_f${index}`;
}

export function templateFieldCount(t: ObjectTemplate): number {
  return t.objects.reduce((n, o) => n + o.fields.length, 0);
}

export function buildTemplateDrafts(template: ObjectTemplate): TemplateObjectDraft[] {
  const nameToTitle = Object.fromEntries(
    template.objects.map(o => [o.name, o.title?.trim() || o.name]),
  );
  return template.objects.map((obj, oi) => {
    const key = `tpl_${template.id}_${oi}`;
    const title = obj.title?.trim() || obj.name;
    const fields = obj.fields.map((f, fi) => ({
      id: fieldId(key, fi),
      label: f.label,
      fieldType: f.fieldType,
      required: Boolean(f.required),
      starred: Boolean(f.starred),
      tracked: Boolean(f.tracked),
      isPrimary: fi === 0,
      relatedObjectId: f.relatedObjectName
        ? (nameToTitle[f.relatedObjectName] ?? f.relatedObjectName)
        : undefined,
    }));
    const objectSettings = mergeObjectSettings(
      {
        primaryInfo: {
          pluralLabel: suggestPlural(title),
          moduleName: title,
        },
        ...(obj.settingsPatch ?? {}),
      },
      obj.objectType,
    );
    return {
      key,
      name: obj.name,
      title,
      description: obj.description,
      objectType: obj.objectType,
      color: obj.color,
      fields,
      objectSettings,
      customized: false,
    };
  });
}

/** ERP / SaaS object suites — content varies per product. */
export const OBJECT_TEMPLATES: ObjectTemplate[] = [
  {
    id: "crm",
    name: "CRM Suite",
    category: "SaaS",
    tagline: "Track pipeline, accounts, and every customer touchpoint",
    description:
      "Pre-built sales objects that connect leads, accounts, contacts, opportunities, and activities so reps and managers work from one consistent data model.",
    icon: "users",
    accentColor: "#6366F1",
    objects: [
      {
        name: "account",
        title: "Account",
        description:
          "Stores the companies and buying organizations your sales team works with across the pipeline. Use it as the parent record for contacts, opportunities, and account-level firmographics so reporting stays consistent from first outreach through close. Account managers and sales ops rely on this object to segment territories and forecast revenue.",
        objectType: "Normal",
        color: "#6366F1",
        fields: [
          { label: "Account Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Industry", fieldType: "Drop-Down", required: false },
          { label: "Website", fieldType: "URL", required: false },
          { label: "Annual Revenue", fieldType: "Currency", required: false, tracked: true },
          { label: "Employee Count", fieldType: "Number", required: false },
          { label: "Billing City", fieldType: "Single-Line", required: false },
        ],
        settingsPatch: {
          fieldTracking: { trackCreated: true, trackModified: true, logHistory: true },
          addInfo: { trackRecordHistory: true, enableReport: true },
        },
      },
      {
        name: "contact",
        title: "Contact",
        description:
          "Captures individual people at customer and prospect accounts—names, roles, and reachability details your reps use daily. Contacts roll up to accounts and appear on opportunities and activities so conversation history follows the person, not just the company. Marketing and sales alignment depends on keeping this record accurate for nurture and handoff.",
        objectType: "Normal",
        color: "#818CF8",
        fields: [
          { label: "Full Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Email", fieldType: "Email Address", required: true, tracked: true },
          { label: "Phone", fieldType: "Phone", required: false },
          { label: "Job Title", fieldType: "Single-Line", required: false },
          { label: "Account", fieldType: "Lookup", required: true, relatedObjectName: "account" },
          { label: "Lead Source", fieldType: "Drop-Down", required: false },
          { label: "Status", fieldType: "Drop-Down", required: true },
        ],
        settingsPatch: {
          fieldTracking: { trackCreated: true, trackModified: true },
          addInfo: { addNotesAndAttachments: true, isMobileEnabled: true },
        },
      },
      {
        name: "lead",
        title: "Lead",
        description:
          "Holds early-stage prospects that are not yet qualified enough to become opportunities or full contacts. Reps and SDRs use leads to capture inbound interest, score fit, and assign ownership before conversion. This object sits at the top of the CRM funnel and feeds qualified records into contacts and opportunities.",
        objectType: "Normal",
        color: "#A5B4FC",
        fields: [
          { label: "Lead Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Company", fieldType: "Single-Line", required: false },
          { label: "Email", fieldType: "Email Address", required: true },
          { label: "Status", fieldType: "Drop-Down", required: true, tracked: true },
          { label: "Score", fieldType: "Number", required: false },
          { label: "Owner", fieldType: "Lookup", required: false, relatedObjectName: "contact" },
          { label: "Notes", fieldType: "Multi Line", required: false },
        ],
        settingsPatch: {
          autoAssignment: {
            enabled: true,
            assignmentMode: "roundRobin",
            defaultAssignee: "Sales queue",
          },
        },
      },
      {
        name: "opportunity",
        title: "Opportunity",
        description:
          "Represents revenue deals in flight—amount, stage, close date, and win probability tied to an account and primary buyer. Sales managers use opportunities for pipeline reviews and forecast commits; reps update stages as deals progress. This object is the financial backbone of the CRM suite alongside accounts and contacts.",
        objectType: "Normal",
        color: "#4F46E5",
        fields: [
          { label: "Opportunity Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Amount", fieldType: "Currency", required: true, tracked: true },
          { label: "Stage", fieldType: "Drop-Down", required: true },
          { label: "Close Date", fieldType: "Date Picker", required: true },
          { label: "Account", fieldType: "Lookup", required: true, relatedObjectName: "account" },
          { label: "Primary Contact", fieldType: "Lookup", required: false, relatedObjectName: "contact" },
          { label: "Probability", fieldType: "Number", required: false },
        ],
        settingsPatch: {
          fieldTracking: { trackCreated: true, trackModified: true, logHistory: true },
          addInfo: { enableReport: true },
        },
      },
      {
        name: "activity",
        title: "Activity",
        description:
          "Logs calls, meetings, tasks, and follow-ups against people and deals in the CRM. Reps schedule and complete activities to prove engagement; managers inspect overdue work from this object. Activities link to contacts (and indirectly to accounts and opportunities) so the full relationship timeline is visible in one place.",
        objectType: "Normal",
        color: "#C7D2FE",
        fields: [
          { label: "Subject", fieldType: "Single-Line", required: true, starred: true },
          { label: "Type", fieldType: "Drop-Down", required: true },
          { label: "Due Date", fieldType: "Date & Time", required: false },
          { label: "Status", fieldType: "Drop-Down", required: true },
          { label: "Related Contact", fieldType: "Lookup", required: false, relatedObjectName: "contact" },
          { label: "Notes", fieldType: "Multi Line", required: false },
        ],
        settingsPatch: {
          addInfo: { addNotesAndAttachments: true },
        },
      },
    ],
    objEdges: [
      { from: "contact", to: "account" },
      { from: "opportunity", to: "account" },
      { from: "opportunity", to: "contact" },
      { from: "activity", to: "contact" },
      { from: "lead", to: "contact" },
    ],
  },
  {
    id: "hrms",
    name: "HRMS",
    category: "ERP",
    tagline: "Employee records, time off, attendance, and payroll in one model",
    description:
      "Core HR objects that connect departments, employees, leave requests, daily attendance, and payroll runs for HR admins and people managers.",
    icon: "briefcase",
    accentColor: "#10B981",
    objects: [
      {
        name: "employee",
        title: "Employee",
        description:
          "Master record for each person on payroll—identifiers, job details, hire date, department, and compensation basics. HR administrators maintain this object; managers reference it for org changes and approvals. Employees are the anchor for leave, attendance, and payroll objects in this suite.",
        objectType: "Normal",
        color: "#34D399",
        fields: [
          { label: "Employee ID", fieldType: "Single-Line", required: true, starred: true },
          { label: "Full Name", fieldType: "Single-Line", required: true },
          { label: "Work Email", fieldType: "Email Address", required: true },
          { label: "Job Title", fieldType: "Single-Line", required: false },
          { label: "Hire Date", fieldType: "Date Picker", required: true, tracked: true },
          { label: "Department", fieldType: "Lookup", required: true, relatedObjectName: "department" },
          { label: "Base Salary", fieldType: "Currency", required: false },
        ],
        settingsPatch: {
          fileManager: { activeTab: "document" },
          fieldTracking: { trackCreated: true, trackModified: true, logHistory: true },
        },
      },
      {
        name: "department",
        title: "Department",
        description:
          "Defines org units used for headcount reporting, cost-center budgeting, and employee assignment. HR and finance leaders use departments to roll up staffing and spend. Every employee lookup points here, so structure changes propagate consistently through leave and payroll reporting.",
        objectType: "Collection",
        color: "#6EE7B7",
        fields: [
          { label: "Department Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Cost Center", fieldType: "Single-Line", required: false },
          { label: "Budget", fieldType: "Currency", required: false },
          { label: "Location", fieldType: "Single-Line", required: false },
          { label: "Head Count", fieldType: "Number", required: false },
        ],
      },
      {
        name: "leave_request",
        title: "Leave Request",
        description:
          "Tracks time-off submissions—type, dates, status, and rationale—submitted by employees and approved by managers. HR uses this object to enforce policy and balance accruals; managers see team coverage risk before approving. Each request ties to an employee record for audit and payroll integration.",
        objectType: "Normal",
        color: "#10B981",
        fields: [
          { label: "Request Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Employee", fieldType: "Lookup", required: true, relatedObjectName: "employee" },
          { label: "Leave Type", fieldType: "Drop-Down", required: true },
          { label: "Start Date", fieldType: "Date Picker", required: true },
          { label: "End Date", fieldType: "Date Picker", required: true },
          { label: "Status", fieldType: "Drop-Down", required: true, tracked: true },
          { label: "Reason", fieldType: "Multi Line", required: false },
        ],
        settingsPatch: {
          addInfo: { enableReport: true, trackRecordHistory: true },
        },
      },
      {
        name: "attendance",
        title: "Attendance",
        description:
          "Stores daily check-in and check-out events per employee for workforce compliance and pay rules. Facilities and HR ops reconcile exceptions from this object; managers review absenteeism patterns. It complements leave requests by capturing actual hours worked versus approved time off.",
        objectType: "Normal",
        color: "#059669",
        fields: [
          { label: "Attendance Key", fieldType: "Single-Line", required: true, starred: true },
          { label: "Employee", fieldType: "Lookup", required: true, relatedObjectName: "employee" },
          { label: "Date", fieldType: "Date Picker", required: true },
          { label: "Check In", fieldType: "Date & Time", required: false },
          { label: "Check Out", fieldType: "Date & Time", required: false },
          { label: "Status", fieldType: "Drop-Down", required: true },
        ],
      },
      {
        name: "payroll_run",
        title: "Payroll Run",
        description:
          "Captures pay-period calculations—gross, deductions, and net pay—for each employee when payroll is processed. Payroll administrators and finance use this object to document what was paid and when. Runs link to employees so year-to-date totals and audits stay tied to the workforce master record.",
        objectType: "Normal",
        color: "#047857",
        fields: [
          { label: "Run Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Employee", fieldType: "Lookup", required: true, relatedObjectName: "employee" },
          { label: "Pay Period", fieldType: "Single-Line", required: true },
          { label: "Gross Pay", fieldType: "Currency", required: true },
          { label: "Deductions", fieldType: "Currency", required: false },
          { label: "Net Pay", fieldType: "Currency", required: true, tracked: true },
        ],
        settingsPatch: {
          addInfo: { trackRecordHistory: true },
        },
      },
    ],
    objEdges: [
      { from: "employee", to: "department" },
      { from: "leave_request", to: "employee" },
      { from: "attendance", to: "employee" },
      { from: "payroll_run", to: "employee" },
    ],
  },
  {
    id: "finance",
    name: "Finance",
    category: "ERP",
    tagline: "Receivables, payables, expenses, and GL-aligned reporting",
    description:
      "Finance operations objects for customer invoices, incoming payments, operational expenses, departmental budgets, and chart-of-accounts entries.",
    icon: "barChart",
    accentColor: "#F59E0B",
    objects: [
      {
        name: "invoice",
        title: "Invoice",
        description:
          "Records customer billing documents—amounts, issue and due dates, and collection status—for accounts receivable. Billing clerks and finance controllers use invoices to track what is owed and overdue. Optional GL account lookup keeps revenue recognition aligned with the chart of accounts in this suite.",
        objectType: "Normal",
        color: "#FCD34D",
        fields: [
          { label: "Invoice Number", fieldType: "Single-Line", required: true, starred: true },
          { label: "Customer Name", fieldType: "Single-Line", required: true },
          { label: "Amount", fieldType: "Currency", required: true, tracked: true },
          { label: "Issue Date", fieldType: "Date Picker", required: true },
          { label: "Due Date", fieldType: "Date Picker", required: true },
          { label: "Status", fieldType: "Drop-Down", required: true },
          { label: "GL Account", fieldType: "Lookup", required: false, relatedObjectName: "gl_account" },
        ],
        settingsPatch: {
          fieldTracking: { trackCreated: true, trackModified: true, logHistory: true },
          addInfo: { trackRecordHistory: true },
        },
      },
      {
        name: "payment",
        title: "Payment",
        description:
          "Logs cash or electronic receipts applied against open invoices. Treasury and AR staff record payments here to close balances and support reconciliation. Each payment points to an invoice so aging and cash-application reports stay accurate across the finance module.",
        objectType: "Normal",
        color: "#F59E0B",
        fields: [
          { label: "Payment Reference", fieldType: "Single-Line", required: true, starred: true },
          { label: "Invoice", fieldType: "Lookup", required: true, relatedObjectName: "invoice" },
          { label: "Amount", fieldType: "Currency", required: true },
          { label: "Payment Date", fieldType: "Date Picker", required: true },
          { label: "Method", fieldType: "Drop-Down", required: true },
        ],
      },
      {
        name: "expense",
        title: "Expense",
        description:
          "Tracks operational spend submitted by employees or vendors—category, amount, date, and supporting notes. Approvers and finance review expenses against departmental budgets before reimbursement or accrual. Budget lookup ties discretionary spend back to planned limits in the same suite.",
        objectType: "Normal",
        color: "#D97706",
        fields: [
          { label: "Expense Title", fieldType: "Single-Line", required: true, starred: true },
          { label: "Category", fieldType: "Drop-Down", required: true },
          { label: "Amount", fieldType: "Currency", required: true },
          { label: "Date", fieldType: "Date Picker", required: true },
          { label: "Budget", fieldType: "Lookup", required: false, relatedObjectName: "budget" },
          { label: "Notes", fieldType: "Multi Line", required: false },
        ],
        settingsPatch: {
          fileManager: { activeTab: "attachment" },
        },
      },
      {
        name: "budget",
        title: "Budget",
        description:
          "Defines period spending envelopes—total, spent, and remaining—for a cost center or initiative. Budget owners and FP&A analysts maintain these records to gate expenses and variance reporting. Expenses in this suite reference budgets so utilization updates in one place.",
        objectType: "Normal",
        color: "#B45309",
        fields: [
          { label: "Budget Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Period", fieldType: "Single-Line", required: true },
          { label: "Total Amount", fieldType: "Currency", required: true },
          { label: "Spent", fieldType: "Currency", required: false, tracked: true },
          { label: "Remaining", fieldType: "Currency", required: false },
        ],
      },
      {
        name: "gl_account",
        title: "GL Account",
        description:
          "Holds chart-of-accounts entries—code, name, type, balance, and currency—for general ledger structure. Accountants use GL accounts when posting invoices and consolidating financial statements. Invoices may reference an account so subledger activity maps cleanly to the GL.",
        objectType: "Normal",
        color: "#92400E",
        fields: [
          { label: "Account Code", fieldType: "Single-Line", required: true, starred: true },
          { label: "Account Name", fieldType: "Single-Line", required: true },
          { label: "Account Type", fieldType: "Drop-Down", required: true },
          { label: "Balance", fieldType: "Currency", required: false },
          { label: "Currency", fieldType: "Drop-Down", required: true },
        ],
      },
    ],
    objEdges: [
      { from: "payment", to: "invoice" },
      { from: "invoice", to: "gl_account" },
      { from: "expense", to: "budget" },
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    category: "ERP",
    tagline: "SKU master data, warehouse stock, and replenishment POs",
    description:
      "Supply-chain objects that link products, storage locations, on-hand quantities, and purchase orders for operations and procurement teams.",
    icon: "package",
    accentColor: "#0EA5E9",
    objects: [
      {
        name: "product",
        title: "Product",
        description:
          "Defines sellable and stock-kept SKUs with cost, price, category, and reorder thresholds. Merchandising and inventory planners maintain product attributes here; warehouses and POs reference the same record. Reorder levels on this object drive replenishment signals elsewhere in the suite.",
        objectType: "Normal",
        color: "#38BDF8",
        fields: [
          { label: "SKU", fieldType: "Single-Line", required: true, starred: true },
          { label: "Product Name", fieldType: "Single-Line", required: true },
          { label: "Category", fieldType: "Drop-Down", required: false },
          { label: "Unit Cost", fieldType: "Currency", required: false },
          { label: "Unit Price", fieldType: "Currency", required: false },
          { label: "Reorder Level", fieldType: "Number", required: false, tracked: true },
        ],
      },
      {
        name: "warehouse",
        title: "Warehouse",
        description:
          "Represents physical or virtual storage sites—codes, location, capacity, and site leadership. Warehouse managers and logistics staff use this object to organize pick paths and inbound receipts. Stock levels always pair a product with a warehouse so availability is location-aware.",
        objectType: "Normal",
        color: "#0EA5E9",
        fields: [
          { label: "Warehouse Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Code", fieldType: "Single-Line", required: true },
          { label: "City", fieldType: "Single-Line", required: false },
          { label: "Capacity", fieldType: "Number", required: false },
          { label: "Manager", fieldType: "Single-Line", required: false },
        ],
        settingsPatch: {
          addInfo: { enableReport: true },
        },
      },
      {
        name: "stock_level",
        title: "Stock Level",
        description:
          "Stores on-hand quantity for a given product at a specific warehouse, plus last count date for cycle-count discipline. Inventory analysts reconcile these rows during audits; planners compare levels to reorder points on the product. This object is the operational heart of the inventory suite between SKU master and purchase orders.",
        objectType: "Normal",
        color: "#0284C7",
        fields: [
          { label: "Stock Key", fieldType: "Single-Line", required: true, starred: true },
          { label: "Product", fieldType: "Lookup", required: true, relatedObjectName: "product" },
          { label: "Warehouse", fieldType: "Lookup", required: true, relatedObjectName: "warehouse" },
          { label: "Quantity", fieldType: "Number", required: true, tracked: true },
          { label: "Last Counted", fieldType: "Date Picker", required: false },
        ],
      },
      {
        name: "purchase_order",
        title: "Purchase Order",
        description:
          "Documents vendor replenishment orders—vendor, product, quantity, status, and expected delivery—for procurement. Buyers create POs when stock falls below thresholds; receiving teams close the loop against inbound shipments. Each PO lines up to a product so costing and availability forecasts stay in sync.",
        objectType: "Normal",
        color: "#0369A1",
        fields: [
          { label: "PO Number", fieldType: "Single-Line", required: true, starred: true },
          { label: "Vendor", fieldType: "Single-Line", required: true },
          { label: "Product", fieldType: "Lookup", required: true, relatedObjectName: "product" },
          { label: "Quantity", fieldType: "Number", required: true },
          { label: "Status", fieldType: "Drop-Down", required: true, tracked: true },
          { label: "Expected Date", fieldType: "Date Picker", required: false },
        ],
        settingsPatch: {
          addInfo: { enableReport: true },
        },
      },
    ],
    objEdges: [
      { from: "stock_level", to: "product" },
      { from: "stock_level", to: "warehouse" },
      { from: "purchase_order", to: "product" },
    ],
  },
  {
    id: "pm",
    name: "Project Mgmt",
    category: "SaaS",
    tagline: "Plan delivery with projects, sprints, tasks, and milestones",
    description:
      "Delivery-management objects for initiatives, agile sprints, assignable work items, checkpoints, and team capacity—built for PMs and engineering leads.",
    icon: "layers",
    accentColor: "#3B82F6",
    objects: [
      {
        name: "project",
        title: "Project",
        description:
          "Defines a delivery initiative with schedule, status, optional budget, and narrative scope. Project managers own this record to communicate timeline and health to stakeholders. Sprints, tasks, milestones, and team members in this suite all roll up under a project for portfolio visibility.",
        objectType: "Normal",
        color: "#60A5FA",
        fields: [
          { label: "Project Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Description", fieldType: "Multi Line", required: false },
          { label: "Start Date", fieldType: "Date Picker", required: false },
          { label: "End Date", fieldType: "Date Picker", required: false },
          { label: "Status", fieldType: "Drop-Down", required: true, tracked: true },
          { label: "Budget", fieldType: "Currency", required: false },
        ],
        settingsPatch: {
          addInfo: { addNotesAndAttachments: true },
        },
      },
      {
        name: "sprint",
        title: "Sprint",
        description:
          "Represents a fixed time box within a project—start, end, and sprint goal—for iterative delivery. Scrum masters and team leads create sprints to scope commitments; velocity and burndown read from linked tasks. Every sprint must belong to a project so multi-team portfolios stay organized.",
        objectType: "Normal",
        color: "#3B82F6",
        fields: [
          { label: "Sprint Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Project", fieldType: "Lookup", required: true, relatedObjectName: "project" },
          { label: "Start Date", fieldType: "Date Picker", required: true },
          { label: "End Date", fieldType: "Date Picker", required: true },
          { label: "Goal", fieldType: "Multi Line", required: false },
        ],
      },
      {
        name: "task",
        title: "Task",
        description:
          "Tracks assignable work items with priority, status, estimates, and links to project, sprint, and team member. Individual contributors update tasks daily; leads use them for standups and capacity planning. Auto-assignment rules in this object help balance load across the delivery team.",
        objectType: "Assignment",
        color: "#2563EB",
        fields: [
          { label: "Task Title", fieldType: "Single-Line", required: true, starred: true },
          { label: "Project", fieldType: "Lookup", required: true, relatedObjectName: "project" },
          { label: "Sprint", fieldType: "Lookup", required: false, relatedObjectName: "sprint" },
          { label: "Assignee", fieldType: "Lookup", required: false, relatedObjectName: "team_member" },
          { label: "Priority", fieldType: "Drop-Down", required: true },
          { label: "Status", fieldType: "Drop-Down", required: true, tracked: true },
          { label: "Estimate Hours", fieldType: "Number", required: false },
        ],
        settingsPatch: {
          autoAssignment: {
            enabled: true,
            assignmentMode: "capacityBased",
            defaultAssignee: "Engineering queue",
          },
        },
      },
      {
        name: "milestone",
        title: "Milestone",
        description:
          "Marks critical delivery checkpoints on a project—target date, status, and notes for steering reviews. PMs use milestones to align executives on go-live and phase gates without tracking every task. Each milestone references a project so roadmap views stay hierarchical.",
        objectType: "Normal",
        color: "#1D4ED8",
        fields: [
          { label: "Milestone Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Project", fieldType: "Lookup", required: true, relatedObjectName: "project" },
          { label: "Target Date", fieldType: "Date Picker", required: true },
          { label: "Status", fieldType: "Drop-Down", required: true },
          { label: "Notes", fieldType: "Multi Line", required: false },
        ],
      },
      {
        name: "team_member",
        title: "Team Member",
        description:
          "Lists people allocated to project work—role, contact, and available hours—for staffing and assignment. Resource managers maintain capacity here; tasks optionally point to a member as assignee. Members can be associated with a primary project while still working across sprints in the suite.",
        objectType: "Normal",
        color: "#93C5FD",
        fields: [
          { label: "Member Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Role", fieldType: "Drop-Down", required: true },
          { label: "Email", fieldType: "Email Address", required: true },
          { label: "Capacity Hours", fieldType: "Number", required: false },
          { label: "Project", fieldType: "Lookup", required: false, relatedObjectName: "project" },
        ],
      },
    ],
    objEdges: [
      { from: "sprint", to: "project" },
      { from: "task", to: "project" },
      { from: "task", to: "sprint" },
      { from: "milestone", to: "project" },
      { from: "team_member", to: "project" },
    ],
  },
  {
    id: "ecommerce",
    name: "E-Commerce",
    category: "SaaS",
    tagline: "Storefront catalog, shoppers, orders, and fulfillment",
    description:
      "Retail objects for listed products, registered customers, completed orders, and outbound shipments—aligned for ops and support teams running an online store.",
    icon: "cart",
    accentColor: "#F43F5E",
    objects: [
      {
        name: "catalog_item",
        title: "Catalog Item",
        description:
          "Lists products available on the storefront—SKU, price, category, stock snapshot, and merchandising image. Catalog managers curate this object; availability feeds customer-facing search and checkout. It is the product backbone for orders in this e-commerce suite.",
        objectType: "Normal",
        color: "#FB7185",
        fields: [
          { label: "Item Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "SKU", fieldType: "Single-Line", required: true },
          { label: "Price", fieldType: "Currency", required: true },
          { label: "Category", fieldType: "Drop-Down", required: false },
          { label: "In Stock", fieldType: "Number", required: false, tracked: true },
          { label: "Image", fieldType: "Image", required: false },
        ],
      },
      {
        name: "customer",
        title: "Customer",
        description:
          "Stores shopper and account-holder profiles—contact details, loyalty tier, and location—for service and marketing. Support agents look up customers when handling order issues; lifecycle campaigns segment on tier and geography. Orders and shipments trace back to this record for a single customer view.",
        objectType: "Normal",
        color: "#F43F5E",
        fields: [
          { label: "Customer Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Email", fieldType: "Email Address", required: true },
          { label: "Phone", fieldType: "Phone", required: false },
          { label: "Loyalty Tier", fieldType: "Drop-Down", required: false },
          { label: "City", fieldType: "Single-Line", required: false },
        ],
        settingsPatch: {
          addInfo: { enableReport: true },
        },
      },
      {
        name: "order",
        title: "Order",
        description:
          "Captures completed checkouts—totals, status, timestamp, and payment method—tied to a customer. Fulfillment and finance reconcile revenue from orders; CS uses status to answer where-is-my-order inquiries. This object sits between the customer record and shipment tracking in the suite.",
        objectType: "Normal",
        color: "#E11D48",
        fields: [
          { label: "Order Number", fieldType: "Single-Line", required: true, starred: true },
          { label: "Customer", fieldType: "Lookup", required: true, relatedObjectName: "customer" },
          { label: "Total", fieldType: "Currency", required: true },
          { label: "Status", fieldType: "Drop-Down", required: true, tracked: true },
          { label: "Ordered At", fieldType: "Date & Time", required: true },
          { label: "Payment Method", fieldType: "Drop-Down", required: false },
        ],
        settingsPatch: {
          fieldTracking: { trackCreated: true, trackModified: true },
        },
      },
      {
        name: "shipment",
        title: "Shipment",
        description:
          "Tracks carrier dispatches for an order—tracking number, carrier, ship date, and delivery status. Warehouse and logistics staff update shipments as packages leave the dock; customers see progress through linked orders. Geo-enabled settings support last-mile visibility when configured.",
        objectType: "Normal",
        color: "#BE123C",
        fields: [
          { label: "Tracking Number", fieldType: "Single-Line", required: true, starred: true },
          { label: "Order", fieldType: "Lookup", required: true, relatedObjectName: "order" },
          { label: "Carrier", fieldType: "Drop-Down", required: true },
          { label: "Shipped Date", fieldType: "Date Picker", required: false },
          { label: "Status", fieldType: "Drop-Down", required: true },
        ],
        settingsPatch: {
          addInfo: { enableReport: true },
        },
      },
    ],
    objEdges: [
      { from: "order", to: "customer" },
      { from: "shipment", to: "order" },
    ],
  },
  {
    id: "itsm",
    name: "IT Service Desk",
    category: "SaaS",
    tagline: "Service desk tickets, assets, requests, and major incidents",
    description:
      "ITSM objects for configuration items and assets, agent-assigned tickets, catalog service requests, and incident response—with links suited to L1–L3 support.",
    icon: "monitor",
    accentColor: "#A855F7",
    objects: [
      {
        name: "asset",
        title: "Asset",
        description:
          "Registers hardware and software under management—tag, type, owner, purchase date, and lifecycle status. IT asset managers maintain this inventory; support agents attach assets to tickets for context on affected equipment. Asset health rolls into service metrics across the ITSM suite.",
        objectType: "Normal",
        color: "#C084FC",
        fields: [
          { label: "Asset Tag", fieldType: "Single-Line", required: true, starred: true },
          { label: "Asset Name", fieldType: "Single-Line", required: true },
          { label: "Type", fieldType: "Drop-Down", required: true },
          { label: "Owner", fieldType: "Single-Line", required: false },
          { label: "Purchase Date", fieldType: "Date Picker", required: false },
          { label: "Status", fieldType: "Drop-Down", required: true, tracked: true },
        ],
      },
      {
        name: "ticket",
        title: "Ticket",
        description:
          "Primary service desk record for end-user issues—reporter, priority, status, and optional related asset. Agents work tickets through resolution with round-robin assignment; history supports SLA reporting. Service requests and incidents can reference a ticket to show how work escalated.",
        objectType: "Assignment",
        color: "#A855F7",
        fields: [
          { label: "Ticket Title", fieldType: "Single-Line", required: true, starred: true },
          { label: "Reporter", fieldType: "Single-Line", required: true },
          { label: "Priority", fieldType: "Drop-Down", required: true },
          { label: "Status", fieldType: "Drop-Down", required: true, tracked: true },
          { label: "Related Asset", fieldType: "Lookup", required: false, relatedObjectName: "asset" },
          { label: "Description", fieldType: "Multi Line", required: false },
        ],
        settingsPatch: {
          autoAssignment: {
            enabled: true,
            assignmentMode: "roundRobin",
            defaultAssignee: "Service desk queue",
          },
          addInfo: { trackRecordHistory: true },
        },
      },
      {
        name: "service_request",
        title: "Service Request",
        description:
          "Stores catalog-based IT asks—access, hardware, or software—with type, requester, due date, and optional parent ticket. Fulfillment teams fulfill standardized requests from this object while keeping audit trails. Linking to tickets bridges self-service intake with agent-owned work items.",
        objectType: "Normal",
        color: "#9333EA",
        fields: [
          { label: "Request Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Request Type", fieldType: "Drop-Down", required: true },
          { label: "Requester", fieldType: "Single-Line", required: true },
          { label: "Status", fieldType: "Drop-Down", required: true },
          { label: "Due Date", fieldType: "Date Picker", required: false },
          { label: "Related Ticket", fieldType: "Lookup", required: false, relatedObjectName: "ticket" },
        ],
      },
      {
        name: "incident",
        title: "Incident",
        description:
          "Tracks major disruptions with severity, status, root-cause notes, and ties to underlying support tickets. Incident commanders use this object for war-room coordination and executive comms. Full change history and reporting settings support post-incident review within the ITSM module.",
        objectType: "Normal",
        color: "#7C3AED",
        fields: [
          { label: "Incident Title", fieldType: "Single-Line", required: true, starred: true },
          { label: "Severity", fieldType: "Drop-Down", required: true, tracked: true },
          { label: "Status", fieldType: "Drop-Down", required: true },
          { label: "Related Ticket", fieldType: "Lookup", required: false, relatedObjectName: "ticket" },
          { label: "Root Cause", fieldType: "Multi Line", required: false },
        ],
        settingsPatch: {
          fieldTracking: { trackCreated: true, trackModified: true, logHistory: true },
          addInfo: { enableReport: true },
        },
      },
    ],
    objEdges: [
      { from: "ticket", to: "asset" },
      { from: "service_request", to: "ticket" },
      { from: "incident", to: "ticket" },
    ],
  },
  {
    id: "healthcare",
    name: "Healthcare Ops",
    category: "ERP",
    tagline: "Patient identity, scheduling, and claims in one care model",
    description:
      "Care-operations objects for patients, clinicians, booked appointments, and insurance claims—structured for front-desk, clinical admin, and revenue cycle teams.",
    icon: "heart",
    accentColor: "#14B8A6",
    objects: [
      {
        name: "patient",
        title: "Patient",
        description:
          "Maintains patient identity and demographics—MRN, date of birth, contacts, and insurance identifier—for every encounter in the organization. Registration staff and clinicians rely on this golden record; privacy settings limit inappropriate sharing. Appointments and claims both point to the patient for continuity of care and billing.",
        objectType: "Normal",
        color: "#2DD4BF",
        fields: [
          { label: "Patient Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "MRN", fieldType: "Single-Line", required: true },
          { label: "Date of Birth", fieldType: "Date Picker", required: true },
          { label: "Email", fieldType: "Email Address", required: false },
          { label: "Phone", fieldType: "Phone", required: false },
          { label: "Insurance ID", fieldType: "Single-Line", required: false, tracked: true },
        ],
        settingsPatch: {
          addInfo: { trackRecordHistory: true, allowRecordSharing: false },
          fileManager: { activeTab: "document" },
        },
      },
      {
        name: "provider",
        title: "Provider",
        description:
          "Lists credentialed clinicians—specialty, NPI, contact, and active flag—for scheduling and claims attribution. Medical staff offices curate provider data; schedulers assign appointments to the right resource. Providers complement the patient record so visit history reflects who delivered care.",
        objectType: "Normal",
        color: "#14B8A6",
        fields: [
          { label: "Provider Name", fieldType: "Single-Line", required: true, starred: true },
          { label: "Specialty", fieldType: "Drop-Down", required: true },
          { label: "NPI", fieldType: "Single-Line", required: false },
          { label: "Email", fieldType: "Email Address", required: false },
          { label: "Active", fieldType: "Checkbox", required: false },
        ],
      },
      {
        name: "appointment",
        title: "Appointment",
        description:
          "Schedules patient visits with provider, start time, status, and reason for the booking. Front-desk and nursing staff manage the daily calendar from this object; no-shows and completions feed operational reports. Each appointment links patient and provider so downstream claims can reference the correct encounter context.",
        objectType: "Normal",
        color: "#0D9488",
        fields: [
          { label: "Appointment Title", fieldType: "Single-Line", required: true, starred: true },
          { label: "Patient", fieldType: "Lookup", required: true, relatedObjectName: "patient" },
          { label: "Provider", fieldType: "Lookup", required: true, relatedObjectName: "provider" },
          { label: "Start Time", fieldType: "Date & Time", required: true },
          { label: "Status", fieldType: "Drop-Down", required: true, tracked: true },
          { label: "Reason", fieldType: "Multi Line", required: false },
        ],
        settingsPatch: {
          addInfo: { enableReport: true, trackRecordHistory: true },
        },
      },
      {
        name: "claim",
        title: "Claim",
        description:
          "Holds insurance reimbursement requests—claim number, patient, amount, status, and submission date—for revenue cycle staff. Billers create and track claims after visits; denials and resubmissions update status over time. Claims tie to patients so payer correspondence and patient responsibility stay aligned in the healthcare suite.",
        objectType: "Normal",
        color: "#0F766E",
        fields: [
          { label: "Claim Number", fieldType: "Single-Line", required: true, starred: true },
          { label: "Patient", fieldType: "Lookup", required: true, relatedObjectName: "patient" },
          { label: "Amount", fieldType: "Currency", required: true },
          { label: "Status", fieldType: "Drop-Down", required: true, tracked: true },
          { label: "Submitted Date", fieldType: "Date Picker", required: false },
          { label: "Notes", fieldType: "Multi Line", required: false },
        ],
        settingsPatch: {
          addInfo: { trackRecordHistory: true },
        },
      },
    ],
    objEdges: [
      { from: "appointment", to: "patient" },
      { from: "appointment", to: "provider" },
      { from: "claim", to: "patient" },
    ],
  },
];

export function getObjectTemplate(id: string): ObjectTemplate | undefined {
  return OBJECT_TEMPLATES.find(t => t.id === id);
}