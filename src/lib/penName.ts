// 글별 랜덤 필명 생성 — 가입 닉네임 트리거와 같은 "형용사+동물+숫자" 조합 방식
const ADJECTIVES = [
  "용감한",
  "수줍은",
  "비밀스런",
  "달리는",
  "잠못드는",
  "엉뚱한",
  "진지한",
  "호기심많은",
  "말많은",
  "조용한",
  "화끈한",
  "느긋한",
  "서늘한",
  "달콤한",
  "의문의",
  "전설의",
  "떠도는",
  "심드렁한",
  "재빠른",
  "어리둥절한",
];

const NOUNS = [
  "개미",
  "고래",
  "너구리",
  "두더지",
  "부엉이",
  "고슴도치",
  "문어",
  "수달",
  "펭귄",
  "다람쥐",
  "사막여우",
  "해파리",
  "치타",
  "판다",
  "알파카",
  "오소리",
  "돌고래",
  "까치",
  "두루미",
  "캥거루",
];

export function generatePenName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${adjective}${noun}${number}`;
}
