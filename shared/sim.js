// 이동·무기: 서버(판정)와 클라이언트(예측)가 똑같이 돌려야 하므로 여기 한 곳에만 둔다
export const TICK = 1 / 60;
export const P = { hw: 0.3, h: 1.85, eye: 1.6, speed: 6, jump: 8, gravity: 24 };
export const KEY = { F: 1, B: 2, L: 4, R: 8, J: 16, FIRE: 32, RELOAD: 64, DOWN: 128 };
export const MAX_HP = 100;
// 단위: 틱(1/60초), 라디안. falloff = [이 거리(m)부터, 피해 배율]
export const WEAPONS = [
  { name: '권총', price: 0, auto: false, mag: 12, rate: 12, reload: 90, dmg: 24, headMul: 2, range: 80, pellets: 1,
    falloff: [25, 0.8], spread: 0.006, moveSpread: 0.02, airSpread: 0.06, heatSpread: 0.006, heatMax: 6 },
  { name: '기관단총', price: 1600, auto: true, mag: 30, rate: 5, reload: 100, dmg: 18, headMul: 2, range: 80, pellets: 1,
    falloff: [20, 0.75], spread: 0.012, moveSpread: 0.018, airSpread: 0.05, heatSpread: 0.003, heatMax: 10 },
  { name: '소총', price: 2900, auto: true, mag: 25, rate: 6, reload: 120, dmg: 25, headMul: 2, range: 120, pellets: 1,
    falloff: null, spread: 0.004, moveSpread: 0.03, airSpread: 0.08, heatSpread: 0.004, heatMax: 10 },
  { name: '샷건', price: 1800, auto: false, mag: 6, rate: 50, reload: 140, dmg: 14, headMul: 1.5, range: 40, pellets: 8,
    falloff: [10, 0.5], spread: 0.07, moveSpread: 0.075, airSpread: 0.09, heatSpread: 0, heatMax: 0 },
  { name: '저격총', price: 4500, auto: false, mag: 5, rate: 75, reload: 180, dmg: 80, headMul: 2, range: 150, pellets: 1,
    falloff: null, spread: 0.001, moveSpread: 0.08, airSpread: 0.15, heatSpread: 0, heatMax: 0 },
];

// 라운드 단계: L 대기실, B 구매, R 전투, E 라운드 끝, O 경기 끝
// 구매 시간엔 움직이거나 쏠 수 없고, 라운드·경기가 끝난 뒤엔 쏠 수 없다
export function maskInput(k, phase) {
  if (phase === 'B') return k & KEY.RELOAD;
  if (phase === 'E' || phase === 'O') return k & ~KEY.FIRE;
  return k;
}

export function damageAt(w, dist, head) {
  let d = w.dmg * (head ? w.headMul : 1);
  if (w.falloff && dist > w.falloff[0]) d *= w.falloff[1];
  return Math.round(d);
}

const EPS = 1e-4;

export function newState([x, y, z], w = 0) {
  return { x, y, z, vx: 0, vy: 0, vz: 0, g: false, w, ammo: WEAPONS[w].mag, cd: 0, rl: 0, heat: 0, tr: false };
}

function hits(map, x, y, z) {
  const x0 = Math.floor(x - P.hw + EPS), x1 = Math.floor(x + P.hw - EPS);
  const y0 = Math.floor(y + EPS), y1 = Math.floor(y + P.h - EPS);
  const z0 = Math.floor(z - P.hw + EPS), z1 = Math.floor(z + P.hw - EPS);
  for (let j = y0; j <= y1; j++)
    for (let k = z0; k <= z1; k++)
      for (let i = x0; i <= x1; i++)
        if (map.solid(i, j, k)) return true;
  return false;
}

