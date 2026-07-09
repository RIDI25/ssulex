import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import {
  baselinePrice,
  changeRate,
  dailySeries,
  formatRate,
  type PricePoint,
} from "@/lib/price";
import { CATEGORY_LABELS } from "@/lib/types";
import { OG_LOGO } from "./og-logo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SSULEX 썰 시세";

const PURPLE = "#6C3CE9";
const INK = "#1E1533";
const MUTED = "#8B849C";
const RISE = "#F04452";
const FALL = "#3182F6";

const FONT_URL =
  "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf";

// 요청마다 폰트를 다시 받지 않도록 모듈 레벨에서 캐시
let fontPromise: Promise<ArrayBuffer> | null = null;
function loadFont() {
  fontPromise ??= fetch(FONT_URL).then((r) => r.arrayBuffer());
  return fontPromise;
}


function formatPoints(points: number): string {
  return `${points.toLocaleString("ko-KR")}P`;
}

// 최근 7일 시세를 폴리라인 좌표로 (표시용 가공만)
function sparkPoints(
  prices: number[],
  width: number,
  height: number
): string {
  const pad = 6;
  if (prices.length <= 1) {
    const y = height / 2;
    return `${pad},${y} ${width - pad},${y}`;
  }
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  return prices
    .map((p, i) => {
      const x = pad + (i / (prices.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (p - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const logoSrc = OG_LOGO;
  const [fontData, { data: ssul }] = await Promise.all([
    loadFont(),
    supabase.from("ssuls_public").select("*").eq("id", id).maybeSingle(),
  ]);

  const fonts = [
    { name: "Pretendard", data: fontData, weight: 700 as const },
  ];

  // 존재하지 않는 썰 → 로고만 있는 기본 이미지
  if (!ssul) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            fontFamily: "Pretendard",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            width={96}
            height={96}
            alt=""
            style={{ borderRadius: 24 }}
          />
          <div
            style={{ display: "flex", fontSize: 72, color: PURPLE, marginTop: 20 }}
          >
            SSULEX
          </div>
          <div style={{ display: "flex", fontSize: 32, color: INK, marginTop: 12 }}>
            이야기를 주식처럼 거래하는 썰 거래소
          </div>
        </div>
      ),
      { ...size, fonts }
    );
  }

  const { data: historyData } = await supabase
    .from("price_history")
    .select("price, created_at")
    .eq("ssul_id", id)
    .order("created_at", { ascending: true });

  const history = (historyData as PricePoint[]) ?? [];
  const rate = changeRate(ssul.current_price, baselinePrice(history));
  const weekPrices = dailySeries(history, 7).map((p) => p.price);
  const noHistory = weekPrices.length <= 1;

  const rateColor = rate > 0 ? RISE : rate < 0 ? FALL : MUTED;
  const chartW = 1072;
  const chartH = 120;

  // satori의 lineClamp 높이 계산이 불안정해서 글자수로 2줄 분량을 자른다
  // (fontSize 54, 폭 1072px 기준 한글 약 19자/줄)
  const MAX_TITLE = 36;
  const title =
    ssul.title.length > MAX_TITLE
      ? `${ssul.title.slice(0, MAX_TITLE)}…`
      : ssul.title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          padding: "48px 64px",
          fontFamily: "Pretendard",
        }}
      >
        {/* 로고 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            width={52}
            height={52}
            alt=""
            style={{ borderRadius: 13 }}
          />
          <span style={{ fontSize: 40, color: PURPLE }}>SSULEX</span>
          <span style={{ fontSize: 26, color: INK }}>썰거래소</span>
        </div>

        {/* 카테고리 뱃지 */}
        <div style={{ display: "flex", marginTop: 24 }}>
          <span
            style={{
              display: "flex",
              background: "#EFE8FF",
              color: PURPLE,
              fontSize: 26,
              padding: "8px 22px",
              borderRadius: 14,
            }}
          >
            {CATEGORY_LABELS[ssul.category as keyof typeof CATEGORY_LABELS] ??
              ssul.category}
          </span>
        </div>

        {/* 제목 (2줄까지 — 글자수로 절삭) */}
        <div
          style={{
            display: "flex",
            marginTop: 14,
            fontSize: 50,
            lineHeight: 1.35,
            color: INK,
            width: "100%",
          }}
        >
          {title}
        </div>

        {/* 현재 시세 + 등락률 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginTop: 12,
          }}
        >
          <span style={{ fontSize: 56, color: INK }}>
            {formatPoints(ssul.current_price)}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: rateColor,
              fontSize: 34,
            }}
          >
            {rate !== 0 && (
              <svg width="26" height="22" viewBox="0 0 26 22">
                <polygon
                  points={rate > 0 ? "13,0 26,22 0,22" : "13,22 26,0 0,0"}
                  fill={rateColor}
                />
              </svg>
            )}
            <span>{formatRate(rate)}</span>
          </div>
        </div>

        {/* 최근 7일 시세 라인 */}
        <svg
          width={chartW}
          height={chartH}
          viewBox={`0 0 ${chartW} ${chartH}`}
          style={{ marginTop: 16 }}
        >
          <polyline
            points={sparkPoints(
              noHistory ? [ssul.current_price] : weekPrices,
              chartW,
              chartH
            )}
            fill="none"
            stroke={PURPLE}
            strokeWidth="6"
            strokeDasharray={noHistory ? "14 14" : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* 하단 문구 */}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            fontSize: 27,
            color: MUTED,
          }}
        >
          지금 시세 확인하기 → ssulex
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
