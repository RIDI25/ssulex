"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPoints } from "@/lib/format";

export default function Header() {
  const [points, setPoints] = useState<number | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  const loadPoints = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", userId)
      .single();
    if (data) setPoints(data.points);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setLoggedIn(true);
        loadPoints(user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setLoggedIn(true);
        loadPoints(session.user.id);
      } else {
        setLoggedIn(false);
        setPoints(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadPoints]);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-card bg-background/95 px-4 backdrop-blur">
      <Link href="/" className="flex items-baseline gap-1.5">
        <span className="text-lg font-extrabold tracking-tight text-primary">
          SSULEX
        </span>
        <span className="text-sm font-semibold text-ink">썰거래소</span>
      </Link>

      {loggedIn ? (
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
    </header>
  );
}
