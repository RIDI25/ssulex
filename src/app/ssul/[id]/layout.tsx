import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("ssuls_public")
    .select("title, preview, current_price")
    .eq("id", id)
    .maybeSingle();

  if (!data) return { title: "SSULEX 썰거래소" };

  const title = `${data.title} | SSULEX 썰거래소`;
  const description = `현재 시세 ${data.current_price.toLocaleString("ko-KR")}P · ${(data.preview ?? "").slice(0, 60)}`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function SsulDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
