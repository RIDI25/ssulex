"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type SsulPublic,
} from "@/lib/types";
import {
  baselinePrice,
  changeRate,
  dailySeries,
  type PricePoint,
} from "@/lib/price";
import { formatPoints } from "@/lib/format";
import SsulCard from "@/components/SsulCard";
import ChangeBadge from "@/components/ChangeBadge";
import Sparkline from "@/components/Sparkline";
import InstallBanner from "@/components/InstallBanner";

const FILTERS = ["all", ...CATEGORIES] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, string> = {
  all: "전체",
  ...CATEGORY_LABELS,
};

const SORTS = ["latest", "price", "hot"] as const;
type Sort = (typeof SORTS)[number];

const SORT_LABELS: Record<Sort, string> = {
  latest: "최신순",
  price: "시세순",
  hot: "급상승순",
};

interface Enriched {
  ssul: SsulPublic;
  rate: number;
  spark: number[];
}

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

function HotSection({ items }: { items: Enriched[] }) {
  if (items.length === 0) return null;

  return (
    <section className="border-b border-card pb-4 pt-3">
      <h2 className="px-4 text-[15px] font-extrabold text-ink">🔥 급상승</h2>
      <div className="mt-2.5 flex gap-2.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(({ ssul, rate, spark }) => (
          <Link
            key={ssul.id}
            href={`/ssul/${ssul.id}`}
            className="w-36 shrink-0 rounded-2xl bg-card p-3.5"
          >
            <ChangeBadge rate={rate} />
            <p className="mt-2 line-clamp-2 text-[13px] font-bold leading-snug text-ink">
              {ssul.title}
            </p>
            <div className="mt-2.5 flex items-end justify-between">
              <span className="text-sm font-extrabold tabular-nums text-ink">
                {formatPoints(ssul.current_price)}
              </span>
              <Sparkline values={spark} width={44} height={20} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SsulList() {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("latest");
  const [items, setItems] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchList() {
      const supabase = createClient();
      let query = supabase
        .from("ssuls_public")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter !== "all") {
        query = query.eq("category", filter as Category);
      }

      const { data: ssuls, error: listError } = await query;
      if (cancelled) return;
      if (listError) {
        setError("목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        setLoading(false);
        return;
      }

      const list = (ssuls as SsulPublic[]) ?? [];
      const ids = list.map((s) => s.id);

      // 목록 전체의 시세 기록을 한 번에 조회해 등락률/스파크라인 계산 (표시용)
      const historyMap = new Map<string, PricePoint[]>();
      if (ids.length > 0) {
        const { data: historyData } = await supabase
          .from("price_history")
          .select("ssul_id, price, created_at")
          .in("ssul_id", ids)
          .order("created_at", { ascending: true });
        if (cancelled) return;
        (historyData ?? []).forEach((h) => {
          const arr = historyMap.get(h.ssul_id) ?? [];
          arr.push({ price: h.price, created_at: h.created_at });
          historyMap.set(h.ssul_id, arr);
        });
      }

      setItems(
        list.map((ssul) => {
          const hist = historyMap.get(ssul.id) ?? [];
          return {
            ssul,
            rate: changeRate(ssul.current_price, baselinePrice(hist)),
            // 미니 스파크라인은 최근 7일 일별 시세로 통일
            spark: dailySeries(hist, 7).map((p) => p.price),
          };
        })
      );
      setLoading(false);
    }

    fetchList();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const sorted = useMemo(() => {
    const arr = [...items];
    if (sort === "price") {
      arr.sort((a, b) => b.ssul.current_price - a.ssul.current_price);
    } else if (sort === "hot") {
      arr.sort((a, b) => b.rate - a.rate);
    }
    // latest: 서버에서 이미 created_at desc
    return arr;
  }, [items, sort]);

  const hotItems = useMemo(
    () =>
      [...items]
        .filter((it) => it.rate > 0)
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5),
    [items]
  );

  return (
    <>
      <div className="sticky top-14 z-10 border-b border-card bg-background">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                filter === f ? "bg-ink text-white" : "bg-card text-ink-muted"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {!loading && !error && <HotSection items={hotItems} />}

      <div className="flex gap-1 px-4 pt-4">
        {SORTS.map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              sort === s ? "bg-card text-ink" : "text-ink-muted"
            }`}
          >
            {SORT_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-4 py-3">
        {loading ? (
          <div className="py-16 text-center text-sm text-ink-muted">
            시세를 불러오는 중…
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-ink-muted">{error}</div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-sm text-ink-muted">
            아직 상장된 썰이 없어요.
            <br />첫 번째 썰을 상장해 보세요!
          </div>
        ) : (
          sorted.map(({ ssul, rate, spark }) => (
            <Link key={ssul.id} href={`/ssul/${ssul.id}`}>
              <SsulCard ssul={ssul} rate={rate} spark={spark} />
            </Link>
          ))
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
      <InstallBanner />
    </Suspense>
  );
}
