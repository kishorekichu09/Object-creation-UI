/**
 * Agentic Object Creation — planning, validation, and contextual edit helpers.
 * Frontend orchestration ready for a real agent backend; suite inference remains
 * the existing prototype generator (inferSuite / SUITES).
 */

export interface GenField {
  label: string;
  type: string;
  required: boolean;
  relatedObjectId?: string;
  /** API / event name — defaults derived from label when empty. */
  name?: string;
  length?: number;
  defaultValue?: string;
  helpTitle?: string;
  helpText?: string;
  isUnique?: boolean;
  isReadOnly?: boolean;
  isSearchResultEnabled?: boolean;
  isSearchEnabled?: boolean;
  isListViewEnabled?: boolean;
  isAugmentationEnabled?: boolean;
  isFreezeColumn?: boolean;
  isExternalMapper?: boolean;
}

export interface GenObject {
  name: string;
  description: string;
  color: string;
  fields: GenField[];
}

export interface GenSuite {
  suiteName: string;
  prompt: string;
  objects: GenObject[];
}

export type AgentTaskStatus =
  | "completed"
  | "in_progress"
  | "pending"
  | "attention"
  | "failed";

export interface AgentTask {
  id: string;
  label: string;
  status: AgentTaskStatus;
}

export interface PlannedFieldDetail {
  label: string;
  type: string;
  required: boolean;
}

export interface PlannedObjectDetail {
  name: string;
  fieldCount: number;
  description: string;
  fields: PlannedFieldDetail[];
  requiredCount: number;
}

export interface PlannedRelationship {
  from: string;
  to: string;
  viaField: string;
}

export interface ExecutionPlan {
  suiteName: string;
  goal: string;
  objectCount: number;
  fieldCount: number;
  relationshipCount: number;
  configsIdentified: number;
  objects: PlannedObjectDetail[];
  relationships: PlannedRelationship[];
  assumptions: string[];
  stages: Array<{ id: string; label: string; detail: string }>;
  /** Planned object names snapshot used during validation. */
  plannedObjectNames: string[];
  plannedFieldTotal: number;
  plannedRelationshipTotal: number;
}

/** Cursor-style disclosure: one-line summary + optional detail lines. */
export interface ThinkingStep {
  id: string;
  stage: "understand" | "plan" | "create" | "connect" | "validate" | "build" | "deploy";
  summary: string;
  detail?: string[];
  status: AgentTaskStatus;
}

export interface NarrativeBeat {
  delayMs: number;
  /** Update or create a thinking step / chat status */
  kind: "thinking" | "status" | "plan_ready" | "ask" | "stage";
  thinking?: ThinkingStep;
  statusText?: string;
  questions?: string[];
}

export interface ValidationIssue {
  id: string;
  objectName: string;
  message: string;
  autoFixable: boolean;
  code:
    | "missing_object"
    | "empty_name"
    | "no_fields"
    | "duplicate_object"
    | "duplicate_field"
    | "invalid_type"
    | "unresolved_lookup"
    | "name_collision"
    | "missing_required_label";
  /** Indices used by auto-fix / review navigation */
  objectIndex?: number;
  fieldIndex?: number;
}

export interface ValidationResult {
  objectsCreated: number;
  objectsPlanned: number;
  fieldsConfigured: number;
  fieldsPlanned: number;
  relationshipsEstablished: number;
  relationshipsPlanned: number;
  passed: boolean;
  issues: ValidationIssue[];
}

const KNOWN_FIELD_TYPES = new Set([
  "Single-Line",
  "Multi Line",
  "Email Address",
  "Number",
  "Currency",
  "Drop-Down",
  "Multi Select",
  "Date Picker",
  "Date & Time",
  "Lookup",
  "Image",
  "Master Details",
  "Geolocation",
  "Password",
]);

export function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function defaultFieldApiName(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "") || "field";
}

/** Fill missing field config defaults used by Help Text / Advanced Settings. */
export function ensureFieldConfigDefaults(field: GenField): GenField {
  return {
    ...field,
    name: field.name?.trim() || defaultFieldApiName(field.label),
    length: field.length ?? 30,
    defaultValue: field.defaultValue ?? "",
    helpTitle: field.helpTitle ?? "",
    helpText: field.helpText ?? "",
    isUnique: field.isUnique ?? false,
    isReadOnly: field.isReadOnly ?? false,
    isSearchResultEnabled: field.isSearchResultEnabled ?? false,
    isSearchEnabled: field.isSearchEnabled ?? false,
    isListViewEnabled: field.isListViewEnabled ?? false,
    isAugmentationEnabled: field.isAugmentationEnabled ?? false,
    isFreezeColumn: field.isFreezeColumn ?? false,
    isExternalMapper: field.isExternalMapper ?? false,
  };
}

