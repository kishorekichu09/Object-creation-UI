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

function toolsInRange(start, end) {
  const out = [];
  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (!line || !line.includes('"StrReplace"') && !line.includes('"Write"')) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    const content = obj?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part?.name === "StrReplace" || part?.name === "Write") {
        out.push({ i, name: part.name, input: part.input || {} });
      }
    }
  }
  return out;
}

// All App.tsx / wizard / launcher / app-theme StrReplace NEW strings in last 40 messages before shadcn
const start = Math.max(0, shadcnIdx - 80);
const interesting = toolsInRange(start, shadcnIdx).filter(({ input }) => {
  const p = String(input.path || "").replace(/\\/g, "/");
  return (
    p.endsWith("App.tsx") ||
    p.endsWith("create-object-wizard.tsx") ||
    p.endsWith("create-object-launcher.tsx") ||
    p.endsWith("app-theme.css") ||
    p.endsWith("theme-toggle.tsx") ||
    p.endsWith("object-advanced-panel.tsx")
  );
});

console.log("tools near pre-shadcn:", interesting.length);
for (const t of interesting) {
  const p = path.basename(String(t.input.path || ""));
  const payload = t.name === "Write" ? t.input.contents : t.input.new_string;
  const len = (payload || "").length;
  console.log(t.i, t.name, p, len);
  if (payload && len > 50) {
    fs.writeFileSync(path.join(outDir, `near-${t.i}-${t.name}-${p}.txt`), payload, "utf8");
  }
  if (t.name === "StrReplace" && t.input.old_string) {
    fs.writeFileSync(path.join(outDir, `near-${t.i}-OLD-${p}.txt`), t.input.old_string, "utf8");
  }
}

// Dump the exact explore/minimap/wizard glass replacements from message ~291 area
for (const t of toolsInRange(280, shadcnIdx)) {
  const p = String(t.input.path || "");
  if (!p.includes("App.tsx") && !p.includes("wizard") && !p.includes("app-theme")) continue;
  const neu = t.input.new_string || "";
  if (neu.includes("borderRadius: 16") || neu.includes("floating-soft") || neu.includes("ActiveNavIcon") || neu.includes("blur(22px)")) {
    console.log("KEY", t.i, path.basename(p), neu.slice(0, 100).replace(/\n/g, " "));
  }
}
