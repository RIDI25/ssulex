// 카드용 초경량 스파크라인 (recharts 대신 순수 SVG — 목록 50개 렌더 부담 없음)
export default function Sparkline({
  values,
  width = 64,
  height = 24,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  // 기록이 없거나 하나뿐이면 수평선으로 (요소가 사라지지 않게)
  if (values.length <= 1) {
    const y = height / 2;
    const pad = 2;
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="shrink-0"
        aria-hidden
      >
        <polyline
          points={`${pad},${y} ${width - pad},${y}`}
          fill="none"
          stroke="#6c3ce9"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
        <circle cx={width - pad} cy={y} r="2" fill="#6c3ce9" />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;

  const points = values.map((v, i) => {
    const x =
      values.length === 1
        ? width / 2
        : pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return { x, y };
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-hidden
    >
      {points.length > 1 && (
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#6c3ce9"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2"
        fill="#6c3ce9"
      />
    </svg>
  );
}
