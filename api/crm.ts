import { z } from "zod";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  customers,
  opportunities,
  stageEvents,
  projects,
  milestones,
  tasks,
  contracts,
  payments,
  users,
  OPPORTUNITY_STAGES,
  PROJECT_STATUSES,
} from "@db/schema";

const stageEnum = z.enum(OPPORTUNITY_STAGES);
const projectStatusEnum = z.enum(PROJECT_STATUSES);

const customerInput = z.object({
  name: z.string().min(1, "客户名称不能为空").max(255),
  industry: z.string().max(64).optional(),
  region: z.enum(["华东", "华北", "华南", "西南", "其他"]).default("其他"),
  contact: z.string().max(64).optional(),
  phone: z.string().max(64).optional(),
  note: z.string().optional(),
});

const opportunityInput = z.object({
  name: z.string().min(1, "商机名称不能为空").max(255),
  customerId: z.number().int().positive(),
  amount: z.number().min(0, "金额不能为负"),
  probability: z.number().int().min(0).max(100).default(10),
  source: z.string().max(64).optional(),
  expectedClose: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().optional(),
});

async function logStageEvent(
  opportunityId: number,
  fromStage: (typeof OPPORTUNITY_STAGES)[number] | null,
  toStage: (typeof OPPORTUNITY_STAGES)[number],
  note: string | undefined,
  userId: number | undefined,
) {
  const db = getDb();
  await db.insert(stageEvents).values({
    opportunityId,
    fromStage,
    toStage,
    note: note ?? null,
    userId: userId ?? null,
  });
}

