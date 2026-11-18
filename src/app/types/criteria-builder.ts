import type { CriteriaToken, SettingsFieldRef } from "./object-settings";

export type CriteriaCombinator = "AND" | "OR";
export type CriteriaValueSource = "constant" | "field" | "function" | "null";
export type CriteriaConstantKind = "text" | "number" | "boolean" | "date";
export type CriteriaDataFamily = "text" | "number" | "date" | "boolean" | "any";

export interface CriteriaOperand {
  source: CriteriaValueSource;
  fieldLabel?: string;
  constantValue?: string;
  constantKind?: CriteriaConstantKind;
  functionId?: string;
  functionArgs?: CriteriaOperand[];
  functionExpr?: string;
}

export interface CriteriaRule {
  kind: "rule";
  id: string;
  enabled: boolean;
  left: CriteriaOperand;
  operator: string;
  right: CriteriaOperand;
}

export interface CriteriaGroup {
  kind: "group";
  id: string;
  enabled: boolean;
  combinator: CriteriaCombinator;
  children: CriteriaNode[];
}

export type CriteriaNode = CriteriaRule | CriteriaGroup;

export interface CriteriaTree {
  root: CriteriaGroup;
}

export interface CriteriaOperatorDef {
  value: string;
  label: string;
  needsValue: boolean;
  families: CriteriaDataFamily[];
}

export const COMPARISON_OPERATORS: CriteriaOperatorDef[] = [
  { value: "==", label: "Equals", needsValue: true, families: ["text", "number", "date", "boolean", "any"] },
  { value: "!=", label: "Not equal", needsValue: true, families: ["text", "number", "date", "boolean", "any"] },
  { value: "contains", label: "Contains", needsValue: true, families: ["text", "any"] },
  { value: "!contains", label: "Does not contain", needsValue: true, families: ["text", "any"] },
  { value: "startsWith", label: "Starts with", needsValue: true, families: ["text", "any"] },
  { value: "endsWith", label: "Ends with", needsValue: true, families: ["text", "any"] },
  { value: "isEmpty", label: "Is empty", needsValue: false, families: ["text", "any"] },
  { value: "isNotEmpty", label: "Is not empty", needsValue: false, families: ["text", "any"] },
  { value: ">", label: "Greater than", needsValue: true, families: ["number", "any"] },
  { value: ">=", label: "Greater than or equal to", needsValue: true, families: ["number", "any"] },
  { value: "<", label: "Less than", needsValue: true, families: ["number", "any"] },
  { value: "<=", label: "Less than or equal to", needsValue: true, families: ["number", "any"] },
  { value: "before", label: "Before", needsValue: true, families: ["date", "any"] },
  { value: "after", label: "After", needsValue: true, families: ["date", "any"] },
  { value: "onOrBefore", label: "On or before", needsValue: true, families: ["date", "any"] },
  { value: "onOrAfter", label: "On or after", needsValue: true, families: ["date", "any"] },
];

const OP_SERIALIZE: Record<string, string> = {
  before: "<",
  after: ">",
  onOrBefore: "<=",
  onOrAfter: ">=",
};

export interface CriteriaFunctionDef {
  id: string;
  name: string;
  label: string;
  group: string;
  minArgs: number;
  maxArgs: number;
  returns: CriteriaDataFamily;
  argHints: string[];
}

