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
