"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/types";

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

  async function submit() {
    if (!userId || !title.trim() || !category || !content.trim()) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.from("ssuls").insert({
      author_id: userId,
      title: title.trim(),
      category,
      body: content.trim(),
      preview: content.trim().slice(0, 150),
    });

    if (error) {
      setError("상장에 실패했어요. 잠시 후 다시 시도해 주세요.");
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
      </div>
    );
  }

  const valid = title.trim() && category && content.trim();

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
        <div className="flex gap-2">
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
          본문
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="여기에 썰을 풀어주세요. 앞 150자는 미리보기로 공개돼요."
          className="w-full resize-none rounded-xl bg-card p-4 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-muted/60 focus:ring-2 focus:ring-primary"
        />
      </div>

      {error && <p className="text-sm text-rise">{error}</p>}

      <button
        onClick={submit}
        disabled={!valid || submitting}
        className="h-13 rounded-xl bg-primary text-[15px] font-bold text-white disabled:opacity-40"
      >
        {submitting ? "상장 처리 중…" : "시작가 100P로 상장하기"}
      </button>
    </div>
  );
}
