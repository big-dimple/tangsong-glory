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
  [
    '`cast_${kitOf(c.heroId)}_${c.slot}`',
    '`cast_${r1["cast_"+c.heroId+"_"+c.slot]?c.heroId:kitOf(c.heroId)}_${c.slot}`',
  ],
  // K3 结算阶段通知：原先只有 loading / match 会通知表现层，朱印落款需要知道结算页何时挂上
  ['a="result",rt.disposeHud()', 'a="result",tsConfig.onPhaseChange?.("result"),rt.disposeHud()'],
  // K4 加载页关闭时长：收卷转场需要比 0.4s 淡出更长的窗口，由表现层按是否播放演出决定
  [
    'f.classList.add("is-closing"),window.setTimeout(()=>{d.dispose(),f.remove()},400)',
    'f.classList.add("is-closing"),window.setTimeout(()=>{d.dispose(),f.remove()},tsConfig.loadingCloseMs?.()??400)',
  ],
];

// Keep integration hooks reproducible when the optional read-only source exists.
export function patchCoreHooks(source) {
  for (const [before, after] of patches) {
    if (source.includes(after)) continue;
    const pieces = source.split(before);
    if (pieces.length !== 2) throw new Error(`core hook expected one anchor, found ${pieces.length - 1}`);
    source = pieces.join(after);
  }
  return source;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const core = path.join(root, 'src/engine/mobaCore.js');
  const output = patchCoreHooks(fs.readFileSync(core, 'utf8'));
  new vm.Script(output.replace(/^export function /m, 'function '), { filename: 'mobaCore.js' });
  fs.writeFileSync(core, output);
  console.log('[patch-core-hooks] integration hooks ready');
}
