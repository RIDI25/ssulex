"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "ssulex:install-dismissed-at";
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari 홈 화면 실행
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function recentlyDismissed(): boolean {
  const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
  return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [iosSheetOpen, setIosSheetOpen] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // iOS 사파리는 beforeinstallprompt가 없으므로 바로 노출
    if (isIos()) {
      setVisible(true);
      return;
    }

    // 안드로이드/크롬: 설치 가능해지면 이벤트가 온다
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setIosSheetOpen(false);
  }

  async function install() {
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      }
      setInstallEvent(null);
      if (outcome !== "accepted") dismiss();
    } else {
      setIosSheetOpen(true);
    }
  }

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-[72px] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 px-3 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-[#f5f0ff] py-2.5 pl-4 pr-2 shadow-sm">
          <button
            onClick={install}
            className="min-w-0 flex-1 text-left text-[13px] font-semibold text-ink"
          >
            📲 홈 화면에 추가하고 앱처럼 쓰세요
          </button>
          <button
            onClick={install}
            className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white"
          >
            추가하기
          </button>
          <button
            onClick={dismiss}
            aria-label="닫기"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* iOS 안내 바텀시트 */}
      {iosSheetOpen && (
        <div className="fixed inset-0 z-50">
          <div className="mx-auto h-full w-full max-w-[480px]">
            <div
              className="absolute inset-0 bg-ink/40"
              onClick={() => setIosSheetOpen(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-background p-6 pb-[calc(24px+env(safe-area-inset-bottom))]">
              <div className="mx-auto h-1 w-10 rounded-full bg-card" />
              <p className="mt-5 text-base font-extrabold text-ink">
                홈 화면에 추가하기
              </p>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-card p-4">
                {/* iOS 공유 아이콘 */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-8 w-8 shrink-0 text-fall"
                >
                  <path
                    d="M12 3v11m0-11L8 7m4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-sm leading-relaxed text-ink">
                  사파리 하단의 <span className="font-bold">공유 버튼</span>을
                  누른 뒤{" "}
                  <span className="font-bold">&lsquo;홈 화면에 추가&rsquo;</span>
                  를 눌러주세요
                </p>
              </div>
              <button
                onClick={() => setIosSheetOpen(false)}
                className="mt-4 h-12 w-full rounded-xl bg-primary text-sm font-bold text-white"
              >
                확인했어요
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
