// 자기장 일정 (단위: 틱). 기다림(hold) → 줄어듦(shrink) → 다음 단계. 바깥에 있으면 초당 dps 피해
import { W, D } from './map.js';

const SEC = 60;
export const ZONE_START = { x: W / 2, z: D / 2, r: 30 };
// vote: 기다리는 시간 앞부분에 망령이 다음 원 위치를 투표하는 시간
export const ZONE_STAGES = [
  { hold: 20 * SEC, vote: 10 * SEC, shrink: 15 * SEC, r: 18, dps: 2 },
  { hold: 15 * SEC, vote: 8 * SEC, shrink: 15 * SEC, r: 9, dps: 5 },
  { hold: 10 * SEC, vote: 5 * SEC, shrink: 15 * SEC, r: 0, dps: 10 },
];
export const ZONE_FINAL_DPS = 20;

// 전투 시작 후 t초일 때 다음 변화까지 남은 초와 그 변화가 무엇인지
export function zoneStatus(t) {
  let start = 0;
  for (const st of ZONE_STAGES) {
    const voteEnd = (start + st.vote) / SEC;
    const holdEnd = (start + st.hold) / SEC, shrinkEnd = (start + st.hold + st.shrink) / SEC;
    if (t < voteEnd) return { voting: true, shrinking: false, left: voteEnd - t };
    if (t < holdEnd) return { shrinking: false, left: holdEnd - t };
    if (t < shrinkEnd) return { shrinking: true, left: shrinkEnd - t };
    start += st.hold + st.shrink;
  }
  return { shrinking: false, left: 0, closed: true };
}