export const CRITERIA_FUNCTION_DEFS: CriteriaFunctionDef[] = [
  { id: "GetCurrentDate", name: "GetCurrentDate", label: "Get current date", group: "Date & time", minArgs: 0, maxArgs: 0, returns: "date", argHints: [] },
  { id: "GetCurrentMonth", name: "GetCurrentMonth", label: "Get current month", group: "Date & time", minArgs: 0, maxArgs: 1, returns: "text", argHints: ["Format"] },
  { id: "IsNow", name: "IsNow", label: "Is now", group: "Date & time", minArgs: 1, maxArgs: 1, returns: "boolean", argHints: ["Date / timestamp"] },
  { id: "IsToday", name: "IsToday", label: "Is today", group: "Date & time", minArgs: 1, maxArgs: 1, returns: "boolean", argHints: ["Date"] },
  { id: "IsBetween", name: "IsBetween", label: "Is between", group: "Date & time", minArgs: 3, maxArgs: 3, returns: "boolean", argHints: ["From", "To", "Input"] },
  { id: "AddDays", name: "AddDays", label: "Add days", group: "Date & time", minArgs: 2, maxArgs: 2, returns: "date", argHints: ["Date", "Days"] },
  { id: "addDatetime", name: "addDatetime", label: "Add date/time", group: "Date & time", minArgs: 2, maxArgs: 3, returns: "date", argHints: ["Timestamp", "Number / category"] },
  { id: "DiffDays", name: "DiffDays", label: "Difference in days", group: "Date & time", minArgs: 2, maxArgs: 2, returns: "number", argHints: ["From", "To"] },
  { id: "GetCurrentUser", name: "GetCurrentUser", label: "Get current user", group: "User & session", minArgs: 0, maxArgs: 0, returns: "text", argHints: [] },
  { id: "GetUserRole", name: "GetUserRole", label: "Get user role", group: "User & session", minArgs: 0, maxArgs: 0, returns: "text", argHints: [] },
  { id: "GetUserEmail", name: "GetUserEmail", label: "Get user email", group: "User & session", minArgs: 0, maxArgs: 0, returns: "text", argHints: [] },
  { id: "IsNull", name: "IsNull", label: "Is null", group: "Null & empty", minArgs: 1, maxArgs: 1, returns: "boolean", argHints: ["Value"] },
  { id: "IsEmpty", name: "IsEmpty", label: "Is empty", group: "Null & empty", minArgs: 1, maxArgs: 1, returns: "boolean", argHints: ["Value"] },
  { id: "IsNotEmpty", name: "IsNotEmpty", label: "Is not empty", group: "Null & empty", minArgs: 1, maxArgs: 1, returns: "boolean", argHints: ["Value"] },
  { id: "Length", name: "Length", label: "Length", group: "Text", minArgs: 1, maxArgs: 1, returns: "number", argHints: ["Text"] },
  { id: "ToString", name: "ToString", label: "To string", group: "Text", minArgs: 1, maxArgs: 1, returns: "text", argHints: ["Value"] },
  { id: "ToLower", name: "ToLower", label: "To lower case", group: "Text", minArgs: 1, maxArgs: 1, returns: "text", argHints: ["Text"] },
  { id: "Trim", name: "Trim", label: "Trim", group: "Text", minArgs: 1, maxArgs: 1, returns: "text", argHints: ["Text"] },
  { id: "Contains", name: "Contains", label: "Contains", group: "Text", minArgs: 2, maxArgs: 2, returns: "boolean", argHints: ["Text", "Part"] },
  { id: "StartsWith", name: "StartsWith", label: "Starts with", group: "Text", minArgs: 2, maxArgs: 2, returns: "boolean", argHints: ["Text", "Part"] },
  { id: "Concatenate", name: "Concatenate", label: "Concatenate", group: "Text", minArgs: 2, maxArgs: 6, returns: "text", argHints: ["Value 1", "Value 2"] },
  { id: "join", name: "join", label: "Join", group: "Text", minArgs: 2, maxArgs: 8, returns: "text", argHints: ["Value 1", "Value 2"] },
  { id: "Replace", name: "Replace", label: "Replace", group: "Text", minArgs: 3, maxArgs: 3, returns: "text", argHints: ["Text", "Find", "Replace with"] },
  { id: "ToNumber", name: "ToNumber", label: "To number", group: "Number", minArgs: 1, maxArgs: 1, returns: "number", argHints: ["Value"] },
  { id: "Round", name: "Round", label: "Round", group: "Number", minArgs: 1, maxArgs: 2, returns: "number", argHints: ["Number", "Decimals"] },
];

export const CRITERIA_FUNCTIONS = CRITERIA_FUNCTION_DEFS.map(f => ({
  value: `${f.name}()`,
  label: f.label,
  group: f.group,
  hint: `${f.name}(${f.argHints.join(", ")})`,
}));

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyGroup(combinator: CriteriaCombinator = "AND"): CriteriaGroup {
  return { kind: "group", id: uid("grp"), enabled: true, combinator, children: [] };
}

