// 포인트 변동(매수/환급/출석 보상 등) 성공 후 호출하면
// 헤더 등 구독자가 DB에서 잔액을 다시 읽어온다.
export const POINTS_REFRESH_EVENT = "ssulex:points-refresh";

export function notifyPointsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(POINTS_REFRESH_EVENT));
  }
}
