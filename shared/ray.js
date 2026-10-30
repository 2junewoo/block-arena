// 사격 판정용 광선 검사 (서버 판정 + 클라이언트 탄 궤적 표시)

// 블록 격자를 한 칸씩 따라가며(DDA) 처음 닿는 블록을 찾는다
export function rayBlocks(map, o, d, max) {
  const cell = [Math.floor(o[0]), Math.floor(o[1]), Math.floor(o[2])];
  const step = [0, 0, 0], tMax = [0, 0, 0], tDelta = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    step[i] = Math.sign(d[i]);
    tDelta[i] = d[i] !== 0 ? Math.abs(1 / d[i]) : Infinity;
    tMax[i] = d[i] > 0 ? (cell[i] + 1 - o[i]) / d[i] : d[i] < 0 ? (o[i] - cell[i]) / -d[i] : Infinity;
  }
  let t = 0, axis = -1;
  while (t <= max) {
    if (axis >= 0 && map.solid(cell[0], cell[1], cell[2])) {
      const n = [0, 0, 0];
      n[axis] = -step[axis];
      return { t, cell: [...cell], n };
    }
    axis = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
    cell[axis] += step[axis];
    t = tMax[axis];
    tMax[axis] += tDelta[axis];
  }
  return null;
}

// 광선이 상자(min~max)에 닿는 거리, 안 닿으면 Infinity
export function rayBox(o, d, min, max) {
  let t0 = 0, t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    if (d[i] === 0) {
      if (o[i] < min[i] || o[i] > max[i]) return Infinity;
      continue;
    }
    let a = (min[i] - o[i]) / d[i], b = (max[i] - o[i]) / d[i];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return Infinity;
  }
  return t0;
}

// 플레이어 발 위치 기준 머리·몸통 판정 상자 (k = 크기 배율, 거인 카드)
export function hitboxes({ x, y, z }, k = 1) {
  return [
    { head: true, min: [x - 0.25 * k, y + 1.38 * k, z - 0.25 * k], max: [x + 0.25 * k, y + 1.88 * k, z + 0.25 * k] },
    { head: false, min: [x - 0.4 * k, y, z - 0.4 * k], max: [x + 0.4 * k, y + 1.38 * k, z + 0.4 * k] },
  ];
}
