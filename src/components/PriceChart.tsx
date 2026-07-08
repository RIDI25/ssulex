"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dailySeries, hourlySeries, type PricePoint } from "@/lib/price";
import { formatPoints } from "@/lib/format";

const PERIODS = ["day", "week", "all"] as const;
type Period = (typeof PERIODS)[number];

const PERIOD_LABELS: Record<Period, string> = {
  day: "1일",
  week: "1주",
  all: "전체",
};

const AXIS_TICK = { fontSize: 11, fill: "#8b849c" };
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #eceaf3",
  fontSize: 12,
};

export default function PriceChart({
  history,
  currentPrice,
}: {
  history: PricePoint[];
  currentPrice: number;
}) {
  const [period, setPeriod] = useState<Period>("day");

  const daily = useMemo(() => hourlySeries(history), [history]);
  const weekly = useMemo(() => dailySeries(history, 7), [history]);
  const all = useMemo(() => dailySeries(history), [history]);

  // 데이터가 비어도 차트 영역은 항상 유지한다
  const noHistory = history.length === 0;
  const noTradeToday = !noHistory && period === "day" && daily.length === 0;
  const flatLine = noHistory || noTradeToday;
  const emptyMessage = noHistory
    ? "아직 거래 기록이 없어요"
    : noTradeToday
      ? "오늘은 아직 거래가 없어요"
      : null;

  return (
    <div className="mt-4 rounded-2xl bg-card p-3 pt-3">
      {/* 기간 탭 */}
      <div className="flex gap-1 px-1 pb-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              period === p ? "bg-white text-ink shadow-sm" : "text-ink-muted"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="relative">
        {flatLine || period === "day" ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={
                flatLine
                  ? // 기록 없음 → 현재가 높이의 점선 수평선
                    [
                      { hour: 0, price: currentPrice },
                      { hour: Math.max(new Date().getHours(), 1), price: currentPrice },
                    ]
                  : daily
              }
              margin={{ top: 6, right: 12, bottom: 0, left: -14 }}
            >
              <CartesianGrid stroke="#eceaf3" vertical={false} />
              <XAxis
                type="number"
                dataKey="hour"
                domain={[0, 24]}
                ticks={[0, 6, 12, 18]}
                tickFormatter={(h) => `${h}시`}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={46}
              />
              {!flatLine && (
                <Tooltip
                  labelFormatter={(h) => `오늘 ${h}시`}
                  formatter={(value) => [formatPoints(Number(value)), "시세"]}
                  contentStyle={TOOLTIP_STYLE}
                />
              )}
              <Line
                type="monotone"
                dataKey="price"
                stroke="#6c3ce9"
                strokeWidth={2}
                strokeDasharray={flatLine ? "4 4" : undefined}
                dot={
                  !flatLine && daily.length <= 2
                    ? { r: 4, fill: "#6c3ce9", strokeWidth: 0 }
                    : false
                }
                activeDot={
                  flatLine ? false : { r: 4, fill: "#6c3ce9", strokeWidth: 0 }
                }
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={period === "week" ? weekly : all}
              margin={{ top: 6, right: 12, bottom: 0, left: -14 }}
            >
              <CartesianGrid stroke="#eceaf3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={46}
              />
              <Tooltip
                formatter={(value) => [formatPoints(Number(value)), "시세"]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#6c3ce9"
                strokeWidth={2}
                dot={
                  (period === "week" ? weekly : all).length <= 2
                    ? { r: 4, fill: "#6c3ce9", strokeWidth: 0 }
                    : false
                }
                activeDot={{ r: 4, fill: "#6c3ce9", strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {emptyMessage && (
          <p className="absolute inset-0 flex items-center justify-center pb-6 text-sm font-medium text-ink-muted">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
