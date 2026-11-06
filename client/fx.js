// 총 모델, 탄 궤적, 파편, 소리
import * as THREE from 'three';
import { scene, camera } from './world.js';

// ---- 1인칭 총 모델 (무기마다 블록 모양만 다르게) ----
// [가로, 세로, 길이, 색, x, y, z]. 앞쪽이 -z. muzzle = 총구 z
// 무기 번호(sim.js WEAPONS) 순서: 카빈, 라이플, SMG
const MODELS = [
  { muzzle: -0.58, kick: 0.18, parts: [ // 풀베기 카빈
    [0.07, 0.09, 0.5, '#2b2b30', 0, 0, -0.1], [0.05, 0.05, 0.22, '#3a3a42', 0, 0.02, -0.45],
    [0.06, 0.14, 0.07, '#ff9fb8', 0, -0.1, -0.08], [0.06, 0.13, 0.06, '#2b2b30', 0, -0.1, 0.08],
    [0.03, 0.04, 0.04, '#ff9fb8', 0, 0.065, 0.05]] },
  { muzzle: -0.85, kick: 0.1, parts: [ // 노래 라이플
    [0.07, 0.09, 0.6, '#2f3f5a', 0, 0, -0.1], [0.04, 0.04, 0.4, '#2b2b30', 0, 0.02, -0.6],
    [0.06, 0.1, 0.06, '#6fb4ff', 0, -0.09, -0.12], [0.06, 0.12, 0.06, '#2f3f5a', 0, -0.09, 0.08]] },
  { muzzle: -0.48, kick: 0.06, parts: [ // 우라 SMG
    [0.07, 0.09, 0.42, '#33363d', 0, 0, -0.1], [0.04, 0.04, 0.12, '#3a3a42', 0, 0.01, -0.37],
    [0.05, 0.2, 0.05, '#ffcf5c', 0, -0.13, -0.12], [0.06, 0.12, 0.06, '#33363d', 0, -0.09, 0.06],
    [0.05, 0.06, 0.12, '#33363d', 0, -0.01, 0.16]] },
];

const gun = new THREE.Group();
const body = new THREE.Group();
gun.add(body);
const flash = new THREE.Mesh(
  new THREE.BoxGeometry(0.1, 0.1, 0.1),
  new THREE.MeshBasicMaterial({ color: '#ffd84a', fog: false }),
);
flash.visible = false;
gun.add(flash);
const muzzle = new THREE.Object3D();
gun.add(muzzle);

const GUN_REST = new THREE.Vector3(0.2, -0.19, -0.42);
gun.position.copy(GUN_REST);
gun.scale.setScalar(0.55);
camera.add(gun);

let model = MODELS[0], modelId = -1;
export function setGunModel(w) {
  if (w === modelId) return;
  modelId = w;
  model = MODELS[w];
  for (const m of [...body.children]) { body.remove(m); m.geometry.dispose(); m.material.dispose(); }
  for (const [pw, ph, pd, color, x, y, z] of model.parts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), new THREE.MeshLambertMaterial({ color, fog: false }));
    m.position.set(x, y, z);
    body.add(m);
  }
  flash.position.set(0, 0.02, model.muzzle - 0.02);
  muzzle.position.set(0, 0.02, model.muzzle);
}
setGunModel(0);

let kick = 0, flashT = 0, reloadDip = 0, visible = true, scoped = false;

function applyVisible() { gun.visible = visible && !scoped; }
export function setGunVisible(v) { visible = v; applyVisible(); }
export function setScoped(v) { scoped = v; applyVisible(); }

export function muzzleWorld() {
  return muzzle.getWorldPosition(new THREE.Vector3());
}

export function gunFired() {
  kick = 1;
  flashT = 0.04;
  flash.visible = true;
  flash.rotation.z = Math.random() * Math.PI;
}

// reloading: 0~1 진행도 (재장전 아니면 -1), moving: 걷는 중이면 흔들기
let bob = 0;
export function updateGun(dt, reloading, moving) {
  kick = Math.max(0, kick - dt * 12);
  flashT -= dt;
  if (flashT <= 0) flash.visible = false;
  reloadDip += ((reloading >= 0 ? 1 : 0) - reloadDip) * Math.min(1, dt * 12);
  bob += dt * (moving ? 10 : 0);
  const sway = moving ? 1 : 0;
  gun.position.set(
    GUN_REST.x + Math.sin(bob) * 0.012 * sway,
    GUN_REST.y - reloadDip * 0.12 + Math.abs(Math.cos(bob)) * 0.012 * sway,
    GUN_REST.z + kick * 0.04,
  );
  gun.rotation.set(kick * model.kick - reloadDip * 0.6, 0, reloadDip * 0.4);
}

// ---- 탄 궤적과 파편 ----
const live = [];
const tracerMat = new THREE.LineBasicMaterial({ color: '#fff2a8', transparent: true });
const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

export function tracer(from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, tracerMat.clone());
  scene.add(line);
  live.push({ obj: line, life: 0.08, max: 0.08, kind: 'tracer' });
}

export function burst(at, color, n = 5, size = 0.08) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(cubeGeo, new THREE.MeshLambertMaterial({ color }));
    m.scale.setScalar(size * (0.6 + Math.random() * 0.8));
    m.position.copy(at);
    scene.add(m);
    live.push({
      obj: m, life: 0.5, max: 0.5, kind: 'bit',
      v: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4),
    });
  }
}

export function updateFx(dt) {
  for (let i = live.length - 1; i >= 0; i--) {
    const p = live[i];
    p.life -= dt;
    if (p.kind === 'tracer') p.obj.material.opacity = Math.max(0, p.life / p.max);
    else {
      p.v.y -= 12 * dt;
      p.obj.position.addScaledVector(p.v, dt);
      p.obj.rotation.x += dt * 8;
    }
    if (p.life <= 0) {
      scene.remove(p.obj);
      p.obj.material.dispose();
      if (p.kind === 'tracer') p.obj.geometry.dispose();
      live.splice(i, 1);
    }
  }
}

// ---- 소리 (파일 없이 WebAudio로 합성) ----
let ac = null;
export function initAudio() {
  if (!ac) try { ac = new AudioContext(); } catch { ac = null; }
  ac?.resume?.();
}

function noise(dur, vol, freq) {
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(ac.destination);
  src.start();
}

function tone(freq, dur, vol, delay = 0) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  const t = ac.currentTime + delay;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur);
}

export const sfx = {
  shot: (w) => noise([0.14, 0.12, 0.1][w], [0.4, 0.35, 0.25][w], [2200, 2400, 2600][w]),
  skill: () => { tone(660, 0.06, 0.06); tone(990, 0.1, 0.06, 0.05); },
  far: (dist) => noise(0.1, Math.max(0.03, 0.25 - dist * 0.006), 1200),
  hit: (head) => tone(head ? 1400 : 900, 0.06, 0.08),
  kill: () => { tone(700, 0.08, 0.08); tone(1050, 0.12, 0.08, 0.08); },
  hurt: () => noise(0.15, 0.3, 500),
  empty: () => tone(300, 0.04, 0.05),
  crack: () => noise(0.06, 0.12, 900),
  smash: () => { noise(0.25, 0.4, 700); tone(140, 0.15, 0.05); },
  buy: () => { tone(880, 0.05, 0.05); tone(1320, 0.08, 0.05, 0.05); },
  round: () => { tone(523, 0.12, 0.06); tone(784, 0.2, 0.06, 0.12); },
};
