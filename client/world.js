// 장면, 블록 맵, 플레이어 아바타
import * as THREE from 'three';
import { W, D, H, B } from '/shared/map.js';

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color('#8fc9f0');
scene.fog = new THREE.Fog('#8fc9f0', 30, 75);
scene.add(new THREE.HemisphereLight('#ffffff', '#6b7a5a', 1.6));
const sun = new THREE.DirectionalLight('#ffffff', 1.4);
sun.position.set(30, 50, 15);
scene.add(sun);

export const camera = new THREE.PerspectiveCamera(80, innerWidth / innerHeight, 0.05, 200);
camera.rotation.order = 'YXZ';
camera.position.set(W / 2, 12, D + 6);
camera.lookAt(W / 2, 0, D / 2);
scene.add(camera); // 총 모델을 카메라에 붙이기 위해

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ---- 맵 그리기: 겉으로 드러난 블록만 InstancedMesh 하나로 ----
function blockTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 16, 16);
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.strokeRect(0.5, 0.5, 15, 15);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const BLOCK_COLORS = {
  [B.FLOOR]: ['#6cbf5a', '#63b352'],
  [B.WALL]: ['#8a909b', '#828893'],
  [B.STONE]: ['#c9bfa8', '#beb49c'],
  [B.CRATE]: ['#c98a3e', '#bd8037'],
  [B.COVER]: ['#5b7fbf', '#5377b5'],
  [B.GHOST]: ['#b48cff', '#a77ef5'],
};

// 블록이 바뀔 때마다 통째로 다시 만든다 (맵이 작아서 몇 ms면 됨)
const blockMat = new THREE.MeshLambertMaterial({ map: blockTexture() });
const blockGeo = new THREE.BoxGeometry(1, 1, 1);
let worldMesh = null;

export function buildWorld(map) {
  if (worldMesh) { scene.remove(worldMesh); worldMesh.dispose(); }
  const list = [];
  for (let y = 0; y < H; y++)
    for (let z = 0; z < D; z++)
      for (let x = 0; x < W; x++) {
        const b = map.get(x, y, z);
        if (!b) continue;
        const exposed = !map.solid(x + 1, y, z) || !map.solid(x - 1, y, z) || !map.solid(x, y + 1, z)
          || (y > 0 && !map.solid(x, y - 1, z)) || !map.solid(x, y, z + 1) || !map.solid(x, y, z - 1);
        if (exposed) list.push([x, y, z, b]);
      }
  const mesh = new THREE.InstancedMesh(blockGeo, blockMat, list.length);
  const m = new THREE.Matrix4(), col = new THREE.Color();
  list.forEach(([x, y, z, b], i) => {
    m.setPosition(x + 0.5, y + 0.5, z + 0.5);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.set(BLOCK_COLORS[b][(x + y + z) & 1]));
  });
  scene.add(mesh);
  worldMesh = mesh;
}

// ---- 아바타 ----
function part(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  mesh.position.set(x, y, z);
  return mesh;
}

function nameTag(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 34px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(0,0,0,0.6)';
  g.strokeText(text, 128, 32);
  g.fillStyle = '#fff';
  g.fillText(text, 128, 32);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  sprite.scale.set(1.6, 0.4, 1);
  sprite.position.y = 2.2;
  return sprite;
}

// 팔다리는 관절(pivot) 그룹 안에 넣어 흔들기
function limb(w, h, color, x, y) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  pivot.add(part(w, h, w, color, 0, -h / 2, 0));
  return pivot;
}

export function makeAvatar(name, color) {
  const root = new THREE.Group();
  const body = new THREE.Group(); // 쓰러질 때 발을 축으로 눕힌다
  const skin = '#f2d0a4', pants = '#2d3550';
  const legL = limb(0.27, 0.7, pants, -0.15, 0.7), legR = limb(0.27, 0.7, pants, 0.15, 0.7);
  const armL = limb(0.22, 0.65, color, -0.42, 1.38), armR = limb(0.22, 0.65, color, 0.42, 1.38);
  // 오른손에 든 총 (팔 방향 = 팔 기준 -y). 길이는 무기에 따라 setAvatarWeapon에서
  const gun = part(0.1, 0.55, 0.12, '#2b2b30', 0, -0.75, -0.02);
  armR.add(gun);
  armL.rotation.z = -0.35;
  const torso = part(0.6, 0.68, 0.32, color, 0, 1.05, 0);
  const head = new THREE.Group();
  head.position.y = 1.39;
  head.add(part(0.46, 0.46, 0.46, skin, 0, 0.24, 0));
  head.add(part(0.07, 0.1, 0.02, '#1d1d1d', -0.1, 0.28, -0.235));
  head.add(part(0.07, 0.1, 0.02, '#1d1d1d', 0.1, 0.28, -0.235));
  body.add(legL, legR, armL, armR, torso, head);
  const tag = nameTag(name);
  root.add(body, tag);
  scene.add(root);
  const mats = [];
  body.traverse((o) => { if (o.material) { o.material.transparent = true; mats.push(o.material); } });
  const baseColors = mats.map((m) => m.color.clone());
  return { root, body, head, legL, legR, armL, armR, gun, tag, mats, baseColors, phase: 0, fall: 0, flash: 0, w: 0, ghost: false, char: null };
}