export function createEmptyRule(): CriteriaRule {
  return {
    kind: "rule",
    id: uid("rule"),
    enabled: true,
    left: { source: "field", fieldLabel: "" },
    operator: "==",
    right: { source: "constant", constantValue: "", constantKind: "text" },
  };
}

export function createEmptyTree(): CriteriaTree {
  return { root: createEmptyGroup("AND") };
}

export function operatorLabel(op: string): string {
  return COMPARISON_OPERATORS.find(o => o.value === op)?.label ?? op;
}

export function operatorNeedsValue(op: string): boolean {
  return COMPARISON_OPERATORS.find(o => o.value === op)?.needsValue ?? true;
}

export function inferDataFamily(fieldType?: string): CriteriaDataFamily {
  if (!fieldType) return "any";
  const t = fieldType.toLowerCase();
  if (t.includes("number") || t.includes("currency") || t.includes("decimal") || t.includes("integer") || t.includes("rollup")) return "number";
  if (t.includes("date") || t.includes("time")) return "date";
  if (t.includes("check") || t.includes("boolean") || t.includes("toggle")) return "boolean";
  return "text";
}

export function operatorsForFamily(family: CriteriaDataFamily): CriteriaOperatorDef[] {
  return COMPARISON_OPERATORS.filter(o =>
    o.families.includes(family) || o.families.includes("any") || family === "any",
  );
}

export function inferConstantKind(fieldType?: string): CriteriaConstantKind {
  const f = inferDataFamily(fieldType);
  if (f === "number") return "number";
  if (f === "date") return "date";
  if (f === "boolean") return "boolean";
  return "text";
}

