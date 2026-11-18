import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Eraser, GitBranch, Infinity as InfinityIcon, List, Menu, Parentheses,
  Pencil, Search, Sigma, Trash2, X,
} from "lucide-react";
import type { CriteriaToken, CriteriaTokenKind, SettingsFieldRef } from "../types/object-settings";
import {
  CRITERIA_FUNCTION_DEFS,
  fieldOptionsFromSettings,
} from "../types/criteria-builder";

/* ─── shared chrome ─────────────────────────────────────────────────────── */

const INPUT: React.CSSProperties = {
  width: "100%", background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border-strong)",
  borderRadius: 8, padding: "7px 10px", color: "var(--app-text-primary)", fontSize: 12, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box",
};

/** Soft accent colors — readable on both light and dark surfaces */
const KIND_COLOR: Record<CriteriaTokenKind, string> = {
  field: "#34D399",
  constant: "#60A5FA",
  operator: "#FBBF24",
  function: "#F472B6",
  condition: "#2DD4BF",
  brace: "#94A3B8",
};

type PaletteKind = CriteriaTokenKind;
type ConstantMode = "bool" | "text" | "number" | "date";

const PALETTE: {
  kind: PaletteKind; label: string; tip: string; Icon: React.ElementType;
}[] = [
  { kind: "field", label: "Field", tip: "Pick an object or related field", Icon: List },
  { kind: "constant", label: "Constant", tip: "Fixed text, number, date, or true/false", Icon: InfinityIcon },
  { kind: "operator", label: "Operator", tip: "Compare values or join with AND / OR / NOT", Icon: Menu },
  { kind: "function", label: "Function", tip: "Date, user, text, and number helpers", Icon: Sigma },
  { kind: "condition", label: "Condition", tip: "if / else / then and logic keywords", Icon: GitBranch },
  { kind: "brace", label: "Braces", tip: "Group nested logic with ( )", Icon: Parentheses },
];

const OPERATORS: { value: string; label: string; group: string }[] = [
  { value: "==", label: "equal", group: "Compare" },
  { value: "!=", label: "Not equal", group: "Compare" },
  { value: ">", label: "Greater than", group: "Compare" },
  { value: "<", label: "Less than", group: "Compare" },
  { value: ">=", label: "Greater than or equal", group: "Compare" },
  { value: "<=", label: "Less than or equal", group: "Compare" },
  { value: "contains", label: "Contains", group: "Compare" },
  { value: "!contains", label: "Does not contain", group: "Compare" },
  { value: "&&", label: "AND", group: "Logic" },
  { value: "||", label: "OR", group: "Logic" },
  { value: "!", label: "NOT", group: "Logic" },
];

const CONDITIONS: { value: string; label: string; hint: string }[] = [
  { value: "if", label: "if", hint: "Start a conditional branch" },
  { value: "else", label: "else", hint: "Alternate branch" },
  { value: "then", label: "then", hint: "Result when condition is true" },
  { value: "AND", label: "AND", hint: "All sides must match" },
  { value: "OR", label: "OR", hint: "Any side may match" },
  { value: "NOT", label: "NOT", hint: "Negate the next expression" },
];

export function serializeCriteriaTokens(tokens: CriteriaToken[]): string {
  return tokens.map(t => t.value).join(" ").replace(/\s+/g, " ").trim();
}

export function humanizeCriteriaTokens(tokens: CriteriaToken[]): string {
  if (!tokens.length) return "";
  return tokens.map(t => {
    if (t.kind === "operator") {
      if (t.value === "&&") return "AND";
      if (t.value === "||") return "OR";
      if (t.value === "!") return "NOT";
      if (t.value === "==") return "equals";
      if (t.value === "!=") return "not equal";
      if (t.value === ">") return "greater than";
      if (t.value === "<") return "less than";
      if (t.value === ">=") return "≥";
      if (t.value === "<=") return "≤";
    }
    return t.value;
  }).join(" ");
}

