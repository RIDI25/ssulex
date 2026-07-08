"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORY_LABELS,
  type Review,
  type SsulPublic,
} from "@/lib/types";
import { formatPoints, timeAgo } from "@/lib/format";
import { notifyPointsChanged } from "@/lib/points";
import { baselinePrice, changeRate, type PricePoint } from "@/lib/price";
import Toast from "@/components/Toast";
import PriceChart from "@/components/PriceChart";
import ChangeBadge from "@/components/ChangeBadge";
import DelistButton from "@/components/DelistButton";

const CATEGORY_STYLE: Record<string, string> = {
  fun: "bg-[#efe8ff] text-[#6c3ce9]",
  scary: "bg-[#e5e0f0] text-[#45325f]",
  surprise: "bg-[#f5f0ff] text-[#8f66f2]",
  angry: "bg-[#eae1fb] text-[#5527c9]",
  amazing: "bg-[#ece9fb] text-[#7568d6]",
  info: "bg-[#eeecf6] text-[#6f66a8]",
};

function Stars({
  rating,
  onSelect,
  size = "text-base",
}: {
  rating: number;
  onSelect?: (r: number) => void;
  size?: string;
}) {
  return (
    <span className={`inline-flex ${size}`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onSelect ? (
          <button
            key={n}
            type="button"
            onClick={() => onSelect(n)}
            className={`px-0.5 ${n <= rating ? "text-primary" : "text-ink-muted/30"}`}
            aria-label={`${n}점`}
          >
            ★
          </button>
        ) : (
          <span
            key={n}
            className={n <= rating ? "text-primary" : "text-ink-muted/30"}
          >
            ★
          </span>
        )
      )}
    </span>
  );
}

