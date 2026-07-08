// 페이지 이동 후에도 보여야 하는 토스트는 레이아웃에 상주하는 Header가 표시한다
export const TOAST_EVENT = "ssulex:toast";

export function showGlobalToast(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
  }
}
