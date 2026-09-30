const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const SRC = path.join(__dirname, 'src');
const ESCAPE_RE = /\\u[0-9A-Fa-f]{4}/;

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) out.push(full);
  }
}

const files = [];
walk(SRC, files);

let problems = [];

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  if (!code.includes('\\u')) continue; // quick skip
  let ast;
  try {
    ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  } catch (e) {
    console.error('PARSE ERROR', file, e.message);
    continue;
  }
  traverse(ast, {
    JSXText(p) {
      // JSXText raw content: check the raw source slice (escapes are literal here regardless)
      if (ESCAPE_RE.test(p.node.value)) {
        problems.push({ file, type: 'JSXText (raw, never processed)', snippet: p.node.value.trim().slice(0, 80), line: p.node.loc.start.line });
      }
    },
    JSXAttribute(p) {
      const val = p.node.value;
      if (val && val.type === 'StringLiteral') {
        // Bare-quoted JSX attribute string literal — does NOT process \u escapes.
        // Check the raw source text for this node, not the parsed .value
        // (which Babel may have already decoded assuming JS semantics).
        const raw = code.slice(val.start, val.end);
        if (ESCAPE_RE.test(raw)) {
          problems.push({ file, type: 'JSXAttribute bare string (not processed)', snippet: raw.slice(0, 80), line: val.loc.start.line });
        }
      }
    },
  });
}

if (problems.length === 0) {
  console.log('CLEAN — no raw/unprocessed unicode escapes found in JSXText or bare JSX attributes.');
} else {
  console.log(`Found ${problems.length} problem(s):\n`);
  for (const p of problems) {
    console.log(`${p.file}:${p.line}  [${p.type}]\n    ${p.snippet}\n`);
  }
}
