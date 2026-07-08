import { CATEGORY_LABELS, type Ssul } from "@/lib/types";
import { formatPoints, timeAgo } from "@/lib/format";

const CATEGORY_STYLE: Record<string, string> = {
  fun: "bg-[#fff1e8] text-[#e8590c]",
  scary: "bg-[#efe9ff] text-primary",
  info: "bg-[#e7f1ff] text-fall",
};

export default function SsulCard({ ssul }: { ssul: Ssul }) {
  return (
    <article className="rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
            CATEGORY_STYLE[ssul.category] ?? "bg-white text-ink-muted"
          }`}
        >
          {CATEGORY_LABELS[ssul.category] ?? ssul.category}
        </span>
        <span className="text-xs text-ink-muted">{timeAgo(ssul.created_at)}</span>
      </div>

      <h2 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-ink">
        {ssul.title}
      </h2>

      {ssul.preview && (
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
          {ssul.preview}
        </p>
      )}

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-xs font-medium text-ink-muted">현재 시세</span>
        <span className="text-base font-extrabold tabular-nums text-ink">
          {formatPoints(ssul.current_price)}
        </span>
      </div>
    </article>
  );
}