function quoteConstant(value: string, kind: CriteriaConstantKind = "text"): string {
  if (kind === "boolean") return value.toUpperCase() === "FALSE" ? "FALSE" : "TRUE";
  if (kind === "number") return value.trim() || "0";
  if (kind === "date") return value.trim() ? `"${value.trim()}"` : '""';
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function argToExpr(op: CriteriaOperand): string {
  if (op.source === "null") return "Null";
  if (op.source === "field") return op.fieldLabel?.trim() || "Field";
  if (op.source === "function") return buildFunctionExpr(op);
  return quoteConstant(op.constantValue ?? "", op.constantKind ?? "text");
}

export function buildFunctionExpr(op: CriteriaOperand): string {
  if (op.functionExpr?.trim() && !op.functionId) return op.functionExpr.trim();
  const def = CRITERIA_FUNCTION_DEFS.find(f => f.id === op.functionId)
    ?? CRITERIA_FUNCTION_DEFS.find(f => op.functionExpr?.startsWith(f.name));
  if (!def) return op.functionExpr?.trim() || "GetCurrentDate()";
  const args = (op.functionArgs ?? []).map(argToExpr);
  while (args.length < def.minArgs) args.push("Null");
  return `${def.name}(${args.join(", ")})`;
}

function operandToTokenValues(op: CriteriaOperand): { kind: CriteriaToken["kind"]; value: string }[] {
  if (op.source === "null") return [{ kind: "constant", value: "Null" }];
  if (op.source === "field") return [{ kind: "field", value: op.fieldLabel?.trim() || "Field" }];
  if (op.source === "function") return [{ kind: "function", value: buildFunctionExpr(op) }];
  return [{ kind: "constant", value: quoteConstant(op.constantValue ?? "", op.constantKind ?? "text") }];
}

function newTok(kind: CriteriaToken["kind"], value: string): CriteriaToken {
  return { id: uid("tok"), kind, value };
}

function serializeOperator(op: string): string {
  return OP_SERIALIZE[op] ?? op;
}

export function treeToTokens(tree: CriteriaTree): CriteriaToken[] {
  const tokens: CriteriaToken[] = [];

  const emitClean = (node: CriteriaNode, depth: number) => {
    if (!node.enabled) return;

    if (node.kind === "rule") {
      const leftOk = !(node.left.source === "field" && !node.left.fieldLabel?.trim());
      if (!leftOk && node.left.source === "field") return;

      if (node.operator === "isEmpty" || node.operator === "isNotEmpty") {
        const fn = node.operator === "isEmpty" ? "IsEmpty" : "IsNotEmpty";
        tokens.push(newTok("function", `${fn}(${argToExpr(node.left)})`));
        return;
      }

      operandToTokenValues(node.left).forEach(t => tokens.push(newTok(t.kind, t.value)));
      tokens.push(newTok("operator", serializeOperator(node.operator)));
      if (operatorNeedsValue(node.operator)) {
        operandToTokenValues(node.right).forEach(t => tokens.push(newTok(t.kind, t.value)));
      }
      return;
    }

    const active = node.children.filter(c => {
      if (!c.enabled) return false;
      if (c.kind === "group") return c.children.some(x => x.enabled);
      return true;
    });
    if (active.length === 0) return;

    const wrap = depth > 0 && active.length > 1;
    if (wrap) tokens.push(newTok("brace", "("));

    active.forEach((child, i) => {
      if (i > 0) tokens.push(newTok("operator", node.combinator === "AND" ? "&&" : "||"));
      emitClean(child, depth + 1);
    });

    if (wrap) tokens.push(newTok("brace", ")"));
  };

  emitClean(tree.root, 0);
  return tokens;
}

export function serializeTreeExpression(tree: CriteriaTree): string {
  return treeToTokens(tree).map(t => t.value).join(" ").replace(/\s+/g, " ").trim();
}

function operandHuman(op: CriteriaOperand): string {
  if (op.source === "null") return "Null";
  if (op.source === "field") return op.fieldLabel?.trim() || "a field";
  if (op.source === "function") return buildFunctionExpr(op);
  const v = op.constantValue?.trim();
  if (!v) return "a value";
  if (op.constantKind === "boolean") return v;
  if (op.constantKind === "number") {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString() : v;
  }
  return `"${v}"`;
}

function ruleHuman(rule: CriteriaRule): string {
  const left = operandHuman(rule.left);
  const op = operatorLabel(rule.operator).toLowerCase();
  if (!operatorNeedsValue(rule.operator)) return `${left} ${op}`;
  return `${left} ${op} ${operandHuman(rule.right)}`;
}

export function humanizeTree(tree: CriteriaTree, intro?: string): string {
  const lines: string[] = [];

  const walk = (node: CriteriaNode, indent: number, joiner?: string) => {
    if (!node.enabled) return;
    const pad = "  ".repeat(indent);

    if (node.kind === "rule") {
      const text = ruleHuman(node);
      lines.push(joiner ? `${pad}${joiner} ${text}` : `${pad}${text}`);
      return;
    }

    const active = node.children.filter(c => c.enabled);
    if (active.length === 0) return;

    if (indent === 0 && active.length === 1) {
      walk(active[0], 0);
      return;
    }

    lines.push(indent === 0
      ? `Match ${node.combinator === "AND" ? "ALL" : "ANY"} of:`
      : `${pad}(Match ${node.combinator === "AND" ? "ALL" : "ANY"})`);

    active.forEach((child, i) => {
      walk(child, indent + 1, i === 0 ? undefined : node.combinator);
    });
  };

  walk(tree.root, 0);
  if (lines.length === 0) return "";
  const body = lines.join("\n");
  return intro ? `${intro}\n${body}` : body;
}

export interface RuleValidation {
  left?: string;
  operator?: string;
  right?: string;
  general?: string;
}

export function validateRule(
  rule: CriteriaRule,
  fields: { label: string; fieldType: string }[],
): RuleValidation {
  const err: RuleValidation = {};

  if (rule.left.source === "field" && !rule.left.fieldLabel?.trim()) {
    err.left = "Choose a field";
  }
  if (rule.left.source === "function") {
    const def = CRITERIA_FUNCTION_DEFS.find(f => f.id === rule.left.functionId);
    if (!rule.left.functionId && !rule.left.functionExpr?.trim()) {
      err.left = "Choose a function";
    } else if (def) {
      const args = rule.left.functionArgs ?? [];
      if (args.length < def.minArgs) {
        err.left = `${def.label} needs ${def.minArgs} argument${def.minArgs === 1 ? "" : "s"}`;
      }
    }
  }
  if (rule.left.source === "constant" && !(rule.left.constantValue ?? "").trim() && rule.left.constantKind !== "boolean") {
    err.left = "Enter a value";
  }

  if (!rule.operator) err.operator = "Choose an operator";

  if (operatorNeedsValue(rule.operator)) {
    if (rule.right.source === "field" && !rule.right.fieldLabel?.trim()) err.right = "Choose a field";
    if (rule.right.source === "function" && !rule.right.functionId && !rule.right.functionExpr?.trim()) {
      err.right = "Choose a function";
    }
    if (rule.right.source === "constant") {
      const v = (rule.right.constantValue ?? "").trim();
      const kind = rule.right.constantKind ?? "text";
      if (!v && kind !== "boolean") err.right = "Value required";
      else if (kind === "number" && v && Number.isNaN(Number(v))) err.right = "Value must be a number";
    }

    if (rule.left.source === "field" && rule.right.source === "constant" && rule.left.fieldLabel) {
      const ft = fields.find(f => f.label === rule.left.fieldLabel)?.fieldType;
      const family = inferDataFamily(ft);
      const kind = rule.right.constantKind ?? "text";
      if (family === "number" && kind === "text" && (rule.right.constantValue ?? "").trim()) {
        if (Number.isNaN(Number(rule.right.constantValue!.trim()))) err.right = "Value must be a number";
      }
      if (family === "boolean" && kind !== "boolean") err.right = "Choose True or False";
    }

    if (rule.left.source === "field" && rule.right.source === "field"
      && rule.left.fieldLabel && rule.right.fieldLabel) {
      const lf = inferDataFamily(fields.find(f => f.label === rule.left.fieldLabel)?.fieldType);
      const rf = inferDataFamily(fields.find(f => f.label === rule.right.fieldLabel)?.fieldType);
      if (lf !== "any" && rf !== "any" && lf !== rf) err.right = "Fields have incompatible types";
    }
  }

  return err;
}

export function validateTree(
  tree: CriteriaTree,
  fields: { label: string; fieldType: string }[] = [],
): string[] {
  const errors: string[] = [];
  const walk = (node: CriteriaNode, path: string) => {
    if (!node.enabled) return;
    if (node.kind === "rule") {
      const v = validateRule(node, fields);
      if (v.left) errors.push(`${path}: ${v.left}`);
      if (v.operator) errors.push(`${path}: ${v.operator}`);
      if (v.right) errors.push(`${path}: ${v.right}`);
      return;
    }
    const active = node.children.filter(c => c.enabled);
    if (active.length === 0 && path !== "Root") errors.push(`${path}: group has no conditions`);
    active.forEach((child, i) => walk(child, `${path} › ${i + 1}`));
  };
  walk(tree.root, "Root");
  return errors;
}

export function countIncomplete(
  tree: CriteriaTree,
  fields: { label: string; fieldType: string }[] = [],
): number {
  let n = 0;
  const walk = (node: CriteriaNode) => {
    if (!node.enabled) return;
    if (node.kind === "rule") {
      const v = validateRule(node, fields);
      if (v.left || v.operator || v.right || v.general) n += 1;
      return;
    }
    node.children.forEach(walk);
  };
  walk(tree.root);
  return n;
}

function stripQuotes(v: string): string {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

function parseOperand(raw: string): CriteriaOperand {
  if (/^null$/i.test(raw)) return { source: "null" };
  if (/^(true|false)$/i.test(raw)) {
    return { source: "constant", constantValue: raw.toUpperCase() === "FALSE" ? "FALSE" : "TRUE", constantKind: "boolean" };
  }
  const fnMatch = raw.match(/^([A-Za-z_][\w.]*)\((.*)\)$/);
  if (fnMatch) {
    const def = CRITERIA_FUNCTION_DEFS.find(f => f.name === fnMatch[1]);
    return { source: "function", functionId: def?.id, functionExpr: raw, functionArgs: [] };
  }
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return { source: "constant", constantValue: stripQuotes(raw), constantKind: "text" };
  }
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return { source: "constant", constantValue: raw, constantKind: "number" };
  }
  return { source: "field", fieldLabel: raw };
}