function newToken(kind: CriteriaTokenKind, value: string): CriteriaToken {
  return {
    id: `tok_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    kind,
    value,
  };
}

function quoteText(raw: string): string {
  const escaped = raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function insideFunctionArgs(tokens: CriteriaToken[], caret: number): boolean {
  let depth = 0;
  let inFn = false;
  for (let i = 0; i < caret; i++) {
    const t = tokens[i];
    if (t.kind === "function") inFn = true;
    if (t.kind === "brace" && t.value === "(") depth += 1;
    if (t.kind === "brace" && t.value === ")") {
      depth -= 1;
      if (depth <= 0) { depth = 0; inFn = false; }
    }
  }
  return inFn && depth > 0;
}

const PALETTE_ICON_SIZE = 40;
const PALETTE_INDICATOR_W = 40;

/** Theme-safe circular icon — no raster white boxes; works in light & dark */
function PaletteGlyph({
  Icon, color, active, muted,
}: {
  Icon: React.ElementType; color: string; active?: boolean; muted?: boolean;
}) {
  return (
    <span
      aria-hidden
      style={{
        width: PALETTE_ICON_SIZE,
        height: PALETTE_ICON_SIZE,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        // Soft tint from the accent color — transparent enough for dark/light shells
        background: `${color}${active ? "33" : "22"}`,
        border: `1.5px solid ${color}${active ? "CC" : "66"}`,
        color,
        opacity: muted ? 0.4 : 1,
        boxShadow: active ? `0 0 0 3px ${color}22` : "none",
        transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s, opacity 0.15s",
      }}
    >
      <Icon size={16} strokeWidth={2.25} />
    </span>
  );
}

function PickerRow({
  label, accent, hint, onClick,
}: {
  label: string; accent: string; hint?: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left"
      style={{
        display: "block", padding: "7px 10px", border: "none", cursor: "pointer",
        background: "transparent", color: "var(--app-text-body)", fontSize: 12,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--app-shell-bg-hover)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontWeight: 700, color: accent }}>{label}</span>
      {hint && (
        <span style={{ color: "var(--app-text-muted)", fontSize: 10, marginLeft: 8 }}>{hint}</span>
      )}
    </button>
  );
}

function Caret() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 1.5,
        height: 14,
        margin: "0 1px",
        borderRadius: 1,
        background: "var(--app-accent)",
        flexShrink: 0,
        alignSelf: "center",
        verticalAlign: "middle",
        animation: "criteriaCaretBlink 1s steps(1) infinite",
      }}
    />
  );
}

/* ─── Builder body (used inside the popup) ──────────────────────────────── */

function CriteriaBuilderBody({
  tokens,
  fields,
  onChange,
}: {
  tokens: CriteriaToken[];
  fields: SettingsFieldRef[];
  onChange: (tokens: CriteriaToken[], expression: string) => void;
}) {
  const fieldOptions = useMemo(() => fieldOptionsFromSettings(fields), [fields]);
  const [picker, setPicker] = useState<PaletteKind | null>(null);
  const [search, setSearch] = useState("");
  const [constantMode, setConstantMode] = useState<ConstantMode>("bool");
  const [constantText, setConstantText] = useState("");
  const [caret, setCaret] = useState(tokens.length);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [compactViewport, setCompactViewport] = useState(false);

  useEffect(() => {
    if (caret > tokens.length) setCaret(tokens.length);
  }, [tokens.length, caret]);

  useEffect(() => {
    const sync = () => setCompactViewport(window.innerHeight < 740 || window.innerWidth < 640);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const inFnArgs = insideFunctionArgs(tokens, caret);

  const commit = (next: CriteriaToken[], nextCaret?: number) => {
    onChange(next, serializeCriteriaTokens(next));
    if (typeof nextCaret === "number") setCaret(nextCaret);
    setValidationMsg(null);
  };

  const insertTokens = (items: { kind: CriteriaTokenKind; value: string }[], placeCaretAt?: number) => {
    if (inFnArgs && items.some(i => i.kind === "operator" || i.kind === "condition" || i.kind === "function")) {
      setValidationMsg("Only a Field or Constant can be used inside a function.");
      return;
    }
    const created = items.map(i => newToken(i.kind, i.value));
    const next = [...tokens.slice(0, caret), ...created, ...tokens.slice(caret)];
    commit(next, placeCaretAt ?? caret + created.length);
    setSelectedId(null);
    setSearch("");
    setConstantText("");
    // Keep single selection: close picker after insert (braces / one-shot)
    setPicker(null);
  };

  const insertOne = (kind: CriteriaTokenKind, value: string) =>
    insertTokens([{ kind, value }]);

  const insertFunction = (name: string, minArgs: number) => {
    if (inFnArgs) {
      setValidationMsg("Only a Field or Constant can be used inside a function.");
      return;
    }
    insertTokens(
      [
        { kind: "function", value: name },
        { kind: "brace", value: "(" },
        { kind: "brace", value: ")" },
      ],
      minArgs === 0 ? caret + 3 : caret + 2,
    );
  };

  const removeAt = (index: number) => {
    commit(tokens.filter((_, i) => i !== index), Math.min(index, Math.max(0, tokens.length - 1)));
    setSelectedId(null);
  };

  const clearAll = () => {
    commit([], 0);
    setPicker(null);
    setSelectedId(null);
  };

  const selectPalette = (kind: PaletteKind) => {
    if (inFnArgs && (kind === "operator" || kind === "condition" || kind === "function")) {
      setValidationMsg("Only a Field or Constant can be used inside a function.");
      return;
    }
    setValidationMsg(null);
    if (kind === "brace") {
      insertTokens(
        [{ kind: "brace", value: "(" }, { kind: "brace", value: ")" }],
        caret + 1,
      );
      return;
    }
    // Single selection only — toggle off if same, otherwise switch
    setPicker(prev => (prev === kind ? null : kind));
    setSearch("");
    if (kind === "constant") setConstantMode("bool");
  };

  const filteredFields = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fieldOptions;
    return fieldOptions.filter(f => f.label.toLowerCase().includes(q) || f.group.toLowerCase().includes(q));
  }, [fieldOptions, search]);

  const fieldGroups = useMemo(() => {
    const map = new Map<string, typeof filteredFields>();
    filteredFields.forEach(f => {
      const arr = map.get(f.group) ?? [];
      arr.push(f);
      map.set(f.group, arr);
    });
    return map;
  }, [filteredFields]);

  const filteredOperators = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return OPERATORS;
    return OPERATORS.filter(o =>
      o.value.toLowerCase().includes(q) || o.label.toLowerCase().includes(q) || o.group.toLowerCase().includes(q),
    );
  }, [search]);

  const operatorGroups = useMemo(() => {
    const map = new Map<string, typeof filteredOperators>();
    filteredOperators.forEach(o => {
      const arr = map.get(o.group) ?? [];
      arr.push(o);
      map.set(o.group, arr);
    });
    return map;
  }, [filteredOperators]);

  const filteredFunctions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CRITERIA_FUNCTION_DEFS;
    return CRITERIA_FUNCTION_DEFS.filter(f =>
      f.label.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || f.group.toLowerCase().includes(q),
    );
  }, [search]);

  const functionGroups = useMemo(() => {
    const map = new Map<string, typeof filteredFunctions>();
    filteredFunctions.forEach(f => {
      const arr = map.get(f.group) ?? [];
      arr.push(f);
      map.set(f.group, arr);
    });
    return map;
  }, [filteredFunctions]);

  const filteredConditions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CONDITIONS;
    return CONDITIONS.filter(c =>
      c.value.toLowerCase().includes(q) || c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q),
    );
  }, [search]);

  const expression = serializeCriteriaTokens(tokens);
  const activePalette = PALETTE.find(p => p.kind === picker);
  const showSearch = picker === "field" || picker === "operator" || picker === "function"
    || picker === "condition" || (picker === "constant" && constantMode === "bool");
  const colorOf = (kind: CriteriaTokenKind) => KIND_COLOR[kind];
  const restrictedInFn = (kind: PaletteKind) =>
    inFnArgs && (kind === "operator" || kind === "condition" || kind === "function");

  const pickerOpen = Boolean(picker && activePalette);
  // On short screens, shrink the expression strip when a picker is open so the list stays usable
  const canvasCompact = pickerOpen && compactViewport;

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: compactViewport ? 8 : 12,
      minHeight: 0, flex: 1, overflow: "hidden",
    }}>
      <style>{`@keyframes criteriaCaretBlink{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>

      {/* 1. Preview — always visible, compact */}
      <div style={{
        padding: compactViewport ? "8px 10px" : "10px 12px", borderRadius: 8,
        background: "var(--app-shell-bg-info)",
        border: "1px solid var(--app-border-info)",
        color: "var(--app-text-info)",
        fontSize: 12, lineHeight: 1.45,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        wordBreak: "break-word",
        flexShrink: 0,
      }}>
        Condition = ( {expression || " "} )
      </div>

      {validationMsg && (
        <div style={{
          padding: "8px 12px", borderRadius: 8, flexShrink: 0,
          background: "var(--app-shell-bg-danger)", border: "1px solid var(--app-border-danger)",
          color: "var(--app-text-danger)", fontSize: 12, fontWeight: 500,
        }}>
          {validationMsg}
        </div>
      )}

      {/* 2. Building blocks — underline centered to icon */}
      <div style={{ flexShrink: 0 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <div style={{
            color: "var(--app-text-muted)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            Building blocks
          </div>
          {tokens.length > 0 && (
            <button type="button" onClick={clearAll} title="Clear condition"
              className="flex items-center gap-1" style={{
                height: 24, padding: "0 6px", border: "none", background: "none",
                cursor: "pointer", color: "var(--app-text-danger-soft)", fontSize: 11, fontWeight: 600,
              }}>
              <Eraser size={12} /> Clear
            </button>
          )}
        </div>

        <div
          role="toolbar"
          aria-label="Criteria building blocks"
          className="flex items-start justify-between"
          style={{ gap: 2 }}
        >
          {PALETTE.map(item => {
            const active = picker === item.kind;
            const restricted = restrictedInFn(item.kind);
            const color = colorOf(item.kind);
            return (
              <button
                key={item.kind}
                type="button"
                title={restricted
                  ? "Not allowed inside a function argument — pick Field or Constant"
                  : item.tip}
                onMouseDown={e => e.preventDefault()}
                onClick={() => selectPalette(item.kind)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  flex: "1 1 0",
                  minWidth: 0,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 0 0",
                  opacity: restricted ? 0.45 : 1,
                }}
              >
                <span style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                }}>
                  <PaletteGlyph Icon={item.Icon} color={color} active={active} muted={restricted && !active} />
                  <span style={{
                    fontSize: 11,
                    fontWeight: active ? 650 : 500,
                    color: active ? color : "var(--app-text-secondary)",
                    lineHeight: 1.2,
                  }}>
                    {item.label}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      width: PALETTE_INDICATOR_W,
                      height: 2.5,
                      borderRadius: 999,
                      background: active ? color : "transparent",
                      transition: "background 0.15s",
                    }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Workspace — canvas shrinks when picker needs room on small screens */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 0, minHeight: 0, flex: 1,
        border: "1px solid var(--app-border)", borderRadius: 10, overflow: "hidden",
        background: "var(--app-shell-bg-subtle)",
      }}>
        <div
          role="listbox"
          aria-label="Criteria expression"
          onClick={() => { setCaret(tokens.length); setSelectedId(null); }}
          style={{
            padding: canvasCompact ? "8px 10px" : "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: canvasCompact ? 4 : 8,
            flexShrink: 0,
            // Compact strip when picker is open on short viewports
            maxHeight: canvasCompact ? 72 : pickerOpen ? 120 : undefined,
            minHeight: canvasCompact ? undefined : (pickerOpen ? 64 : 88),
            overflowY: canvasCompact || pickerOpen ? "auto" : "visible",
            scrollbarWidth: "thin",
            borderBottom: pickerOpen ? "1px solid var(--app-border)" : "none",
          }}
        >
          {!canvasCompact && (
            <div style={{ color: "var(--app-text-muted)", fontSize: 11, lineHeight: 1.3 }}>
              Condition = <span style={{ color: colorOf("operator") }}>(</span>
            </div>
          )}

          <div
            className="flex flex-wrap items-center"
            style={{ gap: 6, minHeight: 24, alignContent: "flex-start" }}
          >
            {tokens.length === 0 && caret === 0 && (
              <>
                <Caret />
                <span style={{ color: "var(--app-text-subtle)", fontSize: 12 }}>
                  Tap a building block above to start
                </span>
              </>
            )}
            {tokens.map((t, index) => {
              const color = colorOf(t.kind);
              return (
                <React.Fragment key={t.id}>
                  {caret === index && <Caret />}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedId === t.id}
                    title={`${t.kind}: ${t.value}`}
                    onClick={e => { e.stopPropagation(); setSelectedId(t.id); setCaret(index + 1); }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      maxWidth: "100%",
                      height: 26,
                      padding: t.kind === "brace" || t.kind === "operator" ? "0 8px" : "0 9px",
                      borderRadius: t.kind === "brace" || t.kind === "operator" ? 999 : 7,
                      border: selectedId === t.id ? `1px solid ${color}` : "1px solid transparent",
                      background: `${color}1a`,
                      color,
                      fontSize: 12,
                      fontWeight: t.kind === "operator" || t.kind === "condition" ? 700 : 600,
                      fontFamily: t.kind === "function" || t.kind === "brace"
                        ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
                      cursor: "pointer", lineHeight: 1,
                      boxSizing: "border-box",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.value}
                    </span>
                    {selectedId === t.id && (
                      <span
                        onClick={e => { e.stopPropagation(); removeAt(index); }}
                        style={{ display: "inline-flex", color: "var(--app-text-danger)" }}
                      >
                        <Trash2 size={11} />
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
            {caret === tokens.length && tokens.length > 0 && <Caret />}
          </div>

          {!canvasCompact && (
            <div style={{ color: colorOf("operator"), fontSize: 11, lineHeight: 1.3 }}>)</div>
          )}
        </div>

        {pickerOpen && activePalette && (
          <div
            onMouseDown={e => e.preventDefault()}
            style={{
              background: "var(--app-shell-bg-floating)",
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: compactViewport ? 160 : 200,
              overflow: "hidden",
            }}
          >
            <div className="flex items-center justify-between gap-2" style={{ padding: "8px 12px 0", flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colorOf(activePalette.kind), minWidth: 0 }}>
                {activePalette.label}
                {!compactViewport && (
                  <span style={{ color: "var(--app-text-muted)", fontWeight: 500, marginLeft: 8, fontSize: 11 }}>
                    {activePalette.tip}
                  </span>
                )}
              </div>
              <button type="button" onClick={() => setPicker(null)} style={{
                background: "none", border: "none", color: "var(--app-text-muted)",
                cursor: "pointer", fontSize: 11, fontWeight: 600, flexShrink: 0,
              }}>Close</button>
            </div>

            {picker === "constant" && (
              <div className="flex gap-1" style={{ padding: "8px 12px 0", flexWrap: "wrap", flexShrink: 0 }}>
                {([
                  { id: "bool" as const, label: "True/False" },
                  { id: "text" as const, label: "Text" },
                  { id: "number" as const, label: "Number" },
                  { id: "date" as const, label: "Date" },
                ]).map(m => (
                  <button key={m.id} type="button"
                    onClick={() => { setConstantMode(m.id); setConstantText(""); }}
                    style={{
                      height: 24, padding: "0 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${constantMode === m.id ? colorOf("constant") : "var(--app-border)"}`,
                      background: constantMode === m.id ? `${colorOf("constant")}18` : "transparent",
                      color: constantMode === m.id ? colorOf("constant") : "var(--app-text-muted)",
                    }}>{m.label}</button>
                ))}
              </div>
            )}

            {showSearch && (
              <div style={{ padding: "8px 12px 0", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <Search size={12} style={{ position: "absolute", left: 9, top: 9, color: "var(--app-text-muted)" }} />
                  <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={`Search ${activePalette.label.toLowerCase()}…`}
                    style={{ ...INPUT, paddingLeft: 28, paddingTop: 6, paddingBottom: 6 }} />
                </div>
              </div>
            )}

            <div style={{
              flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 0 8px",
              scrollbarWidth: "thin",
              WebkitOverflowScrolling: "touch",
            }}>
              {picker === "field" && (
                <>
                  {fieldGroups.size === 0 && (
                    <div style={{ color: "var(--app-text-subtle)", fontSize: 12, padding: "8px 12px" }}>
                      No fields available yet.
                    </div>
                  )}
                  {[...fieldGroups.entries()].map(([group, items]) => (
                    <div key={group}>
                      <div style={{
                        padding: "6px 12px 2px", color: "var(--app-text-muted)", fontSize: 10, fontWeight: 700,
                        letterSpacing: "0.04em", textTransform: "uppercase",
                      }}>{group}</div>
                      {items.map(item => (
                        <PickerRow
                          key={item.id}
                          label={item.label}
                          accent={colorOf("field")}
                          hint={item.fieldType}
                          onClick={() => insertOne("field", item.label)}
                        />
                      ))}
                    </div>
                  ))}
                </>
              )}

              {picker === "operator" && [...operatorGroups.entries()].map(([group, items]) => (
                <div key={group}>
                  <div style={{
                    padding: "6px 12px 2px", color: "var(--app-text-muted)", fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>{group}</div>
                  {items.map(item => (
                    <button key={item.value} type="button"
                      onClick={() => insertOne("operator", item.value)}
                      className="w-full text-left flex items-center justify-between" style={{
                        padding: "6px 12px", border: "none", cursor: "pointer",
                        background: "transparent", color: "var(--app-text-body)", fontSize: 12,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--app-shell-bg-hover)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontWeight: 700, color: colorOf("operator") }}>{item.value}</span>
                      <span style={{ color: "var(--app-text-muted)", fontSize: 11 }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}

              {picker === "function" && [...functionGroups.entries()].map(([group, items]) => (
                <div key={group}>
                  <div style={{
                    padding: "6px 12px 2px", color: "var(--app-text-muted)", fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>{group}</div>
                  {items.map(item => (
                    <button key={item.id} type="button"
                      onClick={() => insertFunction(item.name, item.minArgs)}
                      className="w-full text-left" style={{
                        display: "block", padding: "6px 12px", border: "none", cursor: "pointer",
                        background: "transparent", color: "var(--app-text-body)", fontSize: 12,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--app-shell-bg-hover)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ fontWeight: 700, color: colorOf("function") }}>{item.label}</div>
                      <div style={{
                        color: "var(--app-text-muted)", fontSize: 10,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      }}>
                        {item.name}({item.argHints.join(", ")})
                      </div>
                    </button>
                  ))}
                </div>
              ))}

              {picker === "condition" && filteredConditions.map(item => (
                <PickerRow
                  key={item.value}
                  label={item.label}
                  accent={colorOf("condition")}
                  hint={item.hint}
                  onClick={() => insertOne("condition", item.value)}
                />
              ))}

              {picker === "constant" && constantMode === "bool" && (
                ["TRUE", "FALSE"]
                  .filter(v => !search.trim() || v.toLowerCase().includes(search.trim().toLowerCase()))
                  .map(v => (
                    <PickerRow
                      key={v}
                      label={v === "TRUE" ? "True" : "False"}
                      accent={colorOf("constant")}
                      onClick={() => insertOne("constant", v)}
                    />
                  ))
              )}
            </div>

            {picker === "constant" && constantMode !== "bool" && (
              <div className="flex gap-2" style={{ padding: "0 12px 12px", flexShrink: 0 }}>
                <input
                  autoFocus
                  type={constantMode === "number" ? "number" : constantMode === "date" ? "date" : "text"}
                  value={constantText}
                  onChange={e => setConstantText(e.target.value)}
                  placeholder={constantMode === "text" ? "Enter text (or $ to pick a field)" : undefined}
                  style={{ ...INPUT, flex: 1 }}
                  onKeyDown={e => {
                    if (e.key === "$" && constantMode === "text") {
                      e.preventDefault();
                      setPicker("field");
                      setConstantText("");
                      return;
                    }
                    if (e.key === "Enter" && constantText.trim()) {
                      if (constantMode === "text") insertOne("constant", quoteText(constantText.trim()));
                      else if (constantMode === "number") insertOne("constant", constantText.trim());
                      else {
                        const [y, m, d] = constantText.split("-");
                        insertOne("constant", quoteText(`${d}/${m}/${y}`));
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={constantMode === "date" ? !constantText : !constantText.trim()}
                  onClick={() => {
                    if (constantMode === "text") insertOne("constant", quoteText(constantText.trim()));
                    else if (constantMode === "number") insertOne("constant", constantText.trim());
                    else {
                      const [y, m, d] = constantText.split("-");
                      insertOne("constant", quoteText(`${d}/${m}/${y}`));
                    }
                  }}
                  style={{
                    height: 34, padding: "0 12px", borderRadius: 8, border: "none",
                    cursor: "pointer", background: "var(--app-accent)", color: "var(--app-text-on-accent)",
                    fontSize: 12, fontWeight: 600,
                    opacity: (constantMode === "date" ? !constantText : !constantText.trim()) ? 0.5 : 1,
                  }}
                >Insert</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Modal ─────────────────────────────────────────────────────────────── */

export interface CriteriaBuilderModalProps {
  open: boolean;
  fields: SettingsFieldRef[];
  initialTokens: CriteriaToken[];
  onClose: () => void;
  onAdd: (tokens: CriteriaToken[], expression: string) => void;
}

export function CriteriaBuilderModal({
  open, fields, initialTokens, onClose, onAdd,
}: CriteriaBuilderModalProps) {
  const [draft, setDraft] = useState<CriteriaToken[]>(initialTokens);
  const [draftExpr, setDraftExpr] = useState(() => serializeCriteriaTokens(initialTokens));

  useEffect(() => {
    if (!open) return;
    setDraft(initialTokens);
    setDraftExpr(serializeCriteriaTokens(initialTokens));
  }, [open, initialTokens]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const canAdd = draft.length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center font-sans"
      style={{
        background: "var(--app-shell-bg-overlay)",
        backdropFilter: "blur(5px)",
        padding: "max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom))",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create criteria"
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          // Fill most of the viewport on short screens so the picker has room to scroll
          height: "min(820px, calc(100dvh - 16px))",
          maxHeight: "calc(100dvh - 16px)",
          display: "flex",
          flexDirection: "column",
          borderRadius: 14,
          border: "1px solid var(--app-border)",
          background: "var(--app-shell-bg-floating)",
          boxShadow: "0 24px 64px rgba(15, 23, 42, 0.22)",
          overflow: "hidden",
        }}
      >
        <div className="flex items-start justify-between gap-3" style={{
          padding: "12px 14px 10px",
          borderBottom: "1px solid var(--app-border-subtle)",
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "var(--app-text-primary)", fontSize: 15, fontWeight: 650 }}>
              {initialTokens.length ? "Edit criteria" : "Create criteria"}
            </div>
            <div style={{ color: "var(--app-text-muted)", fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>
              The record can be saved when this condition is met.
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{
              width: 30, height: 30, borderRadius: 8, border: "1px solid var(--app-border)",
              background: "var(--app-shell-bg-subtle)", color: "var(--app-text-muted)",
              cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
            <X size={14} />
          </button>
        </div>

        <div style={{
          padding: "12px 14px", flex: 1, minHeight: 0, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          <CriteriaBuilderBody
            tokens={draft}
            fields={fields}
            onChange={(tokens, expression) => {
              setDraft(tokens);
              setDraftExpr(expression);
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-2" style={{
          padding: "10px 14px 12px",
          borderTop: "1px solid var(--app-border-subtle)",
          background: "var(--app-shell-bg-subtle)",
          flexShrink: 0,
        }}>
          <button type="button" onClick={onClose} style={{
            height: 30, padding: "0 12px", borderRadius: 7,
            border: "1px solid var(--app-border)", background: "transparent",
            color: "var(--app-text-secondary)", cursor: "pointer", fontSize: 12, fontWeight: 550,
          }}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => onAdd(draft, draftExpr)}
            style={{
              height: 30, padding: "0 12px", borderRadius: 7, border: "none",
              background: canAdd ? "var(--app-accent)" : "var(--app-shell-bg-muted)",
              color: canAdd ? "var(--app-text-on-accent)" : "var(--app-text-disabled)",
              cursor: canAdd ? "pointer" : "not-allowed",
              fontSize: 12, fontWeight: 600,
            }}
          >
            Add criteria
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Summary card under the toggle ─────────────────────────────────────── */

/** Embedded entry used by Notifications / Calendar — same modal + summary pattern */
export interface CriteriaBuilderProps {
  tokens: CriteriaToken[];
  fields: SettingsFieldRef[];
  onChange: (tokens: CriteriaToken[], expression: string) => void;
  intentLabel?: string;
  embedded?: boolean;
}

export function CriteriaBuilder({
  tokens,
  fields,
  onChange,
  intentLabel = "The record can be saved when",
}: CriteriaBuilderProps) {
  const [open, setOpen] = useState(false);
  const hasCriteria = tokens.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.4 }}>
        {intentLabel}
      </div>
      {hasCriteria ? (
        <CriteriaSummaryCard
          tokens={tokens}
          expression={serializeCriteriaTokens(tokens)}
          onEdit={() => setOpen(true)}
          onDelete={() => onChange([], "")}
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5"
          style={{
            alignSelf: "flex-start",
            height: 30,
            padding: "0 11px",
            borderRadius: 7,
            border: "1px solid var(--app-border-accent)",
            background: "var(--app-shell-bg-accent)",
            color: "var(--app-text-accent-muted)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Add criteria
        </button>
      )}
      <CriteriaBuilderModal
        open={open}
        fields={fields}
        initialTokens={tokens}
        onClose={() => setOpen(false)}
        onAdd={(nextTokens, expression) => {
          onChange(nextTokens, expression);
          setOpen(false);
        }}
      />
    </div>
  );
}

export function CriteriaSummaryCard({
  tokens,
  expression,
  onEdit,
  onDelete,
}: {
  tokens: CriteriaToken[];
  expression: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const plain = humanizeCriteriaTokens(tokens);
  const formula = expression || serializeCriteriaTokens(tokens);

  return (
    <div style={{
      borderRadius: 10,
      border: "1px solid var(--app-border)",
      background: "var(--app-shell-bg-subtle)",
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div className="flex items-start justify-between gap-2">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            color: "var(--app-text-muted)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4,
          }}>
            Criteria
          </div>
          <div style={{
            color: "var(--app-text-info)",
            fontSize: 12,
            lineHeight: 1.45,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            wordBreak: "break-word",
          }}>
            Condition = ( {formula} )
          </div>
          {plain && (
            <div style={{ color: "var(--app-text-secondary)", fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>
              {plain}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
          <button type="button" onClick={onEdit} title="Edit criteria"
            style={{
              width: 28, height: 28, borderRadius: 7, border: "1px solid var(--app-border)",
              background: "var(--app-shell-bg-input)", color: "var(--app-text-secondary)",
              cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
            <Pencil size={12} />
          </button>
          <button type="button" onClick={onDelete} title="Delete criteria"
            style={{
              width: 28, height: 28, borderRadius: 7, border: "1px solid var(--app-border)",
              background: "var(--app-shell-bg-input)", color: "var(--app-text-danger-soft)",
              cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
