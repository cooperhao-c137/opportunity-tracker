export const Session = {
  cookieName: "kimi_sid",
  maxAgeMs: 365 * 24 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
} as const;

export const Paths = {
  login: "/login",
  oauthCallback: "/api/oauth/callback",
} as const;

export const StageLabels = {
  lead: "线索",
  contact: "接洽",
  proposal: "方案",
  negotiation: "谈判",
  won: "成交",
  lost: "流失",
} as const;

export const StageOrder = [
  "lead",
  "contact",
  "proposal",
  "negotiation",
  "won",
] as const;

export const RegionOptions = ["华东", "华北", "华南", "西南", "其他"] as const;

export const ProjectStatusLabels = {
  active: "进行中",
  at_risk: "有风险",
  delayed: "已延期",
  done: "已交付",
} as const;

export const SourceOptions = [
  "老客户转介绍",
  "官网咨询",
  "展会活动",
  "渠道伙伴",
  "陌生拜访",
  "其他",
] as const;
