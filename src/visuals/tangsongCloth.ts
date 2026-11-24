/** 横向褶深，以半幅布宽为单位。固定端贴住挂点，活动端逐渐起伏。 */
export function clothFoldDepth(across: number, drop: number, pleats: number, phase: number): number {
  const side = 2 * across - 1;
  const drift = 0.65 * Math.sin(side * 2.4 + drop * 2.1 + phase);
  const angle = across * pleats * Math.PI * 2 + phase + drift;
  const gather = Math.cos(angle) * (0.8 + 0.2 * Math.sin(side * 3 - drop + phase));
  const rolledEdge = side ** 4 * (0.5 + 0.4 * Math.sin(drop * 4 + side + phase));
  return drop * (2 - drop) * (gather + rolledEdge);
}
