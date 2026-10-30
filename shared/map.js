// 블록 맵: 서버와 클라이언트가 같은 함수로 똑같은 맵을 만든다 (맵 데이터는 보내지 않음)
export const W = 48, D = 48, H = 10;
export const B = { AIR: 0, FLOOR: 1, WALL: 2, STONE: 3, CRATE: 4, COVER: 5, GHOST: 6 };
// 총으로 부술 수 있는 블록과 그 체력. 여기 없는 블록은 안 부서짐
export const BLOCK_HP = { [B.CRATE]: 75, [B.COVER]: 150, [B.GHOST]: 50 };
// 망령이 지울 수 있는 블록
export const GHOST_REMOVABLE = new Set([B.CRATE, B.GHOST]);

export const SPAWNS = [
  [4.5, 1, 4.5], [43.5, 1, 43.5], [4.5, 1, 43.5], [43.5, 1, 4.5], [24, 3, 24],
];

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function createMap() {
  const cells = new Uint8Array(W * D * H);
  const idx = (x, y, z) => x + W * (z + D * y);
  const inside = (x, y, z) => x >= 0 && x < W && z >= 0 && z < D && y >= 0 && y < H;
  const box = (x0, y0, z0, x1, y1, z1, b) => {
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++)
          if (inside(x, y, z)) cells[idx(x, y, z)] = b;
  };

  // 바닥과 바깥 벽
  box(0, 0, 0, W - 1, 0, D - 1, B.FLOOR);
  box(0, 1, 0, W - 1, 4, 0, B.WALL);
  box(0, 1, D - 1, W - 1, 4, D - 1, B.WALL);
  box(0, 1, 0, 0, 4, D - 1, B.WALL);
  box(W - 1, 1, 0, W - 1, 4, D - 1, B.WALL);

  // 가운데 단상(높이 2)과 네 방향 계단
  box(20, 1, 20, 27, 2, 27, B.STONE);
  box(23, 1, 19, 24, 1, 19, B.STONE);
  box(23, 1, 28, 24, 1, 28, B.STONE);
  box(19, 1, 23, 19, 1, 24, B.STONE);
  box(28, 1, 23, 28, 1, 24, B.STONE);

  // 사분면마다 키 큰 벽(못 넘음)과 낮은 엄폐물(점프로 넘음)
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const cx = sx > 0 ? 12 : 35, cz = sz > 0 ? 12 : 35;
    box(cx - 3, 1, cz, cx + 3, 3, cz, B.WALL);
    box(cx, 1, cz - 3, cx, 3, cz - 1, B.WALL);
    box(cx + 2 * sx, 1, cz + 3 * sz, cx + 4 * sx, 1, cz + 3 * sz, B.COVER);
  }
  // 중앙으로 가는 길목의 낮은 엄폐물
  box(16, 1, 23, 16, 1, 24, B.COVER);
  box(31, 1, 23, 31, 1, 24, B.COVER);
  box(23, 1, 16, 24, 1, 16, B.COVER);
  box(23, 1, 31, 24, 1, 31, B.COVER);

  // 상자 더미 (나중에 부술 수 있는 블록)
  const r = rng(20261030);
  let placed = 0;
  while (placed < 22) {
    const x = 3 + Math.floor(r() * 41), z = 3 + Math.floor(r() * 41);
    const tall = r() < 0.4 ? 2 : 1;
    if (x > 16 && x < 31 && z > 16 && z < 31) continue;
    if (SPAWNS.some(([sx, , sz]) => Math.hypot(sx - x, sz - z) < 6)) continue;
    let clear = true;
    for (let dz = -1; dz <= 2 && clear; dz++)
      for (let dx = -1; dx <= 2 && clear; dx++)
        if (cells[idx(x + dx, 1, z + dz)] !== B.AIR) clear = false;
    if (!clear) continue;
    box(x, 1, z, x + 1, tall, z + 1, B.CRATE);
    placed++;
  }

  return {
    cells,
    get: (x, y, z) => (inside(x, y, z) ? cells[idx(x, y, z)] : B.AIR),
    set(x, y, z, b) { if (inside(x, y, z)) cells[idx(x, y, z)] = b; },
    solid(x, y, z) {
      if (y < 0) return true;
      if (x < 0 || x >= W || z < 0 || z >= D) return true;
      if (y >= H) return false;
      return cells[idx(x, y, z)] !== B.AIR;
    },
  };
}
