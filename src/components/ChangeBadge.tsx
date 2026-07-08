import { formatRate } from "@/lib/price";

export default function ChangeBadge({
  rate,
  className = "",
}: {
  rate: number;
  className?: string;
}) {
  const tone =
    rate > 0
      ? "bg-[#fdedee] text-rise"
      : rate < 0
        ? "bg-[#eaf2fe] text-fall"
        : "bg-card text-ink-muted";

  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${tone} ${className}`}
    >
      {formatRate(rate)}
    </span>
  );
}
