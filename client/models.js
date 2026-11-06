// 캐릭터 모델 (치이카와 GLB). 파일이 없으면 ready = false로 두고 블록 아바타를 그대로 쓴다
// 모델: "chiikawa and friends" by Nini, CC BY-NC 4.0 — 저장소에는 넣지 않음 (client/models/chiikawa-CREDITS.txt)
// 불러오기·노드 분리 코드는 project_fps의 client/assets.js에서 가져옴
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CHARACTERS } from '/shared/characters.js';

const URL = '/client/models/chiikawa_and_friends.glb';
const templates = {}; // 캐릭터 id -> Group (발바닥 중앙이 원점, 정면 -Z, 키 1)
export const models = { ready: false };

export async function loadModels() {
  let gltf;
  try { gltf = await new GLTFLoader().loadAsync(URL); } catch { return false; }
  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const [id, def] of Object.entries(CHARACTERS)) {
    const node = gltf.scene.getObjectByName(def.model);
    if (!node) continue;
    // Sketchfab 루트의 축 변환(Z-up → Y-up)과 0.01 배율을 노드에 구워 넣는다
    const model = node.clone(true);
    model.applyMatrix4(node.parent.matrixWorld);
    box.setFromObject(model);
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    model.position.x -= c.x;
    model.position.z -= c.z;
    model.position.y -= box.min.y;
    const pivot = new THREE.Group();
    pivot.add(model);
    pivot.rotation.y = Math.PI; // 원본 얼굴은 +Z, 게임 정면은 -Z
    pivot.scale.setScalar(1 / size.y);
    const t = new THREE.Group();
    t.add(pivot);
    t.userData.aspect = Math.max(size.x, size.z) / size.y; // 가로 / 키
    templates[id] = t;
  }
  models.ready = Object.keys(templates).length > 0;
  return models.ready;
}

// 키 height(m)로 맞춘 복제본. 재질도 복제 (망령 반투명·맞을 때 깜빡임을 사람마다 따로)
export function createModel(id, height) {
  const t = templates[id];
  if (!t) return null;
  const object = t.clone(true);
  object.scale.setScalar(height);
  const mats = [];
  object.traverse((o) => {
    if (o.isMesh) { o.material = o.material.clone(); mats.push(o.material); }
  });
  return { object, mats, baseColors: mats.map((m) => m.color.clone()), aspect: t.userData.aspect };
}

// 캐릭터 카드용 정면 얼굴 그림 (project_fps의 renderThumbnails)
export function thumbnails(size = 160) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(size, size);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const out = {};
  for (const id of Object.keys(templates)) {
    const sc = new THREE.Scene();
    sc.add(templates[id].clone(true));
    cam.position.set(0, 0.55, -2.6); // 키 1 기준, 정면(-Z)에서
    cam.lookAt(0, 0.45, 0);
    r.render(sc, cam);
    out[id] = r.domElement.toDataURL('image/png');
  }
  r.dispose();
  return out;
}
