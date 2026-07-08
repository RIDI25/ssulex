// 시세는 전부 DB(price_history, ssuls.current_price)가 관리한다.
// 여기서는 표시용 등락률 계산만 한다 — 가격을 바꾸는 로직은 절대 두지 말 것.

export interface PricePoint {
  price: number;
  created_at: string;
}

const LISTING_PRICE = 100;

// 전일 대비 기준가: 오늘 0시 이전 마지막 기록, 없으면 상장가 100
export function baselinePrice(historyAsc: PricePoint[]): number {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  for (let i = historyAsc.length - 1; i >= 0; i--) {
    if (new Date(historyAsc[i].created_at) < midnight) {
      return historyAsc[i].price;
    }
  }
  return LISTING_PRICE;
}

export function changeRate(current: number, baseline: number): number {
  if (baseline <= 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

export function formatRate(rate: number): string {
  const sign = rate > 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}%`;
}

// ── 차트용 가공 (읽기 전용) ──────────────────────────────

// [1일] 오늘 0시 이후 기록을 시간(hour) 단위로 묶고, 같은 시간대는 마지막 값만
export function hourlySeries(
  historyAsc: PricePoint[]
): { hour: number; price: number }[] {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const byHour = new Map<number, number>();
  historyAsc.forEach((h) => {
    const d = new Date(h.created_at);
    if (d >= midnight) byHour.set(d.getHours(), h.price); // 오름차순이라 마지막 값이 남음
  });
  return [...byHour.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, price]) => ({ hour, price }));
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// [1주]/[전체] 하루에 점 하나(그날 마지막 시세), 기록 없는 날은 직전 시세를 이어서.
// days를 주면 최근 N일 윈도우, 없으면 첫 기록일부터.
export function dailySeries(
  historyAsc: PricePoint[],
  days?: number
): { label: string; price: number }[] {
  if (historyAsc.length === 0) return [];

  const byDay = new Map<string, number>();
  historyAsc.forEach((h) => {
    byDay.set(dayKey(new Date(h.created_at)), h.price);
  });

  const firstDay = new Date(historyAsc[0].created_at);
  firstDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start = firstDay;
  if (days !== undefined) {
    const windowStart = new Date(today);
    windowStart.setDate(today.getDate() - (days - 1));
    if (windowStart > firstDay) start = windowStart;
  }

  // 윈도우 시작 전 마지막 시세 (이어그리기 시작값)
  let prev: number | undefined;
  for (const h of historyAsc) {
    const d = new Date(h.created_at);
    d.setHours(0, 0, 0, 0);
    if (d < start) prev = h.price;
    else break;
  }

  const out: { label: string; price: number }[] = [];
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const price = byDay.get(dayKey(d)) ?? prev;
    if (price === undefined) continue;
    prev = price;
    out.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, price });
  }
  return out;
}
