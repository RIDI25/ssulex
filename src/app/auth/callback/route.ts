import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // 최초 가입 판별: auth 유저 생성 시각이 방금(2분 이내)이면 신규 가입으로 간주
  const createdAt = new Date(data.user.created_at).getTime();
  const isNewUser = Date.now() - createdAt < 2 * 60 * 1000;

  return NextResponse.redirect(isNewUser ? `${origin}/?welcome=1` : origin);
}
