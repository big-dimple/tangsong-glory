type WingVertex = [x: number, y: number, z: number, shade: number];

/** 翼根朝原点，翼展沿 +X，前缘朝 +Z。覆羽与飞羽合在同一份网格中。 */
export function buildFeatheredWing(span: number, chord: number, rise: number, sweep: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  const shades: number[] = [];

  function vertex([x, y, z, shade]: WingVertex) {
    positions.push(x, y, z);
    shades.push(shade);
  }

  // 每圈共享顶点，末端收在一个羽尖，正反面和侧缘从各自的曲面取得法线。
  function addTaperedRings(rows: number, sides: number, point: (t: number, angle: number) => WingVertex) {
    const base = positions.length / 3;
    const tip = base + rows * sides;
    for (let row = 0; row < rows; row++) {
      for (let j = 0; j < sides; j++) {
        vertex(point(row / rows, j * 2 * Math.PI / sides));
        const a = base + row * sides + j;
        const b = base + row * sides + (j + 1) % sides;
        if (row === rows - 1) indices.push(a, tip, b);
        else indices.push(a, a + sides, b + sides, a, b + sides, b);
      }
    }
    vertex(point(1, 0));
    for (let j = 1; j < sides - 1; j++) indices.push(base, base + j, base + j + 1);
  }

  const wristHeight = (s: number) => rise * (Math.sin(Math.PI * s) - 0.28 * s * s);
  const leadingEdge = (s: number) => chord * 0.12 * Math.sin(Math.PI * s) - sweep * s * s;
  const covertSpan = 0.86;
  const covertChord = (t: number) => chord * (0.80 * (1 - t * t) + 0.16 * Math.sin(Math.PI * t));
  addTaperedRings(22, 12, (t, angle) => {
    const s = t * covertSpan;
    const width = covertChord(t);
    const back = (1 + Math.cos(angle)) / 2;
    const featherLine = (4.5 * t - back * (0.3 + t * 0.5)) * Math.PI * 2;
    const groove = back * back * Math.sin(Math.PI * t) * (0.5 + 0.5 * Math.cos(featherLine)) ** 2;
    const camber = 0.15 * Math.sin(Math.PI * back) - 0.10 * back;
    const thickness = 0.14 * (1 - 0.65 * back) * Math.sin(angle);
    return [
      span * s,
      wristHeight(s) + width * (camber - thickness - 0.105 * groove),
      leadingEdge(s) - width * (back - 0.11 * groove),
      0.12 * back + 0.32 * groove,
    ];
  });

  // 外侧初级飞羽逐根外展。羽根藏在覆羽下，羽轴微拱，两侧羽片宽窄有别。
  for (let feather = 0; feather < 6; feather++) {
    const fan = feather / 5;
    const root = 0.20 + 0.49 * fan;
    const end = 0.29 + 0.71 * fan;
    const rootZ = leadingEdge(root) - covertChord(root / covertSpan) * (0.62 - 0.32 * fan);
    const tipZ = leadingEdge(end) - chord * (1.16 - 0.86 * fan + 0.19 * Math.sin(Math.PI * fan));
    const dx = span * (end - root);
    const dz = tipZ - rootZ;
    const length = Math.hypot(dx, dz);
    addTaperedRings(6, 6, (row, angle) => {
      const t = (1 - Math.cos(Math.PI * row)) / 2;
      const belly = Math.sin(Math.PI * t);
      const width = span * (0.084 - 0.012 * fan) * (0.5 * (1 - t) + 0.84 * Math.sqrt(belly));
      const vane = Math.cos(angle);
      const sideways = width * vane * (vane > 0 ? 0.78 : 1);
      const s = root + (end - root) * t;
      return [
        span * s - dz / length * sideways,
        wristHeight(s) + chord * (0.075 * belly - 0.015 - (0.18 - 0.08 * fan) * t)
          + width * (0.19 * Math.sin(angle) - 0.10 * vane * vane),
        rootZ + dz * t + dx / length * sideways,
        0.19 + 0.22 * t + 0.12 * vane * vane,
      ];
    });
  }
  return { positions, indices, shades };
}