/** Infer Lookup targets from field labels against sibling objects in the suite. */
export function enrichLookupRelations(objects: GenObject[]): GenObject[] {
  return objects.map((obj, oi) => ({
    ...obj,
    fields: obj.fields.map(field => {
      const base = ensureFieldConfigDefaults(field);
      if (base.type !== "Lookup" && base.type !== "Master Details") {
        return { ...base, relatedObjectId: undefined };
      }
      const labelToken = normalizeToken(base.label);
      let bestIdx = -1;
      let bestScore = 0;
      objects.forEach((candidate, ci) => {
        if (ci === oi) return;
        const nameToken = normalizeToken(candidate.name);
        if (!nameToken) return;
        let score = 0;
        if (labelToken === nameToken) score = 3;
        else if (labelToken.includes(nameToken) || nameToken.includes(labelToken)) score = 2;
        else if (labelToken.startsWith(nameToken) || nameToken.startsWith(labelToken)) score = 1;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = ci;
        }
      });
      return {
        ...base,
        relatedObjectId: bestIdx >= 0 ? `__ai_obj${bestIdx}__` : undefined,
      };
    }),
  }));
}

export function buildSuiteObjEdges(objects: GenObject[]): Array<{ from: string; to: string }> {
  const edges: Array<{ from: string; to: string }> = [];
  const seen = new Set<string>();
  objects.forEach((obj, oi) => {
    const fromId = `__ai_obj${oi}__`;
    obj.fields.forEach(field => {
      if (!field.relatedObjectId || field.relatedObjectId === fromId) return;
      const key = `${fromId}->${field.relatedObjectId}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ from: fromId, to: field.relatedObjectId });
    });
  });
  return edges;
}

export function countPlannedRelationships(objects: GenObject[]): number {
  return buildSuiteObjEdges(enrichLookupRelations(objects)).length;
}

export function buildExecutionPlan(suite: GenSuite): ExecutionPlan {
  const enriched = enrichLookupRelations(
    suite.objects.map(o => ({ ...o, fields: o.fields.map(f => ({ ...f })) })),
  );
  const fieldCount = enriched.reduce((sum, o) => sum + o.fields.length, 0);
  const edges = buildSuiteObjEdges(enriched);
  const relationshipCount = edges.length;
  const configsIdentified = enriched.reduce(
    (sum, o) => sum + o.fields.filter(f => f.required || f.type === "Lookup" || f.type === "Master Details").length,
    0,
  );
  const relationships: PlannedRelationship[] = [];
  enriched.forEach((obj, oi) => {
    obj.fields.forEach(field => {
      if (!field.relatedObjectId) return;
      const match = /^__ai_obj(\d+)__$/.exec(field.relatedObjectId);
      if (!match) return;
      const to = enriched[Number(match[1])];
      if (!to) return;
      relationships.push({ from: obj.name, to: to.name, viaField: field.label });
    });
  });

  const promptLower = suite.prompt.toLowerCase();
  const assumptions: string[] = [
    `Suite name: ${suite.suiteName}`,
    `Primary objects derived from your description: ${enriched.map(o => o.name).join(", ")}`,
  ];
  if (/\b(crm|sales|lead)\b/.test(promptLower)) {
    assumptions.push("Interpreted as a sales/CRM domain with lead-to-account lifecycle.");
  }
  if (relationships.length > 0) {
    assumptions.push(`Will connect objects via ${relationships.length} lookup relationship${relationships.length === 1 ? "" : "s"}.`);
  } else {
    assumptions.push("No strong in-suite relationships detected yet; can add them after review.");
  }

  return {
    suiteName: suite.suiteName,
    goal: suite.prompt.trim(),
    objectCount: enriched.length,
    fieldCount,
    relationshipCount,
    configsIdentified,
    objects: enriched.map(o => ({
      name: o.name,
      fieldCount: o.fields.length,
      description: o.description,
      fields: o.fields.map(f => ({ label: f.label, type: f.type, required: f.required })),
      requiredCount: o.fields.filter(f => f.required).length,
    })),
    relationships,
    assumptions,
    stages: [
      { id: "understand", label: "Understand", detail: "Interpret your requirements and goal" },
      { id: "plan", label: "Plan", detail: "Determine objects, fields, data types and relationships" },
      { id: "create", label: "Create", detail: "Create objects and configure fields" },
      { id: "connect", label: "Connect", detail: "Establish relationships between objects" },
      { id: "validate", label: "Validate", detail: "Check missing fields, invalid configs and conflicts" },
      { id: "build", label: "Build", detail: "Finalize the object suite for review" },
      { id: "deploy", label: "Deploy", detail: "Deploy after your approval" },
    ],
    plannedObjectNames: enriched.map(o => o.name),
    plannedFieldTotal: fieldCount,
    plannedRelationshipTotal: relationshipCount,
  };
}

/**
 * Cursor/Claude-style planning narrative: quiet thinking, warm conversation,
 * then clarifying questions before any objects are created.
 */
export function buildPlanningNarrative(
  prompt: string,
  suite: GenSuite,
  questions: string[],
): NarrativeBeat[] {
  const plan = buildExecutionPlan(suite);
  const domain = suite.suiteName.replace(/\s*Suite\s*$/i, "").trim() || "your app";
  const objectList = plan.objects.map(o => o.name).join(", ");
  const shortGoal = prompt.trim().slice(0, 120) + (prompt.trim().length > 120 ? "…" : "");

  const beats: NarrativeBeat[] = [
    {
      delayMs: 0,
      kind: "thinking",
      thinking: {
        id: "th_read",
        stage: "understand",
        summary: "Reading your request",
        detail: [
          "Taking in what you described in plain language.",
          "Looking for the business records people will actually work with.",
        ],
        status: "in_progress",
      },
      statusText: "Got it — I'm reading through what you need…",
    },
    {
      delayMs: 1400,
      kind: "thinking",
      thinking: {
        id: "th_read",
        stage: "understand",
        summary: "Read your request",
        detail: [
          `You're aiming for something in the ${domain} space.`,
          `From “${shortGoal}”, the durable records look like: ${objectList}.`,
        ],
        status: "completed",
      },
      statusText: `I hear you wanting a ${domain.toLowerCase()} setup. I'm mapping that to concrete objects next.`,
    },
    {
      delayMs: 1600,
      kind: "thinking",
      thinking: {
        id: "th_shape",
        stage: "plan",
        summary: "Shaping a first draft",
        detail: [
          `Sketching ${plan.objectCount} objects and ${plan.fieldCount} fields.`,
          plan.relationshipCount > 0
            ? `Noting ${plan.relationshipCount} relationship${plan.relationshipCount === 1 ? "" : "s"} to connect later.`
            : "Relationships can wait until you confirm the object set.",
          "Nothing is created on your graph yet — this is only a draft plan.",
        ],
        status: "in_progress",
      },
      statusText: "I'm drafting a plan you can steer — still no objects on the graph until you say Proceed.",
    },
    {
      delayMs: 1500,
      kind: "thinking",
      thinking: {
        id: "th_shape",
        stage: "plan",
        summary: "Draft ready to review",
        detail: [
          `${objectList}`,
          `${plan.fieldCount} fields sketched · ${plan.configsIdentified} required/lookup configs flagged.`,
        ],
        status: "completed",
      },
    },
  ];

  if (questions.length > 0) {
    beats.push({
      delayMs: 1100,
      kind: "ask",
      questions,
      statusText: "Before I lock the plan, a couple of quick questions so we don't build the wrong thing:",
      thinking: {
        id: "th_ask",
        stage: "understand",
        summary: "Waiting on you",
        detail: questions,
        status: "attention",
      },
    });
  } else {
    beats.push({
      delayMs: 900,
      kind: "plan_ready",
      statusText: "Here's a draft plan. Tweak it in chat, or Proceed when it looks right — I'll create objects only after you approve.",
    });
  }

  return beats;
}

