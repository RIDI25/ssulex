"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { REASON_LABELS, type PointTransaction } from "@/lib/types";
import { formatPoints, timeAgo } from "@/lib/format";
import { notifyPointsChanged } from "@/lib/points";
import Toast from "@/components/Toast";

export default function WalletPage() {
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async (uid: string) => {
    const supabase = createClient();
    const [{ data: profile }, { data: txs }] = await Promise.all([
      supabase.from("profiles").select("points").eq("id", uid).single(),
      supabase
        .from("point_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (profile) setPoints(profile.points);
    setTransactions((txs as PointTransaction[]) ?? []);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        await load(user.id);
      }
      setChecking(false);
    });
  }, [load]);

  async function claimBonus() {
    if (!userId) return;
    setClaiming(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("claim_daily_bonus");

    if (error) {
      showToast("출석 보상 수령에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } else if (!data?.ok) {
      showToast(data?.error ?? "오늘은 이미 출석 보상을 받았어요.");
      setClaimed(true);
    } else {
      showToast(`+${formatPoints(data.bonus ?? 0)} 출석 보상 지급!`);
      notifyPointsChanged();
      setClaimed(true);
      await load(userId);
    }
    setClaiming(false);
  }

  if (checking) {
    return (
      <div className="py-24 text-center text-sm text-ink-muted">
        불러오는 중…
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center px-6 pt-24 text-center">
        <span className="text-4xl">👛</span>
        <h1 className="mt-4 text-lg font-extrabold text-ink">내 지갑</h1>
        <p className="mt-2 text-sm text-ink-muted">
          로그인하면 보유 포인트와 거래 내역을 볼 수 있어요.
        </p>
        <Link
          href="/login"
          className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-white"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      {/* 보유 포인트 */}
      <div className="rounded-2xl bg-card p-5">
        <p className="text-[13px] font-semibold text-ink-muted">보유 포인트</p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums text-ink">
          {points === null ? "…" : formatPoints(points)}
        </p>
      </div>

      {/* 출석 보상 */}
      <button
        onClick={claimBonus}
        disabled={claiming || claimed}
        className="mt-3 flex h-13 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-white disabled:opacity-40"
      >
        {claimed
          ? "오늘 출석 보상 수령 완료 ✓"
          : claiming
            ? "수령 중…"
            : "오늘의 출석 보상 받기 +200P"}
      </button>

      {/* 거래 내역 */}
      <section className="mt-8">
        <h2 className="text-[15px] font-extrabold text-ink">거래 내역</h2>
        {transactions.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            아직 거래 내역이 없어요.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between border-b border-card py-3.5 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {REASON_LABELS[tx.reason] ?? tx.reason}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {timeAgo(tx.created_at)}
                  </p>
                </div>
                <span
                  className={`text-[15px] font-extrabold tabular-nums ${
                    tx.amount >= 0 ? "text-rise" : "text-fall"
                  }`}
                >
                  {tx.amount >= 0 ? "+" : ""}
                  {formatPoints(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Toast message={toast} />
    </div>
  );
}
