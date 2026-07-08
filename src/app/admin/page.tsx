"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatPoints } from "@/lib/format";
import DelistButton from "@/components/DelistButton";

interface ReportedRow {
  id: string;
  title: string;
  current_price: number;
  reportCount: number;
  avgRating: number | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [rows, setRows] = useState<ReportedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: reports } = await supabase.from("reports").select("ssul_id");
    const counts = new Map<string, number>();
    (reports ?? []).forEach((r) => {
      counts.set(r.ssul_id, (counts.get(r.ssul_id) ?? 0) + 1);
    });

    if (counts.size === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const ids = [...counts.keys()];
    const [{ data: ssuls }, { data: reviews }] = await Promise.all([
      supabase
        .from("ssuls_public")
        .select("id, title, current_price")
        .in("id", ids),
      supabase.from("reviews").select("ssul_id, rating").in("ssul_id", ids),
    ]);

    const ratingAgg = new Map<string, { sum: number; n: number }>();
    (reviews ?? []).forEach((r) => {
      const agg = ratingAgg.get(r.ssul_id) ?? { sum: 0, n: 0 };
      agg.sum += r.rating;
      agg.n += 1;
      ratingAgg.set(r.ssul_id, agg);
    });

    // 이미 상장폐지된 썰의 신고는 제외 (ssuls_public에 없음)
    setRows(
      (ssuls ?? [])
        .map((s) => {
          const agg = ratingAgg.get(s.id);
          return {
            id: s.id,
            title: s.title,
            current_price: s.current_price,
            reportCount: counts.get(s.id) ?? 0,
            avgRating: agg ? agg.sum / agg.n : null,
          };
        })
        .sort((a, b) => b.reportCount - a.reportCount)
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.is_admin !== true) {
        router.replace("/");
        return;
      }
      setChecking(false);
      load();
    });
  }, [router, load]);

  if (checking) {
    return (
      <div className="py-24 text-center text-sm text-ink-muted">
        권한 확인 중…
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-lg font-extrabold text-ink">🛡 관리자 — 신고 누적</h1>

      <div className="mt-4 flex flex-col gap-3">
        {loading ? (
          <p className="py-10 text-center text-sm text-ink-muted">
            불러오는 중…
          </p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">
            신고된 썰이 없어요.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-2xl bg-card p-4">
              <Link
                href={`/ssul/${row.id}`}
                className="line-clamp-2 text-[15px] font-bold leading-snug text-ink underline-offset-2 hover:underline"
              >
                {row.title}
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                <span className="font-bold text-rise">
                  🚨 신고 {row.reportCount}건
                </span>
                <span className="font-semibold text-ink tabular-nums">
                  {formatPoints(row.current_price)}
                </span>
                <span className="text-ink-muted">
                  {row.avgRating === null
                    ? "리뷰 없음"
                    : `★ ${row.avgRating.toFixed(1)}`}
                </span>
              </div>
              <div className="mt-3 flex justify-end">
                <DelistButton ssulId={row.id} admin onDone={load} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