export function buildStageChecklist(planReady = false): AgentTask[] {
  return [
    { id: "understand", label: "Understand — interpret requirements", status: planReady ? "completed" : "in_progress" },
    { id: "plan", label: "Plan — fields, types & relationships", status: planReady ? "completed" : "pending" },
    { id: "create", label: "Create — objects & field configs", status: "pending" },
    { id: "connect", label: "Connect — establish relationships", status: "pending" },
    { id: "validate", label: "Validate — configs & conflicts", status: "pending" },
    { id: "build", label: "Build — finalize suite", status: "pending" },
    { id: "deploy", label: "Deploy — after your approval", status: "pending" },
  ];
}

/**
 * Always ask 1–2 focused questions (Cursor Plan Mode style) so the user
 * steers the plan before any objects are created.
 */
export function detectClarificationNeeds(prompt: string, suite: GenSuite, isGenericFallback: boolean): string[] {
  const questions: string[] = [];
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  const p = prompt.toLowerCase();
  const names = suite.objects.map(o => o.name);

  if (words.length < 6) {
    questions.push("In a sentence or two, what does success look like for the people who will use these records day to day?");
  }

  if (isGenericFallback) {
    questions.push(`I drafted ${names.slice(0, 3).join(", ")}${names.length > 3 ? ", and more" : ""}. Want me to keep that set, or focus on fewer core objects first?`);
  } else if (names.length >= 4) {
    const last = names[names.length - 1];
    questions.push(`Should I include ${last} in the first version, or keep the first pass leaner (${names.slice(0, 3).join(", ")})?`);
  }

  if (/\b(crm|lead|sales|deal)\b/.test(p)) {
    questions.push("For deals/leads, what matters most to track first — stage/status, owner, or amount?");
  } else if (/\b(hr|employee|leave|payroll)\b/.test(p)) {
    questions.push("For people records, should I prioritize org structure (department/manager) or time-off / payroll first?");
  } else if (/\b(invoice|financ|expense|payment)\b/.test(p)) {
    questions.push("For finance, should invoices connect to clients/accounts, or stay standalone for now?");
  } else if (/\b(project|task|sprint)\b/.test(p)) {
    questions.push("Do you want tasks nested under projects from day one, or start with a flat task list?");
  } else if (!questions.length) {
    questions.push(`Anything I should treat as required on ${names[0] || "the primary object"} (for example Status, Owner, or dates)?`);
  }

  // Prefer relational clarity when many objects
  if (suite.objects.length >= 3 && countPlannedRelationships(suite.objects) === 0 && questions.length < 2) {
    questions.push("Should I wire lookup relationships between these objects where the names clearly connect?");
  }

  // Unique, max 2
  const seen = new Set<string>();
  return questions.filter(q => {
    if (seen.has(q)) return false;
    seen.add(q);
    return true;
  }).slice(0, 2);
}

