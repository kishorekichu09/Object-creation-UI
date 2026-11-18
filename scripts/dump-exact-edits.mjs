import fs from "fs";

const transcript =
  "C:/Users/kish3888/.cursor/projects/c-Users-kish3888-Documents-2-Cytoscape-themed-object-flow/agent-transcripts/3149a12c-a586-422e-855d-998567155f1a/3149a12c-a586-422e-855d-998567155f1a.jsonl";
const out =
  "C:/Users/kish3888/Documents/2/Cytoscape themed object flow/.restore-tmp";
fs.mkdirSync(out, { recursive: true });
const lines = fs.readFileSync(transcript, "utf8").split(/\r?\n/);

for (const idx of [237, 265, 276, 277, 278, 280, 282, 290, 291, 293, 295, 296, 297]) {
  const line = lines[idx];
  if (!line) continue;
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    continue;
  }
  const content = obj?.message?.content;
  if (!Array.isArray(content)) continue;
  let n = 0;
  for (const part of content) {
    if (part?.name !== "StrReplace" && part?.name !== "Write") continue;
    const p = String(part.input?.path || "").replace(/\\/g, "/");
    const base = p.split("/").pop();
    const body = part.name === "Write" ? part.input.contents : part.input.new_string;
    if (!body) continue;
    n += 1;
    fs.writeFileSync(`${out}/exact-${idx}-${n}-${part.name}-${base}.txt`, body);
    if (part.input.old_string) {
      fs.writeFileSync(`${out}/exact-${idx}-${n}-OLD-${base}.txt`, part.input.old_string);
    }
    console.log(idx, n, part.name, base, body.length);
  }
}