export default function SsulDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ssul, setSsul] = useState<SsulPublic | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [authorNick, setAuthorNick] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<PricePoint[]>([]);

  const [buying, setBuying] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const loadHistory = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("price_history")
      .select("price, created_at")
      .eq("ssul_id", id)
      .order("created_at", { ascending: true });
    setHistory((data as PricePoint[]) ?? []);
  }, [id]);

  const loadReviews = useCallback(async () => {
    const supabase = createClient();
    const { data: reviewData } = await supabase
      .from("reviews")
      .select("*")
      .eq("ssul_id", id)
      .order("created_at", { ascending: false });

    const list = (reviewData as Review[]) ?? [];
    setReviews(list);

    const ids = [...new Set(list.map((r) => r.reviewer_id))];
    if (ids.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, nickname")
        .in("id", ids);
      const map: Record<string, string> = {};
      (profileData ?? []).forEach((p) => {
        map[p.id] = p.nickname ?? "익명";
      });
      setNicknames((prev) => ({ ...prev, ...map }));
    }
  }, [id]);

  const load = useCallback(async () => {
    const supabase = createClient();

    const [{ data: userRes }, { data: pub }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("ssuls_public").select("*").eq("id", id).maybeSingle(),
    ]);

    if (!pub) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setSsul(pub as SsulPublic);

    const uid = userRes.user?.id ?? null;
    setUserId(uid);

    const tasks: PromiseLike<unknown>[] = [
      // 본문: RLS 때문에 매수자/작성자에게만 row가 보임 → 없으면 잠김
      supabase
        .from("ssuls")
        .select("body")
        .eq("id", id)
        .maybeSingle()
        .then(({ data }) => setBody(data?.body ?? null)),
      supabase
        .from("profiles")
        .select("nickname")
        .eq("id", pub.author_id)
        .maybeSingle()
        .then(({ data }) => setAuthorNick(data?.nickname ?? "익명")),
      loadReviews(),
      loadHistory(),
    ];

    if (uid) {
      tasks.push(
        supabase
          .from("purchases")
          .select("ssul_id")
          .eq("ssul_id", id)
          .eq("buyer_id", uid)
          .maybeSingle()
          .then(({ data }) => setPurchased(!!data))
      );
    }

    await Promise.all(tasks);
    setLoading(false);
  }, [id, loadReviews, loadHistory]);

  // 시세가 바뀐 뒤(매수/리뷰) 현재가와 차트를 DB에서 다시 읽는다
  const refreshPrice = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("ssuls_public")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (data) setSsul(data as SsulPublic);
    await loadHistory();
  }, [id, loadHistory]);

  useEffect(() => {
    load();
  }, [load]);

  async function buy() {
    if (!userId) {
      router.push("/login");
      return;
    }
    setBuying(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("buy_ssul", {
      p_ssul_id: id,
    });

    if (error) {
      showToast("매수에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } else if (!data?.ok) {
      showToast(data?.error ?? "매수에 실패했어요.");
    } else {
      showToast("매수 완료!");
      notifyPointsChanged();
      setPurchased(true);
      const { data: bodyData } = await supabase
        .from("ssuls")
        .select("body")
        .eq("id", id)
        .maybeSingle();
      setBody(bodyData?.body ?? null);
      await refreshPrice();
    }
    setBuying(false);
  }

  async function submitReview() {
    if (rating < 1 || !comment.trim()) return;
    setSubmittingReview(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("write_review", {
      p_ssul_id: id,
      p_rating: rating,
      p_comment: comment.trim(),
    });

    if (error) {
      showToast("리뷰 등록에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } else if (!data?.ok) {
      showToast(data?.error ?? "리뷰 등록에 실패했어요.");
    } else {
      showToast(`+${formatPoints(data.refund ?? 0)} 환급!`);
      notifyPointsChanged();
      setRating(0);
      setComment("");
      await Promise.all([loadReviews(), refreshPrice()]);
    }
    setSubmittingReview(false);
  }

  async function share() {
    if (!ssul) return;
    const url = `${window.location.origin}/ssul/${id}`;
    const price = formatPoints(ssul.current_price);
    const text =
      userId === ssul.author_id
        ? `📈 내 썰 지금 ${price}! 시세 확인하러 가기`
        : `이 썰 지금 ${price}래`;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
      try {
        await navigator.share({ title: ssul.title, text, url });
      } catch {
        // 사용자가 공유창을 닫은 경우 — 무시
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        showToast("링크가 복사되었어요");
      } catch {
        showToast("복사에 실패했어요. 주소창의 링크를 이용해 주세요.");
      }
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-sm text-ink-muted">
        불러오는 중…
      </div>
    );
  }

  if (notFound || !ssul) {
    return (
      <div className="py-24 text-center text-sm text-ink-muted">
        존재하지 않는 썰이에요.
      </div>
    );
  }

  const isAuthor = userId !== null && userId === ssul.author_id;
  const unlocked = body !== null;
  const myReview = userId
    ? reviews.find((r) => r.reviewer_id === userId)
    : undefined;
  const canReview = purchased && !isAuthor && !myReview;

  return (
    <div className="px-4 py-5">
      {/* 상단 정보 */}
      <div className="flex items-center gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
            CATEGORY_STYLE[ssul.category] ?? "bg-card text-ink-muted"
          }`}
        >
          {CATEGORY_LABELS[ssul.category] ?? ssul.category}
        </span>
        <span className="text-xs text-ink-muted">
          {authorNick} · {timeAgo(ssul.created_at)}
        </span>
        <button
          onClick={share}
          aria-label="공유하기"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-card text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M12 3v12m0-12L8 7m4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <h1 className="mt-2 text-xl font-extrabold leading-snug text-ink">
        {ssul.title}
      </h1>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-xs font-medium text-ink-muted">현재 시세</span>
        <span className="text-lg font-extrabold tabular-nums text-ink">
          {formatPoints(ssul.current_price)}
        </span>
        <ChangeBadge
          rate={changeRate(ssul.current_price, baselinePrice(history))}
        />
      </div>

      {/* 시세 차트 */}
      <PriceChart history={history} currentPrice={ssul.current_price} />

      {/* 본문 / 잠금 */}
      {unlocked ? (
        <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-card p-4 text-[15px] leading-relaxed text-ink">
          {body}
        </div>
      ) : (
        <div className="mt-5">
          <div className="rounded-2xl bg-card p-4 text-[15px] leading-relaxed text-ink">
            {ssul.preview}
            <span className="text-ink-muted">…</span>
          </div>
          <div className="relative -mt-6 flex h-16 items-end justify-center bg-gradient-to-t from-white to-transparent" />
          <button
            onClick={buy}
            disabled={buying}
            className="mt-1 flex h-13 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-white disabled:opacity-60"
          >
            {buying
              ? "매수 처리 중…"
              : `${formatPoints(ssul.current_price)}로 매수하기`}
          </button>
        </div>
      )}

      {/* 리뷰 환급 배너 + 작성 폼 */}
      {canReview && (
        <div className="mt-6 rounded-2xl border border-primary/20 bg-[#f5f0ff] p-4">
          <p className="text-sm font-bold text-primary">
            💸 리뷰 쓰고 30% 돌려받기
          </p>
          <div className="mt-3">
            <Stars rating={rating} onSelect={setRating} size="text-2xl" />
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={100}
              placeholder="한줄평을 남겨주세요"
              className="h-11 min-w-0 flex-1 rounded-xl bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-muted/60 focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={submitReview}
              disabled={rating < 1 || !comment.trim() || submittingReview}
              className="h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-40"
            >
              {submittingReview ? "등록 중…" : "등록"}
            </button>
          </div>
        </div>
      )}

      {/* 리뷰 목록 */}
      <section className="mt-8">
        <h2 className="text-[15px] font-extrabold text-ink">
          리뷰 <span className="text-primary">{reviews.length}</span>
        </h2>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            아직 리뷰가 없어요. 첫 리뷰를 남겨보세요!
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl bg-card p-4">
                <div className="flex items-center justify-between">
                  <Stars rating={r.rating} size="text-sm" />
                  <span className="text-xs text-ink-muted">
                    {nicknames[r.reviewer_id] ?? "익명"} ·{" "}
                    {timeAgo(r.created_at)}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink">
                    {r.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 작성자 전용: 상장폐지 */}
      {isAuthor && (
        <div className="mt-10 flex justify-center pb-2">
          <DelistButton ssulId={id} />
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