/** Capabilities the agent can perform — used in the planning briefing UI. */
export const AGENT_CAPABILITIES = [
  { id: "understand", title: "Understand", detail: "Interpret your goal and the records you need" },
  { id: "plan", title: "Plan", detail: "Propose objects, fields, types, and relationships" },
  { id: "create", title: "Create", detail: "Create objects and configure fields on the graph" },
  { id: "connect", title: "Connect", detail: "Link related objects with lookups" },
  { id: "validate", title: "Validate", detail: "Catch missing fields, bad types, and conflicts" },
  { id: "build", title: "Build", detail: "Finalize a reviewable suite before deploy" },
  { id: "deploy", title: "Deploy", detail: "Publish to your graph after you approve" },
] as const;

/** Quick-reply chips for clarifying questions (user can still type freely). */
export function buildClarificationChoices(suite: GenSuite, questions: string[]): string[] {
  const names = suite.objects.map(o => o.name);
  const chips: string[] = [];
  const q = questions.join(" ").toLowerCase();
  if (/\bactivity\b/.test(q) || names.some(n => /activity/i.test(n))) {
    chips.push(`Include ${names[names.length - 1] || "Activity"} in the first version`);
    chips.push(`Keep it lean — ${names.slice(0, Math.min(3, names.length)).join(", ")} only`);
  }
  if (/\bstage|status|owner|amount\b/.test(q)) {
    chips.push("Prioritize Status / Stage fields");
    chips.push("Prioritize Owner and Amount");
  }
  if (/\brelationship|lookup|connect|wire\b/.test(q)) {
    chips.push("Yes — wire relationships where names connect");
    chips.push("Not yet — objects first, relationships later");
  }
  if (chips.length === 0) {
    chips.push("Looks good — use your best judgment");
    chips.push(`Focus on ${names.slice(0, 2).join(" & ") || "core objects"} first`);
  }
  chips.push("I'll type a custom answer…");
  return chips.slice(0, 4);
}

/** Second-pass thinking after the user answers clarifying questions. */
export function buildReanalysisNarrative(prompt: string, suite: GenSuite, answer: string): NarrativeBeat[] {
  const plan = buildExecutionPlan(suite);
  const domain = suite.suiteName.replace(/\s*Suite\s*$/i, "").trim() || "your app";
  return [
    {
      delayMs: 0,
      kind: "thinking",
      thinking: {
        id: "th_re_read",
        stage: "understand",
        summary: "Reading your answers",
        detail: [
          `You said: “${answer.slice(0, 140)}${answer.length > 140 ? "…" : ""}”`,
          "Merging that with your original goal.",
        ],
        status: "in_progress",
      },
      statusText: "Thanks — I'm reading your answers and updating my understanding…",
    },
    {
      delayMs: 1300,
      kind: "thinking",
      thinking: {
        id: "th_re_read",
        stage: "understand",
        summary: "Updated understanding",
        detail: [
          `Goal still centers on ${domain}.`,
          "Adjusting scope, required fields, and what to connect.",
        ],
        status: "completed",
      },
      statusText: "Got it. I'm locking what matters for your goal, then I'll write the plan.",
    },
    {
      delayMs: 1400,
      kind: "thinking",
      thinking: {
        id: "th_plan_final",
        stage: "plan",
        summary: "Writing the object plan",
        detail: [
          `${plan.objectCount} objects · ${plan.fieldCount} fields · ${plan.relationshipCount} relationships.`,
          "Spelling out objects, fields, types, and helpful extras for your CRM-style workflow.",
        ],
        status: "in_progress",
      },
      statusText: "Writing a detailed plan you can review before anything is created…",
    },
    {
      delayMs: 1600,
      kind: "thinking",
      thinking: {
        id: "th_plan_final",
        stage: "plan",
        summary: "Plan ready",
        detail: plan.objects.map(o => `${o.name} — ${o.fieldCount} fields`),
        status: "completed",
      },
    },
    {
      delayMs: 700,
      kind: "plan_ready",
      statusText: `Based on “${prompt.trim().slice(0, 80)}${prompt.trim().length > 80 ? "…" : ""}” and your answers, I've drafted a full object plan — objects, fields, relationships, and extras that should help you hit your goal. Open the plan file to review it.`,
    },
  ];
}

export function isGenericSuiteInference(prompt: string): boolean {
  const p = prompt.toLowerCase();
  if (p.match(/crm|lead|sales|pipeline|deal|opportunit/)) return false;
  if (p.match(/hr|employee|staff|payroll|leave|attend|human resource/)) return false;
  if (p.match(/financ|invoice|billing|payment|budget|expense/)) return false;
  if (p.match(/project|task|sprint|agile|todo|milestone|roadmap/)) return false;
  if (p.match(/ecomm|store|product|order|shop|cart|inventory|customer/)) return false;
  if (p.match(/it service|ticket|asset|incident|helpdesk|support|itil/)) return false;
  return true;
}

