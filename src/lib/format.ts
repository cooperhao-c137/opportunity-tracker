import type { OpportunityStage } from "@contracts/types";
import { StageLabels } from "@contracts/constants";

/** 万元金额格式化：132.0万 / 1,460万 */
export function fmtAmount(v: number): string {
  if (v >= 10000) return (v / 10000).toFixed(2) + "亿";
  const s = v >= 100 ? v.toFixed(0) : v.toFixed(1);
  return Number(s).toLocaleString("zh-CN", {
    minimumFractionDigits: v >= 100 ? 0 : 1,
    maximumFractionDigits: 1,
  }) + "万";
}

export function fmtDate(s?: string | null): string {
  if (!s) return "—";
  return s.slice(0, 10);
}

export function fmtDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getMonth() + 1}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function relTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} 天前`;
  return fmtDate(date.toISOString());
}

export const STAGE_META: Record<
  OpportunityStage,
  { label: string; tint: string; bar: string }
> = {
  lead: { label: StageLabels.lead, tint: "text-sky-300", bar: "#38bdf8" },
  contact: { label: StageLabels.contact, tint: "text-teal-300", bar: "#2dd4bf" },
  proposal: { label: StageLabels.proposal, tint: "text-amber-300", bar: "#fbbf24" },
  negotiation: { label: StageLabels.negotiation, tint: "text-orange-300", bar: "#fb923c" },
  won: { label: StageLabels.won, tint: "text-emerald-300", bar: "#34d399" },
  lost: { label: StageLabels.lost, tint: "text-rose-400", bar: "#fb7185" },
};

export const PROJECT_STATUS_META: Record<
  string,
  { label: string; led: "led-ok" | "led-warn" | "led-critical" | "led-idle" }
> = {
  active: { label: "进行中", led: "led-ok" },
  at_risk: { label: "有风险", led: "led-warn" },
  delayed: { label: "已延期", led: "led-critical" },
  done: { label: "已交付", led: "led-idle" },
};

/** 阶段默认赢率 */
export const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  lead: 10,
  contact: 25,
  proposal: 45,
  negotiation: 70,
  won: 100,
  lost: 0,
};

/** 阶段推进的下一步 */
export const NEXT_STAGES: Partial<Record<OpportunityStage, OpportunityStage>> = {
  lead: "contact",
  contact: "proposal",
  proposal: "negotiation",
  negotiation: "won",
};

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
