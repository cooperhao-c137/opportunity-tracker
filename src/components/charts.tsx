import { useState } from "react";
import { fmtAmount } from "@/lib/format";

/* ---------- 月度分组柱状图（新增 vs 成交） ---------- */
export function MonthlyBars({
  data,
  year,
}: {
  data: { month: number; newAmount: number; wonAmount: number }[];
  year: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => Math.max(d.newAmount, d.wonAmount)));
  const H = 150;
  const bw = 9;
  const gap = 3;
  const step = (bw + gap) * 2 + 12;
  const W = data.length * step;
  const activeData = active !== null ? data[active] : null;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="label-caps font-data">月度商机额 · {year}</p>
        <p className="font-data text-sm text-foreground">
          {activeData ? (
            <>
              {activeData.month}月 · 新增{" "}
              <span className="text-sky-300">{fmtAmount(activeData.newAmount)}</span>
              {" · "}成交{" "}
              <span className="text-emerald-300">
                {fmtAmount(activeData.wonAmount)}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">点击柱子查看明细</span>
          )}
        </p>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H + 22}`}
          className="w-full min-w-[520px]"
          role="img"
          aria-label="月度商机额柱状图"
        >
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <line
              key={r}
              x1={0}
              x2={W}
              y1={H - H * r}
              y2={H - H * r}
              stroke="hsl(213 12% 14%)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
          ))}
          {data.map((d, i) => {
            const x = i * step + 6;
            const hNew = (d.newAmount / max) * H;
            const hWon = (d.wonAmount / max) * H;
            const isActive = active === i;
            return (
              <g
                key={d.month}
                onClick={() => setActive(isActive ? null : i)}
                className="cursor-pointer"
              >
                <rect
                  x={x - 4}
                  y={0}
                  width={step - 4}
                  height={H}
                  fill={isActive ? "hsl(160 45% 16% / 0.35)" : "transparent"}
                  rx={4}
                />
                <rect
                  x={x}
                  y={H - hNew}
                  width={bw}
                  height={Math.max(hNew, d.newAmount > 0 ? 2 : 0)}
                  fill={isActive ? "#7dd3fc" : "#38bdf8"}
                  opacity={d.newAmount > 0 ? (isActive ? 1 : 0.75) : 0.12}
                  rx={1.5}
                >
                  <title>{`${d.month}月 新增 ${fmtAmount(d.newAmount)}`}</title>
                </rect>
                <rect
                  x={x + bw + gap}
                  y={H - hWon}
                  width={bw}
                  height={Math.max(hWon, d.wonAmount > 0 ? 2 : 0)}
                  fill={isActive ? "#6ee7b7" : "#34d399"}
                  opacity={d.wonAmount > 0 ? (isActive ? 1 : 0.75) : 0.12}
                  rx={1.5}
                >
                  <title>{`${d.month}月 成交 ${fmtAmount(d.wonAmount)}`}</title>
                </rect>
                <text
                  x={x + bw}
                  y={H + 16}
                  textAnchor="middle"
                  className="fill-muted-foreground font-data"
                  fontSize={10}
                >
                  {d.month}
                </text>
              </g>
            );
          })}
          <line x1={0} x2={W} y1={H} y2={H} stroke="hsl(213 12% 16%)" />
        </svg>
      </div>
      <div className="mt-2 flex items-center gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-sky-400" />
          新增商机额
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" />
          成交商机额
        </span>
      </div>
    </div>
  );
}

/* ---------- 漏斗条形 ---------- */
export function FunnelBars({
  items,
  max,
  format,
}: {
  items: { label: string; count: number; amount: number; color: string }[];
  max: number;
  format: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => {
        const w = it.count > 0 ? Math.max(6, (it.count / max) * 100) : 2;
        const prev = i > 0 ? items[i - 1].count : 0;
        const conv = prev > 0 ? Math.round((it.count / prev) * 100) : null;
        return (
          <div key={it.label}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm font-medium">{it.label}</span>
              <span className="font-data text-sm text-muted-foreground">
                <span className="text-foreground">{it.count}</span> 个 ·{" "}
                {format(it.amount)}
                {conv !== null && (
                  <span className="ml-2 text-xs">
                    转化 <span className="text-emerald-300">{conv}%</span>
                  </span>
                )}
              </span>
            </div>
            <div className="h-6 w-full overflow-hidden rounded-sm bg-secondary/60">
              <div
                className="h-full rounded-sm transition-all duration-300"
                style={{
                  width: `${w}%`,
                  background: `linear-gradient(90deg, ${it.color}cc, ${it.color})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 细进度条 ---------- */
export function ProgressBar({
  value,
  color = "hsl(var(--ok))",
  height = 5,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-secondary"
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}