export function buildInitialAgentTasks(suite: GenSuite): AgentTask[] {
  const tasks: AgentTask[] = [
    { id: "understand", label: "Understand — interpret requirements", status: "completed" },
    { id: "plan", label: "Plan — fields, types & relationships", status: "completed" },
    { id: "create", label: "Create — objects & field configs", status: "in_progress" },
  ];
  suite.objects.forEach((obj, oi) => {
    tasks.push({ id: `create_${oi}`, label: `Creating ${obj.name} object`, status: "pending" });
    tasks.push({ id: `fields_${oi}`, label: `Configuring ${obj.name} fields`, status: "pending" });
  });
  tasks.push({ id: "connect", label: "Connect — establish relationships", status: "pending" });
  tasks.push({ id: "validate", label: "Validate — configs & conflicts", status: "pending" });
  tasks.push({ id: "build", label: "Build — finalize suite", status: "pending" });
  tasks.push({ id: "deploy", label: "Deploy — after your approval", status: "pending" });
  return tasks;
}

export function tasksForGenerationTick(
  tasks: AgentTask[],
  suite: GenSuite,
  revealed: { obj: number; field: number },
): AgentTask[] {
  const lastObj = suite.objects.length - 1;
  const lastField = (suite.objects[lastObj]?.fields.length ?? 1) - 1;
  const createDone = revealed.obj > lastObj
    || (revealed.obj === lastObj && revealed.field >= lastField);

  return tasks.map(task => {
    if (task.id === "understand" || task.id === "plan") {
      return { ...task, status: "completed" };
    }
    if (task.id === "create") {
      return { ...task, status: createDone ? "completed" : "in_progress" };
    }
    const createMatch = /^create_(\d+)$/.exec(task.id);
    if (createMatch) {
      const oi = Number(createMatch[1]);
      if (revealed.obj > oi || (revealed.obj === oi && revealed.field >= -1)) {
        if (revealed.obj > oi || revealed.field >= 0) return { ...task, status: "completed" };
        return { ...task, status: "in_progress" };
      }
      return { ...task, status: "pending" };
    }
    const fieldsMatch = /^fields_(\d+)$/.exec(task.id);
    if (fieldsMatch) {
      const oi = Number(fieldsMatch[1]);
      const total = suite.objects[oi]?.fields.length ?? 0;
      if (revealed.obj > oi) return { ...task, status: "completed" };
      if (revealed.obj < oi) return { ...task, status: "pending" };
      if (revealed.field < 0) return { ...task, status: "pending" };
      if (revealed.field >= total - 1) return { ...task, status: "completed" };
      return { ...task, status: "in_progress" };
    }
    if (task.id === "connect" || task.id === "validate" || task.id === "build" || task.id === "deploy" || task.id === "relations") {
      return { ...task, status: "pending" };
    }
    return task;
  });
}

