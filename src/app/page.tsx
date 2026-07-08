"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type Ssul,
} from "@/lib/types";
import SsulCard from "@/components/SsulCard";

const FILTERS = ["all", ...CATEGORIES] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, string> = {
  all: "전체",
  ...CATEGORY_LABELS,
};

function WelcomeBanner() {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("welcome") === "1") {
      setVisible(true);
      window.history.replaceState(null, "", "/");
      const timer = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!visible) return null;

  return (
    <div className="mx-4 mt-3 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-white">
      🎉 상장 축하! 1,000P 지급 완료
    </div>
  );
}

function SsulList() {
  const [filter, setFilter] = useState<Filter>("all");
  const [ssuls, setSsuls] = useState<Ssul[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    let query = supabase
      .from("ssuls")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== "all") {
      query = query.eq("category", filter as Category);
    }

    query.then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setError("목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      } else {
        setSsuls((data as Ssul[]) ?? []);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <>
      <div className="sticky top-14 z-10 flex gap-2 border-b border-card bg-background px-4 py-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              filter === f ? "bg-ink text-white" : "bg-card text-ink-muted"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {loading ? (
          <div className="py-16 text-center text-sm text-ink-muted">
            시세를 불러오는 중…
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-ink-muted">{error}</div>
        ) : ssuls.length === 0 ? (
          <div className="py-16 text-center text-sm text-ink-muted">
            아직 상장된 썰이 없어요.
            <br />첫 번째 썰을 상장해 보세요!
          </div>
        ) : (
          ssuls.map((ssul) => <SsulCard key={ssul.id} ssul={ssul} />)
        )}
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <WelcomeBanner />
      <SsulList />
    </Suspense>
  );
}
