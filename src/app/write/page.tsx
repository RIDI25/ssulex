"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/types";
import { generatePenName } from "@/lib/penName";

export default function WritePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 작성자 필명 (직접 입력 불가, 🎲로 다시 뽑기만)
  const [penName, setPenName] = useState(() => generatePenName());

  // 시리즈 연결 (선택사항)
  const [seriesOn, setSeriesOn] = useState(false);
  const [candidates, setCandidates] = useState<
    { id: string; title: string; pen_name: string | null }[]
  >([]);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [prevId, setPrevId] = useState<string>("");
  const [samePenName, setSamePenName] = useState(true); // 이전 편과 같은 필명

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
      } else {
        setUserId(user.id);
        setChecking(false);
      }
    });
  }, [router]);

  // 시리즈 토글 시 "아직 다음 편이 없는 내 썰" 목록 로드
  useEffect(() => {
    if (!seriesOn || !userId || candidatesLoaded) return;
    (async () => {
      const supabase = createClient();
      const { data: mine } = await supabase
        .from("ssuls_public")
        .select("id, title, pen_name")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });
      const myList = (mine ?? []) as {
        id: string;
        title: string;
        pen_name: string | null;
      }[];
      if (myList.length === 0) {
        setCandidates([]);
        setCandidatesLoaded(true);
        return;
      }
      const { data: taken } = await supabase
        .from("ssuls_public")
        .select("prev_ssul_id")
        .in(
          "prev_ssul_id",
          myList.map((s) => s.id)
        );
      const takenSet = new Set((taken ?? []).map((t) => t.prev_ssul_id));
      setCandidates(myList.filter((s) => !takenSet.has(s.id)));
      setCandidatesLoaded(true);
    })();
  }, [seriesOn, userId, candidatesLoaded]);

  // 공백 제외 글자수 (DB 제약과 동일 기준)
  const charCount = content.replace(/\s/g, "").length;
  const MIN_CHARS = 300;
  const longEnough = charCount >= MIN_CHARS;

  async function submit() {
    if (!userId || !title.trim() || !category || !content.trim() || !longEnough)
      return;
    setSubmitting(true);
    setError(null);

    const prevSsul = seriesOn && prevId
      ? candidates.find((c) => String(c.id) === prevId) ?? null
      : null;
    // 시리즈 연재 + 체크 시 이전 편 필명 승계 (없으면 이번 필명)
    const effectivePenName =
      prevSsul && samePenName && prevSsul.pen_name
        ? prevSsul.pen_name
        : penName;

    const supabase = createClient();
    const { error } = await supabase.from("ssuls").insert({
      author_id: userId,
      title: title.trim(),
      category,
      body: content.trim(),
      preview: content.trim().slice(0, 150),
      prev_ssul_id: prevSsul?.id ?? null,
      pen_name: effectivePenName,
    });

    if (error) {
      // 23514: check 제약 위반 (분량 미달 등)
      setError(
        error.code === "23514"
          ? "상장 심사 기준 미달이에요. 공백 제외 300자 이상으로 썰을 더 풀어주세요 📉"
          : "상장에 실패했어요. 잠시 후 다시 시도해 주세요."
      );
      setSubmitting(false);
    } else {
      setDone(true);
    }
  }

  if (checking) {
    return (
      <div className="py-24 text-center text-sm text-ink-muted">
        로그인 확인 중…
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center px-6 pt-24 text-center">
        <span className="text-5xl">🔔</span>
        <h1 className="mt-5 text-xl font-extrabold text-ink">상장 완료!</h1>
        <p className="mt-2 text-sm text-ink-muted">
          <span className="font-bold text-ink">{title.trim()}</span>
          <br />
          시작가 <span className="font-extrabold text-rise">100P</span>로
          거래소에 상장되었어요.
        </p>
        <Link
          href="/"
          className="mt-10 flex h-13 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-white"
        >
          거래소로 가기
        </Link>
        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          광고·홍보 목적의 상업용 썰은 사전 경고 없이 상장폐지될 수 있으며,
          판매 수익은 회수됩니다.
        </p>
      </div>
    );
  }

  const valid =
    title.trim() &&
    category &&
    content.trim() &&
    longEnough &&
    (!seriesOn || prevId);

  const selectedPrev =
    seriesOn && prevId
      ? candidates.find((c) => String(c.id) === prevId)
      : undefined;
  const inheriting = !!(selectedPrev && samePenName && selectedPrev.pen_name);
  const displayPenName = inheriting ? selectedPrev!.pen_name! : penName;

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <h1 className="text-lg font-extrabold text-ink">썰 상장하기</h1>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-muted">
          제목
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="시선을 끄는 제목을 지어주세요"
          className="h-12 w-full rounded-xl bg-card px-4 text-[15px] text-ink outline-none placeholder:text-ink-muted/60 focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-muted">
          카테고리
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                category === c
                  ? "bg-primary text-white"
                  : "bg-card text-ink-muted"
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-muted">
          작성자명 (이 글에만 쓰이는 필명)
        </label>
        <div className="flex items-center gap-2">
          <div className="flex h-12 min-w-0 flex-1 items-center rounded-xl bg-card px-4 text-[15px] font-semibold text-ink">
            {displayPenName}
          </div>
          {!inheriting && (
            <button
              type="button"
              onClick={() => setPenName(generatePenName())}
              aria-label="필명 다시 뽑기"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-card text-xl"
            >
              🎲
            </button>
          )}
        </div>
        {inheriting && (
          <p className="mt-1 text-xs text-ink-muted">
            이전 편의 필명을 그대로 사용해요.
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-[13px] font-semibold text-ink-muted">
            시리즈로 연결 (선택)
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={seriesOn}
            onClick={() => {
              setSeriesOn(!seriesOn);
              if (seriesOn) setPrevId("");
            }}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              seriesOn ? "bg-primary" : "bg-card"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                seriesOn ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
        {seriesOn && (
          <div className="mt-2">
            {!candidatesLoaded ? (
              <p className="text-sm text-ink-muted">불러오는 중…</p>
            ) : candidates.length === 0 ? (
              <p className="rounded-xl bg-card px-4 py-3 text-sm text-ink-muted">
                연결할 수 있는 썰이 없어요. 이미 다음 편이 있거나 상장한 썰이
                없는 경우예요.
              </p>
            ) : (
              <>
                <select
                  value={prevId}
                  onChange={(e) => setPrevId(e.target.value)}
                  className="h-12 w-full rounded-xl bg-card px-3.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">이전 편이 될 썰을 선택하세요</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.title}
                    </option>
                  ))}
                </select>
                {prevId && (
                  <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={samePenName}
                      onChange={(e) => setSamePenName(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    이전 편과 같은 필명 사용
                  </label>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-muted">
          본문
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="여기에 썰을 풀어주세요. 앞 150자는 미리보기로 공개돼요."
          className="w-full resize-none rounded-xl bg-card p-4 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-muted/60 focus:ring-2 focus:ring-primary"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-ink-muted">
            너무 짧은 썰은 상장 심사에서 탈락해요 📉
          </span>
          <span
            className={`text-xs font-bold tabular-nums ${
              longEnough ? "text-primary" : "text-ink-muted"
            }`}
          >
            공백 제외 {charCount.toLocaleString("ko-KR")}자 / 최소 {MIN_CHARS}자
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-rise">{error}</p>}

      <p className="text-xs leading-relaxed text-ink-muted">
        광고·홍보 목적의 상업용 썰은 사전 경고 없이 상장폐지될 수 있으며, 판매
        수익은 회수됩니다.
      </p>

      <button
        onClick={submit}
        disabled={!valid || submitting}
        className="-mt-2 h-13 rounded-xl bg-primary text-[15px] font-bold text-white disabled:opacity-40"
      >
        {submitting ? "상장 처리 중…" : "시작가 100P로 상장하기"}
      </button>
    </div>
  );
}
