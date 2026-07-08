export const CATEGORIES = [
  "fun",
  "scary",
  "surprise",
  "angry",
  "amazing",
  "info",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  fun: "재밌썰",
  scary: "무섭썰",
  surprise: "놀람썰",
  angry: "화남썰",
  amazing: "신기썰",
  info: "정보썰",
};

export interface Ssul {
  id: string;
  author_id: string;
  title: string;
  category: Category;
  body: string;
  preview: string;
  current_price: number;
  created_at: string;
}

// ssuls_public 뷰 (body 없음) — 목록/미리보기는 반드시 이 뷰로 조회
export type SsulPublic = Omit<Ssul, "body">;

export interface Review {
  id: string;
  reviewer_id: string;
  ssul_id: string;
  rating: number;
  comment: string | null;
  refunded: boolean;
  created_at: string;
}

export const REASON_LABELS: Record<string, string> = {
  signup_bonus: "가입 보너스",
  daily_check: "출석 보상",
  read: "썰 매수",
  review_refund: "리뷰 환급",
  sale_income: "판매 수익",
  delist_refund: "상장폐지 환불",
  delist_clawback: "상장폐지 수익 회수",
};

export interface Profile {
  id: string;
  nickname: string | null;
  points: number;
  created_at: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  ssul_id: string | null;
  created_at: string;
}
