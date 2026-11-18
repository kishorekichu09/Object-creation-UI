import fs from "fs";
import path from "path";

const transcript = String.raw`C:\Users\kish3888\.cursor\projects\c-Users-kish3888-Documents-2-Cytoscape-themed-object-flow\agent-transcripts\3149a12c-a586-422e-855d-998567155f1a\3149a12c-a586-422e-855d-998567155f1a.jsonl`;
const outDir = String.raw`C:\Users\kish3888\Documents\2\Cytoscape themed object flow\.restore-tmp`;
fs.mkdirSync(outDir, { recursive: true });

const lines = fs.readFileSync(transcript, "utf8").split(/\r?\n/);
let shadcnIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("npx shadcn@latest init") && lines[i].includes("user_query")) {
    shadcnIdx = i;
    break;
  }
}
console.log("shadcn_user_msg_line", shadcnIdx, "total", lines.length);

function iterToolCalls(start, end) {
  const out = [];
  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (!line || (!line.includes('"Write"') && !line.includes('"StrReplace"'))) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    const content = obj?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      if (part.name === "Write" || part.name === "StrReplace") {
        out.push({ i, name: part.name, input: part.input || {} });
      }
    }
  }
  return out;
}

const keyFiles = [
  "App.tsx", "create-object-wizard.tsx", "create-object-launcher.tsx",
  "theme.css", "app-theme.css", "tailwind.css", "fonts.css", "main.tsx",
  "theme-toggle.tsx", "object-properties-panel.tsx", "object-advanced-panel.tsx",
];

const lastWrite = {};
for (const { i, name, input } of iterToolCalls(0, shadcnIdx > 0 ? shadcnIdx : 0)) {
  if (name !== "Write") continue;
  const p = String(input.path || "").replace(/\\/g, "/");
  for (const k of keyFiles) {
    if (p.endsWith(k)) {
      lastWrite[k] = { i, path: p, contents: input.contents || "" };
    }
  }
}
console.log("Last Write before shadcn:");
for (const [k, v] of Object.entries(lastWrite)) {
  console.log(`  ${k}: line ${v.i} bytes ${v.contents.length}`);
  fs.writeFileSync(path.join(outDir, `write-before-${k}`), v.contents, "utf8");
}

// Find first App.tsx edit that introduces shadcn Button import
let migrateIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("App.tsx") && lines[i].includes("@/app/components/ui/button")) {
    migrateIdx = i;
    break;
  }
}
console.log("first_App_button_import_line", migrateIdx);

// Capture StrReplace old_strings that were replaced WHEN introducing Button/Card/InputGroup
let frag = 0;
for (const { i, name, input } of iterToolCalls(shadcnIdx > 0 ? shadcnIdx : 0, lines.length)) {
  if (name !== "StrReplace") continue;
  const p = String(input.path || "").replace(/\\/g, "/");
  const old = input.old_string || "";
  const neu = input.new_string || "";
  const isApp = p.endsWith("App.tsx");
  const isWizard = p.endsWith("create-object-wizard.tsx");
  const isLauncher = p.endsWith("create-object-launcher.tsx");
  const isThemeToggle = p.endsWith("theme-toggle.tsx");
  if (!(isApp || isWizard || isLauncher || isThemeToggle || p.endsWith("theme.css"))) continue;

  const introducingShadcn =
    (neu.includes("Button") || neu.includes("InputGroup") || neu.includes("Card") || neu.includes("from \"@/app/components/ui")) &&
    (old.includes("<button") || old.includes("app-btn-primary") || old.includes("EXPLORE") || old.includes("function ThemeToggle") || old.includes("LaunchCard") || old.includes("const INPUT"));

  if (introducingShadcn && old.length > 100) {
    const base = path.basename(p);
    fs.writeFileSync(path.join(outDir, `pre-shadcn-${base}-${i}.txt`), old, "utf8");
    frag++;
    console.log("fragment", base, i, "bytes", old.length);
  }

  // theme.css emptied - capture old_string
  if (p.endsWith("theme.css") && old.includes("--background") && neu.length < 500) {
    fs.writeFileSync(path.join(outDir, `pre-shadcn-theme.css-${i}.txt`), old, "utf8");
    console.log("theme.css restore candidate", i, old.length);
  }
}
console.log("fragments saved", frag);

// Also: StrReplace where NEW introduces shadcn and OLD is large header block
for (const { i, name, input } of iterToolCalls(0, lines.length)) {
  if (name !== "StrReplace") continue;
  const p = String(input.path || "").replace(/\\/g, "/");
  if (!p.endsWith("App.tsx")) continue;
  const old = input.old_string || "";
  const neu = input.new_string || "";
  if (old.includes("/* ─── HEADER") || old.includes("LEFT PANEL") || old.includes("GRAPH SEARCH")) {
    fs.writeFileSync(path.join(outDir, `app-section-${i}.txt`), JSON.stringify({ oldLen: old.length, newLen: neu.length, oldStart: old.slice(0, 120), newStart: neu.slice(0, 120) }, null, 2));
  }
}
console.log("done", outDir);
