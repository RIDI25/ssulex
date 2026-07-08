"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPoints } from "@/lib/format";
import { POINTS_REFRESH_EVENT } from "@/lib/points";
import { TOAST_EVENT } from "@/lib/toast";
import Toast from "@/components/Toast";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [points, setPoints] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const loadPoints = useCallback(async (uid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("points, is_admin")
      .eq("id", uid)
      .single();
    if (data) {
      setPoints(data.points);
      setIsAdmin(data.is_admin === true);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        loadPoints(user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadPoints(session.user.id);
      } else {
        setUserId(null);
        setPoints(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadPoints]);

  // 페이지 이동을 넘어 살아남아야 하는 전역 토스트 수신
  useEffect(() => {
    const onToast = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      if (msg) showToast(msg);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, [showToast]);

  // 포인트 변동 이벤트(매수/환급/출석 보상) 시 DB에서 재조회
  useEffect(() => {
    if (!userId) return;
    const refresh = () => loadPoints(userId);
    window.addEventListener(POINTS_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(POINTS_REFRESH_EVENT, refresh);
  }, [userId, loadPoints]);

  // 페이지 이동 시에도 항상 최신 잔액 재조회 + 드로어 닫기
  useEffect(() => {
    if (userId) loadPoints(userId);
    setMenuOpen(false);
  }, [pathname, userId, loadPoints]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    showToast("로그아웃 완료");
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-card bg-background/95 px-4 backdrop-blur">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="text-lg font-extrabold tracking-tight text-primary">
            SSULEX
          </span>
          <span className="text-sm font-semibold text-ink">썰거래소</span>
        </Link>

        <div className="flex items-center gap-2">
          {userId ? (
            <span className="rounded-full bg-card px-3 py-1.5 text-sm font-bold text-primary tabular-nums">
              {points === null ? "…" : formatPoints(points)}
            </span>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-primary px-3.5 py-1.5 text-sm font-semibold text-white"
            >
              로그인
            </Link>
          )}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="메뉴 열기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* 드로어 */}
      {menuOpen && (
        <div className="fixed inset-0 z-40">
          <div className="mx-auto h-full w-full max-w-[480px]">
            <div
              className="absolute inset-0 bg-ink/30"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-0 flex h-full w-64 flex-col bg-background p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-base font-extrabold text-primary">
                  SSULEX
                </span>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="메뉴 닫기"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <nav className="mt-6 flex flex-col">
                {userId ? (
                  <>
                    <Link
                      href="/my"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl px-3 py-3.5 text-[15px] font-semibold text-ink hover:bg-card"
                    >
                      마이페이지
                    </Link>
                    <Link
                      href="/wallet"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl px-3 py-3.5 text-[15px] font-semibold text-ink hover:bg-card"
                    >
                      내 지갑
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-xl px-3 py-3.5 text-[15px] font-semibold text-ink hover:bg-card"
                      >
                        관리자
                      </Link>
                    )}
                    <button
                      onClick={signOut}
                      className="rounded-xl px-3 py-3.5 text-left text-[15px] font-semibold text-ink-muted hover:bg-card"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-3.5 text-[15px] font-semibold text-ink hover:bg-card"
                  >
                    로그인
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </>
  );
}
