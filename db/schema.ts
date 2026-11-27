import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  float,
  int,
  boolean,
  date,
  timestamp,
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/* ---------- 客户 ---------- */
export const customers = mysqlTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 64 }),
  region: mysqlEnum("region", ["华东", "华北", "华南", "西南", "其他"])
    .default("其他")
    .notNull(),
  contact: varchar("contact", { length: 64 }),
  phone: varchar("phone", { length: 64 }),
  note: text("note"),
  ownerId: bigint("ownerId", { mode: "number", unsigned: true }).references(
    () => users.id,
  ),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

/* ---------- 商机 ---------- */
export const OPPORTUNITY_STAGES = [
  "lead",
  "contact",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export const opportunities = mysqlTable("opportunities", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  customerId: bigint("customerId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => customers.id),
  amount: float("amount").notNull().default(0), // 万元
  stage: mysqlEnum("stage", OPPORTUNITY_STAGES).default("lead").notNull(),
  probability: int("probability").notNull().default(10), // %
  source: varchar("source", { length: 64 }),
  expectedClose: date("expectedClose", { mode: "string" }),
  ownerId: bigint("ownerId", { mode: "number", unsigned: true }).references(
    () => users.id,
  ),
  note: text("note"),
  lostReason: varchar("lostReason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const stageEvents = mysqlTable("stageEvents", {
  id: serial("id").primaryKey(),
  opportunityId: bigint("opportunityId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => opportunities.id),
  fromStage: mysqlEnum("fromStage", OPPORTUNITY_STAGES),
  toStage: mysqlEnum("toStage", OPPORTUNITY_STAGES).notNull(),
  note: varchar("note", { length: 255 }),
  userId: bigint("userId", { mode: "number", unsigned: true }).references(
    () => users.id,
  ),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/* ---------- 项目 ---------- */
export const PROJECT_STATUSES = ["active", "at_risk", "delayed", "done"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const projects = mysqlTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  opportunityId: bigint("opportunityId", {
    mode: "number",
    unsigned: true,
  }).references(() => opportunities.id),
  customerId: bigint("customerId", { mode: "number", unsigned: true }).references(
    () => customers.id,
  ),
  contractAmount: float("contractAmount").notNull().default(0), // 万元
  status: mysqlEnum("status", PROJECT_STATUSES).default("active").notNull(),
  startDate: date("startDate", { mode: "string" }),
  endDate: date("endDate", { mode: "string" }),
  managerId: bigint("managerId", { mode: "number", unsigned: true }).references(
    () => users.id,
  ),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const milestones = mysqlTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: bigint("projectId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => projects.id),
  title: varchar("title", { length: 255 }).notNull(),
  dueDate: date("dueDate", { mode: "string" }),
  done: boolean("done").notNull().default(false),
  sort: int("sort").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const tasks = mysqlTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: bigint("projectId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => projects.id),
  milestoneId: bigint("milestoneId", { mode: "number", unsigned: true }).references(
    () => milestones.id,
  ),
  title: varchar("title", { length: 255 }).notNull(),
  assignee: varchar("assignee", { length: 64 }),
  dueDate: date("dueDate", { mode: "string" }),
  done: boolean("done").notNull().default(false),
  doneAt: timestamp("doneAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/* ---------- 合同与回款 ---------- */
export const contracts = mysqlTable("contracts", {
  id: serial("id").primaryKey(),
  contractNo: varchar("contractNo", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  projectId: bigint("projectId", { mode: "number", unsigned: true }).references(
    () => projects.id,
  ),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  totalAmount: float("totalAmount").notNull().default(0), // 万元
  signedDate: date("signedDate", { mode: "string" }),
  ownerId: bigint("ownerId", { mode: "number", unsigned: true }).references(
    () => users.id,
  ),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const payments = mysqlTable("payments", {
  id: serial("id").primaryKey(),
  contractId: bigint("contractId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => contracts.id),
  amount: float("amount").notNull().default(0), // 万元
  plannedDate: date("plannedDate", { mode: "string" }),
  received: boolean("received").notNull().default(false),
  receivedAt: timestamp("receivedAt"),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