/** Apply lightweight plan rewrite from user feedback during planning. */
export function rewriteSuiteFromFeedback(suite: GenSuite, feedback: string): { suite: GenSuite; note: string } {
  const q = feedback.toLowerCase();
  const next: GenSuite = {
    ...suite,
    objects: suite.objects.map(o => ({ ...o, fields: o.fields.map(f => ({ ...f })) })),
  };

  // Remove an object if user asks
  const removeMatch = feedback.match(/(?:remove|drop|skip|exclude)\s+(?:the\s+)?([A-Za-z][\w\s-]{0,40}?)(?:\s+object)?/i);
  if (removeMatch && next.objects.length > 1) {
    const name = removeMatch[1].trim().toLowerCase();
    const filtered = next.objects.filter(o => o.name.toLowerCase() !== name && !o.name.toLowerCase().includes(name));
    if (filtered.length > 0 && filtered.length < next.objects.length) {
      next.objects = enrichLookupRelations(filtered);
      return { suite: next, note: `Removed "${removeMatch[1].trim()}" from the plan and recalculated relationships.` };
    }
  }

  // Add a Status field to a named object
  if (/\b(add|include)\b/.test(q) && /\bfield\b/.test(q)) {
    const obj = next.objects.find(o => q.includes(o.name.toLowerCase())) ?? next.objects[0];
    const labelMatch = feedback.match(/(?:add|include)(?:\s+a)?\s+(?:new\s+)?(?:field\s+)?(?:called\s+|named\s+)?["']?([A-Za-z][\w\s/-]{0,30})/i);
    const label = (labelMatch?.[1] ?? "Status").replace(/\s+field$/i, "").trim();
    if (!obj.fields.some(f => f.label.toLowerCase() === label.toLowerCase())) {
      obj.fields.push({
        label,
        type: /\bemail\b/i.test(label) ? "Email Address" : /\bdate\b/i.test(label) ? "Date Picker" : "Drop-Down",
        required: /\brequired\b/.test(q),
      });
    }
    next.objects = enrichLookupRelations(next.objects);
    return { suite: next, note: `Updated the plan: added "${label}" to ${obj.name}.` };
  }

  if (/\b(simpler|fewer|less)\b/.test(q) && next.objects.length > 3) {
    next.objects = enrichLookupRelations(next.objects.slice(0, 3));
    return { suite: next, note: "Simplified the plan to the first 3 core objects." };
  }

  return {
    suite: next,
    note: "I've noted your feedback and kept the structure, adjusting assumptions for the next pass. Review the plan and tell me what to change, or Proceed when ready.",
  };
}

export function markTask(
  tasks: AgentTask[],
  id: string,
  status: AgentTaskStatus,
): AgentTask[] {
  return tasks.map(t => (t.id === id ? { ...t, status } : t));
}

export function validateGeneratedSuite(
  objects: GenObject[],
  plan: ExecutionPlan | null,
  existingApiNames: string[] = [],
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const plannedNames = plan?.plannedObjectNames ?? objects.map(o => o.name);
  const objectsPlanned = plannedNames.length;
  const fieldsPlanned = plan?.plannedFieldTotal ?? objects.reduce((s, o) => s + o.fields.length, 0);
  const relationshipsPlanned = plan?.plannedRelationshipTotal ?? buildSuiteObjEdges(objects).length;

  // Missing planned objects (by name)
  plannedNames.forEach(name => {
    if (!objects.some(o => o.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      issues.push({
        id: `missing_${normalizeToken(name)}`,
        objectName: name,
        message: `Planned object "${name}" was not created.`,
        autoFixable: false,
        code: "missing_object",
      });
    }
  });

  const usedNames = new Set(existingApiNames.map(n => n.toLowerCase()));
  const seenObjectNames = new Map<string, number>();

  objects.forEach((obj, oi) => {
    const name = obj.name.trim();
    if (!name) {
      issues.push({
        id: `empty_name_${oi}`,
        objectName: `Object ${oi + 1}`,
        message: "Object name is required.",
        autoFixable: true,
        code: "empty_name",
        objectIndex: oi,
      });
    } else {
      const key = name.toLowerCase();
      if (seenObjectNames.has(key)) {
        issues.push({
          id: `dup_obj_${oi}`,
          objectName: name,
          message: `Duplicate object name "${name}".`,
          autoFixable: true,
          code: "duplicate_object",
          objectIndex: oi,
        });
      } else {
        seenObjectNames.set(key, oi);
      }
      if (usedNames.has(key)) {
        issues.push({
          id: `collision_${oi}`,
          objectName: name,
          message: `"${name}" already exists on the graph.`,
          autoFixable: true,
          code: "name_collision",
          objectIndex: oi,
        });
      }
    }

    if (obj.fields.length === 0) {
      issues.push({
        id: `no_fields_${oi}`,
        objectName: name || `Object ${oi + 1}`,
        message: "At least one field is required.",
        autoFixable: true,
        code: "no_fields",
        objectIndex: oi,
      });
    }

    const seenFields = new Map<string, number>();
    obj.fields.forEach((field, fi) => {
      const label = field.label.trim();
      if (!label) {
        issues.push({
          id: `blank_field_${oi}_${fi}`,
          objectName: name || `Object ${oi + 1}`,
          message: `Field ${fi + 1} is missing a label.`,
          autoFixable: true,
          code: "missing_required_label",
          objectIndex: oi,
          fieldIndex: fi,
        });
      } else {
        const fk = label.toLowerCase();
        if (seenFields.has(fk)) {
          issues.push({
            id: `dup_field_${oi}_${fi}`,
            objectName: name || `Object ${oi + 1}`,
            message: `Duplicate field "${label}".`,
            autoFixable: true,
            code: "duplicate_field",
            objectIndex: oi,
            fieldIndex: fi,
          });
        } else {
          seenFields.set(fk, fi);
        }
      }

      if (!KNOWN_FIELD_TYPES.has(field.type)) {
        issues.push({
          id: `bad_type_${oi}_${fi}`,
          objectName: name || `Object ${oi + 1}`,
          message: `"${label || `Field ${fi + 1}`}" has an unsupported type (${field.type}).`,
          autoFixable: true,
          code: "invalid_type",
          objectIndex: oi,
          fieldIndex: fi,
        });
      }

      if ((field.type === "Lookup" || field.type === "Master Details") && !field.relatedObjectId) {
        const labelToken = normalizeToken(field.label);
        const matches = objects
          .map((c, ci) => ({ ci, score: (() => {
            if (ci === oi) return 0;
            const nt = normalizeToken(c.name);
            if (!nt) return 0;
            if (labelToken === nt) return 3;
            if (labelToken.includes(nt) || nt.includes(labelToken)) return 2;
            return 0;
          })() }))
          .filter(m => m.score > 0)
          .sort((a, b) => b.score - a.score);

        // Generic lookups (Owner, Manager, etc.) without a matching object are allowed.
        // Flag only when the label clearly intends an in-suite object relationship,
        // or when the field is Master Details (always requires a parent).
        const intendsSuiteRelation = matches.length > 0 || field.type === "Master Details";
        if (!intendsSuiteRelation) return;

        issues.push({
          id: `lookup_${oi}_${fi}`,
          objectName: name || `Object ${oi + 1}`,
          message: `${label || "Lookup"} relationship requires a related object.`,
          autoFixable: true,
          code: "unresolved_lookup",
          objectIndex: oi,
          fieldIndex: fi,
        });
      }
    });
  });

  const relationshipsEstablished = buildSuiteObjEdges(objects).length;
  const fieldsConfigured = objects.reduce((s, o) => s + o.fields.length, 0);

  return {
    objectsCreated: objects.length,
    objectsPlanned,
    fieldsConfigured,
    fieldsPlanned,
    relationshipsEstablished,
    relationshipsPlanned,
    passed: issues.length === 0,
    issues,
  };
}

/** Apply unambiguous auto-fixes only. Returns updated objects + remaining issues after re-validation. */
export function autoFixValidationIssues(
  objects: GenObject[],
  issues: ValidationIssue[],
): GenObject[] {
  let next = objects.map(o => ({ ...o, fields: o.fields.map(f => ({ ...f })) }));

  issues.forEach(issue => {
    if (!issue.autoFixable || issue.objectIndex == null) return;
    const obj = next[issue.objectIndex];
    if (!obj) return;

    if (issue.code === "empty_name") {
      obj.name = `Object ${issue.objectIndex + 1}`;
      return;
    }

    if (issue.code === "no_fields") {
      obj.fields.push({ label: "Name", type: "Single-Line", required: true });
      return;
    }

    if (issue.code === "duplicate_object" || issue.code === "name_collision") {
      const base = obj.name.trim() || `Object ${issue.objectIndex + 1}`;
      obj.name = `${base} ${issue.objectIndex + 1}`;
      return;
    }

    if (issue.fieldIndex == null) return;
    const field = obj.fields[issue.fieldIndex];
    if (!field) return;

    if (issue.code === "missing_required_label") {
      field.label = `Field ${issue.fieldIndex + 1}`;
      return;
    }

    if (issue.code === "duplicate_field") {
      field.label = `${field.label.trim()} ${issue.fieldIndex + 1}`;
      return;
    }

    if (issue.code === "invalid_type") {
      field.type = "Single-Line";
      return;
    }

    if (issue.code === "unresolved_lookup") {
      const labelToken = normalizeToken(field.label);
      let bestIdx = -1;
      let bestScore = 0;
      next.forEach((candidate, ci) => {
        if (ci === issue.objectIndex) return;
        const nameToken = normalizeToken(candidate.name);
        if (!nameToken) return;
        let score = 0;
        if (labelToken === nameToken) score = 3;
        else if (labelToken.includes(nameToken) || nameToken.includes(labelToken)) score = 2;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = ci;
        }
      });
      if (bestIdx >= 0) {
        field.relatedObjectId = `__ai_obj${bestIdx}__`;
      } else if (field.type === "Master Details" && next.length > 1) {
        // Fall back to another suite object so Master Details stays valid
        const fallback = next.findIndex((_, ci) => ci !== issue.objectIndex);
        if (fallback >= 0) field.relatedObjectId = `__ai_obj${fallback}__`;
      } else {
        // Soften unresolved generic lookups so validation can complete
        field.type = "Single-Line";
        field.relatedObjectId = undefined;
      }
    }
  });

  return enrichLookupRelations(next);
}

export function applyChangePrompt(
  objects: GenObject[],
  change: string,
): { objects: GenObject[]; summary: string; cardTitle: string; needsValidation?: boolean } {
  const q = change.toLowerCase();
  const next = objects.map(o => ({ ...o, fields: o.fields.map(f => ({ ...f })) }));
  if (next.length === 0) {
    return { objects: next, summary: "No objects to update yet.", cardTitle: "No changes applied" };
  }

  const namedObject = next.find(o => q.includes(o.name.toLowerCase())) ?? next[0];

  // Connect / relate objects
  if (/\b(connect|link|relate|relationship|lookup)\b/.test(q)) {
    const named = next.filter(o => q.includes(o.name.toLowerCase()));
    const from = named[0] ?? namedObject;
    const to = named.find(o => o !== from) ?? next.find(o => o !== from);
    if (from && to) {
      const existing = from.fields.find(
        f => (f.type === "Lookup" || f.type === "Master Details")
          && normalizeToken(f.label).includes(normalizeToken(to.name)),
      );
      if (!existing) {
        from.fields.push({
          label: to.name,
          type: "Lookup",
          required: false,
          relatedObjectId: `__ai_obj${next.indexOf(to)}__`,
        });
      } else {
        existing.relatedObjectId = `__ai_obj${next.indexOf(to)}__`;
        existing.type = existing.type === "Master Details" ? "Master Details" : "Lookup";
      }
      return {
        objects: enrichLookupRelations(next),
        summary: `I'll establish the relationship between ${from.name} and ${to.name} and validate its configuration.`,
        cardTitle: `Relate ${from.name} → ${to.name}`,
        needsValidation: true,
      };
    }
  }

  // Validate / check request (no mutation)
  if (/\b(check|validate|review|verify)\b/.test(q) && /\b(field|object|required|structure|config)\b/.test(q)) {
    return {
      objects: enrichLookupRelations(next),
      summary: "I'll review the generated objects against the required configurations.",
      cardTitle: "Validation requested",
      needsValidation: true,
    };
  }

  if (/\b(add|create)\b/.test(q) && /\bfield\b/.test(q)) {
    const labelMatch = change.match(
      /(?:add|create)(?:\s+a)?\s+(?:new\s+)?(?:(\w[\w\s/-]{0,30}?)\s+)?field(?:\s+(?:called|named|to))?\s*(?:to\s+)?(?:the\s+)?(?:["']?([A-Za-z][\w\s/-]{0,40})["']?)?/i,
    );
    // Prefer explicit "Status field" / "field called X"
    const calledMatch = change.match(
      /(?:add|create)(?:\s+a)?\s+(?:new\s+)?field\s+(?:called\s+|named\s+)?["']?([A-Za-z][\w\s/-]{0,40})/i,
    );
    const typeWordMatch = change.match(
      /(?:add|create)(?:\s+a)?\s+(?:new\s+)?([A-Za-z][\w\s/-]{0,30}?)\s+field/i,
    );
    let label = (calledMatch?.[1] ?? typeWordMatch?.[1] ?? labelMatch?.[1] ?? "Notes").trim().replace(/[."]+$/g, "");
    // Strip trailing "to Lead" style
    label = label.replace(/\s+to\s+.+$/i, "").trim() || "Notes";
    const type =
      /\bemail\b/.test(q) ? "Email Address"
        : /\bdate\b/.test(q) ? "Date Picker"
          : /\bnumber|amount|count\b/.test(q) ? "Number"
            : /\bcurrency|money|price\b/.test(q) ? "Currency"
              : /\bstatus|stage|type\b/.test(q) ? "Drop-Down"
                : "Single-Line";
    if (!namedObject.fields.some(f => f.label.toLowerCase() === label.toLowerCase())) {
      namedObject.fields.push({ label, type, required: /\brequired\b/.test(q) });
    }
    return {
      objects: enrichLookupRelations(next),
      summary: `I'll add a ${label} field to the ${namedObject.name} object.`,
      cardTitle: `Add ${label} field`,
    };
  }

  if (/\b(remove|delete)\b/.test(q) && /\bfield\b/.test(q)) {
    const targetField = namedObject.fields.find(f => q.includes(f.label.toLowerCase()));
    if (targetField && namedObject.fields.length > 1) {
      namedObject.fields = namedObject.fields.filter(f => f !== targetField);
      return {
        objects: enrichLookupRelations(next),
        summary: `Done. Removed "${targetField.label}" from ${namedObject.name}.`,
        cardTitle: `Remove ${targetField.label}`,
      };
    }
  }

  if (/\brename\b/.test(q)) {
    const renameMatch = change.match(/rename\s+["']?([A-Za-z][\w\s-]*)["']?\s+to\s+["']?([A-Za-z][\w\s-]*)["']?/i);
    if (renameMatch) {
      const from = renameMatch[1].trim().toLowerCase();
      const to = renameMatch[2].trim();
      const obj = next.find(o => o.name.toLowerCase() === from);
      if (obj) {
        obj.name = to;
        return { objects: enrichLookupRelations(next), summary: `Done. Renamed object to "${to}".`, cardTitle: `Rename to ${to}` };
      }
      const field = namedObject.fields.find(f => f.label.toLowerCase() === from);
      if (field) {
        field.label = to;
        return {
          objects: enrichLookupRelations(next),
          summary: `Done. Renamed field to "${to}" on ${namedObject.name}.`,
          cardTitle: `Rename field to ${to}`,
        };
      }
    }
  }

  if (/\b(description|describe)\b/.test(q)) {
    namedObject.description = change.replace(/^.*?(?:description|describe)\s*(?:to|as|:)?\s*/i, "").trim() || namedObject.description;
    return {
      objects: enrichLookupRelations(next),
      summary: `Done. Updated description for ${namedObject.name}.`,
      cardTitle: `Update ${namedObject.name} description`,
    };
  }

  if (!namedObject.fields.some(f => f.label.toLowerCase() === "notes")) {
    namedObject.fields.push({ label: "Notes", type: "Multi Line", required: false });
    return {
      objects: enrichLookupRelations(next),
      summary: `Done. Applied your change on ${namedObject.name} (added Notes). You can refine further.`,
      cardTitle: `Update ${namedObject.name}`,
    };
  }

  namedObject.description = namedObject.description
    ? `${namedObject.description} · Updated from prompt`
    : `Updated from: ${change.slice(0, 80)}`;
  return {
    objects: enrichLookupRelations(next),
    summary: `Done. Updated ${namedObject.name} from your prompt. Select fields on the right to fine-tune.`,
    cardTitle: `Refine ${namedObject.name}`,
  };
}