// 캐릭터마다 머리 색을 다르게 (몸통·팔은 플레이어 색 그대로)
export function setAvatarChar(a, color) {
  if (a.char === color) return;
  a.char = color;
  const m = a.head.children[0].material;
  const i = a.mats.indexOf(m);
  a.baseColors[i].set(color);
  if (!a.ghost) m.color.set(color);
  else m.color.copy(a.baseColors[i]).lerp(new THREE.Color('#d6c2ff'), 0.6);
}

// 망령: 반투명하게, 총은 숨김
export function setAvatarGhost(a, ghost) {
  if (a.ghost === ghost) return;
  a.ghost = ghost;
  a.gun.visible = !ghost;
  a.mats.forEach((m, i) => {
    m.opacity = ghost ? 0.3 : 1;
    m.depthWrite = !ghost;
    m.color.copy(a.baseColors[i]);
    if (ghost) m.color.lerp(new THREE.Color('#d6c2ff'), 0.6);
  });
  a.tag.material.opacity = ghost ? 0.5 : 1;
}

// 망령이 블록을 놓을 칸(보라 반투명)과 지울 칸(빨간 테두리) 미리보기
const placeBox = new THREE.Mesh(
  new THREE.BoxGeometry(1.01, 1.01, 1.01),
  new THREE.MeshBasicMaterial({ color: '#b48cff', transparent: true, opacity: 0.35, depthWrite: false }),
);
const removeBox = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.03, 1.03, 1.03)),
  new THREE.LineBasicMaterial({ color: '#ff4a4a' }),
);
placeBox.visible = removeBox.visible = false;
scene.add(placeBox, removeBox);

export function setGhostPreview(place, remove, ready) {
  placeBox.visible = !!place;
  if (place) placeBox.position.set(place[0] + 0.5, place[1] + 0.5, place[2] + 0.5);
  placeBox.material.opacity = ready ? 0.4 : 0.12;
  removeBox.visible = !!remove;
  if (remove) removeBox.position.set(remove[0] + 0.5, remove[1] + 0.5, remove[2] + 0.5);
  removeBox.material.color.set(ready ? '#ff4a4a' : '#884444');
}

const AVATAR_GUN_LEN = [1, 1.2, 0.8]; // 카빈, 라이플, SMG
export function setAvatarWeapon(a, w) {
  if (a.w === w) return;
  a.w = w;
  const len = AVATAR_GUN_LEN[w] ?? 1;
  a.gun.scale.y = len;
  a.gun.position.y = -0.5 - 0.275 * len;
}

// ---- 자기장 벽: 안쪽에서도 보이게 양면, 반투명 ----
const zoneMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(1, 1, 1, 72, 1, true),
  new THREE.MeshBasicMaterial({ color: '#4a8cff', transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false, fog: false }),
);
zoneMesh.visible = false;
scene.add(zoneMesh);

// z = [x, z, r, ...] 또는 null. reverse면 (startR - r) 반지름의 빨간 원(그 안이 위험)
export function setZone(z, reverse = false, startR = 30) {
  const r = z ? (reverse ? startR - z[2] : z[2]) : 0;
  zoneMesh.visible = !!z && r > 0.05;
  if (!zoneMesh.visible) return;
  zoneMesh.material.color.set(reverse ? '#ff4a4a' : '#4a8cff');
  zoneMesh.position.set(z[0], 40, z[1]);
  zoneMesh.scale.set(r, 80, r); // 위 끝이 하늘에 보이지 않게 높게
}

// 안개 카드
export function setFog(dense) {
  scene.fog.near = dense ? 3 : 30;
  scene.fog.far = dense ? 16 : 75;
  scene.fog.color.set(dense ? '#c9d3dc' : '#8fc9f0');
  scene.background.set(dense ? '#c9d3dc' : '#8fc9f0');
}

export function removeAvatar(a) {
  scene.remove(a.root);
  a.root.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); });
}
