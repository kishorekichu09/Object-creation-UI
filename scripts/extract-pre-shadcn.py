import json
from pathlib import Path

p = Path(r"C:\Users\kish3888\.cursor\projects\c-Users-kish3888-Documents-2-Cytoscape-themed-object-flow\agent-transcripts\3149a12c-a586-422e-855d-998567155f1a\3149a12c-a586-422e-855d-998567155f1a.jsonl")
lines = p.read_text(encoding="utf-8", errors="replace").splitlines()

shadcn_idx = None
for i, line in enumerate(lines):
    if "npx shadcn@latest init" in line and "user_query" in line:
        shadcn_idx = i
        break
print("shadcn_user_msg_line", shadcn_idx, "total", len(lines))

key_files = [
    "App.tsx",
    "create-object-wizard.tsx",
    "create-object-launcher.tsx",
    "theme.css",
    "app-theme.css",
    "tailwind.css",
    "fonts.css",
    "main.tsx",
    "theme-toggle.tsx",
    "object-properties-panel.tsx",
    "object-advanced-panel.tsx",
]

# Find first migration that introduced @/app/components/ui/button into App.tsx
migrate_idx = None
for i, line in enumerate(lines):
    if "App.tsx" in line and "@/app/components/ui/button" in line and "StrReplace" in line:
        migrate_idx = i
        break
print("first_App_button_import_line", migrate_idx)

# Extract StrReplace old_strings for App.tsx from migration messages (first shadcn UI migration)
# Also dump Write contents for theme-toggle etc before shadcn


def iter_tool_calls(start, end):
    for i, line in enumerate(lines[start:end], start=start):
        try:
            obj = json.loads(line)
        except Exception:
            continue
        content = obj.get("message", {}).get("content", [])
        if not isinstance(content, list):
            continue
        for part in content:
            if not isinstance(part, dict):
                continue
            name = part.get("name")
            inp = part.get("input") or {}
            if name in ("Write", "StrReplace"):
                yield i, name, inp


out_dir = Path(r"C:\Users\kish3888\Documents\2\Cytoscape themed object flow\.restore-tmp")
out_dir.mkdir(exist_ok=True)

# Collect last Write before shadcn for each key file
last_write = {}
for i, name, inp in iter_tool_calls(0, shadcn_idx or 0):
    if name != "Write":
        continue
    path = (inp.get("path") or "").replace("\\", "/")
    for k in key_files:
        if path.endswith(k):
            last_write[k] = (i, path, inp.get("contents") or "")

print("Last Write before shadcn:")
for k, (i, path, contents) in last_write.items():
    print(f"  {k}: line {i} bytes {len(contents)}")
    (out_dir / f"write-before-{k.replace('/', '_')}").write_text(contents, encoding="utf-8")

# Extract App.tsx StrReplace pairs in the window AFTER shadcn init but looking at migration
# Better: find Task completion messages - not available.
# Instead extract ALL StrReplace for App.tsx where old_string contains app-btn-primary or Explore panel

candidates = []
for i, name, inp in iter_tool_calls(0, len(lines)):
    if name != "StrReplace":
        continue
    path = (inp.get("path") or "").replace("\\", "/")
    if not path.endswith("App.tsx"):
        continue
    old = inp.get("old_string") or ""
    new = inp.get("new_string") or ""
    if "app-btn-primary" in old or "LEFT PANEL" in old or "EXPLORE" in old or "px-3 pt-3" in old:
        candidates.append((i, len(old), len(new), old[:80].replace("\n", " ")))

print("App.tsx StrReplace candidates:", len(candidates))
for c in candidates[-15:]:
    print(c)

# Save largest old_string fragments for App chrome from BEFORE first button import
chrome_olds = []
end = migrate_idx if migrate_idx else (shadcn_idx or len(lines))
for i, name, inp in iter_tool_calls(0, end):
    if name != "StrReplace":
        continue
    path = (inp.get("path") or "").replace("\\", "/")
    if not path.endswith("App.tsx"):
        continue
    old = inp.get("old_string") or ""
    if len(old) > 200:
        chrome_olds.append((i, old))

print("Large App.tsx old_strings before migration:", len(chrome_olds))
for i, old in chrome_olds[-5:]:
    (out_dir / f"app-old-{i}.txt").write_text(old, encoding="utf-8")
    print(" saved app-old-", i, "bytes", len(old))

# Find StrReplace that REPLACED custom header WITH Button - old_string is pre-shadcn header
for i, name, inp in iter_tool_calls(shadcn_idx or 0, len(lines)):
    if name != "StrReplace":
        continue
    path = (inp.get("path") or "").replace("\\", "/")
    if not path.endswith("App.tsx"):
        continue
    old = inp.get("old_string") or ""
    new = inp.get("new_string") or ""
    if "Create Object" in old and "button" in old and ("Button" in new or "InputGroup" in new or "Card" in new):
        (out_dir / f"app-pre-migrate-{i}.txt").write_text(old, encoding="utf-8")
        print("pre-migrate fragment", i, "bytes", len(old))
    if "Create Object" in old and "<button" in old and "Button" in new:
        (out_dir / f"app-pre-migrate-btn-{i}.txt").write_text(old, encoding="utf-8")
        print("pre-migrate btn fragment", i, "bytes", len(old))
PY
