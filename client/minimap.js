// 오른쪽 위 미니맵: 맵 윗면, 자기장(현재·다음), 내 위치와 방향
import { W, D, H } from '/shared/map.js';
import { BLOCK_COLORS } from './world.js';

const S = 3; // 블록 1칸 = 3px
const canvas = document.getElementById('minimap');
canvas.width = W * S;
canvas.height = D * S;
const g = canvas.getContext('2d');
let base = null;

// 위에서 내려다본 가장 높은 블록 색 (높을수록 어둡게)
export function buildMinimap(map) {
  base = document.createElement('canvas');
  base.width = W * S;
  base.height = D * S;
  const b = base.getContext('2d');
  for (let z = 0; z < D; z++)
    for (let x = 0; x < W; x++) {
      let y = H - 1;
      while (y > 0 && !map.get(x, y, z)) y--;
      b.fillStyle = BLOCK_COLORS[map.get(x, y, z)][0];
      b.fillRect(x * S, z * S, S, S);
      if (y > 0) {
        b.fillStyle = `rgba(0,0,0,${Math.min(0.5, y * 0.12)})`;
        b.fillRect(x * S, z * S, S, S);
      }
    }
}

// zone = [x, z, r, nx, nz, nr, 줄어드는중, 투표중] 또는 null, me = { x, z, yaw } 또는 null, votes = [[x, z]]
export function drawMinimap(zone, me, votes, reverse = false, startR = 30) {
  if (!base) return;
  g.drawImage(base, 0, 0);
  if (zone && reverse) {
    // 거꾸로 자기장: 안쪽 원이 위험
    const r = Math.max(0, startR - zone[2]);
    g.beginPath();
    g.arc(zone[0] * S, zone[1] * S, r * S, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255, 60, 60, 0.4)';
    g.fill();
    g.strokeStyle = '#ff4a4a';
    g.lineWidth = 1.5;
    g.stroke();
    const nr = Math.max(0, startR - zone[5]);
    if (nr > r + 0.05) {
      g.setLineDash([4, 3]);
      g.strokeStyle = '#ffffff';
      g.beginPath();
      g.arc(zone[3] * S, zone[4] * S, nr * S, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
  } else if (zone) {
    const [x, z, r, nx, nz, nr] = zone;
    // 자기장 바깥을 파랗게
    g.beginPath();
    g.rect(0, 0, canvas.width, canvas.height);
    g.arc(x * S, z * S, Math.max(0, r) * S, 0, Math.PI * 2, true);
    g.fillStyle = 'rgba(40, 100, 255, 0.4)';
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = '#4a8cff';
    g.beginPath();
    g.arc(x * S, z * S, Math.max(0, r) * S, 0, Math.PI * 2);
    g.stroke();
    // 다음 원
    if (nr < r - 0.05 || nx !== x || nz !== z) {
      g.setLineDash([4, 3]);
      g.strokeStyle = '#ffffff';
      g.beginPath();
      g.arc(nx * S, nz * S, Math.max(0.5, nr) * S, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
  }
  // 망령 투표 위치
  for (const [vx, vz] of votes ?? []) {
    g.beginPath();
    g.arc(vx * S, vz * S, 3.5, 0, Math.PI * 2);
    g.fillStyle = '#b48cff';
    g.fill();
    g.strokeStyle = '#2a1650';
    g.lineWidth = 1;
    g.stroke();
  }
  if (me) {
    g.save();
    g.translate(me.x * S, me.z * S);
    g.rotate(-me.yaw);
    g.beginPath();
    g.moveTo(0, -6);
    g.lineTo(4, 4);
    g.lineTo(-4, 4);
    g.closePath();
    g.fillStyle = me.ghost ? '#d6c2ff' : '#fff';
    g.strokeStyle = '#000';
    g.lineWidth = 1;
    g.fill();
    g.stroke();
    g.restore();
  }
}
