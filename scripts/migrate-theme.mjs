/**
 * One-time migration: replace hardcoded colors with CSS theme variables.
 * Run: node scripts/migrate-theme.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "src", "app");

/** Longest-first to avoid partial replacements */
const REPLACEMENTS = [
  ["rgba(5,5,10,0.98)", "var(--app-shell-bg-elevated)"],
  ["rgba(5,5,10,0.97)", "var(--app-shell-bg)"],
  ["rgba(7,7,12,0.99)", "var(--app-shell-bg-muted)"],
  ["rgba(8,8,12,0.97)", "var(--app-shell-bg-panel)"],
  ["rgba(12,12,18,0.98)", "var(--app-shell-bg-dropdown)"],
  ["rgba(0,0,0,0.55)", "var(--app-overlay-blur)"],
  ["rgba(0,0,0,0.5)", "var(--app-shell-bg-overlay)"],
  ["rgba(0,0,0,0.25)", "var(--app-shell-bg-footer)"],
  ["rgba(255,255,255,0.015)", "var(--app-shell-bg-subtle)"],
  ["rgba(255,255,255,0.18)", "var(--app-scrollbar-thumb)"],
  ["rgba(255,255,255,0.22)", "var(--app-scrollbar-thumb-strong)"],
  ["rgba(99,102,241,0.45)", "var(--app-border-accent-strong)"],
  ["rgba(99,102,241,0.35)", "var(--app-border-accent)"],
  ["rgba(99,102,241,0.28)", "var(--app-border-accent)"],
  ["rgba(99,102,241,0.25)", "var(--app-border-accent)"],
  ["rgba(99,102,241,0.22)", "var(--app-border-accent)"],
  ["rgba(99,102,241,0.14)", "var(--app-shell-bg-accent-strong)"],
  ["rgba(99,102,241,0.12)", "var(--app-shell-bg-accent)"],
  ["rgba(99,102,241,0.1)", "var(--app-shell-bg-accent)"],
  ["rgba(99,102,241,0.08)", "var(--app-shell-bg-accent)"],
  ["rgba(99,102,241,0.07)", "var(--app-shell-bg-info)"],
  ["rgba(59,130,246,0.07)", "var(--app-shell-bg-info)"],
  ["rgba(59,130,246,0.08)", "var(--app-shell-bg-info)"],
  ["rgba(96,165,250,0.22)", "var(--app-border-info)"],
  ["rgba(127,29,29,0.2)", "var(--app-shell-bg-danger)"],
  ["rgba(248,113,113,0.25)", "var(--app-border-danger)"],
  ["rgba(16,185,129,0.12)", "var(--app-shell-bg-success)"],
  ["rgba(255,255,255,0.12)", "var(--app-border-strong)"],
  ["rgba(255,255,255,0.1)", "var(--app-border)"],
  ["rgba(255,255,255,0.08)", "var(--app-border)"],
  ["rgba(255,255,255,0.07)", "var(--app-border-subtle)"],
  ["rgba(255,255,255,0.06)", "var(--app-border-subtle)"],
  ["rgba(255,255,255,0.05)", "var(--app-shell-bg-input)"],
  ["rgba(255,255,255,0.03)", "var(--app-shell-bg-subtle)"],
  ["rgba(255,255,255,0.02)", "var(--app-shell-bg-subtle)"],
  ["rgba(255,255,255,0.15)", "var(--app-toggle-off)"],
  ["#BFDBFE", "var(--app-text-info)"],
  ["#FCA5A5", "var(--app-text-danger-soft)"],
  ["#F87171", "var(--app-text-danger)"],
  ["#A5B4FC", "var(--app-text-accent-muted)"],
  ["#818CF8", "var(--app-accent-light)"],
  ["#6366F1", "var(--app-accent)"],
  ["#C9D1D9", "var(--app-text-body)"],
  ["#D1D5DB", "var(--app-text-body)"],
  ["#E5E7EB", "var(--app-text-primary)"],
  ["#9CA3AF", "var(--app-text-secondary)"],
  ["#6B7280", "var(--app-text-muted)"],
  ["#4B5563", "var(--app-text-subtle)"],
  ["#374151", "var(--app-text-disabled)"],
  ["#000000", "var(--app-graph-bg)"],
  ['background: "#fff"', 'background: "var(--app-text-on-accent)"'],
  ['color: "#fff"', 'color: "var(--app-text-on-accent)"'],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "ui") continue;
      walk(full, files);
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(root);
let total = 0;

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  const original = content;
  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }
  if (content !== original) {
    fs.writeFileSync(file, content);
    total++;
    console.log("Updated:", path.relative(root, file));
  }
}

console.log(`\nDone. ${total} files updated.`);
