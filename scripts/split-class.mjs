// Divide uma classe grande em mixins por grupos de métodos, sem mudar comportamento.
// Uso: node split.mjs <arquivo> <config.json>
import fs from 'node:fs';
import path from 'node:path';

const [file, cfgPath] = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const raw = fs.readFileSync(file, 'utf8');
const lines = raw.split(/\r?\n/);

const startRe = /^  (?:async )?([A-Za-z_0-9]+)\(.*\)\s*\{\s*(\}\s*)?$/;
const classLine = lines.findIndex((l) => /^export class /.test(l));
let classEnd = lines.length - 1;
while (classEnd > 0 && lines[classEnd].trim() === '') classEnd--;
if (lines[classEnd].trim() !== '}') throw new Error('Fim da classe não encontrado: ' + lines[classEnd]);

// localizar métodos
const methods = [];
const seen = {};
for (let i = classLine + 1; i < classEnd; i++) {
  const m = lines[i].match(startRe);
  if (!m) continue;
  let end = i;
  if (!m[2]) { end = i + 1; while (lines[end] !== '  }') end++; }
  let lead = i;
  while (lead - 1 > classLine && /^\s*\/\/.*$/.test(lines[lead - 1])) lead--;
  seen[m[1]] = (seen[m[1]] || 0) + 1;
  methods.push({ name: m[1], occ: seen[m[1]], key: seen[m[1]] > 1 ? `${m[1]}#${seen[m[1]]}` : m[1], lead, start: i, end });
  i = end;
}

// cobertura: o que sobra fora dos métodos deve ser vazio/comentário
const covered = new Array(lines.length).fill(false);
for (const m of methods) for (let k = m.lead; k <= m.end; k++) covered[k] = true;
const orphans = [];
for (let i = classLine + 1; i < classEnd; i++) if (!covered[i] && lines[i].trim() !== '' && !/^\s*(\/\/|\/\*|\*)/.test(lines[i])) orphans.push(`${i + 1}: ${lines[i]}`);
if (orphans.length) { console.log('ÓRFÃOS:\n' + orphans.slice(0, 20).join('\n')); process.exit(1); }

const byKey = Object.fromEntries(methods.map((m) => [m.key, m]));
const drop = new Set(cfg.drop || []);
const moved = new Set();
const outDir = path.join(path.dirname(file), cfg.dir);
fs.mkdirSync(outDir, { recursive: true });
const imports = [];

for (const [mod, spec] of Object.entries(cfg.modules)) {
  const body = [];
  for (const key of spec.methods) {
    const m = byKey[key];
    if (!m) throw new Error('Método não encontrado: ' + key);
    moved.add(key);
    body.push(lines.slice(m.lead, m.end + 1).join('\n'));
  }
  const exportName = spec.export;
  const text = `${spec.header ? spec.header + '\n\n' : ''}import * as THREE from 'three';\n\n/** ${spec.doc} */\nexport const ${exportName} = {\n${body.join(',\n\n')}\n};\n`;
  fs.writeFileSync(path.join(outDir, mod + '.js'), text.replace(/\n/g, '\r\n'));
  imports.push({ mod, exportName });
  console.log(mod, spec.methods.length, 'métodos', Math.round(text.length / 1024) + ' KB');
}

// reescrever a classe original
const remove = new Array(lines.length).fill(false);
for (const m of methods) if (moved.has(m.key) || drop.has(m.key)) for (let k = m.lead; k <= m.end; k++) remove[k] = true;
let out = [];
for (let i = 0; i < lines.length; i++) if (!remove[i]) out.push(lines[i]);
// colapsar linhas em branco
out = out.filter((l, i) => !(l.trim() === '' && out[i - 1] !== undefined && out[i - 1].trim() === ''));
const impLines = imports.map((i) => `import { ${i.exportName} } from './${cfg.dir}/${i.mod}.js';`);
const firstImport = out.findIndex((l) => l.startsWith('import '));
out.splice(firstImport + 1, 0, ...impLines);
const className = lines[classLine].match(/export class (\w+)/)[1];
while (out[out.length - 1].trim() === '') out.pop();
out.push('', `Object.assign(${className}.prototype, ${imports.map((i) => i.exportName).join(', ')});`, '');
fs.writeFileSync(file, out.join('\r\n'));
console.log('Restante em', path.basename(file), Math.round(out.join('\n').length / 1024) + ' KB');
