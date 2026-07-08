"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithKakao() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError("로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center px-6 pt-24">
      <span className="text-3xl font-extrabold tracking-tight text-primary">
        SSULEX
      </span>
      <p className="mt-3 text-center text-sm leading-relaxed text-ink-muted">
        이야기를 주식처럼 거래하는 썰 거래소
        <br />
        지금 가입하면 <span className="font-bold text-primary">1,000P</span>{" "}
        상장 축하금 지급!
      </p>

      <button
        onClick={signInWithKakao}
        disabled={loading}
        className="mt-12 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-[15px] font-bold text-[#191919] disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#191919">
          <path d="M12 3C6.48 3 2 6.54 2 10.9c0 2.8 1.86 5.26 4.66 6.65l-.95 3.53c-.08.31.27.56.54.38l4.13-2.76c.53.07 1.07.1 1.62.1 5.52 0 10-3.54 10-7.9S17.52 3 12 3Z" />
        </svg>
        {loading ? "카카오로 이동 중…" : "카카오로 시작하기"}
      </button>

      {error && (
        <p className="mt-4 text-center text-sm text-rise">{error}</p>
      )}
    </div>
  );
}
