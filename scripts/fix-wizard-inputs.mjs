import fs from "fs";

const p = "src/app/components/create-object-wizard.tsx";
let s = fs.readFileSync(p, "utf8");

s = s.replace(/<Input\b([^/>]*)\/>/g, (_m, attrs) => {
  const a = String(attrs)
    .replace(/\s*className=\{formInputClass\}/g, "")
    .replace(/\s*className=\{cn\(formInputClass[^}]*\)\}/g, "");
  return `<input style={INPUT}${a}/>`;
});

s = s.replace(/<Input\b([^>]*)>/g, (_m, attrs) => {
  const a = String(attrs)
    .replace(/\s*className=\{formInputClass\}/g, "")
    .replace(/\s*className=\{cn\(formInputClass[^}]*\)\}/g, "");
  return `<input style={INPUT}${a}>`;
});
s = s.replace(/<\/Input>/g, "</input>");

s = s.replace(/<Textarea\b([^>]*)>/g, (_m, attrs) => {
  const a = String(attrs)
    .replace(/\s*className=\{formInputClass\}/g, "")
    .replace(/\s*className=\{cn\(formInputClass[^}]*\)\}/g, "");
  return `<textarea style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}${a}>`;
});
s = s.replace(/<\/Textarea>/g, "</textarea>");

s = s.replace(/\s*className=\{formInputClass\}/g, "");
s = s.replace(/\s*className=\{cn\(formInputClass[^}]*\)\}/g, "");

// Avoid duplicate style props if we already had style={INPUT}
s = s.replace(/style=\{INPUT\}\s*style=\{INPUT\}/g, "style={INPUT}");
s = s.replace(/<input style=\{INPUT\}([^>]*?)style=\{INPUT\}/g, "<input style={INPUT}$1");

fs.writeFileSync(p, s);
console.log("Input remnants", (s.match(/<Input\b/g) || []).length);
console.log("Textarea remnants", (s.match(/<Textarea\b/g) || []).length);
console.log("formInputClass remnants", (s.match(/formInputClass/g) || []).length);
