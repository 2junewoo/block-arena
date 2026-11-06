// 캐릭터: 고유 무기 1개 + 고유 스킬(E) 1개 (project_fps의 캐릭터 구성을 가져옴)
// 서버(판정)와 클라이언트(예측·화면)가 함께 쓴다. 단위는 sim.js와 같음 (틱 = 1/60초)
// weapon: 무기 번호 (sim.js WEAPONS), ability.type: 스킬 처리는 sim.js stepSkill + 서버(회복처럼 체력이 걸린 것)
export const CHARACTERS = {
  chiikawa: {
    name: '치이카와', role: '밸런스', color: '#ff9fb8', hp: 120, speed: 6, weapon: 0,
    ability: { type: 'heal', name: '용기 충전', cooldown: 12 * 60, amount: 50, desc: '체력 50 즉시 회복' },
  },
  hachiware: {
    name: '하치와레', role: '돌격', color: '#6fb4ff', hp: 100, speed: 6.5, weapon: 1,
    ability: { type: 'dash', name: '대시', cooldown: 6 * 60, speed: 30, ticks: 12, desc: '이동 방향으로 순간 돌진' },
  },
  usagi: {
    name: '우사기', role: '기동', color: '#ffcf5c', hp: 90, speed: 7.2, weapon: 2,
    ability: { type: 'leap', name: '우라!', cooldown: 7 * 60, power: 13, desc: '높이 뛰어올라 고지대 점령' },
  },
};

export const CHAR_IDS = Object.keys(CHARACTERS);
export const DEFAULT_CHAR = 'chiikawa';
export const charOf = (id) => CHARACTERS[id] ?? CHARACTERS[DEFAULT_CHAR];
export const validChar = (id) => (Object.hasOwn(CHARACTERS, id) ? id : DEFAULT_CHAR);