export const crmRouter = createRouter({
  /* ============ 客户 ============ */
  customers: createRouter({
    list: authedQuery.query(async () => {
      const db = getDb();
      return db
        .select()
        .from(customers)
        .orderBy(desc(customers.createdAt))
        .limit(500);
    }),
    create: authedQuery
      .input(customerInput)
      .mutation(async ({ input, ctx }) => {
        const db = getDb();
        const result = await db.insert(customers).values({
          ...input,
          industry: input.industry || null,
          contact: input.contact || null,
          phone: input.phone || null,
          note: input.note || null,
          ownerId: ctx.user.id,
        });
        return { id: Number(result[0].insertId) };
      }),
  }),

  /* ============ 商机 ============ */
  opportunities: createRouter({
    list: authedQuery
      .input(
        z
          .object({
            stage: stageEnum.optional(),
            search: z.string().optional(),
          })
          .optional(),
      )
      .query(async ({ input }) => {
        const db = getDb();
        const conds = [];
        if (input?.stage) conds.push(eq(opportunities.stage, input.stage));
        if (input?.search) {
          conds.push(
            sql`${opportunities.name} LIKE ${"%" + input.search + "%"}`,
          );
        }
        const rows = await db
          .select({
            opportunity: opportunities,
            customerName: customers.name,
            customerRegion: customers.region,
          })
          .from(opportunities)
          .innerJoin(customers, eq(opportunities.customerId, customers.id))
          .where(conds.length ? and(...conds) : undefined)
          .orderBy(desc(opportunities.updatedAt))
          .limit(500);
        return rows;
      }),

    byId: authedQuery
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const db = getDb();
        const [row] = await db
          .select({
            opportunity: opportunities,
            customerName: customers.name,
            customerRegion: customers.region,
            customerContact: customers.contact,
            customerPhone: customers.phone,
            customerIndustry: customers.industry,
          })
          .from(opportunities)
          .innerJoin(customers, eq(opportunities.customerId, customers.id))
          .where(eq(opportunities.id, input.id))
          .limit(1);
        if (!row) return null;
        const events = await db
          .select({
            event: stageEvents,
            userName: users.name,
          })
          .from(stageEvents)
          .leftJoin(users, eq(stageEvents.userId, users.id))
          .where(eq(stageEvents.opportunityId, input.id))
          .orderBy(desc(stageEvents.createdAt))
          .limit(50);
        const project = await db
          .select()
          .from(projects)
          .where(eq(projects.opportunityId, input.id))
          .limit(1);
        return { ...row, events, project: project[0] ?? null };
      }),

    create: authedQuery
      .input(opportunityInput)
      .mutation(async ({ input, ctx }) => {
        const db = getDb();
        const result = await db.insert(opportunities).values({
          ...input,
          expectedClose: input.expectedClose ?? null,
          source: input.source || null,
          note: input.note || null,
          ownerId: ctx.user.id,
        });
        const id = Number(result[0].insertId);
        await logStageEvent(id, null, "lead", "商机创建", ctx.user.id);
        return { id };
      }),

    update: authedQuery
      .input(
        opportunityInput.partial().extend({
          id: z.number().int().positive(),
        }),
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        const { id, ...data } = input;
        await db
          .update(opportunities)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(opportunities.id, id));
        return { ok: true };
      }),

    setStage: authedQuery
      .input(
        z.object({
          id: z.number().int().positive(),
          stage: stageEnum,
          note: z.string().max(255).optional(),
          lostReason: z.string().max(255).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = getDb();
        const [opp] = await db
          .select()
          .from(opportunities)
          .where(eq(opportunities.id, input.id))
          .limit(1);
        if (!opp) throw new Error("商机不存在");
        await db
          .update(opportunities)
          .set({
            stage: input.stage,
            lostReason: input.stage === "lost" ? (input.lostReason ?? null) : null,
            updatedAt: new Date(),
          })
          .where(eq(opportunities.id, input.id));
        await logStageEvent(
          input.id,
          opp.stage,
          input.stage,
          input.note,
          ctx.user.id,
        );
        return { ok: true };
      }),

    delete: authedQuery
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db
          .delete(opportunities)
          .where(eq(opportunities.id, input.id));
        return { ok: true };
      }),
  }),

  /* ============ 项目 ============ */
  projects: createRouter({
    list: authedQuery.query(async () => {
      const db = getDb();
      const rows = await db
        .select({
          project: projects,
          customerName: customers.name,
        })
        .from(projects)
        .leftJoin(customers, eq(projects.customerId, customers.id))
        .orderBy(desc(projects.updatedAt))
        .limit(500);
      const allTasks = await db.select().from(tasks);
      const allMilestones = await db.select().from(milestones);
      const taskMap = new Map<number, { total: number; done: number }>();
      for (const t of allTasks) {
        const m = taskMap.get(t.projectId) ?? { total: 0, done: 0 };
        m.total += 1;
        if (t.done) m.done += 1;
        taskMap.set(t.projectId, m);
      }
      const msMap = new Map<number, { total: number; done: number }>();
      for (const m of allMilestones) {
        const e = msMap.get(m.projectId) ?? { total: 0, done: 0 };
        e.total += 1;
        if (m.done) e.done += 1;
        msMap.set(m.projectId, e);
      }
      return rows.map((r) => ({
        ...r,
        tasks: taskMap.get(r.project.id) ?? { total: 0, done: 0 },
        milestones: msMap.get(r.project.id) ?? { total: 0, done: 0 },
      }));
    }),

    byId: authedQuery
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const db = getDb();
        const [row] = await db
          .select({
            project: projects,
            customerName: customers.name,
            customerRegion: customers.region,
          })
          .from(projects)
          .leftJoin(customers, eq(projects.customerId, customers.id))
          .where(eq(projects.id, input.id))
          .limit(1);
        if (!row) return null;
        const ms = await db
          .select()
          .from(milestones)
          .where(eq(milestones.projectId, input.id))
          .orderBy(milestones.sort, milestones.dueDate);
        const ts = await db
          .select()
          .from(tasks)
          .where(eq(tasks.projectId, input.id))
          .orderBy(tasks.createdAt);
        const [opp] = row.project.opportunityId
          ? await db
              .select()
              .from(opportunities)
              .where(eq(opportunities.id, row.project.opportunityId))
              .limit(1)
          : [];
        return {
          ...row,
          milestones: ms.map((m) => ({
            ...m,
            tasks: ts.filter((t) => t.milestoneId === m.id),
          })),
          looseTasks: ts.filter((t) => !t.milestoneId),
          opportunity: opp ?? null,
        };
      }),

    create: authedQuery
      .input(
        z.object({
          name: z.string().min(1, "项目名称不能为空").max(255),
          customerId: z.number().int().positive().optional(),
          opportunityId: z.number().int().positive().optional(),
          contractAmount: z.number().min(0).default(0),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          description: z.string().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = getDb();
        const result = await db.insert(projects).values({
          ...input,
          customerId: input.customerId ?? null,
          opportunityId: input.opportunityId ?? null,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          description: input.description || null,
          managerId: ctx.user.id,
        });
        return { id: Number(result[0].insertId) };
      }),

    update: authedQuery
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().min(1).max(255).optional(),
          contractAmount: z.number().min(0).optional(),
          status: projectStatusEnum.optional(),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
          description: z.string().nullable().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        const { id, ...data } = input;
        await db
          .update(projects)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(projects.id, id));
        return { ok: true };
      }),

    delete: authedQuery
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.delete(projects).where(eq(projects.id, input.id));
        return { ok: true };
      }),
  }),

  /* ============ 里程碑与任务 ============ */
  milestones: createRouter({
    create: authedQuery
      .input(
        z.object({
          projectId: z.number().int().positive(),
          title: z.string().min(1, "里程碑名称不能为空").max(255),
          dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        const result = await db.insert(milestones).values({
          projectId: input.projectId,
          title: input.title,
          dueDate: input.dueDate ?? null,
        });
        return { id: Number(result[0].insertId) };
      }),
    toggle: authedQuery
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [m] = await db
          .select()
          .from(milestones)
          .where(eq(milestones.id, input.id))
          .limit(1);
        if (!m) throw new Error("里程碑不存在");
        await db
          .update(milestones)
          .set({ done: !m.done })
          .where(eq(milestones.id, input.id));
        return { ok: true };
      }),
    delete: authedQuery
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.delete(milestones).where(eq(milestones.id, input.id));
        return { ok: true };
      }),
  }),

  tasks: createRouter({
    create: authedQuery
      .input(
        z.object({
          projectId: z.number().int().positive(),
          milestoneId: z.number().int().positive().optional(),
          title: z.string().min(1, "任务内容不能为空").max(255),
          assignee: z.string().max(64).optional(),
          dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.insert(tasks).values({
          projectId: input.projectId,
          milestoneId: input.milestoneId ?? null,
          title: input.title,
          assignee: input.assignee || null,
          dueDate: input.dueDate ?? null,
        });
        await db
          .update(projects)
          .set({ updatedAt: new Date() })
          .where(eq(projects.id, input.projectId));
        return { ok: true };
      }),
    toggle: authedQuery
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [t] = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, input.id))
          .limit(1);
        if (!t) throw new Error("任务不存在");
        await db
          .update(tasks)
          .set({ done: !t.done, doneAt: !t.done ? new Date() : null })
          .where(eq(tasks.id, input.id));
        await db
          .update(projects)
          .set({ updatedAt: new Date() })
          .where(eq(projects.id, t.projectId));
        return { ok: true };
      }),
    delete: authedQuery
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.delete(tasks).where(eq(tasks.id, input.id));
        return { ok: true };
      }),
  }),

  /* ============ 合同与回款 ============ */
  contracts: createRouter({
    list: authedQuery.query(async () => {
      const db = getDb();
      const rows = await db
        .select({
          contract: contracts,
          projectName: projects.name,
        })
        .from(contracts)
        .leftJoin(projects, eq(contracts.projectId, projects.id))
        .orderBy(desc(contracts.signedDate))
        .limit(500);
      const allPayments = await db.select().from(payments);
      const payMap = new Map<number, typeof allPayments>();
      for (const p of allPayments) {
        const arr = payMap.get(p.contractId) ?? [];
        arr.push(p);
        payMap.set(p.contractId, arr);
      }
      return rows.map((r) => {
        const pays = payMap.get(r.contract.id) ?? [];
        const received = pays
          .filter((p) => p.received)
          .reduce((sum, p) => sum + p.amount, 0);
        return {
          ...r,
          payments: pays.sort((a, b) =>
            (a.plannedDate ?? "").localeCompare(b.plannedDate ?? ""),
          ),
          received,
          rate: r.contract.totalAmount > 0 ? received / r.contract.totalAmount : 0,
        };
      });
    }),
    create: authedQuery
      .input(
        z.object({
          contractNo: z.string().min(1, "合同编号不能为空").max(64),
          title: z.string().min(1, "合同名称不能为空").max(255),
          customerName: z.string().min(1, "客户名称不能为空").max(255),
          projectId: z.number().int().positive().optional(),
          totalAmount: z.number().min(0),
          signedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = getDb();
        await db.insert(contracts).values({
          ...input,
          projectId: input.projectId ?? null,
          signedDate: input.signedDate ?? null,
          ownerId: ctx.user.id,
        });
        return { ok: true };
      }),
    delete: authedQuery
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.delete(payments).where(eq(payments.contractId, input.id));
        await db.delete(contracts).where(eq(contracts.id, input.id));
        return { ok: true };
      }),
  }),

  payments: createRouter({
    create: authedQuery
      .input(
        z.object({
          contractId: z.number().int().positive(),
          amount: z.number().min(0.01, "金额必须大于 0"),
          plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          note: z.string().max(255).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.insert(payments).values({
          contractId: input.contractId,
          amount: input.amount,
          plannedDate: input.plannedDate ?? null,
          note: input.note || null,
        });
        return { ok: true };
      }),
    toggle: authedQuery
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [p] = await db
          .select()
          .from(payments)
          .where(eq(payments.id, input.id))
          .limit(1);
        if (!p) throw new Error("回款记录不存在");
        await db
          .update(payments)
          .set({ received: !p.received, receivedAt: !p.received ? new Date() : null })
          .where(eq(payments.id, input.id));
        return { ok: true };
      }),
    delete: authedQuery
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.delete(payments).where(eq(payments.id, input.id));
        return { ok: true };
      }),
  }),

  /* ============ 经营驾驶舱汇总 ============ */
  dashboard: authedQuery.query(async () => {
    const db = getDb();
    const year = new Date().getFullYear();

    const opps = await db
      .select({
        opportunity: opportunities,
        customerRegion: customers.region,
      })
      .from(opportunities)
      .innerJoin(customers, eq(opportunities.customerId, customers.id));

    /* 漏斗：未流失商机按阶段统计 */
    const funnelStages = ["lead", "contact", "proposal", "negotiation"] as const;
    const funnel = funnelStages.map((stage) => {
      const rows = opps.filter((o) => o.opportunity.stage === stage);
      return {
        stage,
        count: rows.length,
        amount: rows.reduce((s, o) => s + o.opportunity.amount, 0),
      };
    });
    const wonRows = opps.filter((o) => o.opportunity.stage === "won");
    const lostRows = opps.filter((o) => o.opportunity.stage === "lost");
    const won = {
      stage: "won" as const,
      count: wonRows.length,
      amount: wonRows.reduce((s, o) => s + o.opportunity.amount, 0),
    };
    const lostCount = lostRows.length;
    const pipelineTotal = funnel.reduce((s, f) => s + f.amount, 0);

    /* 月度序列：新增商机额 + 成交商机额 */
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      newAmount: 0,
      wonAmount: 0,
    }));
    for (const o of opps) {
      const created = new Date(o.opportunity.createdAt);
      if (created.getFullYear() === year) {
        monthly[created.getMonth()].newAmount += o.opportunity.amount;
      }
      if (
        o.opportunity.stage === "won" &&
        new Date(o.opportunity.updatedAt).getFullYear() === year
      ) {
        monthly[new Date(o.opportunity.updatedAt).getMonth()].wonAmount +=
          o.opportunity.amount;
      }
    }

    /* 区域排行：在途商机（未成交未流失） */
    const regionMap = new Map<
      string,
      { activeCount: number; pipelineAmount: number; wonAmount: number }
    >();
    for (const o of opps) {
      const r = o.customerRegion ?? "其他";
      const e = regionMap.get(r) ?? {
        activeCount: 0,
        pipelineAmount: 0,
        wonAmount: 0,
      };
      if (o.opportunity.stage === "won") {
        e.wonAmount += o.opportunity.amount;
      } else if (o.opportunity.stage !== "lost") {
        e.activeCount += 1;
        e.pipelineAmount += o.opportunity.amount;
      }
      regionMap.set(r, e);
    }
    const regions = Array.from(regionMap.entries())
      .map(([region, v]) => ({ region, ...v }))
      .sort((a, b) => b.pipelineAmount - a.pipelineAmount);

    /* 合同与回款 */
    const allContracts = await db.select().from(contracts);
    const allPayments = await db.select().from(payments);
    const receivedTotal = allPayments
      .filter((p) => p.received)
      .reduce((s, p) => s + p.amount, 0);
    const contractTotal = allContracts.reduce((s, c) => s + c.totalAmount, 0);

    /* 最近合同 */
    const contractRows = await db
      .select()
      .from(contracts)
      .orderBy(desc(contracts.signedDate))
      .limit(5);
    const recentContracts = contractRows.map((c) => {
      const pays = allPayments.filter((p) => p.contractId === c.id);
      const received = pays
        .filter((p) => p.received)
        .reduce((s, p) => s + p.amount, 0);
      const nextDue = pays
        .filter((p) => !p.received && p.plannedDate)
        .sort((a, b) => (a.plannedDate ?? "").localeCompare(b.plannedDate ?? ""))[0];
      return {
        ...c,
        received,
        rate: c.totalAmount > 0 ? received / c.totalAmount : 0,
        nextDue: nextDue?.plannedDate ?? null,
      };
    });

    /* 进行中项目 */
    const projectRows = await db
      .select({
        project: projects,
        customerName: customers.name,
      })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(inArray(projects.status, ["active", "at_risk", "delayed"]))
      .orderBy(projects.endDate)
      .limit(6);
    const allTasks = await db.select().from(tasks);
    const projTaskMap = new Map<number, { total: number; done: number }>();
    for (const t of allTasks) {
      const m = projTaskMap.get(t.projectId) ?? { total: 0, done: 0 };
      m.total += 1;
      if (t.done) m.done += 1;
      projTaskMap.set(t.projectId, m);
    }
    const activeProjects = projectRows.map((r) => {
      const t = projTaskMap.get(r.project.id) ?? { total: 0, done: 0 };
      return {
        ...r,
        progress: t.total > 0 ? Math.round((t.done / t.total) * 100) : 0,
        taskTotal: t.total,
        taskDone: t.done,
      };
    });

    /* 最近动态 */
    const recentEvents = await db
      .select({
        event: stageEvents,
        opportunityName: opportunities.name,
        userName: users.name,
      })
      .from(stageEvents)
      .innerJoin(
        opportunities,
        eq(stageEvents.opportunityId, opportunities.id),
      )
      .leftJoin(users, eq(stageEvents.userId, users.id))
      .orderBy(desc(stageEvents.createdAt))
      .limit(8);

    return {
      funnel,
      won,
      lostCount,
      pipelineTotal,
      monthly,
      regions,
      payment: {
        contractTotal,
        receivedTotal,
        rate: contractTotal > 0 ? receivedTotal / contractTotal : 0,
      },
      activeProjects,
      recentContracts,
      recentEvents,
      oppTotal: opps.length,
    };
  }),
});
