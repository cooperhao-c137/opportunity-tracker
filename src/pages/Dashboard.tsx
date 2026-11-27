import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { MonthlyBars, FunnelBars, ProgressBar } from "@/components/charts";
import {
  fmtAmount,
  fmtDate,
  relTime,
  STAGE_META,
  PROJECT_STATUS_META,
} from "@/lib/format";

export default function Dashboard() {
  const { data, isLoading } = trpc.crm.dashboard.useQuery();

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const year = new Date().getFullYear();
  const maxFunnel = Math.max(1, ...data.funnel.map((f) => f.count));

  return (
    <div>
      {/* KPI 条 */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="在途商机金额"
          value={fmtAmount(data.pipelineTotal)}
          sub={`${data.oppTotal - data.won.count - data.lostCount} 个商机推进中`}
          led="led-ok led-pulse"
        />
        <KpiTile
          label="本年成交商机"
          value={fmtAmount(data.won.amount)}
          sub={`${data.won.count} 个 · 流失 ${data.lostCount} 个`}
          led="led-idle"
        />
        <KpiTile
          label="合同总额"
          value={fmtAmount(data.payment.contractTotal)}
          sub={`已回款 ${fmtAmount(data.payment.receivedTotal)}`}
          led="led-warn"
        />
        <KpiTile
          label="总回款率"
          value={Math.round(data.payment.rate * 100) + "%"}
          sub={`${data.activeProjects.length} 个在途项目`}
          led="led-ok"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* 跟进漏斗 */}
        <section className="panel p-4 md:p-5 xl:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="label-caps font-data">商机漏斗 · Pipeline</p>
            <Link
              to="/opportunities"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              全部商机 <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <FunnelBars
            max={maxFunnel}
            format={fmtAmount}
            items={data.funnel.map((f) => ({
              label: STAGE_META[f.stage].label,
              count: f.count,
              amount: f.amount,
              color: STAGE_META[f.stage].bar,
            }))}
          />
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">成交</span>
            <span className="font-data">
              <span className="text-emerald-300">{data.won.count}</span> 个 ·{" "}
              {fmtAmount(data.won.amount)}
            </span>
          </div>
        </section>

        {/* 月度商机额 */}
        <section className="panel p-4 md:p-5 xl:col-span-7">
          <MonthlyBars data={data.monthly} year={year} />
        </section>

        {/* 区域排行 */}
        <section className="panel p-4 md:p-5 xl:col-span-4">
          <p className="label-caps font-data mb-4">区域商机排行</p>
          <div className="flex flex-col">
            {data.regions.map((r, i) => (
              <div
                key={r.region}
                className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0"
              >
                <span className="font-data w-6 text-sm text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.region}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.activeCount} 单在途
                  </p>
                </div>
                <span className="font-data text-sm">
                  {fmtAmount(r.pipelineAmount)}
                </span>
              </div>
            ))}
            {data.regions.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                暂无区域数据
              </p>
            )}
          </div>
        </section>

        {/* 合同与回款 */}
        <section className="panel p-4 md:p-5 xl:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="label-caps font-data">合同与回款</p>
            <Link
              to="/payments"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              管理 <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mb-4 flex items-baseline gap-3">
            <span className="font-data text-2xl font-semibold">
              {Math.round(data.payment.rate * 100)}%
            </span>
            <span className="text-xs text-muted-foreground">总回款率</span>
          </div>
          <div className="flex flex-col">
            {data.recentContracts.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                暂无合同，去回款管理页新增
              </p>
            ) : (
              data.recentContracts.map((c) => (
                <Link
                  key={c.id}
                  to="/payments"
                  className="border-b border-border/60 py-2.5 last:border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">
                      {c.customerName}
                    </p>
                    <p className="font-data text-xs text-muted-foreground">
                      <span className="text-foreground">
                        {fmtAmount(c.received)}
                      </span>
                      {" / "}
                      {fmtAmount(c.totalAmount)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1">
                      <ProgressBar
                        value={c.rate * 100}
                        color={
                          c.rate >= 0.6
                            ? "hsl(var(--ok))"
                            : c.rate >= 0.3
                              ? "hsl(var(--warn))"
                              : "hsl(var(--critical))"
                        }
                      />
                    </div>
                    <span className="font-data whitespace-nowrap text-[11px] text-muted-foreground">
                      {Math.round(c.rate * 100)}%{" "}
                      {c.nextDue ? `· 下次 ${fmtDate(c.nextDue)}` : ""}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* 在途项目 */}
        <section className="panel p-4 md:p-5 xl:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="label-caps font-data">在途项目</p>
            <Link
              to="/projects"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              全部 <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-col">
            {data.activeProjects.map((p) => {
              const meta = PROJECT_STATUS_META[p.project.status];
              return (
                <Link
                  key={p.project.id}
                  to={`/projects/${p.project.id}`}
                  className="group border-b border-border/60 py-2.5 last:border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-2">
                    <span className={`led ${meta.led}`} aria-hidden />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium transition-colors group-hover:text-emerald-300">
                      {p.project.name}
                    </p>
                    <span className="font-data text-xs text-muted-foreground">
                      {p.progress}%
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1">
                      <ProgressBar
                        value={p.progress}
                        color={
                          p.project.status === "delayed"
                            ? "hsl(var(--critical))"
                            : p.project.status === "at_risk"
                              ? "hsl(var(--warn))"
                              : "hsl(var(--ok))"
                        }
                      />
                    </div>
                    <span className="font-data whitespace-nowrap text-xs text-muted-foreground">
                      {p.taskDone}/{p.taskTotal} 任务
                    </span>
                  </div>
                </Link>
              );
            })}
            {data.activeProjects.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                暂无在途项目
              </p>
            )}
          </div>
        </section>

        {/* 最新动态 */}
        <section className="panel p-4 md:p-5 xl:col-span-12">
          <p className="label-caps font-data mb-4">最新跟进动态</p>
          <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
            {data.recentEvents.map((e) => (
              <div
                key={e.event.id}
                className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0 md:[&:nth-last-child(2)]:border-0"
              >
                <span
                  className={`led ${
                    e.event.toStage === "won"
                      ? "led-ok"
                      : e.event.toStage === "lost"
                        ? "led-critical"
                        : "led-idle"
                  }`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium">{e.opportunityName}</span>
                    <span className="mx-2 text-muted-foreground">→</span>
                    <span
                      className={
                        e.event.toStage
                          ? STAGE_META[e.event.toStage].tint
                          : undefined
                      }
                    >
                      {e.event.toStage
                        ? STAGE_META[e.event.toStage].label
                        : "—"}
                    </span>
                  </p>
                  {e.event.note && (
                    <p className="truncate text-xs text-muted-foreground">
                      {e.event.note}
                    </p>
                  )}
                </div>
                <span className="font-data whitespace-nowrap text-xs text-muted-foreground">
                  {e.userName ?? "系统"} · {relTime(e.event.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  led,
}: {
  label: string;
  value: string;
  sub: string;
  led: string;
}) {
  return (
    <div className="panel flex flex-col gap-1.5 p-4">
      <div className="flex items-center gap-2">
        <span className={`led ${led}`} aria-hidden />
        <p className="label-caps">{label}</p>
      </div>
      <p className="font-data text-2xl font-semibold tracking-tight">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel h-24 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="panel h-72 animate-pulse xl:col-span-5" />
        <div className="panel h-72 animate-pulse xl:col-span-7" />
      </div>
    </div>
  );
}
