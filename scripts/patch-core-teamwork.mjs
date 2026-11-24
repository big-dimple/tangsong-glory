import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const patches = [
  [
    'this.brain.update(t),this.sense(),this.lastThink=this.time,!this.idle()',
    'this.brain.update(t),this.sense(),this.lastThink=this.time,(!this.idle()||tsConfig.teamTactics?.isUrgent(this))',
  ],
  [
    'this.dodge()||this.survive()||(this.finish(),!this.sustain()&&(this.combat()||this.assist()||this.doTask()))',
    'this.dodge()||this.survive()||(this.finish(),!this.sustain()&&(tsConfig.teamTactics?.respond(this)||this.combat()||this.assist()||this.doTask()))',
  ],
];

// The checked-in engine is generated from an optional read-only source. Keep
// these small integration hooks reproducible even in a standalone checkout.
export function patchCoreTeamwork(source) {
  for (const [before, after] of patches) {
    if (source.includes(after)) continue;
    const pieces = source.split(before);
    if (pieces.length !== 2) throw new Error(`teamwork hook expected one anchor, found ${pieces.length - 1}`);
    source = pieces.join(after);
  }
  return source;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const core = path.join(root, 'src/engine/mobaCore.js');
  const output = patchCoreTeamwork(fs.readFileSync(core, 'utf8'));
  new vm.Script(output.replace(/^export function /m, 'function '), { filename: 'mobaCore.js' });
  fs.writeFileSync(core, output);
  console.log('[patch-core-teamwork] AI teamwork hooks ready');
}