// inp = { k: 키 비트, y: yaw }, grav = 중력 배율 (규칙 카드)
export function stepPlayer(s, inp, map, grav = 1) {
  const k = inp.k, yaw = inp.y;
  const mz = (k & KEY.F ? 1 : 0) - (k & KEY.B ? 1 : 0);
  const mx = (k & KEY.R ? 1 : 0) - (k & KEY.L ? 1 : 0);
  let dx = -Math.sin(yaw) * mz + Math.cos(yaw) * mx;
  let dz = -Math.cos(yaw) * mz - Math.sin(yaw) * mx;
  const len = Math.hypot(dx, dz);
  if (len > 0) { dx /= len; dz /= len; }
  s.vx = dx * P.speed;
  s.vz = dz * P.speed;
  if (k & KEY.J && s.g) s.vy = P.jump;
  s.vy = Math.max(s.vy - P.gravity * grav * TICK, -30);

  let nx = s.x + s.vx * TICK;
  if (hits(map, nx, s.y, s.z)) {
    nx = s.vx > 0 ? Math.floor(nx + P.hw) - P.hw - EPS * 2 : Math.floor(nx - P.hw) + 1 + P.hw + EPS * 2;
    if (hits(map, nx, s.y, s.z)) nx = s.x;
    s.vx = 0;
  }
  s.x = nx;

  let nz = s.z + s.vz * TICK;
  if (hits(map, s.x, s.y, nz)) {
    nz = s.vz > 0 ? Math.floor(nz + P.hw) - P.hw - EPS * 2 : Math.floor(nz - P.hw) + 1 + P.hw + EPS * 2;
    if (hits(map, s.x, s.y, nz)) nz = s.z;
    s.vz = 0;
  }
  s.z = nz;

  let ny = s.y + s.vy * TICK;
  s.g = false;
  if (hits(map, s.x, ny, s.z)) {
    if (s.vy < 0) { ny = Math.floor(ny) + 1; s.g = true; }
    else ny = Math.floor(ny + P.h) - P.h - EPS * 2;
    if (hits(map, s.x, ny, s.z)) ny = s.y;
    s.vy = 0;
  }
  s.y = ny;
}

// ---- 망령: 벽을 통과해 날아다닌다. y는 눈높이 ----
export const GHOST = { speed: 9, vert: 6, reach: 9, cooldown: 8 * 60, coinPerDmg: 2, coinCap: 400 };

export function stepGhost(s, inp, w, d, h) {
  const k = inp.k, yaw = inp.y;
  const mz = (k & KEY.F ? 1 : 0) - (k & KEY.B ? 1 : 0);
  const mx = (k & KEY.R ? 1 : 0) - (k & KEY.L ? 1 : 0);
  let dx = -Math.sin(yaw) * mz + Math.cos(yaw) * mx;
  let dz = -Math.cos(yaw) * mz - Math.sin(yaw) * mx;
  const len = Math.hypot(dx, dz);
  if (len > 0) { dx /= len; dz /= len; }
  const dy = (k & KEY.J ? 1 : 0) - (k & KEY.DOWN ? 1 : 0);
  s.vx = dx * GHOST.speed;
  s.vz = dz * GHOST.speed;
  s.vy = dy * GHOST.vert;
  s.x = Math.max(0.5, Math.min(w - 0.5, s.x + s.vx * TICK));
  s.z = Math.max(0.5, Math.min(d - 0.5, s.z + s.vz * TICK));
  s.y = Math.max(0.6, Math.min(h + 6, s.y + s.vy * TICK));
}

// 쏘면 탄 퍼짐(라디안)을, 안 쏘면 -1을 돌려준다
// 단발 무기는 누를 때마다 한 발 (s.tr = 직전 틱에 눌려 있었는지)
export function stepWeapon(s, k) {
  const w = WEAPONS[s.w];
  const pressed = !!(k & KEY.FIRE), edge = pressed && !s.tr;
  s.tr = pressed;
  if (s.cd > 0) s.cd--;
  s.heat = Math.max(0, s.heat - 0.15);
  if (s.rl > 0) {
    if (--s.rl === 0) s.ammo = w.mag;
    return -1;
  }
  if (k & KEY.RELOAD && s.ammo < w.mag) { s.rl = w.reload; return -1; }
  if (!(w.auto ? pressed : edge) || s.cd > 0) return -1;
  if (s.ammo <= 0) { s.rl = w.reload; return -1; }
  const moving = Math.hypot(s.vx, s.vz) > 0.5;
  const spread = (s.g ? (moving ? w.moveSpread : w.spread) : w.airSpread) + s.heat * w.heatSpread;
  s.ammo--;
  s.cd = w.rate;
  s.heat = Math.min(w.heatMax, s.heat + 1);
  return spread;
}

// 한 번 쏠 때 나가는 탄(샷건은 여러 알)마다의 방향
export function shotDirs(s, yaw, pitch, spread, seq) {
  const n = WEAPONS[s.w].pellets;
  if (n === 1) return [shotDir(yaw, pitch, spread, seq)];
  return Array.from({ length: n }, (_, i) => shotDir(yaw, pitch, spread, seq * 16 + i));
}

// 같은 seed면 서버와 클라이언트가 같은 값을 얻는 난수 (0~1)
function rand(n) {
  n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  n ^= n >>> 13;
  n = Math.imul(n, 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

export function aimDir(yaw, pitch) {
  const c = Math.cos(pitch);
  return [-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c];
}

export function shotDir(yaw, pitch, spread, seed) {
  const a = rand(seed) * Math.PI * 2, m = Math.sqrt(rand(seed * 31 + 7)) * spread;
  return aimDir(yaw + (Math.cos(a) * m) / Math.max(Math.cos(pitch), 0.2), pitch + Math.sin(a) * m);
}
