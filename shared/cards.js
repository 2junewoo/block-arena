// 라운드 규칙 카드: 가장 먼저 죽은 사람이 3장 중 하나를 골라 다음 한 라운드에 적용
import { B, W, D } from './map.js';

export const CARDS = {
  lowgrav: { name: '저중력', desc: '중력이 1/3로 줄어 점프가 아주 높아집니다' },
  headonly: { name: '헤드샷만', desc: '몸통은 맞아도 피해가 없습니다' },
  blockbullet: { name: '블록 탄', desc: '바깥 벽과 바닥만 빼고 모든 블록이 총에 부서집니다' },
  fog: { name: '안개', desc: '시야가 15m 정도로 줄어듭니다' },
  giant: { name: '거인', desc: '직전 라운드 승자가 1.6배 크기, 체력 200이 됩니다' },
  reverse: { name: '거꾸로 자기장', desc: '자기장이 안쪽부터 퍼집니다. 바깥으로 도망치세요' },
};

export const GIANT = { scale: 1.6, hp: 200 };
export const CARD_BLOCK_HP = 100; // 블록 탄 카드일 때 원래 안 부서지는 블록의 체력

export function gravityMul(card) {
  return card === 'lowgrav' ? 0.33 : 1;
}

// 블록 탄 카드에서 부서지는 칸: 바닥(y=0)과 맵 테두리 벽 빼고 전부
export function breakableByCard(x, y, z, b) {
  if (y === 0 || x === 0 || z === 0 || x === W - 1 || z === D - 1) return false;
  return b === B.WALL || b === B.STONE;
}