const OP_SET = new Set([
  ...COMPARISON_OPERATORS.map(o => o.value),
  ...Object.values(OP_SERIALIZE),
]);

export function tokensToTree(tokens: CriteriaToken[]): { tree: CriteriaTree; fullyParsed: boolean } {
  if (!tokens.length) return { tree: createEmptyTree(), fullyParsed: true };

  const values = tokens.map(t => t.value);
  const flat: string[] = [];
  for (const v of values) {
    if (v === "AND") flat.push("&&");
    else if (v === "OR") flat.push("||");
    else flat.push(v);
  }

  type Item = CriteriaNode | "&&" | "||" | "(" | ")";
  const items: Item[] = [];
  let i = 0;
  let fullyParsed = true;

  while (i < flat.length) {
    const v = flat[i];
    if (v === "(") { items.push("("); i++; continue; }
    if (v === ")") { items.push(")"); i++; continue; }
    if (v === "&&" || v === "||") { items.push(v); i++; continue; }

    const emptyFn = v.match(/^(IsEmpty|IsNotEmpty)\((.+)\)$/);
    if (emptyFn) {
      items.push({
        kind: "rule",
        id: uid("rule"),
        enabled: true,
        left: parseOperand(emptyFn[2]),
        operator: emptyFn[1] === "IsEmpty" ? "isEmpty" : "isNotEmpty",
        right: { source: "constant", constantValue: "", constantKind: "text" },
      });
      i++;
      continue;
    }

    if (i + 2 < flat.length && OP_SET.has(flat[i + 1])) {
      items.push({
        kind: "rule",
        id: uid("rule"),
        enabled: true,
        left: parseOperand(flat[i]),
        operator: flat[i + 1],
        right: parseOperand(flat[i + 2]),
      });
      i += 3;
      continue;
    }

    fullyParsed = false;
    i++;
  }

  const parseSeq = (seq: Item[]): CriteriaGroup => {
    const group = createEmptyGroup("AND");
    if (seq.length === 0) return group;
    const hasOr = seq.includes("||");
    const hasAnd = seq.includes("&&");
    group.combinator = hasOr && !hasAnd ? "OR" : "AND";

    let current: Item[] = [];
    const flush = () => {
      if (current.length === 1 && typeof current[0] === "object") {
        group.children.push(current[0] as CriteriaNode);
      } else if (current.length > 0) fullyParsed = false;
      current = [];
    };

    let depth = 0;
    let buf: Item[] = [];
    for (const it of seq) {
      if (it === "(") {
        if (depth === 0) flush();
        depth++;
        if (depth > 1) buf.push(it);
        continue;
      }
      if (it === ")") {
        depth--;
        if (depth === 0) {
          group.children.push(parseSeq(buf));
          buf = [];
        } else if (depth > 0) buf.push(it);
        continue;
      }
      if (depth > 0) { buf.push(it); continue; }
      if (it === "&&" || it === "||") {
        flush();
        if (it === "||") group.combinator = "OR";
        if (it === "&&") group.combinator = "AND";
        continue;
      }
      current.push(it);
    }
    flush();
    return group;
  };

  const root = parseSeq(items);
  if (root.children.length === 0 && tokens.length > 0) {
    return { tree: createEmptyTree(), fullyParsed: false };
  }
  return { tree: { root }, fullyParsed };
}

