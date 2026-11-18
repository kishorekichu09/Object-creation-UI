import React, { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Search, RotateCcw, Plus, Minus, X, Check,
  ChevronRight, Target, LayoutGrid, Network, ListFilter,
} from "lucide-react";
import { CreateObjectWizard, slugObjectName, type PanelPreviewNode, type PanelPreviewEdge, type WizardEditInitial } from "./components/create-object-wizard";
import { CreateObjectLauncher } from "./components/create-object-launcher";
import { CreateObjectAIPanel } from "./components/create-object-ai-panel";
import { CreateObjectTemplatePanel } from "./components/create-object-template-panel";
import { ObjectPropertiesPanel } from "./components/object-properties-panel";
import { ObjectsCardView, type CardObjectItem } from "./components/objects-card-view";
import { ThemeToggle } from "./components/theme-toggle";
import { type ObjectSettings } from "./types/object-settings";
import { getGraphColors, getGraphBackground, getGraphLabelColor, getGraphLabelStyle, type GraphColorPalette, type GraphLabelStyle } from "./theme/graph-colors";
import { GraphColorsProvider, useGraphColors } from "./theme/graph-colors-context";
import { SabLogo } from "./components/sab-logo";
import { useTheme } from "next-themes";

type CreateMode = "launcher" | "manual" | "ai" | "template";

type ObjectsFilterState = {
  recentOnly: boolean;
  objectType: string | null;
  hasRelationships: boolean;
  hasLayouts: boolean;
};

const EMPTY_OBJECTS_FILTER: ObjectsFilterState = {
  recentOnly: false,
  objectType: null,
  hasRelationships: false,
  hasLayouts: false,
};

function isObjectsFilterActive(f: ObjectsFilterState) {
  return f.recentOnly || Boolean(f.objectType) || f.hasRelationships || f.hasLayouts;
}

type FilterPos3 = { x: number; y: number; z: number };

/** Fibonacci-sphere satellites around a parent — matches the clear Performance-style cluster. */
function placeFilterSatellites(
  targets: Map<string, FilterPos3>,
  parent: FilterPos3,
  children: any[],
  radius: number,
  yBias: number,
  phase = 0,
) {
  if (children.length === 0) return;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const n = children.length;
  children.forEach((child: any, i: number) => {
    // Even coverage on a sphere so nothing stacks along the camera ray
    const t = n === 1 ? 0.35 : i / (n - 1);
    const yUnit = 1 - t * 2; // 1 → -1
    const rAtY = Math.sqrt(Math.max(0, 1 - yUnit * yUnit));
    const theta = golden * i + phase;
    const r = radius * (0.88 + 0.18 * ((i % 4) / 3));
    targets.set(child.id, {
      x: parent.x + Math.cos(theta) * rAtY * r,
      y: parent.y + yUnit * r * 0.62 + yBias,
      z: parent.z + Math.sin(theta) * rAtY * r,
    });
  });
}

/**
 * Pack filtered suites into one dense board centered at the origin.
 * Aspect-aware grid so the group can fill the visible canvas without empty middle.
 */
function buildFilterClusterTargets(
  nodes: any[],
  objectIds: Set<string>,
  viewAspect = 1.6,
): Map<string, FilterPos3> {
  const visible = nodes.filter((n: any) => {
    if (n.type === "object") return objectIds.has(n.id);
    return Boolean(n.parentId && objectIds.has(n.parentId));
  });
  const objects = visible.filter((n: any) => n.type === "object");
  const targets = new Map<string, FilterPos3>();
  if (objects.length === 0) return targets;

  // Stable reading order — left→right, top→bottom
  const ordered = [...objects].sort((a: any, b: any) => {
    const dy = (b.y ?? 0) - (a.y ?? 0);
    if (Math.abs(dy) > 8) return dy;
    return (a.x ?? 0) - (b.x ?? 0);
  });

  const N = ordered.length;
  // Prefer a wide board that matches the canvas aspect (fills width + height together)
  let cols = 1;
  if (N <= 2) cols = N;
  else if (N <= 4) cols = 2;
  else if (N <= 6) cols = 3;
  else if (N <= 9) cols = viewAspect >= 1.35 ? 4 : 3;
  else cols = Math.max(3, Math.ceil(Math.sqrt(N * Math.max(1.05, viewAspect))));
  const rows = Math.max(1, Math.ceil(N / cols));

  // Dense pitch — suites sit close so the board reads as one composition
  const pitchX = N === 1 ? 0 : Math.max(48, Math.min(70, 58 - Math.max(0, N - 6) * 1.5));
  const pitchY = pitchX * (viewAspect >= 1.4 ? 0.72 : 0.82);

  ordered.forEach((o: any, i: number) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const rowCount = row === rows - 1 ? (N - row * cols) : cols;
    const colInRow = row === rows - 1 ? i - row * cols : col;
    const ox = (colInRow - (rowCount - 1) / 2) * pitchX;
    const oy = ((rows - 1) / 2 - row) * pitchY;
    const oz = ((colInRow + row) % 2 === 0 ? 4 : -4);
    targets.set(o.id, { x: ox, y: oy, z: oz });
  });

  ordered.forEach((o: any, oi: number) => {
    const parent = targets.get(o.id);
    if (!parent) return;
    const fields = visible.filter((n: any) => n.type === "field" && n.parentId === o.id);
    const layouts = visible.filter((n: any) => n.type === "layout" && n.parentId === o.id);
    const phase = oi * 0.55;
    const fieldR = N === 1 ? 34 : N <= 4 ? 20 : 15;
    const layoutR = N === 1 ? 46 : N <= 4 ? 28 : 20;
    placeFilterSatellites(targets, parent, fields, fieldR, -3, phase);
    placeFilterSatellites(targets, parent, layouts, layoutR, 9, phase + 1.05);
  });

  return targets;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── TYPES ─────────────────────────────────────────────────────────────────────
type NodeType = "object" | "field" | "layout";
type EdgeType = "obj-obj" | "obj-field" | "obj-layout" | "field-field";

interface GNode {
  id: string; type: NodeType; label: string; x: number; y: number;
  parentId?: string; fieldType?: string; required?: boolean;
  layoutType?: string; relatedObjectId?: string;
  description?: string; objectType?: string;
  objectApiName?: string; starred?: boolean; tracked?: boolean; isPrimary?: boolean;
  lifecycleStatus?: "Draft" | "Built" | "Deployed";
  objectSettings?: ObjectSettings;
}
interface GEdge { id: string; from: string; to: string; type: EdgeType; }
interface FGNode extends GNode { x: number; y: number; z: number; vx?: number; vy?: number; vz?: number; }
interface FGLink { id: string; source: string | FGNode; target: string | FGNode; type: EdgeType; }
interface DynNode {
  id: string; type: NodeType; label: string;
  x: number; y: number; z: number;
  fx?: number; fy?: number; fz?: number;
  parentId?: string; fieldType?: string; required?: boolean;
  layoutType?: string;
  description?: string; objectType?: string;
  objectApiName?: string; starred?: boolean; tracked?: boolean; isPrimary?: boolean;
  lifecycleStatus?: "Draft" | "Built" | "Deployed";
  relatedObjectId?: string;
  objectSettings?: ObjectSettings;
}

function isLookupLike(fieldType?: string) {
  return fieldType === "Lookup" || fieldType === "Master Details" || fieldType === "Record Association";
}

function normalizeRelToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function objObjUndirectedKey(a: string, b: string) {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

/** One spine per object pair — stacked duplicates read as oversized thick ribbons. */
function dedupeObjObjEdges(edges: GEdge[]): GEdge[] {
  const seen = new Set<string>();
  return edges.filter(e => {
    if (e.type !== "obj-obj") return true;
    const key = objObjUndirectedKey(e.from, e.to);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function appendRelationshipEdges(oid: string, fields: any[], edges: GEdge[]) {
  const seen = new Set(
    edges.filter(e => e.type === "obj-obj").map(e => objObjUndirectedKey(e.from, e.to)),
  );
  fields.forEach((f: any) => {
    const relId = f.relatedObjectId as string | undefined;
    // Explicit related target always becomes an object↔object spine (home style)
    if (!relId || relId === oid) return;
    const key = objObjUndirectedKey(oid, relId);
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({
      id: `oo_${oid}_${relId}_${edges.length}`,
      from: oid,
      to: relId,
      type: "obj-obj",
    });
  });
}

/**
 * Sparse, technically correct object↔object spines (like home OBJ_OBJ):
 * only explicit lookups / name-matched relation fields — never a full mesh.
 */
function wireSuiteClusterEdges(
  objects: Array<{ id: string; name: string; fields: any[] }>,
  edges: GEdge[],
  edgeIdPrefix: string,
) {
  const seen = new Set(
    edges.filter(e => e.type === "obj-obj").map(e => objObjUndirectedKey(e.from, e.to)),
  );
  const add = (from: string, to: string, tag: string) => {
    if (!from || !to || from === to) return;
    const key = objObjUndirectedKey(from, to);
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({
      id: `${edgeIdPrefix}_${tag}_${edges.length}`,
      from,
      to,
      type: "obj-obj",
    });
  };

  const byToken = new Map<string, string>();
  objects.forEach(o => {
    const t = normalizeRelToken(o.name);
    if (t) byToken.set(t, o.id);
  });

  // Only wire from relation-like fields (or an explicit relatedObjectId)
  objects.forEach(o => {
    (o.fields ?? []).forEach((f: any) => {
      const ft = String(f.fieldType ?? f.type ?? "");
      const hasRel = Boolean(f.relatedObjectId);
      const isRelType = isLookupLike(ft) || ft === "Lookup";
      if (!hasRel && !isRelType) return;

      let targetId = f.relatedObjectId as string | undefined;
      if (targetId && !objects.some(x => x.id === targetId) && !byToken.has(normalizeRelToken(String(targetId)))) {
        // relatedObjectId may still be a display name
        targetId = byToken.get(normalizeRelToken(String(targetId))) ?? targetId;
      }
      if (!targetId || !objects.some(x => x.id === targetId)) {
        const token = normalizeRelToken(String(f.label ?? ""));
        if (!token) return;
        // Exact / strong name match only (avoid "Status" → nothing, avoid loose includes)
        targetId = byToken.get(token);
        if (!targetId) {
          for (const [nameTok, id] of byToken) {
            if (id === o.id) continue;
            if (token === nameTok || token === `${nameTok}id` || token === `${nameTok}name`) {
              targetId = id;
              break;
            }
          }
        }
      }
      if (targetId && targetId !== o.id && objects.some(x => x.id === targetId)) {
        add(o.id, targetId, "lookup");
      }
    });
  });

  // A few canonical CRM spines when those objects exist and no link yet
  // (mirrors how home emp↔dep / emp↔job are intentional, not every-to-every)
  const find = (...names: string[]) => {
    for (const n of names) {
      const id = byToken.get(normalizeRelToken(n));
      if (id) return id;
    }
    return undefined;
  };
  const lead = find("Lead", "Leads");
  const contact = find("Contact", "Contacts");
  const account = find("Account", "Accounts");
  const deal = find("Deal", "Deals", "Opportunity", "Opportunities");
  const activity = find("Activity", "Activities", "Task", "Tasks");
  if (contact && account) add(contact, account, "crm");
  if (lead && account) add(lead, account, "crm");
  if (deal && account) add(deal, account, "crm");
  if (deal && contact) add(deal, contact, "crm");
  if (activity && contact) add(activity, contact, "crm");
  // Do not mesh lead↔deal, activity↔deal, activity↔account, lead↔contact unless a lookup field exists
}

function pos3(x: number, y: number, z: number) {
  return { x, y, z };
}

function childOrbit(cx: number, cy: number, cz: number, index: number, total: number, radius: number) {
  const angle = total > 0 ? (index / total) * Math.PI * 2 : 0;
  return pos3(
    cx + radius * Math.cos(angle),
    cy + (index % 2 === 0 ? 5 : -5),
    cz + radius * Math.sin(angle),
  );
}

/**
 * Irregular object seeds in the home graph plane (XZ) — organic, not a stamped ring.
 * Values are normalized; scaled in suiteObjectOffsets.
 */
const SUITE_CLUSTER_SEEDS_XZ: [number, number][] = [
  [0.05, -0.08],
  [1.18, -0.42],
  [-0.92, -0.68],
  [0.62, 1.12],
  [-1.15, 0.58],
  [1.28, 0.72],
  [-0.28, -1.22],
  [0.22, 1.38],
  [-1.32, -0.18],
  [0.95, -1.05],
];

/**
 * Place suite objects like a home-page cytoscape neighborhood:
 * graph lives in XZ, objects get mild Y jitter, spacing feels organic.
 */
function suiteObjectOffsets(count: number, seed = 714): Array<{ x: number; y: number; z: number }> {
  const n = Math.max(count, 1);
  if (n === 1) return [{ x: 0, y: 0, z: 0 }];
  const rng = lcgRand(seed + n * 131);
  // Home-like object spacing (~OP distances after SCALE)
  const scale = Math.max(36, 30 + n * 5);
  return Array.from({ length: n }, (_, i) => {
    let sx: number;
    let sz: number;
    if (i < SUITE_CLUSTER_SEEDS_XZ.length) {
      [sx, sz] = SUITE_CLUSTER_SEEDS_XZ[i];
      sx += (rng() - 0.5) * 0.22;
      sz += (rng() - 0.5) * 0.22;
    } else {
      const a = (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.55;
      const r = 0.82 + rng() * 0.5;
      sx = Math.cos(a) * r;
      sz = Math.sin(a) * r;
    }
    return {
      x: sx * scale,
      y: (rng() - 0.5) * 16,
      z: sz * scale,
    };
  });
}

/** Field / layout ring matching home `buildGraph` (XZ orbit + Y depth). */
function fieldOrbitHome(
  cx: number, cy: number, cz: number,
  index: number, total: number, radius: number,
  rng: () => number,
  opts?: { startAngle?: number },
) {
  const start = opts?.startAngle ?? 0;
  const jitter = (rng() - 0.5) * 0.4;
  const angle = start + (total > 0 ? (index / Math.max(total, 1)) * Math.PI * 2 : 0) + jitter;
  const r = radius * (0.9 + rng() * 0.2);
  return pos3(
    cx + r * Math.cos(angle),
    cy + (rng() - 0.5) * (opts?.startAngle != null ? 36 : 28),
    cz + r * Math.sin(angle),
  );
}

// ─── OBJECT POSITIONS (2D seed, scaled to 3D) ──────────────────────────────────
const OP: Record<string, [number, number]> = {
  emp: [2000, 1500], dep: [1280, 820], job: [2720, 780], loc: [3100, 1450],
  att: [1020, 1480], lev: [1260, 2200], pay: [830, 1020],
  per: [2750, 2100], pro: [3020, 1780], tra: [2080, 2480],
  can: [1680, 980],  intv: [2400, 1100], ast: [3400, 1980], exp: [740, 1880],
  tim: [1540, 2680], shf: [620, 1480],  hol: [3600, 1200], skl: [2200, 720],
  ben: [980, 640],   onb: [1880, 3000],
};

const OBJECTS = [
  { id: "emp", label: "Employee",       desc: "Stores employee information and profile data.",        objType: "Custom Object" },
  { id: "dep", label: "Department",     desc: "Represents organizational departments.",                objType: "Custom Object" },
  { id: "job", label: "Job Role",       desc: "Defines job roles and career levels.",                  objType: "Custom Object" },
  { id: "loc", label: "Location",       desc: "Office and work site locations.",                       objType: "Custom Object" },
  { id: "att", label: "Attendance",     desc: "Tracks daily attendance and hours worked.",             objType: "Custom Object" },
  { id: "lev", label: "Leave Request",  desc: "Employee leave applications and approvals.",            objType: "Custom Object" },
  { id: "pay", label: "Payroll",        desc: "Monthly payroll and compensation records.",             objType: "Custom Object" },
  { id: "per", label: "Performance",    desc: "Employee performance reviews and ratings.",             objType: "Custom Object" },
  { id: "pro", label: "Project",        desc: "Company projects and team assignments.",                objType: "Custom Object" },
  { id: "tra", label: "Training",       desc: "Training programs and certifications.",                 objType: "Custom Object" },
  { id: "can", label: "Candidate",      desc: "Prospective hires moving through recruiting stages.",   objType: "Custom Object" },
  { id: "intv",label: "Interview",      desc: "Interview schedules, panels, and candidate feedback.",  objType: "Custom Object" },
  { id: "ast", label: "Asset",          desc: "Company devices and equipment assigned to people.",     objType: "Custom Object" },
  { id: "exp", label: "Expense Claim",  desc: "Employee expense submissions and reimbursements.",      objType: "Custom Object" },
  { id: "tim", label: "Timesheet",      desc: "Weekly time entries against projects and tasks.",       objType: "Custom Object" },
  { id: "shf", label: "Shift",          desc: "Work shift definitions and roster assignments.",        objType: "Custom Object" },
  { id: "hol", label: "Holiday",        desc: "Organization holiday calendar and regional days off.",  objType: "Custom Object" },
  { id: "skl", label: "Skill",          desc: "Skills and competencies mapped to employees.",          objType: "Custom Object" },
  { id: "ben", label: "Benefit",        desc: "Benefit plans and enrollments for the workforce.",      objType: "Custom Object" },
  { id: "onb", label: "Onboarding",     desc: "New-hire onboarding tasks and checklist progress.",     objType: "Custom Object" },
];

interface FieldDef {
  id: string; label: string; parentId: string; fieldType: string; required: boolean;
  relatedObjectId?: string; starred?: boolean; tracked?: boolean; isPrimary?: boolean;
}
const FIELDS: FieldDef[] = [
  { id: "emp_id",     label: "Employee ID",       parentId: "emp", fieldType: "Text",      required: true,  isPrimary: true, tracked: true },
  { id: "emp_fname",  label: "First Name",         parentId: "emp", fieldType: "Text",      required: true,  starred: true, tracked: true },
  { id: "emp_lname",  label: "Last Name",          parentId: "emp", fieldType: "Text",      required: true,  starred: true },
  { id: "emp_email",  label: "Email",              parentId: "emp", fieldType: "Email",     required: true,  starred: true, tracked: true },
  { id: "emp_phone",  label: "Phone",              parentId: "emp", fieldType: "Phone",     required: false },
  { id: "emp_dob",    label: "Date of Birth",      parentId: "emp", fieldType: "Date",      required: false },
  { id: "emp_join",   label: "Joining Date",       parentId: "emp", fieldType: "Date",      required: true,  tracked: true },
  { id: "emp_dep",    label: "Department",         parentId: "emp", fieldType: "Lookup",    required: true,  relatedObjectId: "dep", starred: true, tracked: true },
  { id: "emp_job",    label: "Job Role",           parentId: "emp", fieldType: "Lookup",    required: true,  relatedObjectId: "job", starred: true },
  { id: "emp_mgr",    label: "Manager",            parentId: "emp", fieldType: "Lookup",    required: false, relatedObjectId: "emp" },
  { id: "emp_loc",    label: "Location",           parentId: "emp", fieldType: "Lookup",    required: false, relatedObjectId: "loc" },
  { id: "emp_status", label: "Employment Status",  parentId: "emp", fieldType: "Select",    required: true,  tracked: true },
  { id: "emp_salary", label: "Salary",             parentId: "emp", fieldType: "Currency",  required: false, tracked: true },
  { id: "emp_photo",  label: "Profile Photo",      parentId: "emp", fieldType: "File",      required: false },
  { id: "dep_id",     label: "Department ID",      parentId: "dep", fieldType: "Text",      required: true  },
  { id: "dep_name",   label: "Department Name",    parentId: "dep", fieldType: "Text",      required: true  },
  { id: "dep_head",   label: "Department Head",    parentId: "dep", fieldType: "Lookup",    required: false, relatedObjectId: "emp" },
  { id: "dep_desc",   label: "Description",        parentId: "dep", fieldType: "Long Text", required: false },
  { id: "dep_loc",    label: "Location",           parentId: "dep", fieldType: "Lookup",    required: false, relatedObjectId: "loc" },
  { id: "dep_status", label: "Status",             parentId: "dep", fieldType: "Select",    required: true  },
  { id: "dep_budget", label: "Budget",             parentId: "dep", fieldType: "Currency",  required: false },
  { id: "dep_phone",  label: "Phone",              parentId: "dep", fieldType: "Phone",     required: false },
  { id: "dep_email",  label: "Email",              parentId: "dep", fieldType: "Email",     required: false },
  { id: "dep_cost",   label: "Cost Center",        parentId: "dep", fieldType: "Text",      required: false },
  { id: "job_id",     label: "Role ID",            parentId: "job", fieldType: "Text",      required: true  },
  { id: "job_name",   label: "Role Name",          parentId: "job", fieldType: "Text",      required: true  },
  { id: "job_dep",    label: "Department",         parentId: "job", fieldType: "Lookup",    required: false, relatedObjectId: "dep" },
  { id: "job_desc",   label: "Description",        parentId: "job", fieldType: "Long Text", required: false },
  { id: "job_level",  label: "Level",              parentId: "job", fieldType: "Select",    required: false },
  { id: "job_status", label: "Status",             parentId: "job", fieldType: "Select",    required: true  },
  { id: "job_range",  label: "Salary Range",       parentId: "job", fieldType: "Text",      required: false },
  { id: "job_rto",    label: "Reports To",         parentId: "job", fieldType: "Lookup",    required: false, relatedObjectId: "job" },
  { id: "loc_id",     label: "Location ID",        parentId: "loc", fieldType: "Text",      required: true  },
  { id: "loc_name",   label: "Location Name",      parentId: "loc", fieldType: "Text",      required: true  },
  { id: "loc_addr",   label: "Address",            parentId: "loc", fieldType: "Text",      required: false },
  { id: "loc_city",   label: "City",               parentId: "loc", fieldType: "Text",      required: false },
  { id: "loc_state",  label: "State",              parentId: "loc", fieldType: "Text",      required: false },
  { id: "loc_country",label: "Country",            parentId: "loc", fieldType: "Text",      required: false },
  { id: "loc_postal", label: "Postal Code",        parentId: "loc", fieldType: "Text",      required: false },
  { id: "loc_phone",  label: "Phone",              parentId: "loc", fieldType: "Phone",     required: false },
  { id: "loc_status", label: "Status",             parentId: "loc", fieldType: "Select",    required: true  },
  { id: "att_id",     label: "Attendance ID",      parentId: "att", fieldType: "Text",      required: true  },
  { id: "att_emp",    label: "Employee",           parentId: "att", fieldType: "Lookup",    required: true,  relatedObjectId: "emp" },
  { id: "att_date",   label: "Date",               parentId: "att", fieldType: "Date",      required: true  },
  { id: "att_cin",    label: "Check In",           parentId: "att", fieldType: "Time",      required: false },
  { id: "att_cout",   label: "Check Out",          parentId: "att", fieldType: "Time",      required: false },
  { id: "att_status", label: "Status",             parentId: "att", fieldType: "Select",    required: true  },
  { id: "att_hours",  label: "Hours Worked",       parentId: "att", fieldType: "Number",    required: false },
  { id: "att_ot",     label: "Overtime Hours",     parentId: "att", fieldType: "Number",    required: false },
  { id: "lev_id",     label: "Request ID",         parentId: "lev", fieldType: "Text",      required: true  },
  { id: "lev_emp",    label: "Employee",           parentId: "lev", fieldType: "Lookup",    required: true,  relatedObjectId: "emp" },
  { id: "lev_type",   label: "Leave Type",         parentId: "lev", fieldType: "Select",    required: true  },
  { id: "lev_start",  label: "Start Date",         parentId: "lev", fieldType: "Date",      required: true  },
  { id: "lev_end",    label: "End Date",           parentId: "lev", fieldType: "Date",      required: true  },
  { id: "lev_status", label: "Status",             parentId: "lev", fieldType: "Select",    required: true  },
  { id: "lev_reason", label: "Reason",             parentId: "lev", fieldType: "Long Text", required: false },
  { id: "lev_appr",   label: "Approved By",        parentId: "lev", fieldType: "Lookup",    required: false, relatedObjectId: "emp" },
  { id: "pay_id",     label: "Payroll ID",         parentId: "pay", fieldType: "Text",      required: true  },
  { id: "pay_emp",    label: "Employee",           parentId: "pay", fieldType: "Lookup",    required: true,  relatedObjectId: "emp" },
  { id: "pay_period", label: "Pay Period",         parentId: "pay", fieldType: "Text",      required: true  },
  { id: "pay_basic",  label: "Basic Salary",       parentId: "pay", fieldType: "Currency",  required: true  },
  { id: "pay_allow",  label: "Allowances",         parentId: "pay", fieldType: "Currency",  required: false },
  { id: "pay_ded",    label: "Deductions",         parentId: "pay", fieldType: "Currency",  required: false },
  { id: "pay_net",    label: "Net Pay",            parentId: "pay", fieldType: "Currency",  required: true  },
  { id: "pay_date",   label: "Payment Date",       parentId: "pay", fieldType: "Date",      required: true  },
  { id: "pay_status", label: "Status",             parentId: "pay", fieldType: "Select",    required: true  },
  { id: "per_id",     label: "Review ID",          parentId: "per", fieldType: "Text",      required: true  },
  { id: "per_emp",    label: "Employee",           parentId: "per", fieldType: "Lookup",    required: true,  relatedObjectId: "emp" },
  { id: "per_period", label: "Review Period",      parentId: "per", fieldType: "Text",      required: true  },
  { id: "per_rating", label: "Rating",             parentId: "per", fieldType: "Number",    required: true  },
  { id: "per_goals",  label: "Goals",              parentId: "per", fieldType: "Long Text", required: false },
  { id: "per_achiev", label: "Achievements",       parentId: "per", fieldType: "Long Text", required: false },
  { id: "per_comments",label:"Manager Comments",   parentId: "per", fieldType: "Long Text", required: false },
  { id: "per_status", label: "Status",             parentId: "per", fieldType: "Select",    required: true  },
  { id: "pro_id",     label: "Project ID",         parentId: "pro", fieldType: "Text",      required: true  },
  { id: "pro_name",   label: "Project Name",       parentId: "pro", fieldType: "Text",      required: true  },
  { id: "pro_desc",   label: "Description",        parentId: "pro", fieldType: "Long Text", required: false },
  { id: "pro_start",  label: "Start Date",         parentId: "pro", fieldType: "Date",      required: false },
  { id: "pro_end",    label: "End Date",           parentId: "pro", fieldType: "Date",      required: false },
  { id: "pro_status", label: "Status",             parentId: "pro", fieldType: "Select",    required: true  },
  { id: "pro_mgr",    label: "Manager",            parentId: "pro", fieldType: "Lookup",    required: false, relatedObjectId: "emp" },
  { id: "pro_dep",    label: "Department",         parentId: "pro", fieldType: "Lookup",    required: false, relatedObjectId: "dep" },
  { id: "pro_budget", label: "Budget",             parentId: "pro", fieldType: "Currency",  required: false },
  { id: "tra_id",     label: "Training ID",        parentId: "tra", fieldType: "Text",      required: true  },
  { id: "tra_name",   label: "Training Name",      parentId: "tra", fieldType: "Text",      required: true  },
  { id: "tra_desc",   label: "Description",        parentId: "tra", fieldType: "Long Text", required: false },
  { id: "tra_type",   label: "Type",               parentId: "tra", fieldType: "Select",    required: false },
  { id: "tra_start",  label: "Start Date",         parentId: "tra", fieldType: "Date",      required: false },
  { id: "tra_end",    label: "End Date",           parentId: "tra", fieldType: "Date",      required: false },
  { id: "tra_trainer",label: "Trainer",            parentId: "tra", fieldType: "Text",      required: false },
  { id: "tra_status", label: "Status",             parentId: "tra", fieldType: "Select",    required: true  },
  { id: "tra_dep",    label: "Department",         parentId: "tra", fieldType: "Lookup",    required: false, relatedObjectId: "dep" },
  { id: "can_id",     label: "Candidate ID",       parentId: "can", fieldType: "Text",      required: true,  isPrimary: true },
  { id: "can_name",   label: "Full Name",          parentId: "can", fieldType: "Text",      required: true,  starred: true },
  { id: "can_email",  label: "Email",              parentId: "can", fieldType: "Email",     required: true,  starred: true },
  { id: "can_role",   label: "Applied Role",       parentId: "can", fieldType: "Lookup",    required: true,  relatedObjectId: "job" },
  { id: "can_stage",  label: "Stage",              parentId: "can", fieldType: "Select",    required: true,  tracked: true },
  { id: "can_source", label: "Source",             parentId: "can", fieldType: "Select",    required: false },
  { id: "intv_id",    label: "Interview ID",       parentId: "intv",fieldType: "Text",      required: true,  isPrimary: true },
  { id: "intv_can",   label: "Candidate",          parentId: "intv",fieldType: "Lookup",    required: true,  relatedObjectId: "can", starred: true },
  { id: "intv_date",  label: "Interview Date",     parentId: "intv",fieldType: "Date",      required: true },
  { id: "intv_panel", label: "Interviewer",        parentId: "intv",fieldType: "Lookup",    required: false, relatedObjectId: "emp" },
  { id: "intv_score", label: "Score",              parentId: "intv",fieldType: "Number",    required: false },
  { id: "intv_status",label: "Status",             parentId: "intv",fieldType: "Select",    required: true },
  { id: "ast_id",     label: "Asset ID",           parentId: "ast", fieldType: "Text",      required: true,  isPrimary: true },
  { id: "ast_name",   label: "Asset Name",         parentId: "ast", fieldType: "Text",      required: true,  starred: true },
  { id: "ast_type",   label: "Asset Type",         parentId: "ast", fieldType: "Select",    required: true },
  { id: "ast_emp",    label: "Assigned To",        parentId: "ast", fieldType: "Lookup",    required: false, relatedObjectId: "emp" },
  { id: "ast_status", label: "Status",             parentId: "ast", fieldType: "Select",    required: true },
  { id: "ast_serial", label: "Serial Number",      parentId: "ast", fieldType: "Text",      required: false },
  { id: "exp_id",     label: "Claim ID",           parentId: "exp", fieldType: "Text",      required: true,  isPrimary: true },
  { id: "exp_emp",    label: "Employee",           parentId: "exp", fieldType: "Lookup",    required: true,  relatedObjectId: "emp", starred: true },
  { id: "exp_amount", label: "Amount",             parentId: "exp", fieldType: "Currency",  required: true },
  { id: "exp_cat",    label: "Category",           parentId: "exp", fieldType: "Select",    required: true },
  { id: "exp_date",   label: "Expense Date",       parentId: "exp", fieldType: "Date",      required: true },
  { id: "exp_status", label: "Status",             parentId: "exp", fieldType: "Select",    required: true,  tracked: true },
  { id: "tim_id",     label: "Timesheet ID",       parentId: "tim", fieldType: "Text",      required: true,  isPrimary: true },
  { id: "tim_emp",    label: "Employee",           parentId: "tim", fieldType: "Lookup",    required: true,  relatedObjectId: "emp", starred: true },
  { id: "tim_pro",    label: "Project",            parentId: "tim", fieldType: "Lookup",    required: true,  relatedObjectId: "pro" },
  { id: "tim_week",   label: "Week Of",            parentId: "tim", fieldType: "Date",      required: true },
  { id: "tim_hours",  label: "Hours",              parentId: "tim", fieldType: "Number",    required: true },
  { id: "tim_status", label: "Status",             parentId: "tim", fieldType: "Select",    required: true },
  { id: "shf_id",     label: "Shift ID",           parentId: "shf", fieldType: "Text",      required: true,  isPrimary: true },
  { id: "shf_name",   label: "Shift Name",         parentId: "shf", fieldType: "Text",      required: true,  starred: true },
  { id: "shf_start",  label: "Start Time",         parentId: "shf", fieldType: "Time",      required: true },
  { id: "shf_end",    label: "End Time",           parentId: "shf", fieldType: "Time",      required: true },
  { id: "shf_loc",    label: "Location",           parentId: "shf", fieldType: "Lookup",    required: false, relatedObjectId: "loc" },
  { id: "shf_status", label: "Status",             parentId: "shf", fieldType: "Select",    required: true },
  { id: "hol_id",     label: "Holiday ID",         parentId: "hol", fieldType: "Text",      required: true,  isPrimary: true },
  { id: "hol_name",   label: "Holiday Name",       parentId: "hol", fieldType: "Text",      required: true,  starred: true },
  { id: "hol_date",   label: "Date",               parentId: "hol", fieldType: "Date",      required: true },
  { id: "hol_region", label: "Region",             parentId: "hol", fieldType: "Text",      required: false },
  { id: "hol_type",   label: "Type",               parentId: "hol", fieldType: "Select",    required: false },
  { id: "skl_id",     label: "Skill ID",           parentId: "skl", fieldType: "Text",      required: true,  isPrimary: true },
  { id: "skl_name",   label: "Skill Name",         parentId: "skl", fieldType: "Text",      required: true,  starred: true },
  { id: "skl_cat",    label: "Category",           parentId: "skl", fieldType: "Select",    required: false },
  { id: "skl_level",  label: "Proficiency",        parentId: "skl", fieldType: "Select",    required: false },
  { id: "skl_emp",    label: "Employee",           parentId: "skl", fieldType: "Lookup",    required: false, relatedObjectId: "emp" },
  { id: "ben_id",     label: "Benefit ID",         parentId: "ben", fieldType: "Text",      required: true,  isPrimary: true },
  { id: "ben_name",   label: "Plan Name",          parentId: "ben", fieldType: "Text",      required: true,  starred: true },
  { id: "ben_type",   label: "Benefit Type",       parentId: "ben", fieldType: "Select",    required: true },
  { id: "ben_emp",    label: "Employee",           parentId: "ben", fieldType: "Lookup",    required: false, relatedObjectId: "emp" },
  { id: "ben_status", label: "Enrollment Status",  parentId: "ben", fieldType: "Select",    required: true },
  { id: "onb_id",     label: "Task ID",            parentId: "onb", fieldType: "Text",      required: true,  isPrimary: true },
  { id: "onb_title",  label: "Task Title",         parentId: "onb", fieldType: "Text",      required: true,  starred: true },
  { id: "onb_emp",    label: "New Hire",           parentId: "onb", fieldType: "Lookup",    required: true,  relatedObjectId: "emp" },
  { id: "onb_due",    label: "Due Date",           parentId: "onb", fieldType: "Date",      required: false },
  { id: "onb_owner",  label: "Owner",              parentId: "onb", fieldType: "Lookup",    required: false, relatedObjectId: "emp" },
  { id: "onb_status", label: "Status",             parentId: "onb", fieldType: "Select",    required: true,  tracked: true },
];

interface LayoutDef { id: string; label: string; parentId: string; layoutType: string; }
const LAYOUTS: LayoutDef[] = [
  { id: "lay_emp_entry",   label: "Employee Entry",      parentId: "emp", layoutType: "Form View"     },
  { id: "lay_emp_details", label: "Employee Details",    parentId: "emp", layoutType: "Detail View"   },
  { id: "lay_emp_list",    label: "Employee List",       parentId: "emp", layoutType: "List View"     },
  { id: "lay_emp_search",  label: "Employee Search",     parentId: "emp", layoutType: "Search View"   },
  { id: "lay_emp_summary", label: "Employee Summary",    parentId: "emp", layoutType: "Summary View"  },
  { id: "lay_dep_list",    label: "Department List",     parentId: "dep", layoutType: "List View"     },
  { id: "lay_dep_details", label: "Department Details",  parentId: "dep", layoutType: "Detail View"   },
  { id: "lay_dep_entry",   label: "Department Entry",    parentId: "dep", layoutType: "Form View"     },
  { id: "lay_job_list",    label: "Role List",           parentId: "job", layoutType: "List View"     },
  { id: "lay_job_details", label: "Role Details",        parentId: "job", layoutType: "Detail View"   },
  { id: "lay_job_entry",   label: "Role Entry",          parentId: "job", layoutType: "Form View"     },
  { id: "lay_loc_list",    label: "Location List",       parentId: "loc", layoutType: "List View"     },
  { id: "lay_loc_details", label: "Location Details",    parentId: "loc", layoutType: "Detail View"   },
  { id: "lay_att_log",     label: "Attendance Log",      parentId: "att", layoutType: "List View"     },
  { id: "lay_att_report",  label: "Attendance Report",   parentId: "att", layoutType: "Report View"   },
  { id: "lay_att_mark",    label: "Mark Attendance",     parentId: "att", layoutType: "Form View"     },
  { id: "lay_lev_apply",   label: "Leave Application",   parentId: "lev", layoutType: "Form View"     },
  { id: "lay_lev_status",  label: "Leave Status",        parentId: "lev", layoutType: "Detail View"   },
  { id: "lay_lev_appr",    label: "Leave Approval",      parentId: "lev", layoutType: "Approval View" },
  { id: "lay_lev_cal",     label: "Leave Calendar",      parentId: "lev", layoutType: "Calendar View" },
  { id: "lay_pay_summary", label: "Payroll Summary",     parentId: "pay", layoutType: "Summary View"  },
  { id: "lay_pay_entry",   label: "Payroll Entry",       parentId: "pay", layoutType: "Form View"     },
  { id: "lay_pay_slip",    label: "Pay Slip",            parentId: "pay", layoutType: "Print View"    },
  { id: "lay_per_review",  label: "Performance Review",  parentId: "per", layoutType: "Detail View"   },
  { id: "lay_per_history", label: "Review History",      parentId: "per", layoutType: "List View"     },
  { id: "lay_per_form",    label: "Review Form",         parentId: "per", layoutType: "Form View"     },
  { id: "lay_pro_list",    label: "Project List",        parentId: "pro", layoutType: "List View"     },
  { id: "lay_pro_details", label: "Project Details",     parentId: "pro", layoutType: "Detail View"   },
  { id: "lay_pro_entry",   label: "Project Entry",       parentId: "pro", layoutType: "Form View"     },
  { id: "lay_tra_list",    label: "Training List",       parentId: "tra", layoutType: "List View"     },
  { id: "lay_tra_details", label: "Training Details",    parentId: "tra", layoutType: "Detail View"   },
  { id: "lay_tra_enroll",  label: "Training Enrollment", parentId: "tra", layoutType: "Form View"     },
  { id: "lay_can_list",    label: "Candidate Pipeline",  parentId: "can", layoutType: "List View"     },
  { id: "lay_can_details", label: "Candidate Profile",   parentId: "can", layoutType: "Detail View"   },
  { id: "lay_intv_form",   label: "Interview Form",      parentId: "intv",layoutType: "Form View"     },
  { id: "lay_intv_list",   label: "Interview Schedule",  parentId: "intv",layoutType: "List View"     },
  { id: "lay_ast_list",    label: "Asset Inventory",     parentId: "ast", layoutType: "List View"     },
  { id: "lay_ast_details", label: "Asset Details",       parentId: "ast", layoutType: "Detail View"   },
  { id: "lay_exp_form",    label: "Expense Entry",       parentId: "exp", layoutType: "Form View"     },
  { id: "lay_exp_list",    label: "Expense Claims",      parentId: "exp", layoutType: "List View"     },
  { id: "lay_tim_form",    label: "Timesheet Entry",     parentId: "tim", layoutType: "Form View"     },
  { id: "lay_tim_list",    label: "Timesheet List",      parentId: "tim", layoutType: "List View"     },
  { id: "lay_shf_list",    label: "Shift Roster",        parentId: "shf", layoutType: "List View"     },
  { id: "lay_hol_cal",     label: "Holiday Calendar",    parentId: "hol", layoutType: "Calendar View" },
  { id: "lay_skl_list",    label: "Skills Matrix",       parentId: "skl", layoutType: "List View"     },
  { id: "lay_ben_list",    label: "Benefits Catalog",    parentId: "ben", layoutType: "List View"     },
  { id: "lay_onb_list",    label: "Onboarding Checklist",parentId: "onb", layoutType: "List View"     },
  { id: "lay_onb_details", label: "Onboarding Task",     parentId: "onb", layoutType: "Detail View"   },
];

const OBJ_OBJ: [string, string][] = [
  ["emp","dep"],["emp","job"],["emp","loc"],["emp","att"],
  ["emp","lev"],["emp","pay"],["emp","per"],["emp","pro"],
  ["emp","tra"],["dep","job"],["dep","loc"],["pro","dep"],["tra","dep"],
  ["can","job"],["intv","can"],["intv","emp"],["ast","emp"],
  ["exp","emp"],["tim","emp"],["tim","pro"],["shf","loc"],
  ["skl","emp"],["ben","emp"],["onb","emp"],
];

// ─── GRAPH BUILDER ─────────────────────────────────────────────────────────────
function buildGraph(): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];

  // Object nodes
  OBJECTS.forEach(o => nodes.push({ id: o.id, type: "object", label: o.label, x: OP[o.id][0], y: OP[o.id][1], description: o.desc, objectType: o.objType }));

  // Field nodes — orbit parent object
  const fieldsByParent: Record<string, FieldDef[]> = {};
  FIELDS.forEach(f => { (fieldsByParent[f.parentId] = fieldsByParent[f.parentId] ?? []).push(f); });
  Object.entries(fieldsByParent).forEach(([pid, fields]) => {
    const [cx, cy] = OP[pid];
    fields.forEach((f, i) => {
      const angle = (i / fields.length) * Math.PI * 2;
      const r = 210;
      nodes.push({
        id: f.id, type: "field", label: f.label,
        x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle),
        parentId: f.parentId, fieldType: f.fieldType, required: f.required,
        relatedObjectId: f.relatedObjectId,
        starred: Boolean(f.starred), tracked: Boolean(f.tracked), isPrimary: Boolean(f.isPrimary),
      });
      edges.push({ id: `of_${pid}_${f.id}`, from: pid, to: f.id, type: "obj-field" });
      if (f.relatedObjectId && f.relatedObjectId !== f.parentId) {
        edges.push({ id: `ff_${f.id}_${f.relatedObjectId}`, from: f.id, to: f.relatedObjectId, type: "field-field" });
      }
    });
  });

  // Layout nodes — orbit parent object on opposite side
  const layoutsByParent: Record<string, LayoutDef[]> = {};
  LAYOUTS.forEach(l => { (layoutsByParent[l.parentId] = layoutsByParent[l.parentId] ?? []).push(l); });
  Object.entries(layoutsByParent).forEach(([pid, layouts]) => {
    const [cx, cy] = OP[pid];
    layouts.forEach((l, i) => {
      const angle = Math.PI + (i / layouts.length) * Math.PI * 2;
      const r = 250;
      nodes.push({ id: l.id, type: "layout", label: l.label, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), parentId: l.parentId, layoutType: l.layoutType });
      edges.push({ id: `ol_${pid}_${l.id}`, from: pid, to: l.id, type: "obj-layout" });
    });
  });

  OBJ_OBJ.forEach(([a, b]) => edges.push({ id: `oo_${a}_${b}`, from: a, to: b, type: "obj-obj" }));
  return { nodes, edges };
}

// ─── CONNECTIVITY ──────────────────────────────────────────────────────────────
function getConnectivity(selectedId: string | null, edges: GEdge[], nodeMap: Map<string, GNode>) {
  if (!selectedId) return { direct: new Set<string>(), second: new Set<string>() };
  const direct = new Set<string>();
  edges.forEach(e => {
    if (e.from === selectedId) direct.add(e.to);
    if (e.to === selectedId) direct.add(e.from);
  });
  const sel = nodeMap.get(selectedId);
  if (sel?.parentId) direct.add(sel.parentId);
  direct.delete(selectedId);
  const second = new Set<string>();
  direct.forEach(dId => {
    edges.forEach(e => {
      const other = e.from === dId ? e.to : e.to === dId ? e.from : null;
      if (other && other !== selectedId && !direct.has(other)) second.add(other);
    });
  });
  return { direct, second };
}

// ─── THREE.JS HELPERS ──────────────────────────────────────────────────────────
// Lazy singleton white glow texture — all node sprites share this, tinted via material.color
let _glowTex: THREE.CanvasTexture | null = null;
function getGlowTex(): THREE.CanvasTexture {
  if (_glowTex) return _glowTex;
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  g.addColorStop(0,    "rgba(255,255,255,1)");
  g.addColorStop(0.12, "rgba(255,255,255,0.95)");
  g.addColorStop(0.3,  "rgba(255,255,255,0.6)");
  g.addColorStop(0.55, "var(--app-scrollbar-thumb)");
  g.addColorStop(0.8,  "rgba(255,255,255,0.04)");
  g.addColorStop(1,    "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}

/** High-DPI canvas label — sharp when zoomed; draws above solid spheres. */
function makeLabel(
  text: string,
  color: string,
  fontSize = 13,
  labelStyle: GraphLabelStyle = { stroke: "rgba(0,0,0,0.92)", skipStroke: false, strokeWidth: 3.2 },
): THREE.Sprite {
  const dpr = Math.min(3, Math.max(2, (typeof window !== "undefined" ? window.devicePixelRatio : 2) || 2));
  const fontPx = Math.round(fontSize * dpr);
  const padX = Math.round(22 * dpr);
  const padY = Math.round(14 * dpr);
  const font = `600 ${fontPx}px Inter, system-ui, sans-serif`;

  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = font;
  const raw = (text || "").trim() || " ";
  const maxChars = 28;
  const display = raw.length > maxChars ? `${raw.slice(0, maxChars - 1)}…` : raw;
  const textW = Math.ceil(measure.measureText(display).width);

  const canvasW = Math.ceil(textW + padX * 2);
  const canvasH = Math.ceil(fontPx + padY * 2);
  const c = document.createElement("canvas");
  c.width = canvasW;
  c.height = canvasH;
  const ctx = c.getContext("2d")!;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  // Outline/halo so glyphs stay readable over spheres in both themes
  if (!labelStyle.skipStroke) {
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeStyle = labelStyle.stroke;
    ctx.lineWidth = Math.max(3, labelStyle.strokeWidth * dpr);
    ctx.strokeText(display, cx, cy);
  }
  ctx.fillStyle = color;
  ctx.fillText(display, cx, cy);

  const tex = new THREE.CanvasTexture(c);
  if ("colorSpace" in tex) (tex as THREE.CanvasTexture & { colorSpace: string }).colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const s = new THREE.Sprite(mat);
  s.renderOrder = 30;
  const worldH = (fontSize / 13) * 5.4;
  const worldW = worldH * (canvasW / canvasH);
  s.scale.set(worldW, worldH, 1);
  (s as any).__baseScale = { x: worldW, y: worldH };
  return s;
}

// ─── COLOR PALETTE (theme-aware via GraphColorsProvider) ───────────────────────
function isLookupField(fieldType?: string) {
  return fieldType === "Lookup" || fieldType === "Master Details";
}

function fieldGraphColor(c: GraphColorPalette, fieldType?: string) {
  return isLookupField(fieldType) ? c.fieldLookup : c.field;
}

function baseNodeColor(c: GraphColorPalette, n: GNode): string {
  if (n.type === "object") return c.object;
  if (n.type === "field")  return fieldGraphColor(c, n.fieldType);
  return c.layout;
}

const SPHERE_GEO = {
  object: new THREE.SphereGeometry(6.2, 32, 32),
  field:  new THREE.SphereGeometry(2.9, 24, 24),
  layout: new THREE.SphereGeometry(2.2, 20, 20),
};

// ─── UI SUB-COMPONENTS ─────────────────────────────────────────────────────────
function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--app-text-muted)" }}>{title}</span>
        {count !== undefined && <span className="text-xs" style={{ color: "var(--app-text-muted)" }}>{count}</span>}
        <div style={{ flex: 1, height: 1, background: "var(--app-border)" }} />
      </div>
      {children}
    </div>
  );
}

function RowBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        marginBottom: 2, padding: "6px 8px", borderRadius: 8, border: "none",
        background: "transparent", cursor: "pointer", fontFamily: "inherit",
        fontSize: 13, fontWeight: 400, textAlign: "left", color: "var(--app-text-primary)",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--app-shell-bg-hover)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function DetailPanel({ node, nodeMap, edges, onClose, onNodeSelect }: {
  node: GNode; nodeMap: Map<string, GNode>; edges: GEdge[];
  onClose: () => void; onNodeSelect: (n: GNode) => void;
}) {
  const COLOR = useGraphColors();
  const parentNode = node.parentId ? nodeMap.get(node.parentId) : undefined;
  const objFields   = FIELDS.filter(f => f.parentId === node.id);
  const objLayouts  = LAYOUTS.filter(l => l.parentId === node.id);
  const objDef      = OBJECTS.find(o => o.id === node.id);
  const fieldDef    = FIELDS.find(f => f.id === node.id);
  const layoutDef   = LAYOUTS.find(l => l.id === node.id);

  const connectedObjIds = new Set<string>();
  edges.forEach(e => {
    if (e.type === "obj-obj") {
      if (e.from === node.id) connectedObjIds.add(e.to);
      if (e.to   === node.id) connectedObjIds.add(e.from);
    }
  });
  const connectedObjs = Array.from(connectedObjIds).map(id => nodeMap.get(id)).filter(Boolean) as GNode[];
  const layoutFields  = node.type === "layout" && node.parentId ? FIELDS.filter(f => f.parentId === node.parentId).slice(0, 8) : [];
  const fieldLayouts  = node.type === "field"  && node.parentId ? LAYOUTS.filter(l => l.parentId === node.parentId).slice(0, 4) : [];

  const typeColor = node.type === "object" ? COLOR.objectBright : node.type === "field" ? COLOR.fieldLookup : COLOR.layoutBright;

  return (
    <div className="absolute right-0 bottom-0 z-20 flex flex-col overflow-hidden"
      style={{ top: 52, width: 400, background: "var(--app-shell-bg-panel)", borderLeft: "1px solid var(--app-border)", backdropFilter: "blur(20px)", animation: "panelIn 0.35s cubic-bezier(0.25,0.46,0.45,0.94)" }}>
      <style>{`@keyframes panelIn{from{transform:translateX(28px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

      <div className="shrink-0 border-b border-border px-5 pb-4 pt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold uppercase tracking-widest" style={{ color: typeColor, fontSize: 10 }}>{node.type.toUpperCase()}</span>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "var(--app-text-muted)" }}>
            <X size={14} />
          </button>
        </div>
        <h2 className="mb-1.5 font-semibold text-foreground" style={{ fontSize: 16 }}>{node.label}</h2>
        {node.type === "object" && objDef  && <p className="text-sm leading-relaxed text-muted-foreground">{objDef.desc}</p>}
        {node.type === "field"  && fieldDef  && <p className="text-sm text-muted-foreground">{fieldDef.fieldType} field in <span style={{ color: COLOR.objectBright }}>{parentNode?.label}</span></p>}
        {node.type === "layout" && layoutDef && <p className="text-sm text-muted-foreground">{layoutDef.layoutType} · <span style={{ color: COLOR.objectBright }}>{parentNode?.label}</span></p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-color:var(--app-scrollbar-thumb)_transparent] [scrollbar-width:thin]">
        {node.type === "object" && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3">
              {[["Object Type", objDef?.objType ?? "Custom Object"], ["Status", "Active"], ["Created", "Jun 12, 2026"], ["Last Updated", "Jul 20, 2026"]].map(([k,v]) => (
                <div key={k}>
                  <div className="mb-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{k}</div>
                  <div className="text-sm text-foreground">{v}</div>
                </div>
              ))}
            </div>
            <Section title="FIELDS" count={objFields.length}>
              {objFields.map(f => (
                <RowBtn key={f.id} onClick={() => { const n = nodeMap.get(f.id); if (n) onNodeSelect(n); }}>
                  <div className="size-1.5 shrink-0 rounded-full" style={{ background: fieldGraphColor(COLOR, f.fieldType) }} />
                  <span className="flex-1 text-sm text-foreground">{f.label}</span>
                  <span className="text-xs text-muted-foreground">{f.fieldType}</span>
                  {f.required && <span className="text-[10px] opacity-80" style={{ color: COLOR.fieldLookup }}>REQ</span>}
                </RowBtn>
              ))}
            </Section>
            {connectedObjs.length > 0 && (
              <Section title="RELATIONSHIPS" count={connectedObjs.length}>
                {connectedObjs.map(obj => (
                  <RowBtn key={obj.id} onClick={() => onNodeSelect(obj)}>
                    <div className="size-2 shrink-0 rounded-full border-[1.5px] bg-transparent" style={{ borderColor: COLOR.objectBright }} />
                    <span className="flex-1 text-sm text-foreground">{obj.label}</span>
                    <ChevronRight className="size-2.5 text-muted-foreground" />
                  </RowBtn>
                ))}
              </Section>
            )}
            {objLayouts.length > 0 && (
              <Section title="LAYOUTS" count={objLayouts.length}>
                {objLayouts.map(l => (
                  <RowBtn key={l.id} onClick={() => { const n = nodeMap.get(l.id); if (n) onNodeSelect(n); }}>
                    <div className="size-1.5 shrink-0 rounded-full" style={{ background: COLOR.layout }} />
                    <span className="flex-1 text-sm text-foreground">{l.label}</span>
                    <span className="text-xs text-muted-foreground">{l.layoutType}</span>
                  </RowBtn>
                ))}
              </Section>
            )}
          </>
        )}
        {node.type === "field" && fieldDef && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3">
              {[["Field Type", fieldDef.fieldType], ["Required", fieldDef.required ? "Yes" : "No"], ["Unique", "No"], ["Indexed", fieldDef.required ? "Yes" : "No"]].map(([k,v]) => (
                <div key={k}>
                  <div className="mb-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{k}</div>
                  <div className="text-sm text-foreground">{v}</div>
                </div>
              ))}
            </div>
            <Section title="PARENT OBJECT">
              {parentNode && <RowBtn onClick={() => onNodeSelect(parentNode)}>
                <div className="size-2 shrink-0 rounded-full border-[1.5px] bg-transparent" style={{ borderColor: COLOR.objectBright }} />
                <span className="flex-1 text-sm text-foreground">{parentNode.label}</span>
                <ChevronRight className="size-2.5 text-muted-foreground" />
              </RowBtn>}
            </Section>
            {fieldDef.relatedObjectId && fieldDef.relatedObjectId !== fieldDef.parentId && (
              <Section title="RELATED OBJECT">
                {(() => { const rel = nodeMap.get(fieldDef.relatedObjectId!); return rel ? (
                  <RowBtn onClick={() => onNodeSelect(rel)}>
                    <div className="size-2 shrink-0 rounded-full border-[1.5px] bg-transparent" style={{ borderColor: COLOR.objectBright }} />
                    <span className="flex-1 text-sm" style={{ color: COLOR.objectBright }}>{rel.label}</span>
                    <ChevronRight className="size-2.5 text-muted-foreground" />
                  </RowBtn>
                ) : null; })()}
              </Section>
            )}
            {fieldLayouts.length > 0 && (
              <Section title="USED IN LAYOUTS" count={fieldLayouts.length}>
                {fieldLayouts.map(l => (
                  <RowBtn key={l.id} onClick={() => { const n = nodeMap.get(l.id); if (n) onNodeSelect(n); }}>
                    <div className="size-1.5 shrink-0 rounded-full" style={{ background: COLOR.layout }} />
                    <span className="flex-1 text-sm text-foreground">{l.label}</span>
                    <span className="text-xs text-muted-foreground">{l.layoutType}</span>
                  </RowBtn>
                ))}
              </Section>
            )}
          </>
        )}
        {node.type === "layout" && layoutDef && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3">
              {[["Layout Type", layoutDef.layoutType], ["Status", "Published"], ["Object", parentNode?.label ?? ""], ["Last Updated", "Jul 18, 2026"]].map(([k,v]) => (
                <div key={k}>
                  <div className="mb-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{k}</div>
                  <div className="text-sm text-foreground">{v}</div>
                </div>
              ))}
            </div>
            <Section title="RELATED OBJECT">
              {parentNode && <RowBtn onClick={() => onNodeSelect(parentNode)}>
                <div className="size-2 shrink-0 rounded-full border-[1.5px] bg-transparent" style={{ borderColor: COLOR.objectBright }} />
                <span className="flex-1 text-sm text-foreground">{parentNode.label}</span>
                <ChevronRight className="size-2.5 text-muted-foreground" />
              </RowBtn>}
            </Section>
            {layoutFields.length > 0 && (
              <Section title="FIELDS USED" count={layoutFields.length}>
                {layoutFields.map(f => (
                  <RowBtn key={f.id} onClick={() => { const n = nodeMap.get(f.id); if (n) onNodeSelect(n); }}>
                    <div className="size-1.5 shrink-0 rounded-full" style={{ background: COLOR.field }} />
                    <span className="flex-1 text-sm text-foreground">{f.label}</span>
                    <span className="text-xs text-muted-foreground">{f.fieldType}</span>
                  </RowBtn>
                ))}
              </Section>
            )}
            <button
              type="button"
              className="mt-2 w-full"
              style={{
                width: "100%", marginTop: 8, padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                background: "transparent", border: `1px solid ${COLOR.layout}55`, color: COLOR.layoutBright,
                fontSize: 13, fontFamily: "inherit",
              }}
            >
              Open Layout Configuration
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CtrlBtn({ onClick, title, children }: {
  onClick: () => void; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 32, height: 32, borderRadius: 8, cursor: "pointer",
        background: "var(--app-shell-bg-panel)", border: "1px solid var(--app-border)",
        backdropFilter: "blur(8px)", color: "var(--app-text-primary)", fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function CanvasControls({ onZoomIn, onZoomOut, onFocusSelected, hasSelection }: {
  onZoomIn: () => void; onZoomOut: () => void;
  onFocusSelected: () => void; hasSelection: boolean;
}) {
  return (
    <div className="absolute z-20 flex flex-col items-center gap-1.5"
      style={{ bottom: CHROME_INSET, right: CHROME_INSET }}>
      {hasSelection && <CtrlBtn onClick={onFocusSelected} title="Focus Selected"><Target size={14} /></CtrlBtn>}
      <CtrlBtn onClick={onZoomIn}  title="Zoom In"><Plus size={14} /></CtrlBtn>
      <CtrlBtn onClick={onZoomOut} title="Zoom Out"><Minus size={14} /></CtrlBtn>
    </div>
  );
}

function MiniMap({ nodes, selectedId, visibility }: {
  nodes: GNode[]; selectedId: string | null;
  visibility: { objects: boolean; fields: boolean; layouts: boolean };
}) {
  const COLOR = useGraphColors();
  const pad = 120;
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
  const [wxMin, wxMax] = [Math.min(...xs) - pad, Math.max(...xs) + pad];
  const [wyMin, wyMax] = [Math.min(...ys) - pad, Math.max(...ys) + pad];
  const ww = wxMax - wxMin, wh = wyMax - wyMin;
  /* Match Explore panel width (w-48 = 192px) */
  const mmW = 192, mmH = 100;
  const sc = Math.min(mmW / ww, mmH / wh);
  const ox = (mmW - ww * sc) / 2, oy = (mmH - wh * sc) / 2;
  const toMM = (x: number, y: number) => ({ x: ox + (x - wxMin) * sc, y: oy + (y - wyMin) * sc });
  return (
    <div className="absolute z-20 overflow-hidden flex items-center justify-center"
      style={{
        bottom: CHROME_INSET, left: CHROME_INSET, width: mmW, height: mmH, borderRadius: 16,
        background: PANEL_OVERLAY_BG, border: "1px solid var(--app-border)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        boxShadow: "var(--app-shell-shadow)",
        pointerEvents: "auto",
      }}>
      <svg width={mmW} height={mmH} style={{ display: "block" }}>
        {nodes.map(n => {
          const vis = n.type === "object" ? visibility.objects : n.type === "field" ? visibility.fields : visibility.layouts;
          if (!vis) return null;
          const { x, y } = toMM(n.x, n.y);
          const r    = n.type === "object" ? 2.5 : n.type === "layout" ? 1.5 : 0.8;
          const color= n.type === "object" ? COLOR.object : n.type === "layout" ? COLOR.layout : COLOR.field;
          const isSel = n.id === selectedId;
          return <circle key={n.id} cx={x} cy={y} r={isSel ? r * 2.5 : r} fill={isSel ? "#44CCFF" : color} opacity={n.type === "object" ? 0.9 : 0.45} />;
        })}
      </svg>
    </div>
  );
}

function Tooltip({ node, x, y, nodes, edges }: { node: GNode; x: number; y: number; nodes: GNode[]; edges: GEdge[] }) {
  const COLOR = useGraphColors();
  const parent = node.parentId ? nodes.find(n => n.id === node.parentId) : null;
  const fieldCount  = node.type === "object" ? FIELDS.filter(f => f.parentId === node.id).length : 0;
  const layoutCount = node.type === "object" ? LAYOUTS.filter(l => l.parentId === node.id).length : 0;
  const relCount    = node.type === "object" ? new Set(edges.filter(e => e.type === "obj-obj" && (e.from === node.id || e.to === node.id)).map(e => e.from === node.id ? e.to : e.from)).size : 0;
  return (
    <div
      className="pointer-events-none absolute z-50 max-w-[220px] px-3 py-2"
      style={{
        left: x, top: y, borderRadius: 10,
        background: "var(--app-shell-bg-floating-soft)", border: "1px solid var(--app-border)",
        backdropFilter: "blur(12px)", boxShadow: "var(--app-shell-shadow)",
      }}
    >
      <div className="text-sm font-medium" style={{ color: "var(--app-text-primary)" }}>{node.label}</div>
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: node.type === "object" ? COLOR.objectBright : node.type === "field" ? COLOR.fieldLookup : COLOR.layoutBright }}>{node.type.toUpperCase()}</div>
      {node.type === "object" && <div className="text-xs" style={{ color: "var(--app-text-muted)" }}>{fieldCount} Fields · {relCount} Relationships · {layoutCount} Layouts</div>}
      {node.type === "field"  && <div className="text-xs" style={{ color: "var(--app-text-muted)" }}>{node.fieldType} {parent ? `· ${parent.label}` : ""}</div>}
      {node.type === "layout" && <div className="text-xs" style={{ color: "var(--app-text-muted)" }}>{node.layoutType} {parent ? `· ${parent.label}` : ""}</div>}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
const SCALE = 1 / 14;
const CX = 2000, CY = 1500;
/** Nominal overview orbit — locked so landing zoom is stable across reloads & screen sizes. */
const NOMINAL_ORBIT_DIST = 360;
const NOMINAL_REF_VIEW_H = 720;
const NOMINAL_ORBIT_MIN = 300;
const NOMINAL_ORBIT_MAX = 480;
/** Left Explore panel width (w-48) — overlays the graph; does not inset the canvas. */
const CHROME_INSET = 20;
/** Tailwind w-48 — keep filter/toolbars clear of Explore. */
const EXPLORE_PANEL_W = 192;
const HEADER_H = 52;
/** Right object properties panel width when a node is selected. */
const PROPS_PANEL_CHROME_PX = 400;
/** Fallback orbit radius before the first overview frame. */
const DEFAULT_ORBIT_DIST = NOMINAL_ORBIT_DIST;
/** Auto-rotate angular step per frame (≈40% slower than original 0.0025). */
const AUTO_ROTATE_STEP = 0.0015;
/** Slower orbit while browsing Use Template catalog so glass cards stay readable. */
const TEMPLATE_CATALOG_ROTATE_STEP = 0.00055;
/** Link particle travel speed (half of prior 0.006). */
const LINK_PARTICLE_SPEED = 0.003;
/** Shared frosted overlay fill so the graph reads through chrome gaps. */
const PANEL_OVERLAY_BG = "color-mix(in srgb, var(--app-shell-bg-panel) 78%, transparent)";

// Seeded LCG for deterministic z-spreads
function lcgRand(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
}

/** Constant angular size across viewports: farther on taller screens, nearer on short ones. */
function nominalOrbitDist(viewH: number) {
  const scaled = NOMINAL_ORBIT_DIST * (Math.max(480, viewH) / NOMINAL_REF_VIEW_H);
  return Math.min(NOMINAL_ORBIT_MAX, Math.max(NOMINAL_ORBIT_MIN, scaled));
}

function graphCentroid(nodes: { x?: number; y?: number; z?: number }[]) {
  let cx = 0, cy = 0, cz = 0, n = 0;
  nodes.forEach(node => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)) return;
    cx += node.x as number;
    cy += node.y as number;
    cz += node.z as number;
    n += 1;
  });
  if (n === 0) return { x: 0, y: 0, z: 0 };
  return { x: cx / n, y: cy / n, z: cz / n };
}

/** Frame the calm “nominal” overview used on landing + auto-rotate (not zoomToFit). */
function applyNominalOverview(
  fg: { cameraPosition: (pos: { x: number; y: number; z: number }, lookAt: { x: number; y: number; z: number }, ms: number) => void },
  opts: {
    nodes: { x?: number; y?: number; z?: number }[];
    viewH: number;
    rotCenterRef: { current: { x: number; y: number; z: number } };
    rotAngleRef: { current: number };
    orbitDistRef: { current: number };
    durationMs?: number;
  },
) {
  const look = graphCentroid(opts.nodes);
  opts.rotCenterRef.current = look;
  const dist = nominalOrbitDist(opts.viewH);
  opts.orbitDistRef.current = dist;
  const a = opts.rotAngleRef.current;
  const elev = Math.max(40, dist * 0.13);
  fg.cameraPosition(
    { x: look.x + dist * Math.sin(a), y: look.y + elev, z: look.z + dist * Math.cos(a) },
    look,
    opts.durationMs ?? 0,
  );
}

export default function App() {
  const { resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => setThemeReady(true), []);
  // Avoid black FOUC: before next-themes hydrates, trust the boot class from index.html / storage.
  const bootTheme = useMemo((): "light" | "dark" => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }, []);
  const activeTheme = (themeReady ? (resolvedTheme ?? bootTheme) : bootTheme) as "light" | "dark";

  useEffect(() => {
    document.documentElement.style.backgroundColor = activeTheme === "light" ? "#E2E8F0" : "#000000";
    document.documentElement.style.colorScheme = activeTheme === "light" ? "light" : "dark";
  }, [activeTheme]);

  const graphColors = useMemo(() => getGraphColors(activeTheme), [activeTheme]);
  const graphBg = useMemo(() => getGraphBackground(activeTheme), [activeTheme]);
  const labelStyle = useMemo(() => getGraphLabelStyle(activeTheme), [activeTheme]);

  const { nodes, edges } = useMemo(buildGraph, []);
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // These are declared early so effects below can reference fullNodeMap
  // (dynamicNodes state is declared below; the memos will re-run when it changes)
  const [dynamicNodes,    setDynamicNodes]    = useState<DynNode[]>([]);
  const [dynamicEdges,    setDynamicEdges]    = useState<GEdge[]>([]);
  const [hiddenIds,       setHiddenIds]       = useState<Set<string>>(() => new Set());
  const [nodePatches,     setNodePatches]     = useState<Record<string, Partial<GNode>>>({});

  const dynNodeMap = useMemo<Map<string, GNode>>(() => {
    const m = new Map<string, GNode>();
    dynamicNodes.forEach(n => {
      if (hiddenIds.has(n.id)) return;
      const patch = nodePatches[n.id];
      m.set(n.id, { ...(n as unknown as GNode), ...patch });
    });
    return m;
  }, [dynamicNodes, hiddenIds, nodePatches]);

  const fullNodeMap = useMemo<Map<string, GNode>>(() => {
    const m = new Map<string, GNode>();
    nodeMap.forEach((v, k) => {
      if (hiddenIds.has(k)) return;
      const patch = nodePatches[k];
      m.set(k, patch ? { ...v, ...patch } : v);
    });
    dynNodeMap.forEach((v, k) => m.set(k, v));
    return m;
  }, [nodeMap, dynNodeMap, hiddenIds, nodePatches]);

  const fgRef              = useRef<any>(null);
  const containerRef       = useRef<HTMLDivElement>(null);
  const nodeMeshesRef      = useRef<Map<string, THREE.Mesh>>(new Map());
  const labelSpritesRef    = useRef<Map<string, THREE.Sprite>>(new Map());
  const previewMeshesRef   = useRef<Map<string, THREE.Mesh>>(new Map());
  const autoRotateRef      = useRef(true);
  const rotAngleRef        = useRef(0);
  const rotCenterRef       = useRef({ x: 0, y: 0, z: 0 });
  const orbitDistRef       = useRef(DEFAULT_ORBIT_DIST);
  const cameraAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomVelRef         = useRef(0);
  const previewSpawnRef    = useRef<{ x: number; y: number; z: number } | null>(null);
  const selectedIdRef      = useRef<string | null>(null);
  const graphDataRef      = useRef<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const pendingFocusIdRef  = useRef<string | null>(null);
  /** When set, post-close camera frames the whole new object suite (not just one object). */
  const pendingFocusSuiteIdsRef = useRef<string[] | null>(null);
  /** Ignore resize re-frames while a deploy focus sequence is in flight. */
  const focusLockUntilRef = useRef(0);
  /** Newly deployed nodes — slide/dock into the existing cluster until reveal finishes. */
  const arrivingIdsRef = useRef<Set<string>>(new Set());
  const arrivingMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const arrivalProgressRef = useRef<Map<string, number>>(new Map());
  /** Final dock positions for arriving nodes (world space). */
  const arrivalHomeRef = useRef<Map<string, { x: number; y: number; z: number }>>(new Map());
  /** Spawn positions (offset away from existing graph) before the dock lerp. */
  const arrivalSpawnRef = useRef<Map<string, { x: number; y: number; z: number }>>(new Map());
  const arrivalActiveRef = useRef(false);
  /** 0→1 bloom while the new cluster is parked before docking. */
  const arrivalBloomRef = useRef(0);
  /** Timestamp when staggered dock unlock started. */
  const arrivalUnlockAtRef = useRef(0);
  /** Per-node delay (ms) before dock lerp begins. */
  const arrivalStaggerMsRef = useRef<Map<string, number>>(new Map());
  const arrivalMotionPhaseRef = useRef<"bloom" | "dock" | "done">("bloom");
  const idleRotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const IDLE_ROTATE_MS = 20_000;
  /** Staggered reveal groups queued until the deploy wizard closes. */
  const pendingSuiteRevealRef = useRef<{
    objectIds: string[];
    allIds: string[];
    firstObjId: string;
    hideExistingIds: string[];
  } | null>(null);
  /** During solo arrival, hide the previous graph so only new objects appear. */
  const [soloHideIds, setSoloHideIds] = useState<Set<string> | null>(null);
  const starfieldRef       = useRef<THREE.Points | null>(null);

  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [hoveredId,     setHoveredId]     = useState<string | null>(null);
  const [mousePos,      setMousePos]      = useState({ x: 0, y: 0 });
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [objectsViewMode, setObjectsViewMode] = useState<"graph" | "cards">("graph");
  const [objectsFilterOpen, setObjectsFilterOpen] = useState(false);
  /** Committed filters — drive card list + graph visibility */
  const [objectsFilterApplied, setObjectsFilterApplied] = useState<ObjectsFilterState>(EMPTY_OBJECTS_FILTER);
  /** Draft edits inside the menu until Apply */
  const [objectsFilterDraft, setObjectsFilterDraft] = useState<ObjectsFilterState>(EMPTY_OBJECTS_FILTER);
  const objectsFilterRef = useRef<HTMLDivElement | null>(null);
  const [showGuide,     setShowGuide]     = useState(true);
  const [visibility,    setVisibility]    = useState({ objects: true, fields: true, layouts: true });
  const [dims,          setDims]          = useState({ w: window.innerWidth, h: window.innerHeight });
  const [createMode, setCreateMode] = useState<CreateMode | null>(null);
  const createModeRef = useRef<CreateMode | null>(null);
  const [editDraft, setEditDraft] = useState<WizardEditInitial | null>(null);
  const [previewNodes,    setPreviewNodes]    = useState<PanelPreviewNode[]>([]);
  const [previewEdges,    setPreviewEdges]    = useState<PanelPreviewEdge[]>([]);

  const clearCameraAnimTimer = useCallback(() => {
    if (cameraAnimTimerRef.current !== null) {
      clearTimeout(cameraAnimTimerRef.current);
      cameraAnimTimerRef.current = null;
    }
  }, []);

  const clearIdleRotateTimer = useCallback(() => {
    if (idleRotateTimerRef.current !== null) {
      clearTimeout(idleRotateTimerRef.current);
      idleRotateTimerRef.current = null;
    }
  }, []);

  /** While object filters are applied, never resume auto-rotate. */
  const filterLockRotateRef = useRef(false);
  /** Home positions captured before filter cluster animation. */
  const filterHomePosRef = useRef<Map<string, { x: number; y: number; z: number }>>(new Map());
  const filterAnimRef = useRef<{
    active: boolean;
    mode: "in" | "out";
    t0: number;
    duration: number;
    from: Map<string, { x: number; y: number; z: number }>;
    to: Map<string, { x: number; y: number; z: number }>;
  } | null>(null);

  /** Stop rotation immediately; only resume after 20s with no further interaction. */
  const pauseRotateForIdle = useCallback(() => {
    autoRotateRef.current = false;
    clearIdleRotateTimer();
    idleRotateTimerRef.current = setTimeout(() => {
      if (arrivalActiveRef.current) return;
      if (filterLockRotateRef.current) return;
      autoRotateRef.current = true;
      idleRotateTimerRef.current = null;
    }, IDLE_ROTATE_MS);
  }, [clearIdleRotateTimer]);

  /** Keep auto-rotate orbit in sync with the current camera (distance + look-at + angle). */
  const syncOrbitFromCamera = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    try {
      const controls = fg.controls() as { target: { x: number; y: number; z: number } } | undefined;
      const cam = fg.cameraPosition() as { x: number; y: number; z: number };
      const look = controls?.target
        ? { x: controls.target.x, y: controls.target.y, z: controls.target.z }
        : rotCenterRef.current;
      rotCenterRef.current = look;
      const dx = cam.x - look.x;
      const dz = cam.z - look.z;
      const dist = Math.hypot(dx, cam.y - look.y, dz);
      if (dist > 1) orbitDistRef.current = dist;
      if (Math.hypot(dx, dz) > 1e-4) {
        rotAngleRef.current = Math.atan2(dx, dz);
      }
    } catch { /* controls / camera may not be ready */ }
  }, []);

  const freezeGraphNodes = useCallback(() => {
    graphDataRef.current.nodes.forEach((n: any) => {
      if (typeof n.x === "number") {
        n.fx = n.x;
        n.fy = n.y;
        n.fz = n.z;
        n.vx = 0;
        n.vy = 0;
        n.vz = 0;
      }
    });
  }, []);

  const unfreezeGraphNodes = useCallback(() => {
    graphDataRef.current.nodes.forEach((n: any) => {
      delete n.fx;
      delete n.fy;
      delete n.fz;
    });
  }, []);

  const setAmbientForce = useCallback((on: boolean) => {
    const fg = fgRef.current;
    if (!fg) return;
    try {
      fg.d3AlphaTarget(on ? 0.025 : 0);
      if (on) fg.d3ReheatSimulation();
    } catch { /* force graph may not be ready */ }
  }, []);

  const fitAllInView = useCallback((durationMs = 700, opts?: { restoreMotion?: boolean; resumeRotate?: boolean }) => {
    const fg = fgRef.current;
    if (!fg) return;
    clearCameraAnimTimer();
    const resumeRotate = opts?.resumeRotate ?? false;
    if (resumeRotate) autoRotateRef.current = false;
    const viewH = Math.max(1, (typeof window !== "undefined" ? window.innerHeight : 720) - HEADER_H);
    const frame = (ms: number) => applyNominalOverview(fg, {
      nodes: graphDataRef.current.nodes,
      viewH,
      rotCenterRef,
      rotAngleRef,
      orbitDistRef,
      durationMs: ms,
    });
    frame(durationMs);
    const settle = () => {
      frame(0);
      if (opts?.restoreMotion) {
        unfreezeGraphNodes();
        setAmbientForce(true);
      }
      if (resumeRotate) autoRotateRef.current = true;
      cameraAnimTimerRef.current = null;
    };
    if (durationMs <= 0) settle();
    else cameraAnimTimerRef.current = setTimeout(settle, durationMs + 48);
  }, [clearCameraAnimTimer, unfreezeGraphNodes, setAmbientForce]);

  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // ── Stop rotation on any canvas interaction; parallax wheel zoom ─────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMouseDown = () => { pauseRotateForIdle(); };

    // Only hijack wheel for graph zoom when the pointer is over the WebGL canvas.
    // Nested UI (dialogs, drawers, sidebars, menus) must keep native mouse-wheel scroll.
    const onWheel = (e: WheelEvent) => {
      const overCanvas = e.composedPath().some(n => n instanceof HTMLCanvasElement);
      if (!overCanvas) return;

      e.preventDefault();
      pauseRotateForIdle();
      const raw = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      zoomVelRef.current += raw * 0.00055;
      zoomVelRef.current = Math.max(-0.18, Math.min(0.18, zoomVelRef.current));
    };

    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("wheel", onWheel);
    };
  }, [pauseRotateForIdle]);

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { createModeRef.current = createMode; }, [createMode]);
  // Keep a calm orbit under the Use Template catalog glass cards
  useEffect(() => {
    if (createMode === "template" && previewNodes.length === 0) {
      autoRotateRef.current = true;
      clearIdleRotateTimer();
    }
  }, [createMode, previewNodes.length, clearIdleRotateTimer]);

  // ── Base graph data (stable — built once; force graph mutates positions in-place) ──
  const baseGraphData = useMemo(() => {
    const rng = lcgRand(91827);
    const seeded = nodes.map(n => ({
      ...n,
      x: (n.x - CX) * SCALE,
      y: (rng() - 0.5) * (n.type === "object" ? 20 : n.type === "field" ? 60 : 80),
      z: (n.y - CY) * SCALE,
    }));
    let centroidX = 0;
    let centroidZ = 0;
    seeded.forEach(n => { centroidX += n.x; centroidZ += n.z; });
    centroidX /= seeded.length;
    centroidZ /= seeded.length;
    return {
      nodes: seeded.map(n => ({ ...n, x: n.x - centroidX, z: n.z - centroidZ })),
      links: edges.map(e => ({ id: e.id, source: e.from, target: e.to, type: e.type })),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Full graph data: base + dynamic (created) + live preview nodes ─────────────────────────────
  const graphData = useMemo(() => {
    const rngP = lcgRand(55555);
    const applyPatch = (n: any) => {
      const patch = nodePatches[n.id];
      return patch ? { ...n, ...patch } : n;
    };
    const pNodes = previewNodes.map(n => {
      const np = n as PanelPreviewNode & { x3d?: number; y3d?: number; z3d?: number };
      const x = np.x3d !== undefined ? np.x3d : (n.type === "object" ? 0 : (rngP() - 0.5) * 28);
      const y = np.y3d !== undefined ? np.y3d : (n.type === "object" ? 8 : (rngP() - 0.5) * 16);
      const z = np.z3d !== undefined ? np.z3d : (n.type === "object" ? 0 : (rngP() - 0.5) * 28);
      return { ...n, ...pos3(x, y, z) };
    });
    const pLinks = previewEdges.map(e => ({ id: e.id, source: e.from, target: e.to, type: e.type }));
    const isSoloHidden = (id: string) => Boolean(soloHideIds?.has(id));
    const dLinks = dynamicEdges
      .filter(e => !hiddenIds.has(e.from) && !hiddenIds.has(e.to) && !isSoloHidden(e.from) && !isSoloHidden(e.to))
      .map(e => ({ id: e.id, source: e.from, target: e.to, type: e.type }));
    const baseNodes = baseGraphData.nodes
      .filter((n: any) => !hiddenIds.has(n.id) && !isSoloHidden(n.id))
      .map(applyPatch);
    const baseLinks = baseGraphData.links.filter((l: any) => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      return !hiddenIds.has(s) && !hiddenIds.has(t) && !isSoloHidden(s) && !isSoloHidden(t);
    });
    const dyn = dynamicNodes.filter(n => !hiddenIds.has(n.id) && !isSoloHidden(n.id)).map(applyPatch);
    // During create/edit wizard, show only the live preview cluster so the new object is obvious
    if (createMode !== null && pNodes.length > 0) {
      return { nodes: pNodes, links: pLinks };
    }
    if (dyn.length === 0 && previewNodes.length === 0 && hiddenIds.size === 0 && Object.keys(nodePatches).length === 0) {
      return baseGraphData;
    }
    return {
      nodes: [...baseNodes, ...dyn, ...pNodes],
      links: [...baseLinks, ...dLinks, ...pLinks],
    };
  }, [baseGraphData, dynamicNodes, dynamicEdges, previewNodes, previewEdges, hiddenIds, nodePatches, createMode, soloHideIds]);

  useEffect(() => { graphDataRef.current = graphData; }, [graphData]);

  /** Frame an arbitrary set of graph nodes inside the visible canvas (chrome-aware). */
  const frameNodesInView = useCallback((
    nodes: any[],
    durationMs = 1100,
    opts?: {
      distMul?: number;
      lookYShift?: number;
      maxDist?: number;
      pad?: number;
      leftInset?: number;
      rightInset?: number;
      /** Squash depth when fitting so wide side-by-side fans aren't pushed too far away. */
      fitMode?: "sphere" | "width";
      /** Lock camera on +Z with a mild elevation (filter results face the viewer). */
      forceFrontView?: boolean;
    },
  ) => {
    const fg = fgRef.current;
    if (!fg || nodes.length === 0) return;
    clearCameraAnimTimer();
    autoRotateRef.current = false;
    freezeGraphNodes();
    setAmbientForce(false);

    let cx = 0, cy = 0, cz = 0;
    let counted = 0;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    nodes.forEach((n: any) => {
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y) || !Number.isFinite(n.z)) return;
      cx += n.x; cy += n.y; cz += n.z;
      counted += 1;
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
      minZ = Math.min(minZ, n.z); maxZ = Math.max(maxZ, n.z);
    });
    if (counted === 0) return;
    cx /= counted; cy /= counted; cz /= counted;

    const pad = opts?.pad ?? 1.35;
    const spanX = Math.max(24, (maxX - minX) * pad);
    const spanY = Math.max(24, (maxY - minY) * pad);
    const spanZ = Math.max(24, (maxZ - minZ) * pad);
    const fitMode = opts?.fitMode ?? "sphere";
    const maxR = fitMode === "width"
      ? Math.max(28, Math.max(spanX, spanY) * 0.52, spanZ * 0.35)
      : Math.max(28, Math.hypot(spanX, spanY, spanZ) * 0.55);

    const viewW = Math.max(1, dims.w - (opts?.leftInset ?? 0) - (opts?.rightInset ?? 0));
    const viewH = Math.max(1, dims.h - HEADER_H);
    const fov = 50 * Math.PI / 180;
    const fitDistH = (maxR) / Math.tan(fov / 2);
    const fitDistW = (maxR) / (Math.tan(fov / 2) * (viewW / viewH));
    const distMul = opts?.distMul ?? 1;
    const maxDist = opts?.maxDist ?? 720;
    const dist = Math.max(100, Math.min(maxDist, Math.max(fitDistH, fitDistW) * distMul + 40));

    const lookYShift = opts?.lookYShift ?? 0;
    const leftInset = opts?.leftInset ?? 0;
    const rightInset = opts?.rightInset ?? 0;
    // Shift look target so the cluster sits in the uncovered middle of the screen
    const canvasW = Math.max(1, dims.w - (createMode === null && selectedIdRef.current ? PROPS_PANEL_CHROME_PX : 0));
    const visibleCenterX = (leftInset + (canvasW - rightInset)) / 2;
    const ndcShift = ((visibleCenterX / canvasW) - 0.5) * 2;
    const worldShiftX = ndcShift * dist * Math.tan(fov / 2) * (canvasW / Math.max(1, viewH));

    const lookAt = { x: cx - worldShiftX * 0.35, y: cy + lookYShift, z: cz };
    let to: { x: number; y: number; z: number };
    if (opts?.forceFrontView) {
      // Performance-style: face the fan head-on with a soft elevated angle
      to = {
        x: lookAt.x,
        y: lookAt.y + Math.max(36, dist * 0.22),
        z: lookAt.z + dist,
      };
      rotAngleRef.current = 0;
    } else {
      const cam = fg.cameraPosition();
      const look = rotCenterRef.current;
      let dx = cam.x - look.x, dy = cam.y - look.y, dz = cam.z - look.z;
      let len = Math.hypot(dx, dy, dz);
      if (len < 1e-3) {
        dx = 0; dy = 0.25; dz = 1;
        len = Math.hypot(dx, dy, dz);
      }
      const ux = dx / len, uz = dz / len;
      to = {
        x: lookAt.x + ux * dist,
        y: lookAt.y + Math.max(28, dist * 0.2),
        z: lookAt.z + uz * dist,
      };
    }

    rotCenterRef.current = lookAt;
    orbitDistRef.current = Math.hypot(to.x - lookAt.x, to.y - lookAt.y, to.z - lookAt.z);
    fg.cameraPosition(to, lookAt, durationMs);
    cameraAnimTimerRef.current = setTimeout(() => {
      syncOrbitFromCamera();
      cameraAnimTimerRef.current = null;
    }, durationMs + 40);
  }, [dims.w, dims.h, createMode, setAmbientForce, freezeGraphNodes, clearCameraAnimTimer, syncOrbitFromCamera]);

  /** Parallax camera fly — cool the sim so the cluster stays put while framing. */
  const flyToClusterParallax = useCallback((nodeId: string, durationMs = 1100, opts?: { distMul?: number; lookYShift?: number }) => {
    const selNode = fullNodeMap.get(nodeId);
    const focusObjId = selNode
      ? (selNode.type === "object" ? selNode.id : (selNode.parentId ?? selNode.id))
      : nodeId;

    const cluster = graphDataRef.current.nodes.filter(
      (n: any) => n.id === focusObjId || n.parentId === focusObjId || n.id === nodeId
    );
    frameNodesInView(cluster, durationMs, opts);
  }, [fullNodeMap, frameNodesInView]);

  const filterCameraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearFilterCameraTimer = useCallback(() => {
    if (filterCameraTimerRef.current) {
      clearTimeout(filterCameraTimerRef.current);
      filterCameraTimerRef.current = null;
    }
  }, []);

  /** Frame a set of world positions so they fill the visible canvas (filter pack). */
  const framePositionsInView = useCallback((
    positions: FilterPos3[],
    durationMs = 700,
  ) => {
    const fg = fgRef.current;
    if (!fg || positions.length === 0) return;
    clearCameraAnimTimer();
    autoRotateRef.current = false;
    setAmbientForce(false);

    let cx = 0, cy = 0, cz = 0;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    positions.forEach(p => {
      cx += p.x; cy += p.y; cz += p.z;
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    });
    const n = positions.length;
    cx /= n; cy /= n; cz /= n;

    const leftInset = CHROME_INSET + EXPLORE_PANEL_W + 12;
    const viewW = Math.max(1, dims.w - leftInset);
    const viewH = Math.max(1, dims.h - HEADER_H);
    const fov = 50 * Math.PI / 180;
    // Pad so labels/halos aren't clipped; fillFactor pushes the board into most of the canvas
    const pad = 1.18;
    const spanX = Math.max(36, (maxX - minX) * pad);
    const spanY = Math.max(36, (maxY - minY) * pad);
    const fillFactor = 0.9;
    const distForW = (spanX / 2) / (Math.tan(fov / 2) * (viewW / viewH) * fillFactor);
    const distForH = (spanY / 2) / (Math.tan(fov / 2) * fillFactor);
    const elev = 0.2;
    const dist = Math.max(90, Math.min(340, Math.max(distForW, distForH) * Math.sqrt(1 + elev * elev) + 24));

    const lookAt = { x: cx, y: cy + 4, z: cz };
    const to = {
      x: lookAt.x,
      y: lookAt.y + dist * elev,
      z: lookAt.z + dist,
    };
    rotAngleRef.current = 0;
    rotCenterRef.current = lookAt;
    orbitDistRef.current = Math.hypot(to.x - lookAt.x, to.y - lookAt.y, to.z - lookAt.z);
    freezeGraphNodes();
    fg.cameraPosition(to, lookAt, durationMs);
    cameraAnimTimerRef.current = setTimeout(() => {
      syncOrbitFromCamera();
      cameraAnimTimerRef.current = null;
    }, durationMs + 40);
  }, [dims.w, dims.h, clearCameraAnimTimer, setAmbientForce, freezeGraphNodes, syncOrbitFromCamera]);

  const frameFilteredCluster = useCallback((objectIds: Set<string>, durationMs = 780) => {
    const nodes = graphDataRef.current.nodes.filter((n: any) => {
      if (n.type === "object") return objectIds.has(n.id);
      return Boolean(n.parentId && objectIds.has(n.parentId));
    });
    if (nodes.length === 0) return;
    const positions = nodes
      .filter((n: any) => Number.isFinite(n.x) && Number.isFinite(n.y) && Number.isFinite(n.z))
      .map((n: any) => ({ x: n.x as number, y: n.y as number, z: n.z as number }));
    framePositionsInView(positions, durationMs);
  }, [framePositionsInView]);

  /** Gather filtered nodes into a dense board that fills the canvas; lock auto-rotate. */
  const runFilterClusterIn = useCallback((objectIds: Set<string>) => {
    if (objectIds.size === 0) return;
    const fg = fgRef.current;
    clearFilterCameraTimer();
    filterLockRotateRef.current = true;
    autoRotateRef.current = false;
    clearIdleRotateTimer();
    setAmbientForce(false);
    focusLockUntilRef.current = Date.now() + 1600;
    try { fg?.d3AlphaTarget?.(0); } catch { /* engine may be mid-tick */ }

    const nodes = graphDataRef.current.nodes;
    if (filterHomePosRef.current.size === 0) {
      const homes = new Map<string, FilterPos3>();
      nodes.forEach((n: any) => {
        if (Number.isFinite(n.x) && Number.isFinite(n.y) && Number.isFinite(n.z)) {
          homes.set(n.id, { x: n.x, y: n.y, z: n.z });
        }
      });
      filterHomePosRef.current = homes;
    }

    const leftInset = CHROME_INSET + EXPLORE_PANEL_W + 12;
    const viewAspect = Math.max(0.9, (dims.w - leftInset) / Math.max(1, dims.h - HEADER_H));
    const targets = buildFilterClusterTargets(nodes, objectIds, viewAspect);
    if (targets.size === 0) return;

    const from = new Map<string, FilterPos3>();
    targets.forEach((pos, id) => {
      const n = nodes.find((node: any) => node.id === id);
      if (!n) return;
      from.set(id, {
        x: Number.isFinite(n.x) ? n.x : pos.x,
        y: Number.isFinite(n.y) ? n.y : pos.y,
        z: Number.isFinite(n.z) ? n.z : pos.z,
      });
      // Freeze at current spot before the gather lerp
      n.fx = n.x; n.fy = n.y; n.fz = n.z;
      n.vx = 0; n.vy = 0; n.vz = 0;
    });

    const duration = 720;
    filterAnimRef.current = {
      active: true,
      mode: "in",
      t0: performance.now(),
      duration,
      from,
      to: targets,
    };

    // Camera fits the TARGET board immediately — never the old scattered layout
    framePositionsInView(Array.from(targets.values()), 680);

    filterCameraTimerRef.current = setTimeout(() => {
      targets.forEach((pos, id) => {
        const n = graphDataRef.current.nodes.find((node: any) => node.id === id);
        if (!n) return;
        n.x = pos.x; n.y = pos.y; n.z = pos.z;
        n.fx = pos.x; n.fy = pos.y; n.fz = pos.z;
        n.vx = 0; n.vy = 0; n.vz = 0;
      });
      filterAnimRef.current = null;
      framePositionsInView(Array.from(targets.values()), 420);
      filterCameraTimerRef.current = null;
    }, duration + 30);
  }, [
    clearFilterCameraTimer,
    clearIdleRotateTimer,
    setAmbientForce,
    framePositionsInView,
    dims.w,
    dims.h,
  ]);

  /** Expand clustered nodes back to saved homes, then resume overview orbit. */
  const runFilterClusterOut = useCallback(() => {
    clearFilterCameraTimer();
    autoRotateRef.current = false;
    clearIdleRotateTimer();
    setAmbientForce(false);

    const homes = filterHomePosRef.current;
    const nodes = graphDataRef.current.nodes;

    if (homes.size === 0) {
      filterLockRotateRef.current = false;
      filterAnimRef.current = null;
      unfreezeGraphNodes();
      fitAllInView(700, { restoreMotion: true, resumeRotate: true });
      return;
    }

    const from = new Map<string, FilterPos3>();
    const to = new Map<string, FilterPos3>();
    homes.forEach((pos, id) => {
      const n = nodes.find((node: any) => node.id === id);
      if (!n) return;
      from.set(id, {
        x: Number.isFinite(n.x) ? n.x : pos.x,
        y: Number.isFinite(n.y) ? n.y : pos.y,
        z: Number.isFinite(n.z) ? n.z : pos.z,
      });
      to.set(id, pos);
      n.fx = n.x; n.fy = n.y; n.fz = n.z;
      n.vx = 0; n.vy = 0; n.vz = 0;
    });

    const duration = 920;
    filterAnimRef.current = {
      active: true,
      mode: "out",
      t0: performance.now(),
      duration,
      from,
      to,
    };

    filterCameraTimerRef.current = setTimeout(() => {
      // Snap finals, release freeze, restore overview + rotate
      to.forEach((pos, id) => {
        const n = graphDataRef.current.nodes.find((node: any) => node.id === id);
        if (!n) return;
        n.x = pos.x; n.y = pos.y; n.z = pos.z;
        delete n.fx; delete n.fy; delete n.fz;
      });
      filterAnimRef.current = null;
      filterHomePosRef.current = new Map();
      filterLockRotateRef.current = false;
      unfreezeGraphNodes();
      setAmbientForce(true);
      fitAllInView(750, { restoreMotion: true, resumeRotate: true });
      filterCameraTimerRef.current = null;
    }, duration + 40);
  }, [clearFilterCameraTimer, clearIdleRotateTimer, setAmbientForce, unfreezeGraphNodes, fitAllInView]);

  const releaseFocusMotion = useCallback(() => {
    // Keep nodes frozen until the return-to-overview camera settles — prevents layout jumps.
    setAmbientForce(false);
  }, [setAmbientForce]);

  // ── Connectivity ─────────────────────────────────────────────────────────────
  const { direct } = useMemo(
    () => getConnectivity(selectedId, [...edges, ...dynamicEdges], fullNodeMap),
    [selectedId, edges, dynamicEdges, fullNodeMap]
  );

  // ── Node color helper ────────────────────────────────────────────────────────
  const resolvedNodeColor = useCallback((n: GNode & { isPreview?: boolean }): string => {
    if (n.isPreview) return n.type === "object" ? "#8B92FF" : n.type === "layout" ? "#F6C453" : "#5EDDB5";
    // During suite arrival, keep new nodes vivid; soft-dim the existing world (still readable)
    if (arrivalActiveRef.current && arrivingIdsRef.current.size > 0) {
      if (arrivingIdsRef.current.has(n.id)) return baseNodeColor(graphColors, n);
      return activeTheme === "light" ? "#94A3B8" : "#3a3a48";
    }
    if (n.id === selectedId) {
      return n.type === "object" ? graphColors.objectBright : n.type === "field" ? graphColors.fieldLookup : graphColors.layoutBright;
    }
    if (n.id === hoveredId)  return n.type === "object" ? graphColors.objectBright : n.type === "field" ? graphColors.fieldLookup : graphColors.layoutBright;
    if (selectedId) {
      if (direct.has(n.id)) return baseNodeColor(graphColors, n);
      return activeTheme === "light" ? "#CBD5E1" : "#111111";
    }
    return baseNodeColor(graphColors, n);
  }, [selectedId, hoveredId, direct, graphColors, activeTheme]);

  // ── Update solid-sphere materials when selection changes ─────────────────────
  useEffect(() => {
    nodeMeshesRef.current.forEach((mesh, id) => {
      const n = fullNodeMap.get(id);
      if (!n) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.set(new THREE.Color(resolvedNodeColor(n)));
      mat.emissive.set(new THREE.Color(resolvedNodeColor(n)));
    });
  }, [selectedId, hoveredId, direct, fullNodeMap, resolvedNodeColor]);

  // ── Node Three.js object — solid spheres + crisp labels ─────────────────────
  const nodeThreeObj = useCallback((node: any) => {
    const n = node as GNode & { isPreview?: boolean };
    const isPreview = !!n.isPreview;
    const isArriving = arrivingIdsRef.current.has(n.id);
    const color = baseNodeColor(graphColors, n);
    const geo = SPHERE_GEO[n.type] ?? SPHERE_GEO.field;

    const arriveP = isArriving ? (arrivalProgressRef.current.get(n.id) ?? 0) : 0;
    const arriveSettled = isArriving && arriveP >= 0.95;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.38,
      metalness: 0.12,
      emissive: new THREE.Color(color),
      // Same resting material as home clusters (avoid “glowing oversized” new nodes)
      emissiveIntensity: isPreview ? 0.18 : arriveSettled ? 0.1 : 0.1,
      transparent: isPreview || (isArriving && !arriveSettled),
      opacity: isPreview ? 0.85 : arriveSettled ? 1 : isArriving ? 0 : 1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 1;
    (mesh as any).__baseNodeScale = 1;
    // Always start at home scale — never leave arriving nodes visually larger
    mesh.scale.set(1, 1, 1);
    if (isArriving) {
      if (!arriveSettled) {
        mat.transparent = true;
        mat.opacity = arriveP > 0 ? Math.min(1, 0.2 + arriveP * 0.8) : 0;
        mat.emissiveIntensity = 0.14;
      }
      arrivingMeshesRef.current.set(n.id, mesh);
    }

    if (isPreview) previewMeshesRef.current.set(n.id, mesh);
    nodeMeshesRef.current.set(n.id, mesh);

    const group = new THREE.Group();
    group.add(mesh);

    // Match home graph label sizes — arriving nodes must not look oversized
    const fontSize = n.type === "object" ? 15 : 11;
    const label = makeLabel(
      n.label,
      getGraphLabelColor(graphColors, n.type, activeTheme),
      fontSize,
      labelStyle,
    );
    const radius = n.type === "object" ? 6.2 : n.type === "field" ? 2.9 : 2.2;
    label.position.set(0, -(radius + (n.type === "object" ? 5.2 : 4.0)), 0);
    if (isArriving && !arriveSettled) (label.material as THREE.SpriteMaterial).opacity = 0;
    labelSpritesRef.current.set(n.id, label);
    group.add(label);

    return group;
  }, [graphColors, activeTheme, labelStyle]);

  // ── Node sphere color (updates reactively for the underlying mesh) ───────────
  const nodeColorFn = useCallback((node: any) => resolvedNodeColor(node as GNode), [resolvedNodeColor]);

  // ── Node val — theme sizing ──────────────────────────────────────────────────
  const nodeValFn = useCallback((node: any) => {
    const n = node as GNode & { isPreview?: boolean };
    if (n.isPreview) return n.type === "object" ? 10 : n.type === "field" ? 2 : 1;
    const sel = n.id === selectedId;
    return n.type === "object" ? (sel ? 12 : 10) : n.type === "field" ? (sel ? 2.4 : 2) : (sel ? 1.3 : 1);
  }, [selectedId]);

  // Keep labels crisp (never inflate bitmaps) and type-colored
  useEffect(() => {
    labelSpritesRef.current.forEach((label, id) => {
      const n = fullNodeMap.get(id);
      if (!n) return;
      const base = (label as any).__baseScale as { x: number; y: number } | undefined;
      if (!base) return;
      label.scale.set(base.x, base.y, 1);
      // Don't force-show labels that are still waiting in the solo arrival sequence
      if (arrivalActiveRef.current && arrivingIdsRef.current.has(id)) {
        const p = arrivalProgressRef.current.get(id) ?? 0;
        if (p < 0.95) return;
      }
      (label.material as THREE.SpriteMaterial).opacity = 1;
    });
  }, [selectedId, fullNodeMap]);

  /** Resolve object ids for a filter snapshot (null = no filter / show all) */
  const resolveFilteredObjectIds = useCallback((filter: ObjectsFilterState) => {
    if (!isObjectsFilterActive(filter)) return null as Set<string> | null;
    const all = Array.from(fullNodeMap.values());
    const isSoloHidden = (id: string) => Boolean(soloHideIds?.has(id));
    const isUserCreated = (id: string) => dynNodeMap.has(id) || id.startsWith("created_");
    const hasAnyUserCreated = all.some(n => n.type === "object" && isUserCreated(n.id) && !isSoloHidden(n.id));
    const seedRecentCutoff = Math.max(0, OBJECTS.length - 8); // newest 8 seed objects when no session creates
    const ids = new Set<string>();
    all.forEach(n => {
      if (n.type !== "object" || isSoloHidden(n.id)) return;
      const fields = all.filter(f => f.type === "field" && f.parentId === n.id && !isSoloHidden(f.id));
      const layoutCount = all.filter(l => l.type === "layout" && l.parentId === n.id && !isSoloHidden(l.id)).length;
      const relationshipCount = fields.filter(f =>
        f.fieldType === "Lookup" || f.fieldType === "Master Details" || f.fieldType === "Record Association",
      ).length;
      if (filter.recentOnly) {
        if (hasAnyUserCreated) {
          if (!isUserCreated(n.id)) return;
        } else {
          const seedIdx = OBJECTS.findIndex(o => o.id === n.id);
          if (seedIdx < seedRecentCutoff) return;
        }
      }
      if (filter.objectType && (n.objectType || "Object") !== filter.objectType) return;
      if (filter.hasRelationships && relationshipCount === 0) return;
      if (filter.hasLayouts && layoutCount === 0) return;
      ids.add(n.id);
    });
    return ids;
  }, [fullNodeMap, soloHideIds, dynNodeMap]);

  /** Object ids that pass the applied filter (null = no filter / show all) */
  const filteredObjectIdSet = useMemo(
    () => resolveFilteredObjectIds(objectsFilterApplied),
    [resolveFilteredObjectIds, objectsFilterApplied],
  );

  // ── Node visibility — isolation mode when a node is selected ────────────────
  const nodeVisibilityFn = useCallback((node: any) => {
    const n = node as GNode;
    // During suite arrival, keep the full graph visible so the new cluster can be seen joining
    if (!arrivalActiveRef.current && selectedId) {
      const selNode = fullNodeMap.get(selectedId);
      if (selNode) {
        const focusObjId = selNode.type === "object" ? selNode.id : (selNode.parentId ?? selNode.id);
        return n.id === focusObjId || n.parentId === focusObjId;
      }
    }
    if (n.type === "field"  && !visibility.fields)  return false;
    if (n.type === "layout" && !visibility.layouts) return false;
    if (n.type === "object" && !visibility.objects) return false;
    if (filteredObjectIdSet) {
      if (n.type === "object") return filteredObjectIdSet.has(n.id);
      if (n.parentId) return filteredObjectIdSet.has(n.parentId);
    }
    return true;
  }, [selectedId, fullNodeMap, visibility, filteredObjectIdSet]);

  // ── Link color ───────────────────────────────────────────────────────────────
  const linkColorFn = useCallback((link: any) => {
    const from = typeof link.source === "object" ? link.source?.id : link.source;
    const to   = typeof link.target === "object" ? link.target?.id : link.target;
    if (String(from).startsWith("__preview") || String(to).startsWith("__preview") || String(from).startsWith("__tpl_") || String(to).startsWith("__tpl_")) {
      return `${graphColors.object}77`;
    }
    if (!selectedId) {
      return link.type === "obj-obj" ? `${graphColors.object}88` : link.type === "field-field" ? `${graphColors.field}77` : `${graphColors.layout}66`;
    }
    if (from === selectedId || to === selectedId) {
      return link.type === "obj-obj" ? `${graphColors.objectBright}` : link.type === "obj-layout" ? `${graphColors.layoutBright}` : `${graphColors.fieldLookup}`;
    }
    if (direct.has(from) || direct.has(to)) return link.type === "obj-obj" ? `${graphColors.object}88` : `${graphColors.field}66`;
    return activeTheme === "light" ? "#94A3B8" : "#2a2a2a";
  }, [selectedId, direct, graphColors, activeTheme]);

  // ── Link width ───────────────────────────────────────────────────────────────
  const linkWidthFn = useCallback((link: any) => {
    const from = typeof link.source === "object" ? link.source?.id : link.source;
    const to   = typeof link.target === "object" ? link.target?.id : link.target;
    if (String(from).startsWith("__preview") || String(to).startsWith("__preview") || String(from).startsWith("__tpl_") || String(to).startsWith("__tpl_")) return 0.6;
    // Match home cluster line weight (close zoom used to make 1.2+particles look like fat ribbons)
    if (!selectedId) return link.type === "obj-obj" ? 0.7 : 0.35;
    if (from === selectedId || to === selectedId) return link.type === "obj-obj" ? 1.0 : 0.7;
    return 0.15;
  }, [selectedId, direct]);

  // ── Link visibility — isolation mode hides cross-cluster links ───────────────
  const linkVisibilityFn = useCallback((link: any) => {
    if (!arrivalActiveRef.current && selectedId) {
      const selNode = fullNodeMap.get(selectedId);
      if (selNode) {
        const focusObjId = selNode.type === "object" ? selNode.id : (selNode.parentId ?? selNode.id);
        const from = typeof link.source === "object" ? link.source?.id : link.source;
        const to   = typeof link.target === "object" ? link.target?.id : link.target;
        const fromNode = fullNodeMap.get(from);
        const toNode   = fullNodeMap.get(to);
        const fromIn = fromNode && (fromNode.id === focusObjId || fromNode.parentId === focusObjId);
        const toIn   = toNode   && (toNode.id   === focusObjId || toNode.parentId   === focusObjId);
        return !!(fromIn && toIn);
      }
    }
    if ((link.type === "obj-field" || link.type === "field-field") && !visibility.fields)  return false;
    if (link.type === "obj-layout" && !visibility.layouts) return false;
    if (filteredObjectIdSet) {
      const from = typeof link.source === "object" ? link.source?.id : link.source;
      const to   = typeof link.target === "object" ? link.target?.id : link.target;
      const fromNode = fullNodeMap.get(String(from));
      const toNode   = fullNodeMap.get(String(to));
      const fromObj = fromNode?.type === "object" ? fromNode.id : fromNode?.parentId;
      const toObj   = toNode?.type === "object" ? toNode.id : toNode?.parentId;
      if (fromObj && !filteredObjectIdSet.has(fromObj)) return false;
      if (toObj && !filteredObjectIdSet.has(toObj)) return false;
    }
    return true;
  }, [selectedId, fullNodeMap, visibility, filteredObjectIdSet]);

  // ── Particles ─────────────────────────────────────────────────────────────────
  const linkParticlesFn = useCallback((link: any) => {
    // Filtered focus view — no traveling sprinkles competing with structure
    if (filteredObjectIdSet) return 0;
    if (link.type === "obj-obj") return 2;
    if (link.type === "obj-field" || link.type === "obj-layout") return selectedId ? 2 : 1;
    const from = typeof link.source === "object" ? link.source?.id : link.source;
    const to   = typeof link.target === "object" ? link.target?.id : link.target;
    if (link.type === "field-field" && (from === selectedId || to === selectedId)) return 2;
    return 0;
  }, [selectedId, filteredObjectIdSet]);

  const linkParticleColorFn = useCallback((link: any) => {
    const from = typeof link.source === "object" ? link.source?.id : link.source;
    const to   = typeof link.target === "object" ? link.target?.id : link.target;
    return (from === selectedId || to === selectedId) ? "#FFFFFF" : graphColors.objectBright;
  }, [selectedId, graphColors]);

  const linkParticleWidthFn = useCallback((_link: any) => 1.2, []);

  // ── Stars + force tuning after engine initializes ────────────────────────────
  const handleEngineStop = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;

    if ((fg as any).__sceneSetup) {
      // Keep ForceAtlas-style simmer when nothing is focused —
      // but never reheat during / right after suite arrival (reads as a second load)
      // or while a filter pack is locked in place
      if (
        !selectedIdRef.current
        && !arrivalActiveRef.current
        && !filterLockRotateRef.current
        && Date.now() >= focusLockUntilRef.current
      ) {
        setAmbientForce(true);
      }
      return;
    }
    (fg as any).__sceneSetup = true;

    // Disable OrbitControls' built-in zoom — we handle it with parallax inertia
    try {
      const controls = fg.controls() as any;
      if (controls) controls.enableZoom = false;
    } catch (_) { /* controls may not be ready yet — safe to ignore */ }

    const scene = fg.scene() as THREE.Scene;
    if (!(fg as any).__lightsAdded) {
      (fg as any).__lightsAdded = true;
      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      const key = new THREE.DirectionalLight(0xffffff, 0.9);
      key.position.set(60, 120, 80);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xa5b4fc, 0.35);
      fill.position.set(-80, 40, -60);
      scene.add(fill);
    }

    // 3D star field
    const count = 12000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 600 + Math.random() * 1400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const isLight = !document.documentElement.classList.contains("dark");
    const opacity = isLight ? 0 : 0.65;
    const size = isLight ? 0 : 0.7;
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff, size, sizeAttenuation: true, transparent: true, opacity,
    });
    const stars = new THREE.Points(geo, starMat);
    stars.visible = opacity > 0 && size > 0;
    starfieldRef.current = stars;
    scene.add(stars);

    // Tune d3-force for ForceAtlas-like semantic clustering
    const link = fg.d3Force("link");
    if (link) link.distance((l: any) => {
      switch (l.type) {
        case "obj-obj":    return 110;
        case "obj-field":  return 60;
        case "obj-layout": return 65;
        case "field-field":return 90;
        default:           return 70;
      }
    });
    const charge = fg.d3Force("charge");
    if (charge) charge.strength(-260);

    // Frame nominal overview once — fixed distance (stable across reloads); no zoomToFit jitter
    autoRotateRef.current = false;
    const viewH = Math.max(1, window.innerHeight - HEADER_H);
    applyNominalOverview(fg, {
      nodes: graphDataRef.current.nodes,
      viewH,
      rotCenterRef,
      rotAngleRef,
      orbitDistRef,
      durationMs: 0,
    });
    setTimeout(() => {
      // Re-center on settled layout centroid at the same nominal distance
      if (selectedIdRef.current) return;
      applyNominalOverview(fg, {
        nodes: graphDataRef.current.nodes,
        viewH: Math.max(1, window.innerHeight - HEADER_H),
        rotCenterRef,
        rotAngleRef,
        orbitDistRef,
        durationMs: 500,
      });
      autoRotateRef.current = true;
      setAmbientForce(true);
    }, 900);
  }, [setAmbientForce]);

  // Hide star-sprinkles while a filter is applied (empty space should stay quiet)
  useEffect(() => {
    const sf = starfieldRef.current;
    if (!sf) return;
    const isLight = activeTheme === "light";
    if (filteredObjectIdSet || isLight) {
      sf.visible = false;
    } else {
      const mat = sf.material as THREE.PointsMaterial;
      mat.opacity = 0.65;
      mat.size = 0.7;
      sf.visible = true;
      mat.needsUpdate = true;
    }
  }, [filteredObjectIdSet, activeTheme]);

  // ── Sync graph canvas + starfield + labels when theme changes ────────────────
  useLayoutEffect(() => {
    const isLight = activeTheme === "light";
    const fg = fgRef.current;
    if (fg) {
      try {
        const renderer = fg.renderer();
        if (renderer) renderer.setClearColor(new THREE.Color(graphBg));
      } catch { /* renderer may not be ready */ }
    }
    const sf = starfieldRef.current;
    if (sf) {
      const mat = sf.material as THREE.PointsMaterial;
      mat.opacity = isLight ? 0 : 0.65;
      mat.size = isLight ? 0 : 0.7;
      // Keep stars off under an active filter even when theme flips
      sf.visible = !isLight && !filterLockRotateRef.current;
      mat.needsUpdate = true;
    }
    nodeMeshesRef.current.forEach((mesh, id) => {
      const n = fullNodeMap.get(id);
      if (!n) return;
      const col = resolvedNodeColor(n);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.set(new THREE.Color(col));
      mat.emissive.set(new THREE.Color(col));
    });
    labelSpritesRef.current.forEach((oldLabel, id) => {
      const n = fullNodeMap.get(id);
      if (!n || !oldLabel.parent) return;
      const fontSize = n.type === "object" ? 15 : 11;
      const neu = makeLabel(
        n.label,
        getGraphLabelColor(graphColors, n.type, activeTheme),
        fontSize,
        labelStyle,
      );
      neu.position.copy(oldLabel.position);
      oldLabel.parent.add(neu);
      oldLabel.parent.remove(oldLabel);
      const map = (oldLabel.material as THREE.SpriteMaterial).map;
      (oldLabel.material as THREE.SpriteMaterial).dispose();
      map?.dispose();
      labelSpritesRef.current.set(id, neu);
    });
  }, [activeTheme, graphBg, graphColors, labelStyle, fullNodeMap, resolvedNodeColor]);

  // ── Sync preview mesh map with current preview node ids ────────────────────
  useEffect(() => {
    const currentIds = new Set(previewNodes.map(n => n.id));
    previewMeshesRef.current.forEach((_, id) => {
      if (!currentIds.has(id)) previewMeshesRef.current.delete(id);
    });
  }, [previewNodes]);

  // Gentle reheat when preview nodes enter so they join the ForceAtlas motion
  useEffect(() => {
    if (previewNodes.length === 0) return;
    const t = setTimeout(() => {
      unfreezeGraphNodes();
      setAmbientForce(true);
    }, 60);
    return () => clearTimeout(t);
  }, [previewNodes.length, unfreezeGraphNodes, setAmbientForce]);

  // Frame the live preview cluster so object/fields stay visible behind create flows
  useEffect(() => {
    if (createMode === null || previewNodes.length === 0) return;
    const objs = previewNodes.filter(n => n.type === "object");
    if (objs.length === 0) return;
    autoRotateRef.current = false;
    const t = setTimeout(() => {
      const preview = graphDataRef.current.nodes.filter((n: any) => n.isPreview && Number.isFinite(n.x));
      if (createMode === "ai" && preview.length > 0) {
        preview.forEach((n: any) => {
          n.fx = n.x; n.fy = n.y; n.fz = n.z;
          n.vx = 0; n.vy = 0; n.vz = 0;
        });
        frameNodesInView(preview, 700, {
          distMul: 1.05,
          lookYShift: -4,
          maxDist: 780,
          pad: 1.55,
          leftInset: 300,
          rightInset: 360,
        });
        return;
      }
      flyToClusterParallax(objs[0].id, 700, { distMul: 1.25, lookYShift: -6 });
    }, 140);
    return () => clearTimeout(t);
  }, [createMode, previewNodes.length, flyToClusterParallax, frameNodesInView]);

  // ── Animation loop: auto-rotation + parallax zoom + preview pulse ────────────
  useEffect(() => {
    let raf: number;
    const MIN_DIST = 40, MAX_DIST = 1800;

    const tick = () => {
      const fg = fgRef.current;

      // Auto-rotation — orbits at the calm overview distance set on landing / fit
      // Use Template catalog keeps a slower orbit so glass cards stay easy to read
      // Filtered results stay locked (no rotate) until Clear all restores overview
      if (autoRotateRef.current && !filterLockRotateRef.current && fg) {
        rotAngleRef.current += createModeRef.current === "template"
          ? TEMPLATE_CATALOG_ROTATE_STEP
          : AUTO_ROTATE_STEP;
        const a = rotAngleRef.current;
        const c = rotCenterRef.current;
        const dist = orbitDistRef.current;
        const elev = Math.max(40, dist * 0.13);
        fg.cameraPosition(
          { x: c.x + dist * Math.sin(a), y: c.y + elev, z: c.z + dist * Math.cos(a) },
          { x: c.x, y: c.y, z: c.z },
          0
        );
      }

      // Parallax zoom — scale camera distance relative to orbit center
      if (Math.abs(zoomVelRef.current) > 0.0001 && fg) {
        const look = rotCenterRef.current;
        const p = fg.cameraPosition();
        const dx = p.x - look.x;
        const dy = p.y - look.y;
        const dz = p.z - look.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > 1e-4) {
          const newDist = Math.max(MIN_DIST, Math.min(MAX_DIST, dist * (1 + zoomVelRef.current)));
          const sc = newDist / dist;
          orbitDistRef.current = newDist;
          fg.cameraPosition(
            { x: look.x + dx * sc, y: look.y + dy * sc, z: look.z + dz * sc },
            { x: look.x, y: look.y, z: look.z },
            0,
          );
        }
        zoomVelRef.current *= 0.72;
        if (Math.abs(zoomVelRef.current) < 0.0001) zoomVelRef.current = 0;
      }

      // Filter cluster pack / unpack — keep nodes frozen on interpolated fx/fy/fz
      const filterAnim = filterAnimRef.current;
      if (filterAnim?.active) {
        const raw = Math.min(1, (performance.now() - filterAnim.t0) / filterAnim.duration);
        const u = easeInOutCubic(raw);
        filterAnim.to.forEach((to, id) => {
          const from = filterAnim.from.get(id);
          if (!from) return;
          const live = graphDataRef.current.nodes.find((n: any) => n.id === id);
          if (!live) return;
          live.x = from.x + (to.x - from.x) * u;
          live.y = from.y + (to.y - from.y) * u;
          live.z = from.z + (to.z - from.z) * u;
          live.fx = live.x;
          live.fy = live.y;
          live.fz = live.z;
          live.vx = 0;
          live.vy = 0;
          live.vz = 0;
        });
        if (raw >= 1) {
          filterAnim.active = false;
        }
      }

      // Pulse preview meshes
      if (previewMeshesRef.current.size > 0) {
        const pulse = 0.92 + 0.08 * Math.sin(Date.now() * 0.0028);
        previewMeshesRef.current.forEach(mesh => {
          mesh.scale.set(pulse, pulse, pulse);
        });
      }

      // Newly deployed suite — docks into space (travel + settle), not a blink fade
      if (arrivingMeshesRef.current.size > 0) {
        if (arrivalMotionPhaseRef.current === "bloom") {
          arrivalBloomRef.current = Math.min(1, arrivalBloomRef.current + 0.022);
        }

        arrivingMeshesRef.current.forEach((mesh, id) => {
          const home = arrivalHomeRef.current.get(id);
          const spawn = arrivalSpawnRef.current.get(id) ?? home;
          const live = graphDataRef.current.nodes.find((n: any) => n.id === id);
          const label = labelSpritesRef.current.get(id);
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.transparent = true;

          if (!home) return;

          if (!arrivalProgressRef.current.has(id)) {
            if (live && spawn) {
              live.x = spawn.x; live.y = spawn.y; live.z = spawn.z;
              live.fx = spawn.x; live.fy = spawn.y; live.fz = spawn.z;
            }
            mesh.scale.set(0.92, 0.92, 0.92);
            mat.opacity = 0;
            mat.emissiveIntensity = 0.14;
            if (label) (label.material as THREE.SpriteMaterial).opacity = 0;
            return;
          }

          const stagger = arrivalStaggerMsRef.current.get(id) ?? 0;
          const unlockedFor = Date.now() - arrivalUnlockAtRef.current;
          if (unlockedFor < stagger) {
            if (live && spawn) {
              live.x = spawn.x; live.y = spawn.y; live.z = spawn.z;
              live.fx = spawn.x; live.fy = spawn.y; live.fz = spawn.z;
            }
            mesh.scale.set(0.92, 0.92, 0.92);
            mat.opacity = 0.15;
            mat.emissiveIntensity = 0.16;
            if (label) (label.material as THREE.SpriteMaterial).opacity = 0;
            return;
          }

          let p = arrivalProgressRef.current.get(id) ?? 0;
          if (p < 1) {
            // Smooth dock — slightly slower so appear reads once, clearly
            p = Math.min(1, p + 0.009);
            arrivalProgressRef.current.set(id, p);
          }
          // Soft ease-out-back: gentle overshoot then settle
          const c1 = 1.45;
          const c3 = c1 + 1;
          const back = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
          const t = Math.max(0, Math.min(1.08, back));
          // Soft lateral swing that decays quickly
          const swing = Math.sin(p * Math.PI * 2.1) * (1 - p) * (1 - p) * 10;
          const dx = home.x - spawn.x;
          const dy = home.y - spawn.y;
          const dz = home.z - spawn.z;
          const len = Math.hypot(dx, dz) || 1;
          const sideX = -dz / len;
          const sideZ = dx / len;
          if (live && spawn) {
            live.x = spawn.x + dx * t + sideX * swing;
            live.y = spawn.y + dy * t;
            live.z = spawn.z + dz * t + sideZ * swing;
            live.fx = live.x; live.fy = live.y; live.fz = live.z;
            live.vx = 0; live.vy = 0; live.vz = 0;
          }
          // Scale bloom: compact → full with a soft pop
          const s = 0.62 + 0.38 * Math.min(1, p * 1.08);
          mesh.scale.set(s, s, s);
          mat.opacity = Math.min(1, 0.12 + p * 0.95);
          mat.emissiveIntensity = 0.22 - 0.12 * Math.min(1, p);
          if (label) (label.material as THREE.SpriteMaterial).opacity = Math.min(1, Math.max(0, (p - 0.18) * 1.35));
          if (p >= 1) {
            if (live) {
              live.x = home.x; live.y = home.y; live.z = home.z;
              live.fx = home.x; live.fy = home.y; live.fz = home.z;
            }
            mesh.scale.set(1, 1, 1);
            mat.transparent = false;
            mat.opacity = 1;
            mat.emissiveIntensity = 0.1;
          }
        });
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Interaction handlers ──────────────────────────────────────────────────────
  const handleNodeClick = useCallback((node: any) => {
    pauseRotateForIdle();
    const n = node as GNode;
    const isDeselect = selectedId === n.id;
    setShowGuide(false);
    if (isDeselect) {
      setSelectedId(null);
      releaseFocusMotion();
      if (filterLockRotateRef.current && filteredObjectIdSet && filteredObjectIdSet.size > 0) {
        frameFilteredCluster(filteredObjectIdSet, 700);
      } else {
        fitAllInView(700, { restoreMotion: true, resumeRotate: false });
      }
      pauseRotateForIdle();
      return;
    }
    setSelectedId(n.id);
    // Wait a frame so isolation visibility updates, then parallax-frame the cluster
    clearCameraAnimTimer();
    cameraAnimTimerRef.current = setTimeout(() => {
      flyToClusterParallax(n.id, 900, { distMul: 0.72 });
    }, 50);
  }, [selectedId, flyToClusterParallax, releaseFocusMotion, fitAllInView, clearCameraAnimTimer, pauseRotateForIdle, filteredObjectIdSet, frameFilteredCluster]);

  const handleNodeHover = useCallback((node: any | null) => {
    setHoveredId(node ? node.id : null);
  }, []);

  const handleBgClick = useCallback(() => {
    pauseRotateForIdle();
    if (!selectedIdRef.current) return;
    setSelectedId(null);
    releaseFocusMotion();
    if (filterLockRotateRef.current && filteredObjectIdSet && filteredObjectIdSet.size > 0) {
      frameFilteredCluster(filteredObjectIdSet, 700);
    } else {
      fitAllInView(700, { restoreMotion: true, resumeRotate: false });
    }
    pauseRotateForIdle();
  }, [releaseFocusMotion, fitAllInView, pauseRotateForIdle, filteredObjectIdSet, frameFilteredCluster]);

  // ── Create panel callbacks ────────────────────────────────────────────────────
  const handlePanelClose = useCallback(() => {
    setCreateMode(null);
    setEditDraft(null);
    setPreviewNodes([]);
    setPreviewEdges([]);
    previewSpawnRef.current = null;
  }, []);

  const handleEditObject = useCallback((objectId: string) => {
    const obj = fullNodeMap.get(objectId);
    if (!obj || obj.type !== "object") return;
    const objFields = Array.from(fullNodeMap.values())
      .filter(n => n.parentId === objectId && n.type === "field");
    const primaryIdx = Math.max(0, objFields.findIndex(f => f.isPrimary));
    const fields = objFields.map((f, i) => ({
      id: f.id,
      label: f.label,
      fieldType: f.fieldType ?? "Text",
      required: Boolean(f.required),
      starred: Boolean(f.starred),
      tracked: Boolean(f.tracked),
      isPrimary: f.isPrimary ?? i === primaryIdx,
      relatedObjectId: f.relatedObjectId,
    }));
    setEditDraft({
      editId: objectId,
      name: obj.objectApiName ?? slugObjectName(obj.label),
      title: obj.label,
      description: obj.description ?? "",
      objectType: obj.objectType,
      fields,
      objectSettings: obj.objectSettings,
    });
    setSelectedId(null);
    releaseFocusMotion();
    setCreateMode("manual");
    autoRotateRef.current = false;
  }, [fullNodeMap, releaseFocusMotion]);

  const handleObjectCreated = useCallback((obj: any) => {
    // ── Edit existing object (update details + replace fields) ───────────────
    if (obj.editId) {
      const oid = obj.editId as string;
      const patch = {
        label: (obj.title as string) || (obj.name as string),
        description: obj.description as string | undefined,
        objectType: obj.objectType as string | undefined,
        lifecycleStatus: "Deployed" as const,
        objectSettings: obj.objectSettings as ObjectSettings | undefined,
      };
      setNodePatches(prev => ({ ...prev, [oid]: { ...prev[oid], ...patch } }));

      const oldFieldIds = Array.from(fullNodeMap.values())
        .filter(n => n.parentId === oid && n.type === "field")
        .map(n => n.id);
      const oldFieldSet = new Set(oldFieldIds);

      setHiddenIds(prev => {
        const next = new Set(prev);
        oldFieldIds.forEach(id => next.add(id));
        return next;
      });

      const parentLive = graphDataRef.current.nodes.find((n: any) => n.id === oid);
      const ox = parentLive?.x ?? 0, oy = parentLive?.y ?? 0, oz = parentLive?.z ?? 0;
      const fields: any[] = obj.fields ?? [];
      const newFieldNodes: DynNode[] = fields.map((f: any, i: number) => {
        const fid = `${oid}_edit_f${Date.now()}_${i}`;
        const pos = childOrbit(ox, oy, oz, i, Math.max(fields.length, 1), 18);
        return {
          id: fid, type: "field" as const, label: f.label, ...pos, parentId: oid,
          fieldType: f.fieldType ?? f.type, required: f.required,
          starred: Boolean(f.starred), tracked: Boolean(f.tracked), isPrimary: Boolean(f.isPrimary),
          relatedObjectId: f.relatedObjectId,
        };
      });
      const newFieldEdges: GEdge[] = newFieldNodes.map(fn => ({
        id: `e_${fn.id}`, from: oid, to: fn.id, type: "obj-field" as EdgeType,
      }));
      appendRelationshipEdges(oid, fields, newFieldEdges);

      setDynamicNodes(prev => [
        ...prev
          .filter(n => !(n.parentId === oid && n.type === "field") && !oldFieldSet.has(n.id))
          .map(n => (n.id === oid ? { ...n, ...patch } : n)),
        ...newFieldNodes,
      ]);
      setDynamicEdges(prev => [
        ...prev.filter(e =>
          !oldFieldSet.has(e.from) && !oldFieldSet.has(e.to)
          && !(e.type === "obj-obj" && e.from === oid),
        ),
        ...newFieldEdges,
      ]);

      previewSpawnRef.current = null;
      setPreviewNodes([]);
      setPreviewEdges([]);
      // Keep editDraft until wizard onClose so the wizard is not remounted mid-success

      autoRotateRef.current = false;
      setSelectedId(oid);
      setShowGuide(false);
      pendingFocusIdRef.current = oid;
      setTimeout(() => {
        const ids = new Set([oid, ...newFieldNodes.map(n => n.id)]);
        graphDataRef.current.nodes.forEach((n: any) => {
          if (!ids.has(n.id) || !Number.isFinite(n.x)) return;
          n.fx = n.x;
          n.fy = n.y;
          n.fz = n.z;
        });
        setAmbientForce(false);
        flyToClusterParallax(oid, 900);
      }, 80);
      return;
    }

    const ts = Date.now();
    const newDynNodes: DynNode[] = [];
    const newDynEdges: GEdge[] = [];
    let firstObjId = `created_${ts}`;

    const previewLive = (graphDataRef.current.nodes as any[]).filter((n: any) => n.isPreview);
    const previewObjects = previewLive.filter((n: any) => n.type === "object");
    const previewByParent = (parentPreviewId: string | undefined, type: NodeType) =>
      previewLive.filter((n: any) => n.type === type && n.parentId === parentPreviewId);

    const livePos = (node: any | undefined, fallback: { x: number; y: number; z: number }) => {
      if (node && Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.z)) {
        return pos3(node.x, node.y, node.z);
      }
      return pos3(fallback.x, fallback.y, fallback.z);
    };

    const appendChildren = (
      oid: string,
      origin: { x: number; y: number; z: number },
      fields: any[],
      layouts: any[],
      _fieldPreview: any[],
      _layoutPreview: any[],
      resolveRelatedId?: (raw: string | undefined) => string | undefined,
    ) => {
      // Deterministic per-object jitter so each mini-cluster feels home-like, not stamped
      const rng = lcgRand((oid.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 9973) >>> 0);
      // Home field ring = 210 * SCALE ≈ 15
      const fieldR = 15;
      fields.forEach((f: any, i: number) => {
        const fid = `${oid}_f${i}`;
        const pos = fieldOrbitHome(origin.x, origin.y, origin.z, i, Math.max(fields.length, 1), fieldR, rng);
        const relatedRaw = f.relatedObjectId as string | undefined;
        const relatedObjectId = resolveRelatedId ? resolveRelatedId(relatedRaw) : relatedRaw;
        newDynNodes.push({
          id: fid, type: "field", label: f.label, ...pos, parentId: oid,
          fieldType: f.fieldType ?? f.type, required: f.required,
          starred: Boolean(f.starred), tracked: Boolean(f.tracked), isPrimary: Boolean(f.isPrimary),
          relatedObjectId,
        });
        newDynEdges.push({ id: `${oid}_e${i}`, from: oid, to: fid, type: "obj-field" });
        if (relatedObjectId && relatedObjectId !== oid) {
          newDynEdges.push({
            id: `ff_${fid}_${relatedObjectId}`,
            from: fid,
            to: relatedObjectId,
            type: "field-field" as EdgeType,
          });
        }
      });
      const relFields = fields.map((f: any) => ({
        ...f,
        relatedObjectId: resolveRelatedId
          ? resolveRelatedId(f.relatedObjectId as string | undefined)
          : f.relatedObjectId,
      }));
      appendRelationshipEdges(oid, relFields, newDynEdges);
      const layoutR = Math.max(17, 15.5 + Math.min(layouts.length, 4));
      layouts.forEach((l: any, i: number) => {
        const lid = `${oid}_l${i}`;
        const pos = fieldOrbitHome(
          origin.x, origin.y, origin.z,
          i, Math.max(layouts.length, 1), layoutR, rng,
          { startAngle: Math.PI },
        );
        newDynNodes.push({
          id: lid, type: "layout", label: l.label, ...pos, parentId: oid,
          layoutType: l.layoutType ?? l.type,
        });
        newDynEdges.push({ id: `${oid}_le${i}`, from: oid, to: lid, type: "obj-layout" });
      });
    };

    // Place new suite as its own upright cytoscape-style cluster in free space
    const existingLive = (graphDataRef.current.nodes as any[]).filter(
      (n: any) => !n.isPreview && Number.isFinite(n.x) && Number.isFinite(n.y) && Number.isFinite(n.z),
    );
    let suiteAnchor = { x: 48, y: 14, z: 28 };
    if (existingLive.length > 0) {
      let cx = 0, cy = 0, cz = 0;
      existingLive.forEach((n: any) => { cx += n.x; cy += n.y; cz += n.z; });
      cx /= existingLive.length; cy /= existingLive.length; cz /= existingLive.length;
      suiteAnchor = { x: cx + 110, y: cy + 8, z: cz + 70 };
    }

    if (obj.isTemplate && Array.isArray(obj.objects)) {
      const nameToId: Record<string, string> = {};
      const indexToId: Record<number, string> = {};
      const N = Math.max(obj.objects.length, 1);
      const offsets = suiteObjectOffsets(N);

      // Pre-assign stable ids so relationship resolution can wire during child append
      obj.objects.forEach((o: any, oi: number) => {
        const oid = `created_${ts}_${oi}`;
        if (oi === 0) firstObjId = oid;
        nameToId[String(o.name ?? "").trim()] = oid;
        indexToId[oi] = oid;
      });

      const resolveRelatedId = (raw: string | undefined) => {
        if (!raw) return undefined;
        if (nameToId[raw]) return nameToId[raw];
        const previewMatch = /^__ai_obj(\d+)__$/.exec(raw);
        if (previewMatch) return indexToId[Number(previewMatch[1])];
        // Existing home-graph object id, or already-resolved created id
        if (fullNodeMap.has(raw)) return raw;
        if (Object.values(indexToId).includes(raw)) return raw;
        return undefined;
      };

      obj.objects.forEach((o: any, oi: number) => {
        const oid = indexToId[oi];
        const off = offsets[oi] ?? { x: 0, y: 0, z: 0 };
        const origin = pos3(
          suiteAnchor.x + off.x,
          suiteAnchor.y + off.y,
          suiteAnchor.z + off.z,
        );
        newDynNodes.push({
          id: oid, type: "object", label: o.name, ...origin,
          description: o.description,
          objectType: o.objectType ?? "Normal",
          lifecycleStatus: "Deployed",
        });
        appendChildren(
          oid, origin, o.fields ?? [], o.layouts ?? [],
          [],
          [],
          resolveRelatedId,
        );
      });

      const seenOo = new Set(
        newDynEdges
          .filter(e => e.type === "obj-obj")
          .map(e => objObjUndirectedKey(e.from, e.to)),
      );
      (obj.objEdges ?? []).forEach((e: any, i: number) => {
        const fromId = resolveRelatedId(e.from) ?? nameToId[e.from];
        const toId = resolveRelatedId(e.to) ?? nameToId[e.to];
        if (!fromId || !toId || fromId === toId) return;
        const key = objObjUndirectedKey(fromId, toId);
        if (seenOo.has(key)) return;
        seenOo.add(key);
        newDynEdges.push({ id: `tpl_oo_${ts}_${i}`, from: fromId, to: toId, type: "obj-obj" as EdgeType });
      });

      // Densify into one connected cytoscape neighborhood (not isolated mini-suns)
      wireSuiteClusterEdges(
        obj.objects.map((o: any, oi: number) => ({
          id: indexToId[oi],
          name: String(o.name ?? ""),
          fields: (o.fields ?? []).map((f: any) => ({
            ...f,
            relatedObjectId: resolveRelatedId(f.relatedObjectId) ?? f.relatedObjectId,
          })),
        })),
        newDynEdges,
        `suite_oo_${ts}`,
      );

      // Final pass — collapse any residual duplicate spines into one home-weight link
      const unique = dedupeObjObjEdges(newDynEdges);
      newDynEdges.length = 0;
      newDynEdges.push(...unique);
    } else {
      const pObj = previewObjects[0];
      const origin = existingLive.length > 0
        ? suiteAnchor
        : livePos(pObj, pos3(suiteAnchor.x, suiteAnchor.y, suiteAnchor.z));
      newDynNodes.push({
        id: firstObjId, type: "object", label: obj.title ?? obj.name, ...origin,
        objectApiName: obj.name, description: obj.description, objectType: obj.objectType,
        lifecycleStatus: "Deployed",
        objectSettings: obj.objectSettings as ObjectSettings | undefined,
      });
      appendChildren(
        firstObjId, origin, obj.fields ?? [], obj.layouts ?? [],
        previewByParent(pObj?.id, "field"),
        previewByParent(pObj?.id, "layout"),
      );
    }

    // Homes = final dock. Spawn = “thrown in” from above / toward camera, then swings to rest.
    arrivalHomeRef.current = new Map();
    arrivalSpawnRef.current = new Map();
    let suiteCx = 0, suiteCy = 0, suiteCz = 0;
    newDynNodes.forEach(n => { suiteCx += n.x; suiteCy += n.y; suiteCz += n.z; });
    const nn = Math.max(newDynNodes.length, 1);
    suiteCx /= nn; suiteCy /= nn; suiteCz /= nn;
    newDynNodes.forEach(n => {
      const home = { x: n.x, y: n.y, z: n.z };
      const spawn = {
        x: home.x + (home.x - suiteCx) * 0.55 - 18,
        y: home.y + 72 + (home.y - suiteCy) * 0.25,
        z: home.z + 95 + (home.z - suiteCz) * 0.35,
      };
      arrivalHomeRef.current.set(n.id, home);
      arrivalSpawnRef.current.set(n.id, spawn);
      n.x = spawn.x; n.y = spawn.y; n.z = spawn.z;
      n.fx = spawn.x; n.fy = spawn.y; n.fz = spawn.z;
    });

    // Capture existing world so post-deploy can solo-reveal the new suite alone
    const hideExistingIds: string[] = [];
    fullNodeMap.forEach((n, id) => {
      if ((n as { isPreview?: boolean }).isPreview) return;
      hideExistingIds.push(id);
    });

    // Drop preview, add real nodes — existing clusters stay hidden until solo hold ends
    previewSpawnRef.current = null;
    setPreviewNodes([]);
    setPreviewEdges([]);
    setSoloHideIds(hideExistingIds.length > 0 ? new Set(hideExistingIds) : null);
    setDynamicNodes(prev => [...prev, ...newDynNodes]);
    setDynamicEdges(prev => [...prev, ...newDynEdges]);

    const flyTargetId = firstObjId;
    const suiteObjectIds = newDynNodes.filter(n => n.type === "object").map(n => n.id);
    const allNewIds = newDynNodes.map(n => n.id);
    arrivingIdsRef.current = new Set(allNewIds);
    arrivalProgressRef.current = new Map(); // unlocked progressively on reveal
    arrivalBloomRef.current = 0;
    arrivalUnlockAtRef.current = 0;
    arrivalStaggerMsRef.current = new Map();
    arrivalMotionPhaseRef.current = "bloom";
    arrivalActiveRef.current = true;
    autoRotateRef.current = false;
    clearIdleRotateTimer();
    setSelectedId(null);
    setShowGuide(false);
    pendingFocusIdRef.current = flyTargetId;
    pendingFocusSuiteIdsRef.current = suiteObjectIds;
    pendingSuiteRevealRef.current = {
      objectIds: suiteObjectIds,
      allIds: allNewIds,
      firstObjId: flyTargetId,
      hideExistingIds,
    };
    focusLockUntilRef.current = Date.now() + Math.max(38_000, suiteObjectIds.length * 1200 + 34_000);

    // Freeze positions once the force-graph mounts the new nodes (wizard may still be open)
    const freezeCreated = (attempt = 0) => {
      const ids = new Set(allNewIds);
      const created = graphDataRef.current.nodes.filter((n: any) => ids.has(n.id) && Number.isFinite(n.x));
      if (created.length === 0 && attempt < 24) {
        window.setTimeout(() => freezeCreated(attempt + 1), 80);
        return;
      }
      created.forEach((n: any) => {
        n.fx = n.x; n.fy = n.y; n.fz = n.z;
        n.vx = 0; n.vy = 0; n.vz = 0;
      });
      // Also freeze existing graph so the join-in feels intentional, not jittery
      graphDataRef.current.nodes.forEach((n: any) => {
        if (!Number.isFinite(n.x)) return;
        n.fx = n.x; n.fy = n.y; n.fz = n.z;
        n.vx = 0; n.vy = 0; n.vz = 0;
      });
      setAmbientForce(false);
    };
    window.setTimeout(() => freezeCreated(0), 100);
  }, [createMode, unfreezeGraphNodes, setAmbientForce, fullNodeMap, clearIdleRotateTimer]);

  const handleDeleteObject = useCallback((objectId: string) => {
    const childIds = Array.from(fullNodeMap.values())
      .filter(n => n.parentId === objectId)
      .map(n => n.id);
    const remove = new Set([objectId, ...childIds]);
    setHiddenIds(prev => {
      const next = new Set(prev);
      remove.forEach(id => next.add(id));
      return next;
    });
    setDynamicNodes(prev => prev.filter(n => !remove.has(n.id)));
    setDynamicEdges(prev => prev.filter(e => !remove.has(e.from) && !remove.has(e.to)));
    setSelectedId(null);
    releaseFocusMotion();
    autoRotateRef.current = true;
    fitAllInView(700, { restoreMotion: true, resumeRotate: true });
  }, [fullNodeMap, releaseFocusMotion, fitAllInView]);

  // After deploy wizard closes: empty canvas → suite docks once → hold → restore world
  useEffect(() => {
    if (createMode !== null) return;
    const reveal = pendingSuiteRevealRef.current;
    const id = pendingFocusIdRef.current;
    if (!reveal && !id) return;

    // Consume pending work immediately so dependency churn cannot restart the sequence
    pendingSuiteRevealRef.current = null;
    pendingFocusIdRef.current = null;
    pendingFocusSuiteIdsRef.current = null;

    autoRotateRef.current = false;
    clearIdleRotateTimer();
    arrivalActiveRef.current = true;
    arrivalMotionPhaseRef.current = "dock";
    arrivalBloomRef.current = 1;
    arrivalProgressRef.current = new Map();
    arrivalStaggerMsRef.current = new Map();
    setSelectedId(null);
    setShowGuide(false);

    const suiteIds = reveal?.objectIds ?? [];
    const allIds = reveal?.allIds ?? [];
    const hideExisting = reveal?.hideExistingIds ?? [];
    // Avoid a second graphData rebuild if solo-hide was already applied on create
    if (hideExisting.length > 0) {
      setSoloHideIds(prev => {
        if (prev && prev.size === hideExisting.length && hideExisting.every(hid => prev.has(hid))) {
          return prev;
        }
        return new Set(hideExisting);
      });
    }

    /** Thrown-in as one cluster, short object cadence, then still hold */
    const OBJECT_STAGGER_MS = 140;
    const FIELD_LAG_BASE = 24;
    const FIELD_LAG_STEP = 12;
    const FADE_SETTLE_MS = 2600;
    const HOLD_STILL_MS = 10_000;
    const staggerTotal = Math.max(0, (suiteIds.length - 1) * OBJECT_STAGGER_MS);
    const revealStartedAt = Date.now();
    focusLockUntilRef.current = revealStartedAt + staggerTotal + FADE_SETTLE_MS + HOLD_STILL_MS + 8000;

    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      const t = window.setTimeout(() => { if (!cancelled) fn(); }, ms);
      timers.push(t);
    };

    const resolveSuite = () => {
      if (suiteIds.length === 0) return [] as any[];
      const idSet = new Set(suiteIds);
      return graphDataRef.current.nodes.filter(
        (n: any) => idSet.has(n.id) || (n.parentId && idSet.has(n.parentId)),
      );
    };

    const freezeAll = () => {
      graphDataRef.current.nodes.forEach((n: any) => {
        if (!Number.isFinite(n.x)) return;
        n.fx = n.x; n.fy = n.y; n.fz = n.z;
        n.vx = 0; n.vy = 0; n.vz = 0;
      });
      setAmbientForce(false);
    };

    const suitePoints = (onlyVisible = false) => allIds.map(nid => {
      if (onlyVisible) {
        const p = arrivalProgressRef.current.get(nid) ?? 0;
        const stagger = arrivalStaggerMsRef.current.get(nid) ?? 0;
        const unlockedFor = Date.now() - arrivalUnlockAtRef.current;
        if (p < 0.15 || unlockedFor < stagger) return null;
      }
      const pt = arrivalHomeRef.current.get(nid);
      const live = graphDataRef.current.nodes.find((x: any) => x.id === nid);
      if (pt) return { id: nid, x: pt.x, y: pt.y, z: pt.z };
      return live;
    }).filter(Boolean) as any[];

    /** Elevated home-style frame onto the XZ cluster — readable, not flat face-on. */
    const frameNewSuite = (durationMs: number, pts?: any[]) => {
      freezeAll();
      const suitePts = pts ?? suitePoints();
      if (suitePts.length === 0) return;
      const fg = fgRef.current;
      if (fg && suitePts.length > 0) {
        let cx = 0, cy = 0, cz = 0, n = 0;
        suitePts.forEach((p: any) => {
          if (!Number.isFinite(p.x)) return;
          cx += p.x; cy += p.y; cz += p.z; n += 1;
        });
        if (n > 0) {
          cx /= n; cy /= n; cz /= n;
          // Same orbital language as the objects home overview
          rotAngleRef.current = 0.62;
          rotCenterRef.current = { x: cx, y: cy, z: cz };
          const previewDist = 150;
          const elev = Math.max(36, previewDist * 0.38);
          fg.cameraPosition(
            {
              x: cx + previewDist * Math.sin(rotAngleRef.current),
              y: cy + elev,
              z: cz + previewDist * Math.cos(rotAngleRef.current),
            },
            { x: cx, y: cy, z: cz },
            0,
          );
        }
      }
      frameNodesInView(suitePts, durationMs, {
        distMul: 0.52,
        lookYShift: -2.2,
        maxDist: 260,
        pad: 1.18,
        leftInset: 110,
        rightInset: 110,
      });
    };

    /** Soft 10% pullback from the close suite frame — keep a zoomed-in world, not a full overview. */
    const pullBackTenPercent = (durationMs: number) => {
      const fg = fgRef.current;
      if (!fg) return;
      freezeAll();
      syncOrbitFromCamera();
      const c = rotCenterRef.current;
      const d = Math.max(80, orbitDistRef.current * 1.10);
      orbitDistRef.current = d;
      const a = rotAngleRef.current;
      const elev = Math.max(28, d * 0.14);
      fg.cameraPosition(
        { x: c.x + d * Math.sin(a), y: c.y + elev, z: c.z + d * Math.cos(a) },
        { x: c.x, y: c.y, z: c.z },
        durationMs,
      );
    };

    const unlockStaggered = () => {
      arrivalMotionPhaseRef.current = "dock";
      arrivalUnlockAtRef.current = Date.now();
      arrivalBloomRef.current = 1;
      arrivingMeshesRef.current.clear();

      // Park at spawn; dock lerp communicates “added into the graph”
      allIds.forEach(nid => {
        const mesh = nodeMeshesRef.current.get(nid);
        const spawn = arrivalSpawnRef.current.get(nid);
        const live = graphDataRef.current.nodes.find((x: any) => x.id === nid);
        if (live && spawn) {
          live.x = spawn.x; live.y = spawn.y; live.z = spawn.z;
          live.fx = spawn.x; live.fy = spawn.y; live.fz = spawn.z;
        }
        if (mesh) {
          mesh.scale.set(0.58, 0.58, 0.58);
          arrivingMeshesRef.current.set(nid, mesh);
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = 0;
          mat.emissiveIntensity = 0.18;
        }
        const label = labelSpritesRef.current.get(nid);
        if (label) (label.material as THREE.SpriteMaterial).opacity = 0;
      });

      suiteIds.forEach((oid, oi) => {
        const delay = oi * OBJECT_STAGGER_MS;
        const group = allIds.filter(nid => {
          if (nid === oid) return true;
          const n = graphDataRef.current.nodes.find((x: any) => x.id === nid);
          return n?.parentId === oid;
        });
        group.forEach((nid, fi) => {
          if (!arrivingIdsRef.current.has(nid)) return;
          const fieldLag = nid === oid ? 0 : FIELD_LAG_BASE + fi * FIELD_LAG_STEP;
          arrivalStaggerMsRef.current.set(nid, delay + fieldLag);
          arrivalProgressRef.current.set(nid, 0.001);
        });
      });
      allIds.forEach(nid => {
        if (arrivalProgressRef.current.has(nid)) return;
        if (!arrivingIdsRef.current.has(nid)) return;
        arrivalStaggerMsRef.current.set(nid, staggerTotal);
        arrivalProgressRef.current.set(nid, 0.001);
      });

      later(() => frameNewSuite(1000), 40);
    };

    const settleNewCluster = () => {
      arrivalMotionPhaseRef.current = "done";
      arrivingMeshesRef.current.forEach(mesh => {
        mesh.scale.set(1, 1, 1);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.transparent = false;
        mat.opacity = 1;
        mat.emissiveIntensity = 0.1;
      });
      allIds.forEach(nid => {
        const home = arrivalHomeRef.current.get(nid);
        const n = graphDataRef.current.nodes.find((x: any) => x.id === nid);
        if (!home || !n) return;
        n.x = home.x; n.y = home.y; n.z = home.z;
        n.fx = home.x; n.fy = home.y; n.fz = home.z;
      });
      labelSpritesRef.current.forEach((label, lid) => {
        if (arrivingIdsRef.current.has(lid) || allIds.includes(lid)) {
          (label.material as THREE.SpriteMaterial).opacity = 1;
        }
      });
      freezeAll();
      // Soft settle frame — avoid a hard camera cut that reads as a second load
      frameNewSuite(500);
      autoRotateRef.current = false;
      clearIdleRotateTimer();
    };

    const revealWorldAndRotate = () => {
      // Keep new suite marked settled (progress=1) through the remount caused by
      // un-hiding the world — prevents a second “full appear” flash of the cluster.
      allIds.forEach(nid => {
        if (arrivingIdsRef.current.has(nid)) {
          arrivalProgressRef.current.set(nid, 1);
        }
      });
      freezeAll();
      setSoloHideIds(null);

      later(() => {
        freezeAll();
        // Clear arrival bookkeeping only after remount used settled materials
        arrivingIdsRef.current = new Set();
        arrivingMeshesRef.current.clear();
        arrivalProgressRef.current.clear();
        arrivalStaggerMsRef.current.clear();
        arrivalHomeRef.current.clear();
        arrivalSpawnRef.current.clear();
        arrivalActiveRef.current = false;

        // Stay on the new suite, then ease out ~10% and start rotate
        frameNewSuite(600);
        later(() => {
          pullBackTenPercent(900);
          later(() => {
            freezeAll();
            syncOrbitFromCamera();
            autoRotateRef.current = true;
            clearIdleRotateTimer();
          }, 1000);
        }, 720);
      }, 120);
    };

    later(() => {
      let attempts = 0;
      const start = () => {
        attempts += 1;
        const suite = resolveSuite();
        const ready = suite.some((n: any) => Number.isFinite(n.x));
        if (!ready) {
          if (attempts < 30) later(start, 80);
          else {
            settleNewCluster();
            later(revealWorldAndRotate, HOLD_STILL_MS);
          }
          return;
        }
        autoRotateRef.current = false;
        freezeAll();
        // Keep nodes at spawn (invisible) — never snap to home first (that caused a full flash then re-dock)
        allIds.forEach(nid => {
          const n = graphDataRef.current.nodes.find((x: any) => x.id === nid);
          const spawn = arrivalSpawnRef.current.get(nid);
          if (!n || !spawn) return;
          n.x = spawn.x; n.y = spawn.y; n.z = spawn.z;
          n.fx = spawn.x; n.fy = spawn.y; n.fz = spawn.z;
        });

        // Single dock → settle → hold still 10s → world + rotate
        later(() => {
          unlockStaggered();
          later(() => {
            settleNewCluster();
            later(revealWorldAndRotate, HOLD_STILL_MS);
          }, staggerTotal + FADE_SETTLE_MS + 500);
        }, 200);
      };
      start();
    }, 120);

    return () => {
      cancelled = true;
      timers.forEach(t => clearTimeout(t));
    };
  }, [
    createMode,
    frameNodesInView,
    setAmbientForce,
    clearIdleRotateTimer,
    syncOrbitFromCamera,
  ]);

  // Refresh label sprites when names change via patches / dynamic edits / live preview
  useEffect(() => {
    const previewMap = new Map(previewNodes.map(n => [n.id, n]));
    labelSpritesRef.current.forEach((oldLabel, id) => {
      const n = fullNodeMap.get(id) ?? previewMap.get(id);
      if (!n || !oldLabel.parent) return;
      const fontSize = n.type === "object" ? 15 : 11;
      const neu = makeLabel(
        n.label,
        getGraphLabelColor(graphColors, n.type, activeTheme),
        fontSize,
        labelStyle,
      );
      neu.position.copy(oldLabel.position);
      oldLabel.parent.add(neu);
      oldLabel.parent.remove(oldLabel);
      const map = (oldLabel.material as THREE.SpriteMaterial).map;
      (oldLabel.material as THREE.SpriteMaterial).dispose();
      map?.dispose();
      labelSpritesRef.current.set(id, neu);
    });
  // Only when editable content changes — not on selection/hover
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodePatches, dynamicNodes, previewNodes, graphColors, activeTheme, labelStyle]);

  const handleCameraFlyTo = useCallback((x: number, y: number, z: number) => {
    autoRotateRef.current = false;
    const lookAt = { x: x * 0.15, y: 0, z: z * 0.15 };
    rotCenterRef.current = lookAt;
    fgRef.current?.cameraPosition({ x: x * 0.15, y: y * 0.15 + 40, z: z * 0.15 + 120 }, lookAt, 1200);
  }, []);

  const spawnInFrontOfCamera = useCallback(() => {
    const fg = fgRef.current;
    const look = rotCenterRef.current;
    if (!fg) return { x: 0, y: 16, z: 0 };
    try {
      const cam = fg.cameraPosition();
      const dx = look.x - cam.x, dy = look.y - cam.y, dz = look.z - cam.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      const dist = Math.min(150, Math.max(95, len * 0.34));
      return {
        x: cam.x + (dx / len) * dist,
        y: cam.y + (dy / len) * dist,
        z: cam.z + (dz / len) * dist,
      };
    } catch {
      return { x: 0, y: 16, z: 0 };
    }
  }, []);

  const handlePreviewChange = useCallback((nextNodes: PanelPreviewNode[], nextEdges: PanelPreviewEdge[]) => {
    if (nextNodes.length === 0) {
      previewSpawnRef.current = null;
      setPreviewNodes([]);
      setPreviewEdges([]);
      return;
    }

    const liveById = new Map<string, any>();
    (graphDataRef.current.nodes as any[]).forEach((n: any) => {
      if (n?.isPreview && n.id) liveById.set(n.id, n);
    });

    if (!previewSpawnRef.current) {
      const existingObj = liveById.get("__preview_object__")
        ?? Array.from(liveById.values()).find((n: any) => n.type === "object");
      previewSpawnRef.current = existingObj && Number.isFinite(existingObj.x)
        ? { x: existingObj.x, y: existingObj.y, z: existingObj.z }
        : { x: 0, y: 8, z: 0 };
    }
    const spawn = previewSpawnRef.current;
    const objects = nextNodes.filter(n => n.type === "object");
    const placed = nextNodes.map(n => {
      const live = liveById.get(n.id);
      if (live && Number.isFinite(live.x) && Number.isFinite(live.y) && Number.isFinite(live.z)) {
        return { ...n, x3d: live.x, y3d: live.y, z3d: live.z } as PanelPreviewNode;
      }
      if (n.type === "object") {
        const oi = objects.indexOf(n);
        const pos = objects.length <= 1 ? spawn : childOrbit(spawn.x, spawn.y, spawn.z, oi, objects.length, 36);
        return { ...n, x3d: pos.x, y3d: pos.y, z3d: pos.z } as PanelPreviewNode;
      }
      const parent = nextNodes.find(p => p.id === n.parentId && p.type === "object");
      const siblings = nextNodes.filter(c => c.parentId === n.parentId && c.type === n.type);
      const idx = siblings.indexOf(n);
      const origin = parent
        ? (objects.length <= 1 ? spawn : childOrbit(spawn.x, spawn.y, spawn.z, objects.indexOf(parent), objects.length, 36))
        : spawn;
      const pos = childOrbit(origin.x, origin.y, origin.z, idx, Math.max(siblings.length, 1), n.type === "layout" ? 22 : 18);
      return { ...n, x3d: pos.x, y3d: pos.y, z3d: pos.z } as PanelPreviewNode;
    });
    setPreviewNodes(placed);
    setPreviewEdges(nextEdges);
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { objects: [] as GNode[], fields: [] as GNode[], layouts: [] as GNode[] };
    const q = searchQuery.toLowerCase();
    const m = nodes.filter(n => n.label.toLowerCase().includes(q));
    return { objects: m.filter(n => n.type === "object").slice(0, 5), fields: m.filter(n => n.type === "field").slice(0, 7), layouts: m.filter(n => n.type === "layout").slice(0, 5) };
  }, [searchQuery, nodes]);

  const handleSearchSelect = useCallback((node: GNode) => {
    setSearchQuery(""); setSearchFocused(false);
    setSelectedId(node.id); setShowGuide(false);
    autoRotateRef.current = false;
    if (objectsViewMode !== "graph") return;
    clearCameraAnimTimer();
    cameraAnimTimerRef.current = setTimeout(() => {
      flyToClusterParallax(node.id, 900, { distMul: 0.72 });
    }, 50);
  }, [flyToClusterParallax, clearCameraAnimTimer, objectsViewMode]);

  // ── Camera controls ───────────────────────────────────────────────────────────
  const zoomIn = useCallback(() => {
    autoRotateRef.current = false;
    const fg = fgRef.current; if (!fg) return;
    const look = rotCenterRef.current;
    const p = fg.cameraPosition();
    const dx = p.x - look.x, dy = p.y - look.y, dz = p.z - look.z;
    const sc = 0.75;
    orbitDistRef.current = Math.hypot(dx, dy, dz) * sc;
    fg.cameraPosition(
      { x: look.x + dx * sc, y: look.y + dy * sc, z: look.z + dz * sc },
      { x: look.x, y: look.y, z: look.z },
      300,
    );
  }, []);

  const zoomOut = useCallback(() => {
    autoRotateRef.current = false;
    const fg = fgRef.current; if (!fg) return;
    const look = rotCenterRef.current;
    const p = fg.cameraPosition();
    const dx = p.x - look.x, dy = p.y - look.y, dz = p.z - look.z;
    const dist = Math.hypot(dx, dy, dz) || 1;
    const MAX_DIST = 1800;
    const sc = Math.min(1.35, MAX_DIST / dist);
    orbitDistRef.current = dist * sc;
    fg.cameraPosition(
      { x: look.x + dx * sc, y: look.y + dy * sc, z: look.z + dz * sc },
      { x: look.x, y: look.y, z: look.z },
      300,
    );
  }, []);

  const focusSelected = useCallback(() => {
    if (!selectedId) return;
    flyToClusterParallax(selectedId, 1100, { distMul: 0.72 });
  }, [selectedId, flyToClusterParallax]);

  const selectedNode = selectedId ? fullNodeMap.get(selectedId) : null;
  const hoveredNode  = hoveredId  ? fullNodeMap.get(hoveredId)  : null;
  const isDynNode = (id: string | null) => !!id && dynNodeMap.has(id);
  const hasSearchResults = searchResults.objects.length + searchResults.fields.length + searchResults.layouts.length > 0;

  const objNodes    = useMemo(() => [...nodes, ...(dynamicNodes as unknown as GNode[])].filter(n => n.type === "object"), [nodes, dynamicNodes]);
  const existingApiNames = useMemo(() =>
    objNodes
      .filter(n => n.id !== editDraft?.editId)
      .map(n => n.objectApiName ?? slugObjectName(n.label)),
  [objNodes, editDraft?.editId]);
  const availableObjects = useMemo(() =>
    objNodes
      .filter(n => n.id !== editDraft?.editId)
      .map(n => ({ id: n.id, label: n.label, apiName: n.objectApiName ?? slugObjectName(n.label) })),
  [objNodes, editDraft?.editId]);
  const fieldNodes  = useMemo(() => [...nodes, ...(dynamicNodes as unknown as GNode[])].filter(n => n.type === "field"),  [nodes, dynamicNodes]);
  const layoutNodes = useMemo(() => [...nodes, ...(dynamicNodes as unknown as GNode[])].filter(n => n.type === "layout"), [nodes, dynamicNodes]);

  const cardObjects = useMemo<CardObjectItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const all = Array.from(fullNodeMap.values());
    const isSoloHidden = (id: string) => Boolean(soloHideIds?.has(id));
    const isUserCreated = (id: string) => dynNodeMap.has(id) || id.startsWith("created_");
    const parseCreatedAt = (id: string) => {
      const m = /^created_(\d+)/.exec(id);
      if (m) return Number(m[1]);
      // Stable seed ordering — later seed objects feel slightly newer
      const seedIdx = OBJECTS.findIndex(o => o.id === id);
      return seedIdx >= 0 ? seedIdx : 0;
    };
    let list = all
      .filter(n => n.type === "object" && !isSoloHidden(n.id))
      .map(n => {
        const fields = all
          .filter(f => f.type === "field" && f.parentId === n.id && !isSoloHidden(f.id))
          .map(f => ({ id: f.id, label: f.label, fieldType: f.fieldType }));
        const layoutCount = all.filter(l => l.type === "layout" && l.parentId === n.id && !isSoloHidden(l.id)).length;
        const relationshipCount = fields.filter(f =>
          f.fieldType === "Lookup" || f.fieldType === "Master Details" || f.fieldType === "Record Association",
        ).length;
        return {
          id: n.id,
          label: n.label,
          description: n.description,
          objectType: n.objectType,
          fields,
          layoutCount,
          relationshipCount,
          isUserCreated: isUserCreated(n.id),
          createdAt: parseCreatedAt(n.id),
        } satisfies CardObjectItem;
      });

    if (q) {
      list = list.filter(n => {
        if (n.label.toLowerCase().includes(q)) return true;
        if ((n.description ?? "").toLowerCase().includes(q)) return true;
        return n.fields.some(f => f.label.toLowerCase().includes(q));
      });
    }
    if (objectsFilterApplied.recentOnly) {
      const hasAnyUserCreated = list.some(n => n.isUserCreated);
      const seedRecentCutoff = Math.max(0, OBJECTS.length - 8);
      list = list.filter(n => {
        if (hasAnyUserCreated) return Boolean(n.isUserCreated);
        const seedIdx = OBJECTS.findIndex(o => o.id === n.id);
        return seedIdx < 0 || seedIdx >= seedRecentCutoff;
      });
      list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } else {
      list.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    }
    if (objectsFilterApplied.objectType) {
      list = list.filter(n => (n.objectType || "Object") === objectsFilterApplied.objectType);
    }
    if (objectsFilterApplied.hasRelationships) {
      list = list.filter(n => (n.relationshipCount ?? 0) > 0);
    }
    if (objectsFilterApplied.hasLayouts) {
      list = list.filter(n => (n.layoutCount ?? 0) > 0);
    }
    return list;
  }, [fullNodeMap, searchQuery, soloHideIds, dynNodeMap, objectsFilterApplied]);

  const cardObjectTypes = useMemo(() => {
    const types = new Set<string>();
    fullNodeMap.forEach(n => {
      if (n.type === "object") types.add(n.objectType || "Object");
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [fullNodeMap]);

  const objectsFilterActive = isObjectsFilterActive(objectsFilterApplied);
  const objectsFilterDraftActive = isObjectsFilterActive(objectsFilterDraft);

  const totalObjectCount = useMemo(() => {
    let n = 0;
    fullNodeMap.forEach(node => {
      if (node.type === "object" && !soloHideIds?.has(node.id)) n += 1;
    });
    return n;
  }, [fullNodeMap, soloHideIds]);

  const filteredObjectCount = filteredObjectIdSet ? filteredObjectIdSet.size : totalObjectCount;

  const appliedFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (objectsFilterApplied.recentOnly) chips.push("Recently created");
    if (objectsFilterApplied.hasRelationships) chips.push("Has relationships");
    if (objectsFilterApplied.hasLayouts) chips.push("Has layouts");
    if (objectsFilterApplied.objectType) chips.push(objectsFilterApplied.objectType);
    return chips;
  }, [objectsFilterApplied]);

  const openObjectsFilter = useCallback(() => {
    setObjectsFilterDraft(objectsFilterApplied);
    setObjectsFilterOpen(true);
  }, [objectsFilterApplied]);

  const applyObjectsFilter = useCallback(() => {
    const next = objectsFilterDraft;
    setObjectsFilterApplied(next);
    setObjectsFilterOpen(false);
  }, [objectsFilterDraft]);

  const clearObjectsFilter = useCallback(() => {
    setObjectsFilterDraft(EMPTY_OBJECTS_FILTER);
    setObjectsFilterApplied(EMPTY_OBJECTS_FILTER);
    setObjectsFilterOpen(false);
  }, []);

  useEffect(() => {
    if (!filteredObjectIdSet || !selectedId) return;
    const n = fullNodeMap.get(selectedId);
    if (!n) return;
    const objId = n.type === "object" ? n.id : n.parentId;
    if (objId && !filteredObjectIdSet.has(objId)) setSelectedId(null);
  }, [filteredObjectIdSet, selectedId, fullNodeMap]);

  // Pack / unpack whenever the applied filter set changes (graph view)
  useEffect(() => {
    if (objectsViewMode !== "graph") return;
    const t = window.setTimeout(() => {
      if (!filteredObjectIdSet) {
        if (filterLockRotateRef.current || filterHomePosRef.current.size > 0) {
          runFilterClusterOut();
        }
        return;
      }
      if (filteredObjectIdSet.size === 0) {
        filterLockRotateRef.current = true;
        autoRotateRef.current = false;
        clearIdleRotateTimer();
        return;
      }
      runFilterClusterIn(filteredObjectIdSet);
    }, 40);
    return () => window.clearTimeout(t);
  }, [filteredObjectIdSet, objectsViewMode, runFilterClusterIn, runFilterClusterOut, clearIdleRotateTimer]);

  useEffect(() => {
    if (!objectsFilterOpen) return;
    const onDown = (e: MouseEvent) => {
      if (objectsFilterRef.current?.contains(e.target as Node)) return;
      setObjectsFilterOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [objectsFilterOpen]);

  const selectedObjectIdForCards = useMemo(() => {
    if (!selectedId) return null;
    const n = fullNodeMap.get(selectedId);
    if (!n) return null;
    if (n.type === "object") return n.id;
    if (n.parentId && fullNodeMap.get(n.parentId)?.type === "object") return n.parentId;
    return null;
  }, [selectedId, fullNodeMap]);

  const handleCardObjectSelect = useCallback((id: string) => {
    setShowGuide(false);
    if (selectedId === id || selectedObjectIdForCards === id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
  }, [selectedId, selectedObjectIdForCards]);

  // Graph canvas is full-bleed under chrome overlays (explore / minimap float on top)
  const graphLeft = 0;
  const graphRight = createMode === null && selectedId ? PROPS_PANEL_CHROME_PX : 0;
  const graphTop = createMode === null ? HEADER_H : 0;
  const graphW = Math.max(1, dims.w - graphLeft - graphRight);
  const graphH = Math.max(1, dims.h - graphTop);

  // Keep focus framed when the visible canvas size changes (panel open/close, resize)
  useEffect(() => {
    if (createMode !== null) return;
    if (Date.now() < focusLockUntilRef.current) return;
    const fg = fgRef.current;
    if (!fg) return;
    const t = setTimeout(() => {
      if (Date.now() < focusLockUntilRef.current) return;
      if (selectedIdRef.current) {
        flyToClusterParallax(selectedIdRef.current, 550, { distMul: 0.72 });
      } else if (autoRotateRef.current) {
        fitAllInView(550, { resumeRotate: true });
      }
    }, 60);
    return () => clearTimeout(t);
  }, [graphW, graphH, createMode, flyToClusterParallax, fitAllInView]);

  return (
    <GraphColorsProvider colors={graphColors}>
    <DndProvider backend={HTML5Backend}>
    <div ref={containerRef} style={{ position: "fixed", inset: 0, background: graphBg, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ─── 3D FORCE GRAPH / CARD VIEW (full-bleed; left chrome overlays on top) ─ */}
      <div
        style={{
          position: "absolute",
          top: graphTop,
          left: 0,
          right: graphRight,
          bottom: 0,
          overflow: "hidden",
        }}
      >
        {createMode === null && objectsViewMode === "cards" ? (
          <ObjectsCardView
            objects={cardObjects}
            selectedId={selectedObjectIdForCards}
            panelOpen={Boolean(selectedId)}
            onSelect={handleCardObjectSelect}
            topInset={CHROME_INSET + 36 + 20}
            filterActive={objectsFilterActive}
            filteredCount={filteredObjectCount}
            totalCount={totalObjectCount}
          />
        ) : (
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          width={graphW}
          height={graphH}
          backgroundColor={graphBg}
          showNavInfo={false}

          nodeId="id"
          nodeLabel={() => ""}
          nodeThreeObject={nodeThreeObj}
          nodeThreeObjectExtend={false}
          nodeColor={nodeColorFn}
          nodeVal={nodeValFn}
          nodeVisibility={nodeVisibilityFn}
          nodeOpacity={0.95}

          linkSource="source"
          linkTarget="target"
          linkColor={linkColorFn}
          linkWidth={linkWidthFn}
          linkVisibility={linkVisibilityFn}
          linkOpacity={0.7}
          linkDirectionalParticles={linkParticlesFn}
          linkDirectionalParticleSpeed={LINK_PARTICLE_SPEED}
          linkDirectionalParticleWidth={linkParticleWidthFn}
          linkDirectionalParticleColor={linkParticleColorFn}

          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onNodeDrag={() => { pauseRotateForIdle(); }}
          onBackgroundClick={handleBgClick}
          onEngineStop={handleEngineStop}

          enableNodeDrag={true}
          cooldownTicks={Infinity}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.35}
          d3AlphaMin={0.001}
        />
        )}
      </div>

      {/* ─── HEADER ────────────────────────────────────────────────────────────── */}
      {createMode === null && (
      <header className="absolute top-0 left-0 right-0 z-30 flex items-stretch h-13"
        style={{ background: "var(--app-shell-bg)", borderBottom: "1px solid var(--app-border)", height: HEADER_H, paddingLeft: CHROME_INSET, paddingRight: CHROME_INSET }}>

        {/* Menu + Logo — menu left edge at 20px to match Explore panel */}
        <div className="flex items-center gap-3 shrink-0" style={{ minWidth: 200 }}>
          <button
            type="button"
            aria-label="Open menu"
            className="flex items-center justify-center shrink-0 rounded-md"
            style={{
              width: 32,
              height: 32,
              padding: 0,
              background: "transparent",
              border: "none",
              color: "var(--app-text-secondary)",
              cursor: "pointer",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--app-text-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--app-text-secondary)"; }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
              <rect x="1" y="1" width="4" height="4" rx="0.6" />
              <rect x="7" y="1" width="4" height="4" rx="0.6" />
              <rect x="13" y="1" width="4" height="4" rx="0.6" />
              <rect x="1" y="7" width="4" height="4" rx="0.6" />
              <rect x="7" y="7" width="4" height="4" rx="0.6" />
              <rect x="13" y="7" width="4" height="4" rx="0.6" />
              <rect x="1" y="13" width="4" height="4" rx="0.6" />
              <rect x="7" y="13" width="4" height="4" rx="0.6" />
              <rect x="13" y="13" width="4" height="4" rx="0.6" />
            </svg>
          </button>
          <SabLogo />
        </div>

        {/* Center nav tabs */}
        <nav className="flex items-stretch flex-1 justify-center gap-1 self-stretch">
          {([
            { key: "applications", label: "Applications" },
            { key: "layouts",      label: "Layouts"      },
            { key: "objects",      label: "Objects"      },
            { key: "workbench",    label: "Workbench"    },
          ] as const).map(({ key, label }) => {
            const isActive = key === "objects";
            return (
              <button key={key}
                className="flex items-center"
                style={{
                  padding: "0 16px",
                  height: "100%",
                  background: "transparent",
                  borderTop: "none", borderLeft: "none", borderRight: "none",
                  borderBottom: isActive ? "2px solid var(--app-text-accent-muted)" : "2px solid transparent",
                  color: isActive ? "var(--app-text-accent-muted)" : "var(--app-text-muted)",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "var(--app-text-secondary)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "var(--app-text-muted)"; }}>
                {label}
              </button>
            );
          })}
        </nav>

        {/* Right: theme toggle + Create Object CTA */}
        <div className="flex items-center gap-3 shrink-0 self-center" style={{ minWidth: 200, justifyContent: "flex-end" }}>
          <ThemeToggle />
          <button
            onClick={() => { setCreateMode("launcher"); setEditDraft(null); setSelectedId(null); autoRotateRef.current = false; }}
            className="flex items-center gap-2 px-4 h-8 rounded-lg shrink-0"
            style={{
              background: "var(--app-btn-primary-bg)",
              color: "var(--app-btn-primary-text)",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.01em",
              transition: "all 0.15s",
              boxShadow: "0 1px 4px var(--app-btn-primary-shadow)",
              visibility: createMode !== null ? "hidden" : "visible",
              pointerEvents: createMode !== null ? "none" : "auto",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--app-btn-primary-hover)"; e.currentTarget.style.boxShadow = "0 2px 8px var(--app-btn-primary-shadow)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--app-btn-primary-bg)"; e.currentTarget.style.boxShadow = "0 1px 4px var(--app-btn-primary-shadow)"; }}>
            <Plus size={13} />
            Create Object
          </button>
        </div>
      </header>
      )}

      {/* ─── LEFT PANEL (graph explore — hidden in card view) ───────────────── */}
      {createMode === null && objectsViewMode === "graph" && (
      <div className="absolute z-20 w-48 overflow-hidden"
        style={{
          top: HEADER_H + CHROME_INSET,
          left: CHROME_INSET,
          borderRadius: 16,
          background: PANEL_OVERLAY_BG,
          border: "1px solid var(--app-border)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "var(--app-shell-shadow)",
          pointerEvents: "auto",
        }}>
        <div style={{ padding: CHROME_INSET - 4 }}>
          <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.12em", marginBottom: 10, fontWeight: 600 }}>EXPLORE</div>
          <div style={{ marginBottom: 12 }}>
            {[
              { key: "objects"  as const, label: "Objects",  count: objNodes.length,    color: graphColors.object },
              { key: "fields"   as const, label: "Fields",   count: fieldNodes.length,  color: graphColors.field  },
              { key: "layouts"  as const, label: "Layouts",  count: layoutNodes.length, color: graphColors.layout },
            ].map(({ key, label, count, color }) => (
              <div key={key} className="flex items-center justify-between mb-2.5">
                <button className="flex items-center gap-2" onClick={() => setVisibility(v => ({ ...v, [key]: !v[key] }))}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: visibility[key] ? color : "transparent", border: `1.5px solid ${visibility[key] ? color : "var(--app-text-disabled)"}`, boxShadow: visibility[key] ? `0 0 6px ${color}88` : "none", transition: "all 0.2s" }} />
                  <span style={{ color: visibility[key] ? "var(--app-text-primary)" : "var(--app-text-muted)", fontSize: 12, transition: "color 0.2s" }}>{label}</span>
                </button>
                <span style={{ color: "var(--app-text-secondary)", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{count}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--app-border-subtle)", margin: "10px 0" }} />
          <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.08em", marginBottom: 8, fontWeight: 600 }}>RELATIONSHIPS</div>
          <div className="space-y-2">
            {[
              { label: "Object ↔ Object",  c: graphColors.object },
              { label: "Object ↔ Field",   c: graphColors.field  },
              { label: "Object ↔ Layout",  c: graphColors.layout },
              { label: "Field ↔ Field",    c: graphColors.fieldLookup, dash: true },
            ].map(({ label, c, dash }) => (
              <div key={label} className="flex items-center gap-2">
                <svg width={20} height={6}>
                  <line x1={0} y1={3} x2={20} y2={3} stroke={c} strokeWidth={1.5} strokeDasharray={dash ? "3 2" : ""} opacity={0.8} />
                </svg>
                <span style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 400 }}>{label}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--app-border-subtle)", marginTop: 12, paddingTop: 10 }}>
            <div style={{ color: "var(--app-text-muted)", fontSize: 10, letterSpacing: "0.08em", marginBottom: 6, fontWeight: 600 }}>VIEW</div>
            <button className="w-full py-1.5 rounded-lg text-center text-xs flex items-center justify-center gap-1.5"
              style={{
                background: `${graphColors.object}18`,
                border: `1px solid ${graphColors.object}44`,
                color: "var(--app-text-body)",
                transition: "all 0.2s",
                cursor: objectsFilterActive ? "not-allowed" : "pointer",
                opacity: objectsFilterActive ? 0.55 : 1,
              }}
              title={objectsFilterActive ? "Auto-rotate pauses while a filter is applied" : "Auto-rotate"}
              disabled={objectsFilterActive}
              onClick={() => {
                if (filterLockRotateRef.current) return;
                const next = !autoRotateRef.current;
                if (next) {
                  clearIdleRotateTimer();
                  if (!arrivalActiveRef.current) autoRotateRef.current = true;
                } else {
                  pauseRotateForIdle();
                }
              }}>
              <RotateCcw size={10} />
              Auto-rotate
            </button>
          </div>

        </div>
      </div>
      )}

      {/* ─── GRAPH EMPTY STATE WHEN FILTERS MATCH NOTHING ───────────────────── */}
      {createMode === null && objectsViewMode === "graph" && objectsFilterActive && filteredObjectCount === 0 && (
        <div
          className="absolute z-[15] flex items-center justify-center pointer-events-none"
          style={{
            top: graphTop,
            left: 0,
            right: graphRight,
            bottom: 0,
          }}
        >
          <div
            style={{
              padding: "28px 32px",
              borderRadius: 14,
              border: "1px dashed var(--app-border)",
              background: "var(--app-shell-bg-floating)",
              backdropFilter: "blur(16px)",
              boxShadow: "var(--app-shell-shadow)",
              textAlign: "center",
              maxWidth: 360,
              pointerEvents: "auto",
            }}
          >
            <div style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              No objects match
            </div>
            <div style={{ color: "var(--app-text-muted)", fontSize: 13, lineHeight: 1.45, marginBottom: 14 }}>
              Clear filters to bring the full graph back.
            </div>
            <button
              type="button"
              onClick={clearObjectsFilter}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "var(--app-btn-primary-bg)",
                color: "var(--app-btn-primary-text)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* ─── TOOLBAR: applied filter (left) + filter / view / search (right) ─ */}
      {createMode === null && (
      <div
        className="absolute z-20 flex items-center gap-2"
        style={{
          top: HEADER_H + CHROME_INSET,
          left: objectsViewMode === "graph" ? CHROME_INSET + EXPLORE_PANEL_W + 12 : CHROME_INSET,
          right: CHROME_INSET + graphRight,
          transition: "right 0.25s ease, left 0.25s ease",
          pointerEvents: "none",
        }}
      >
        {objectsFilterActive ? (
          <div
            className="flex items-center gap-2 min-w-0"
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              background: "var(--app-shell-bg-floating)",
              border: "1px solid var(--app-border-accent)",
              backdropFilter: "blur(16px)",
              boxShadow: "var(--app-search-shadow)",
              maxWidth: "min(52vw, 520px)",
              height: 36,
              boxSizing: "border-box",
              pointerEvents: "auto",
              overflow: "hidden",
            }}
          >
            <ListFilter size={13} style={{ color: "var(--app-accent)", flexShrink: 0 }} />
            <span style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
              Filtered · {filteredObjectCount} of {totalObjectCount}
            </span>
            <span style={{ width: 1, height: 14, background: "var(--app-border)", flexShrink: 0 }} />
            <div className="flex items-center gap-1.5 min-w-0" style={{ overflow: "hidden" }}>
              {appliedFilterChips.map(chip => (
                <span
                  key={chip}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "color-mix(in srgb, var(--app-accent) 14%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--app-accent) 28%, var(--app-border))",
                    color: "var(--app-accent)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={clearObjectsFilter}
              style={{
                marginLeft: 2,
                padding: "3px 9px",
                borderRadius: 8,
                border: "1px solid var(--app-border)",
                background: "var(--app-shell-bg-elevated)",
                color: "var(--app-text-secondary)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Clear all
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }} />
        )}
        <div className="flex items-center gap-2 ml-auto shrink-0" style={{ pointerEvents: "auto" }}>
        <div className="relative shrink-0" ref={objectsFilterRef}>
          <button
            type="button"
            title={objectsFilterActive ? "Filters applied — edit filters" : "Filter objects"}
            aria-label="Filter objects"
            aria-expanded={objectsFilterOpen}
            aria-haspopup="menu"
            aria-pressed={objectsFilterActive}
            className="flex items-center justify-center"
            onClick={() => {
              if (objectsFilterOpen) setObjectsFilterOpen(false);
              else openObjectsFilter();
            }}
            style={{
              width: 36,
              height: 36,
              padding: 0,
              borderRadius: 10,
              background: objectsFilterActive
                ? "var(--app-view-toggle-selected-bg)"
                : objectsFilterOpen
                  ? "color-mix(in srgb, var(--app-accent) 10%, var(--app-shell-bg-floating-soft))"
                  : "var(--app-shell-bg-floating-soft)",
              border: `1px solid ${objectsFilterActive || objectsFilterOpen ? "var(--app-border-accent)" : "var(--app-border)"}`,
              backdropFilter: "blur(16px)",
              boxShadow: "var(--app-search-shadow)",
              color: objectsFilterActive || objectsFilterOpen ? "var(--app-accent)" : "var(--app-text-muted)",
              cursor: "pointer",
              transition: "color 0.15s ease, border-color 0.15s ease, background 0.15s ease",
            }}
          >
            <ListFilter size={15} strokeWidth={objectsFilterActive ? 2.4 : 2} />
          </button>
          {objectsFilterOpen && (
            <div
              role="dialog"
              aria-label="Object filters"
              className="absolute top-11 right-0 rounded-xl overflow-hidden"
              style={{
                width: 280,
                padding: 12,
                background: "var(--app-shell-bg-floating)",
                border: "1px solid var(--app-border)",
                backdropFilter: "blur(20px)",
                zIndex: 50,
                boxShadow: "var(--app-shell-shadow-lg)",
              }}
            >
              <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>
                FILTER OBJECTS
              </div>
              {([
                {
                  key: "recentOnly" as const,
                  label: "Recently created",
                  hint: "Newest objects (session creates, or latest in the catalog)",
                  checked: objectsFilterDraft.recentOnly,
                  toggle: () => setObjectsFilterDraft(f => ({ ...f, recentOnly: !f.recentOnly })),
                },
                {
                  key: "hasRelationships" as const,
                  label: "Has relationships",
                  hint: "Lookup / master-detail links",
                  checked: objectsFilterDraft.hasRelationships,
                  toggle: () => setObjectsFilterDraft(f => ({ ...f, hasRelationships: !f.hasRelationships })),
                },
                {
                  key: "hasLayouts" as const,
                  label: "Has layouts",
                  hint: "Form, list, or detail views attached",
                  checked: objectsFilterDraft.hasLayouts,
                  toggle: () => setObjectsFilterDraft(f => ({ ...f, hasLayouts: !f.hasLayouts })),
                },
              ]).map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  role="checkbox"
                  aria-checked={opt.checked}
                  onClick={opt.toggle}
                  className="w-full text-left"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 8px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    background: opt.checked ? "color-mix(in srgb, var(--app-accent) 10%, transparent)" : "transparent",
                    color: "var(--app-text-primary)",
                    fontFamily: "inherit",
                    marginBottom: 2,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      flexShrink: 0,
                      marginTop: 1,
                      boxSizing: "border-box",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: opt.checked ? "var(--app-accent)" : "transparent",
                      border: opt.checked ? "1px solid var(--app-accent)" : "1px solid var(--app-border-strong)",
                      color: "#FFFFFF",
                    }}
                  >
                    {opt.checked ? <Check size={11} strokeWidth={3} /> : null}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: opt.checked ? 600 : 500 }}>{opt.label}</span>
                    <span style={{ fontSize: 10, color: "var(--app-text-subtle)" }}>{opt.hint}</span>
                  </span>
                </button>
              ))}
              <div style={{ borderTop: "1px solid var(--app-border-subtle)", margin: "8px 0" }} />
              <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 6 }}>
                OBJECT TYPE
              </div>
              <button
                type="button"
                role="checkbox"
                aria-checked={!objectsFilterDraft.objectType}
                onClick={() => setObjectsFilterDraft(f => ({ ...f, objectType: null }))}
                className="w-full text-left"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 8px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: !objectsFilterDraft.objectType ? "color-mix(in srgb, var(--app-accent) 10%, transparent)" : "transparent",
                  color: "var(--app-text-primary)",
                  fontSize: 12,
                  fontWeight: !objectsFilterDraft.objectType ? 600 : 500,
                  fontFamily: "inherit",
                  marginBottom: 2,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    flexShrink: 0,
                    boxSizing: "border-box",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: !objectsFilterDraft.objectType ? "var(--app-accent)" : "transparent",
                    border: !objectsFilterDraft.objectType ? "1px solid var(--app-accent)" : "1px solid var(--app-border-strong)",
                    color: "#FFFFFF",
                  }}
                >
                  {!objectsFilterDraft.objectType ? <Check size={11} strokeWidth={3} /> : null}
                </span>
                All types
              </button>
              {cardObjectTypes.map(t => {
                const checked = objectsFilterDraft.objectType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => setObjectsFilterDraft(f => ({ ...f, objectType: checked ? null : t }))}
                    className="w-full text-left"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 8px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      background: checked ? "color-mix(in srgb, var(--app-accent) 10%, transparent)" : "transparent",
                      color: "var(--app-text-primary)",
                      fontSize: 12,
                      fontWeight: checked ? 600 : 500,
                      fontFamily: "inherit",
                      marginBottom: 2,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        flexShrink: 0,
                        boxSizing: "border-box",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: checked ? "var(--app-accent)" : "transparent",
                        border: checked ? "1px solid var(--app-accent)" : "1px solid var(--app-border-strong)",
                        color: "#FFFFFF",
                      }}
                    >
                      {checked ? <Check size={11} strokeWidth={3} /> : null}
                    </span>
                    {t}
                  </button>
                );
              })}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {objectsFilterActive || objectsFilterDraftActive ? (
                  <button
                    type="button"
                    onClick={clearObjectsFilter}
                    style={{
                      flex: 1,
                      padding: "9px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--app-border)",
                      background: "var(--app-shell-bg-elevated)",
                      color: "var(--app-text-secondary)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Clear all
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={applyObjectsFilter}
                  style={{
                    flex: 1,
                    padding: "9px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "var(--app-btn-primary-bg)",
                    color: "var(--app-btn-primary-text)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    boxShadow: "0 1px 4px var(--app-btn-primary-shadow)",
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
        <div
          role="group"
          aria-label="Objects view mode"
          className="flex items-stretch shrink-0"
          style={{
            height: 36,
            padding: 0,
            borderRadius: 10,
            background: "var(--app-shell-bg-floating-soft)",
            border: "1px solid var(--app-border)",
            backdropFilter: "blur(16px)",
            boxShadow: "var(--app-search-shadow)",
            overflow: "hidden",
          }}
        >
          {([
            { id: "graph" as const, label: "Graph view", Icon: Network },
            { id: "cards" as const, label: "Card view", Icon: LayoutGrid },
          ]).map(opt => {
            const active = objectsViewMode === opt.id;
            const Icon = opt.Icon;
            return (
              <button
                key={opt.id}
                type="button"
                title={opt.label}
                aria-label={opt.label}
                aria-pressed={active}
                onClick={() => {
                  setObjectsViewMode(opt.id);
                  setHoveredId(null);
                  if (opt.id === "cards") {
                    autoRotateRef.current = false;
                    pauseRotateForIdle();
                  }
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: "100%",
                  padding: 0,
                  border: "none",
                  borderRadius: 0,
                  cursor: "pointer",
                  background: active ? "var(--app-view-toggle-selected-bg)" : "transparent",
                  color: active ? "var(--app-accent)" : "var(--app-text-muted)",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                <Icon size={15} strokeWidth={active ? 2.4 : 2} />
              </button>
            );
          })}
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 px-3 h-9 rounded-lg"
            style={{
              background: "var(--app-shell-bg-floating-soft)",
              border: `1px solid ${searchFocused ? `${graphColors.object}66` : "var(--app-border)"}`,
              backdropFilter: "blur(16px)",
              boxShadow: searchFocused ? "var(--app-search-shadow-focus)" : "var(--app-search-shadow)",
              transition: "all 0.2s",
              width: searchFocused || searchQuery ? 240 : 200,
            }}>
            <Search size={13} style={{ color: searchFocused ? graphColors.objectBright : "var(--app-text-muted)", flexShrink: 0, transition: "color 0.2s" }} />
            <input
              className="flex-1 bg-transparent outline-none"
              style={{ color: "var(--app-text-primary)", fontSize: 13, caretColor: graphColors.objectBright }}
              placeholder="Search objects, fields…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 160)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ color: "var(--app-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <X size={11} />
              </button>
            )}
          </div>
          {searchFocused && hasSearchResults && (
            <div className="absolute top-11 right-0 rounded-xl overflow-hidden"
              style={{
                width: 260,
                maxHeight: "min(60vh, 360px)",
                overflowY: "auto",
                padding: 16,
                background: "var(--app-shell-bg-floating)",
                border: "1px solid var(--app-border)",
                backdropFilter: "blur(20px)",
                zIndex: 50,
                boxShadow: "var(--app-shell-shadow-lg)",
                scrollbarWidth: "thin",
                scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent",
              }}>
              {(["objects","fields","layouts"] as const)
                .filter(type => searchResults[type].length > 0)
                .map((type, typeIdx) => {
                const items = searchResults[type];
                const dotColor = type === "objects" ? graphColors.object : type === "fields" ? graphColors.field : graphColors.layout;
                return (
                  <div key={type} style={{ marginTop: typeIdx === 0 ? 0 : 12 }}>
                    <div style={{
                      color: "var(--app-text-muted)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      fontWeight: 600,
                      marginBottom: 8,
                    }}>
                      {type.toUpperCase()}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {items.map(node => (
                        <button key={node.id} className="w-full text-left flex items-center gap-2"
                          style={{
                            color: "var(--app-text-primary)",
                            fontSize: 12,
                            padding: "8px 0",
                            transition: "background 0.15s, color 0.2s",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            borderRadius: 8,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--app-shell-bg-hover)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          onMouseDown={() => handleSearchSelect(node)}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
                          {node.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </div>
      )}

      {/* ─── DETAIL PANEL ────────────────────────────────────────────────────── */}
      {selectedNode && createMode === null && (() => {
        const closePanel = () => {
          setSelectedId(null);
          if (objectsViewMode === "graph") {
            releaseFocusMotion();
            if (filterLockRotateRef.current && filteredObjectIdSet && filteredObjectIdSet.size > 0) {
              frameFilteredCluster(filteredObjectIdSet, 700);
            } else {
              fitAllInView(700, { restoreMotion: true, resumeRotate: true });
            }
          }
        };
        const selectId = (id: string) => {
          setSelectedId(id);
          if (objectsViewMode !== "graph") return;
          clearCameraAnimTimer();
          cameraAnimTimerRef.current = setTimeout(() => {
            flyToClusterParallax(id, 900, { distMul: 0.72 });
          }, 50);
        };
        const related = Array.from(fullNodeMap.values());

        if (selectedNode.type === "object" || selectedNode.type === "field" || isDynNode(selectedNode.id)) {
          return (
            <ObjectPropertiesPanel
              node={selectedNode}
              relatedNodes={related}
              isUserCreated={isDynNode(selectedNode.id) || (selectedNode.parentId ? isDynNode(selectedNode.parentId) : false)}
              onClose={closePanel}
              onNodeSelect={selectId}
              onDeleteObject={handleDeleteObject}
              onEditObject={handleEditObject}
            />
          );
        }
        return (
          <DetailPanel
            node={selectedNode}
            nodeMap={fullNodeMap}
            edges={[...edges, ...dynamicEdges]}
            onClose={closePanel}
            onNodeSelect={n => selectId(n.id)}
          />
        );
      })()}

      {/* ─── CANVAS CONTROLS ─────────────────────────────────────────────────── */}
      {/* Hide while creating, card view, or while the right properties/detail panel is open */}
      {createMode === null && objectsViewMode === "graph" && !selectedNode && (
        <CanvasControls
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFocusSelected={focusSelected}
          hasSelection={!!selectedId}
        />
      )}

      {/* ─── MINIMAP ─────────────────────────────────────────────────────────── */}
      {createMode === null && objectsViewMode === "graph" && (
        <MiniMap
          nodes={[...nodes, ...(dynamicNodes as unknown as GNode[])].filter(n => {
            if (!filteredObjectIdSet) return true;
            if (n.type === "object") return filteredObjectIdSet.has(n.id);
            return n.parentId ? filteredObjectIdSet.has(n.parentId) : true;
          })}
          selectedId={selectedId}
          visibility={visibility}
        />
      )}

      {/* ─── TOOLTIP ─────────────────────────────────────────────────────────── */}
      {objectsViewMode === "graph" && hoveredNode && (
        <Tooltip node={hoveredNode} x={mousePos.x + 16} y={mousePos.y - 10} nodes={[...nodes, ...dynamicNodes as unknown as GNode[]]} edges={edges} />
      )}

      {/* ─── GUIDE (graph view only) ─────────────────────────────────────────── */}
      {showGuide && createMode === null && objectsViewMode === "graph" && (
        <div className="absolute bottom-20 left-1/2 z-10 pointer-events-none"
          style={{ transform: "translateX(-50%)", textAlign: "center", animation: "fadeGuide 3s ease-in-out infinite" }}>
          <style>{`@keyframes fadeGuide{0%,100%{opacity:0.4}50%{opacity:0.85}}`}</style>
          <div className="text-sm text-muted-foreground">Drag to orbit · Scroll to zoom · Click a node to explore</div>
        </div>
      )}

      {/* ─── CREATE OBJECT ROUTING ───────────────────────────────────────────── */}
      {createMode === "launcher" && (
        <CreateObjectLauncher
          onClose={handlePanelClose}
          onSelect={(mode) => setCreateMode(mode)}
        />
      )}
      {createMode === "manual" && (
        <CreateObjectWizard
          // Stable key for the whole open session so save success is not remounted as step 1
          key={editDraft?.editId ? `edit-${editDraft.editId}` : "create-new"}
          onClose={handlePanelClose}
          onObjectCreated={handleObjectCreated}
          onPreviewChange={handlePreviewChange}
          editInitial={editDraft}
          existingApiNames={existingApiNames}
          availableObjects={availableObjects}
        />
      )}
      {createMode === "ai" && (
        <CreateObjectAIPanel
          onClose={handlePanelClose}
          onObjectCreated={handleObjectCreated}
          onPreviewChange={handlePreviewChange}
          existingApiNames={existingApiNames}
        />
      )}
      {createMode === "template" && (
        <CreateObjectTemplatePanel
          onClose={handlePanelClose}
          onObjectCreated={handleObjectCreated}
          onPreviewChange={handlePreviewChange}
          onCameraFlyTo={handleCameraFlyTo}
          existingApiNames={existingApiNames}
        />
      )}

    </div>
    </DndProvider>
    </GraphColorsProvider>
  );
}