export function fieldOptionsFromSettings(fields: SettingsFieldRef[]): {
  id: string; label: string; fieldType: string; group: string;
}[] {
  const current = fields.map(f => ({
    id: f.id,
    label: f.label,
    fieldType: f.fieldType,
    group: "Current object",
  }));
  const related = [
    { id: "rel_account_type", label: "Account › Account Type", fieldType: "Dropdown", group: "Reference object" },
    { id: "rel_account_status", label: "Account › Status", fieldType: "Dropdown", group: "Reference object" },
    { id: "parent_name", label: "Parent › Name", fieldType: "Text Box", group: "Parent / master" },
  ];
  const user = [
    { id: "user_name", label: "Logged User › Name", fieldType: "Text Box", group: "Logged user" },
    { id: "user_email", label: "Logged User › Email", fieldType: "Email", group: "Logged user" },
  ];
  return [...current, ...related, ...user];
}

export function emptyOperand(
  source: CriteriaValueSource = "constant",
  kind: CriteriaConstantKind = "text",
): CriteriaOperand {
  if (source === "field") return { source: "field", fieldLabel: "" };
  if (source === "function") return { source: "function", functionId: "GetCurrentDate", functionArgs: [] };
  if (source === "null") return { source: "null" };
  return { source: "constant", constantValue: kind === "boolean" ? "TRUE" : "", constantKind: kind };
}
