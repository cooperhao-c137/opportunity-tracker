import { getDb } from "../api/queries/connection";
import {
  customers,
  opportunities,
  stageEvents,
  projects,
  milestones,
  tasks,
  contracts,
  payments,
  type OpportunityStage,
} from "./schema";

const d = (s: string) => new Date(s + "T09:00:00");

async function main() {
  const db = getDb();
  console.log("Seeding...");

  /* ---------- 客户 ---------- */
  const customerRows = [
    { name: "众合供应链", industry: "物流供应链", region: "华东" as const, contact: "周立群", phone: "138-0136-7721", note: "年框客户，决策链短" },
    { name: "启明供应链", industry: "物流供应链", region: "华北" as const, contact: "韩梅", phone: "139-1102-3345", note: "二期扩容意向强" },
    { name: "众合控股", industry: "综合集团", region: "华东" as const, contact: "陈国平", phone: "137-6180-2256", note: "集团统采" },
    { name: "中瑞控股", industry: "金融服务", region: "华南" as const, contact: "林晓彤", phone: "136-0255-8874", note: "合规要求高" },
    { name: "启明控股", industry: "综合集团", region: "华北" as const, contact: "赵鹏", phone: "135-2271-9903", note: "" },
    { name: "汇丰食品", industry: "食品制造", region: "西南" as const, contact: "唐敏", phone: "133-0806-5521", note: "旺季前上线需求" },
    { name: "蓝湾科技", industry: "软件信息", region: "华南" as const, contact: "苏哲", phone: "186-2013-7745", note: "技术导向，POC 通过" },
    { name: "安途汽配", industry: "汽车零部件", region: "华东" as const, contact: "钱伟", phone: "139-1725-3310", note: "" },
    { name: "同辉建材", industry: "建材制造", region: "西南" as const, contact: "吴春燕", phone: "138-8220-6641", note: "价格敏感" },
    { name: "恒润新能源", industry: "新能源", region: "华北" as const, contact: "郑凯", phone: "186-0139-4287", note: "预算已批" },
    { name: "锦程文旅", industry: "文化旅游", region: "华南" as const, contact: "许晴", phone: "137-2435-8890", note: "" },
    { name: "天工精密", industry: "装备制造", region: "华东" as const, contact: "罗建军", phone: "135-6482-1173", note: "老客户转介绍" },
    { name: "博雅教育", industry: "教育培训", region: "西南" as const, contact: "孟瑶", phone: "133-4028-6652", note: "" },
    { name: "青云航空", industry: "航空服务", region: "华北" as const, contact: "高翔", phone: "186-1147-3390", note: "招标流程中" },
  ];
  await db.insert(customers).values(customerRows.map((c) => ({ ...c, note: c.note || null, createdAt: d("2026-01-05") })));
  const custs = await db.select().from(customers);
  const cid = (name: string) => custs.find((c) => c.name === name)!.id;

  /* ---------- 商机 ---------- */
  type OppSeed = {
    name: string; customer: string; amount: number; stage: OpportunityStage;
    probability: number; source: string; expectedClose?: string;
    created: string; updated: string; note?: string; lostReason?: string;
  };
  const oppSeeds: OppSeed[] = [
    { name: "众合供应链 · 智能调度平台一期", customer: "众合供应链", amount: 132, stage: "won", probability: 100, source: "老客户转介绍", created: "2026-01-12", updated: "2026-02-20", expectedClose: "2026-02-28", note: "已签约，进入交付" },
    { name: "汇丰食品 · 溯源质检系统", customer: "汇丰食品", amount: 102, stage: "won", probability: 100, source: "展会活动", created: "2026-03-02", updated: "2026-04-15", expectedClose: "2026-04-30", note: "客户要求旺季前上线" },
    { name: "众合控股 · 集团数据中台", customer: "众合控股", amount: 146, stage: "won", probability: 100, source: "老客户转介绍", created: "2026-04-08", updated: "2026-06-10", expectedClose: "2026-06-15" },
    { name: "中瑞控股 · 风控合规平台", customer: "中瑞控股", amount: 74, stage: "won", probability: 100, source: "渠道伙伴", created: "2026-05-11", updated: "2026-07-22", expectedClose: "2026-08-01" },
    { name: "启明供应链 · 仓储二期扩容", customer: "启明供应链", amount: 99, stage: "negotiation", probability: 70, source: "老客户转介绍", created: "2026-06-18", updated: "2026-11-20", expectedClose: "2026-12-15", note: "商务条款已基本谈妥，等待对方盖章" },
    { name: "启明控股 · 财务共享中心", customer: "启明控股", amount: 73, stage: "negotiation", probability: 65, source: "官网咨询", created: "2026-07-03", updated: "2026-11-18", expectedClose: "2026-12-25" },
    { name: "汇丰食品 · 渠道分销管理", customer: "汇丰食品", amount: 121, stage: "won", probability: 100, source: "老客户转介绍", created: "2026-08-05", updated: "2026-10-12", expectedClose: "2026-10-20", note: "二期增购" },
    { name: "蓝湾科技 · 联合实验室数据平台", customer: "蓝湾科技", amount: 86, stage: "proposal", probability: 45, source: "渠道伙伴", created: "2026-09-14", updated: "2026-11-21", expectedClose: "2027-01-20", note: "POC 已通过，方案评审中" },
    { name: "安途汽配 · MES 车间执行系统", customer: "安途汽配", amount: 95, stage: "proposal", probability: 40, source: "展会活动", created: "2026-09-28", updated: "2026-11-15", expectedClose: "2027-01-31" },
    { name: "恒润新能源 · 电站运维监控", customer: "恒润新能源", amount: 128, stage: "proposal", probability: 50, source: "官网咨询", created: "2026-10-09", updated: "2026-11-24", expectedClose: "2027-02-10", note: "预算已批，方案已提交两周" },
    { name: "锦程文旅 · 会员营销平台", customer: "锦程文旅", amount: 62, stage: "contact", probability: 25, source: "陌生拜访", created: "2026-10-20", updated: "2026-11-10", expectedClose: "2027-03-01" },
    { name: "同辉建材 · ERP 替换评估", customer: "同辉建材", amount: 48, stage: "contact", probability: 20, source: "渠道伙伴", created: "2026-10-26", updated: "2026-11-08", expectedClose: "2027-03-15", note: "客户在对比三家供应商" },
    { name: "天工精密 · 质量追溯平台", customer: "天工精密", amount: 110, stage: "negotiation", probability: 60, source: "老客户转介绍", created: "2026-08-19", updated: "2026-11-25", expectedClose: "2026-12-30" },
    { name: "博雅教育 · 校区运营管理", customer: "博雅教育", amount: 36, stage: "contact", probability: 15, source: "官网咨询", created: "2026-11-02", updated: "2026-11-19", expectedClose: "2027-04-01" },
    { name: "青云航空 · 地面保障调度", customer: "青云航空", amount: 158, stage: "lead", probability: 10, source: "展会活动", created: "2026-11-10", updated: "2026-11-10", expectedClose: "2027-05-30", note: "公开招标，需准备资质材料" },
    { name: "蓝湾科技 · 开发者生态门户", customer: "蓝湾科技", amount: 54, stage: "lead", probability: 10, source: "渠道伙伴", created: "2026-11-16", updated: "2026-11-16", expectedClose: "2027-05-15" },
    { name: "众合供应链 · 运力撮合平台", customer: "众合供应链", amount: 88, stage: "contact", probability: 30, source: "老客户转介绍", created: "2026-11-05", updated: "2026-11-22", expectedClose: "2027-02-28" },
    { name: "安途汽配 · 供应链协同平台", customer: "安途汽配", amount: 67, stage: "lead", probability: 10, source: "展会活动", created: "2026-11-20", updated: "2026-11-20", expectedClose: "2027-06-30" },
    { name: "锦程文旅 · 票务中台重构", customer: "锦程文旅", amount: 92, stage: "proposal", probability: 35, source: "陌生拜访", created: "2026-11-01", updated: "2026-11-23", expectedClose: "2027-02-15" },
    { name: "中瑞控股 · 投研数据服务", customer: "中瑞控股", amount: 45, stage: "lost", probability: 0, source: "官网咨询", created: "2026-05-20", updated: "2026-09-30", expectedClose: "2026-10-31", lostReason: "预算冻结，明年重启" },
    { name: "博雅教育 · 在线课堂平台", customer: "博雅教育", amount: 28, stage: "lost", probability: 0, source: "陌生拜访", created: "2026-04-14", updated: "2026-08-20", expectedClose: "2026-09-30", lostReason: "选择了竞对低价方案" },
    { name: "同辉建材 · 数字大屏项目", customer: "同辉建材", amount: 22, stage: "lost", probability: 0, source: "渠道伙伴", created: "2026-03-25", updated: "2026-07-12", expectedClose: "2026-08-15", lostReason: "客户内部立项取消" },
    { name: "青云航空 · 货运结算系统", customer: "青云航空", amount: 76, stage: "lost", probability: 0, source: "展会活动", created: "2026-06-30", updated: "2026-10-05", expectedClose: "2026-11-01", lostReason: "招标流标，重新选型" },
    { name: "恒润新能源 · 储能监控平台", customer: "恒润新能源", amount: 64, stage: "lost", probability: 0, source: "官网咨询", created: "2026-02-10", updated: "2026-06-18", expectedClose: "2026-07-31", lostReason: "集团战略调整暂停 IT 投入" },
  ];
  for (const o of oppSeeds) {
    const result = await db.insert(opportunities).values({
      name: o.name,
      customerId: cid(o.customer),
      amount: o.amount,
      stage: o.stage,
      probability: o.probability,
      source: o.source,
      expectedClose: o.expectedClose ?? null,
      note: o.note ?? null,
      lostReason: o.lostReason ?? null,
      createdAt: d(o.created),
      updatedAt: d(o.updated),
    });
    const id = Number(result[0].insertId);
    await db.insert(stageEvents).values({
      opportunityId: id,
      fromStage: null,
      toStage: "lead",
      note: "商机创建",
      createdAt: d(o.created),
    });
    if (o.stage !== "lead") {
      const path: OpportunityStage[] = ["contact", "proposal", "negotiation", "won"];
      const upto: OpportunityStage[] =
        o.stage === "lost"
          ? ["contact", "proposal", "negotiation"]
          : path.slice(0, path.indexOf(o.stage) + 1);
      let i = 0;
      for (const s of upto) {
        i += 1;
        await db.insert(stageEvents).values({
          opportunityId: id,
          fromStage: i === 1 ? "lead" : upto[i - 2],
          toStage: s,
          note: null,
          createdAt: d(o.created),
        });
      }
      if (o.stage === "lost") {
        await db.insert(stageEvents).values({
          opportunityId: id,
          fromStage: "negotiation",
          toStage: "lost",
          note: o.lostReason ?? null,
          createdAt: d(o.updated),
        });
      }
    }
  }
  const opps = await db.select().from(opportunities);
  const oid = (name: string) => opps.find((o) => o.name === name)!.id;

  /* ---------- 项目 ---------- */
  const projectSeeds = [
    { name: "众合供应链 · 智能调度平台一期", customer: "众合供应链", opp: "众合供应链 · 智能调度平台一期", amount: 132, status: "done" as const, start: "2026-03-01", end: "2026-08-31", desc: "覆盖 12 个区域仓的智能调度，已完成验收。" },
    { name: "汇丰食品 · 溯源质检系统", customer: "汇丰食品", opp: "汇丰食品 · 溯源质检系统", amount: 102, status: "active" as const, start: "2026-05-01", end: "2026-12-20", desc: "需在 2027 春节旺季前完成全量上线。" },
    { name: "众合控股 · 集团数据中台", customer: "众合控股", opp: "众合控股 · 集团数据中台", amount: 146, status: "active" as const, start: "2026-07-01", end: "2027-03-31", desc: "三大子公司数据归集与统一指标口径。" },
    { name: "中瑞控股 · 风控合规平台", customer: "中瑞控股", opp: "中瑞控股 · 风控合规平台", amount: 74, status: "at_risk" as const, start: "2026-08-15", end: "2027-01-15", desc: "合规规则引擎开发量超预期，需评估追加资源。" },
    { name: "汇丰食品 · 渠道分销管理", customer: "汇丰食品", opp: "汇丰食品 · 渠道分销管理", amount: 121, status: "active" as const, start: "2026-11-01", end: "2027-04-30", desc: "二期增购项目，经销商订单全流程线上化。" },
    { name: "天工精密 · 质量追溯平台", customer: "天工精密", opp: null, amount: 110, status: "active" as const, start: "2026-12-01", end: "2027-05-31", desc: "预立项，等待合同签署后启动。" },
  ];
  for (const p of projectSeeds) {
    await db.insert(projects).values({
      name: p.name,
      customerId: cid(p.customer),
      opportunityId: p.opp ? oid(p.opp) : null,
      contractAmount: p.amount,
      status: p.status,
      startDate: p.start,
      endDate: p.end,
      description: p.desc,
    });
  }
  const projs = await db.select().from(projects);
  const pid = (name: string) => projs.find((p) => p.name === name)!.id;

  /* ---------- 里程碑与任务 ---------- */
  const msSeeds: [string, { title: string; due: string; done: boolean }[]][] = [
    ["众合供应链 · 智能调度平台一期", [
      { title: "需求调研完成", due: "2026-03-20", done: true },
      { title: "核心调度引擎开发", due: "2026-06-30", done: true },
      { title: "华东区域试点上线", due: "2026-07-31", done: true },
      { title: "全量上线与验收", due: "2026-08-31", done: true },
    ]],
    ["汇丰食品 · 溯源质检系统", [
      { title: "需求确认与原型评审", due: "2026-05-20", done: true },
      { title: "质检流程引擎开发", due: "2026-09-30", done: true },
      { title: "溯源码体系对接", due: "2026-11-30", done: false },
      { title: "试点工厂上线", due: "2026-12-10", done: false },
      { title: "旺季前全量上线", due: "2026-12-20", done: false },
    ]],
    ["众合控股 · 集团数据中台", [
      { title: "指标体系蓝图", due: "2026-08-15", done: true },
      { title: "数据接入层开发", due: "2026-11-30", done: true },
      { title: "指标服务层联调", due: "2027-01-20", done: false },
      { title: "子公司分批切换", due: "2027-03-15", done: false },
    ]],
    ["中瑞控股 · 风控合规平台", [
      { title: "合规规则梳理", due: "2026-09-30", done: true },
      { title: "规则引擎开发", due: "2026-12-15", done: false },
      { title: "监管报送联调", due: "2027-01-10", done: false },
      { title: "等保测评", due: "2027-01-15", done: false },
    ]],
    ["汇丰食品 · 渠道分销管理", [
      { title: "蓝图设计", due: "2026-11-25", done: false },
      { title: "经销商门户开发", due: "2027-02-28", done: false },
      { title: "订单全链路联调", due: "2027-04-10", done: false },
    ]],
    ["天工精密 · 质量追溯平台", [
      { title: "项目启动会", due: "2026-12-05", done: false },
      { title: "现场调研", due: "2026-12-20", done: false },
    ]],
  ];
  const msIds: Record<string, number[]> = {};
  for (const [proj, list] of msSeeds) {
    const ids: number[] = [];
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const r = await db.insert(milestones).values({
        projectId: pid(proj),
        title: m.title,
        dueDate: m.due,
        done: m.done,
        sort: i,
      });
      ids.push(Number(r[0].insertId));
    }
    msIds[proj] = ids;
  }
  const taskSeeds: [string, (number | null), { title: string; assignee: string; due?: string; done: boolean }[]][] = [
    ["汇丰食品 · 溯源质检系统", msIds["汇丰食品 · 溯源质检系统"][2], [
      { title: "对接国家溯源平台接口", assignee: "沈工", due: "2026-11-28", done: false },
      { title: "溯源码批量打印组件", assignee: "小顾", done: true },
      { title: "原料批次数据清洗", assignee: "沈工", due: "2026-11-30", done: false },
    ]],
    ["汇丰食品 · 溯源质检系统", msIds["汇丰食品 · 溯源质检系统"][3], [
      { title: "试点工厂环境部署", assignee: "老白", due: "2026-12-05", done: false },
      { title: "质检员操作培训", assignee: "唐敏", due: "2026-12-08", done: false },
    ]],
    ["众合控股 · 集团数据中台", msIds["众合控股 · 集团数据中台"][2], [
      { title: "指标 API 网关联调", assignee: "阿灿", due: "2026-12-10", done: false },
      { title: "报表迁移脚本", assignee: "小顾", done: true },
      { title: "权限矩阵梳理", assignee: "陈国平", due: "2026-12-15", done: false },
    ]],
    ["中瑞控股 · 风控合规平台", msIds["中瑞控股 · 风控合规平台"][1], [
      { title: "规则 DSL 设计评审", assignee: "阿灿", due: "2026-11-26", done: true },
      { title: "规则引擎核心开发", assignee: "沈工", due: "2026-12-20", done: false },
      { title: "历史数据回测", assignee: "林晓彤", due: "2027-01-05", done: false },
    ]],
    ["众合供应链 · 智能调度平台一期", null, [
      { title: "运维手册交付", assignee: "老白", done: true },
      { title: "验收报告归档", assignee: "周立群", done: true },
    ]],
  ];
  for (const [proj, msId, list] of taskSeeds) {
    for (const t of list) {
      await db.insert(tasks).values({
        projectId: pid(proj),
        milestoneId: msId,
        title: t.title,
        assignee: t.assignee,
        dueDate: t.due ?? null,
        done: t.done,
        doneAt: t.done ? d("2026-11-20") : null,
      });
    }
  }

  /* ---------- 合同与回款 ---------- */
  const contractSeeds = [
    { no: "HT-2026-008", title: "智能调度平台一期建设合同", customer: "众合供应链", project: "众合供应链 · 智能调度平台一期", amount: 132, signed: "2026-02-20", pays: [
      { amount: 39.6, date: "2026-03-01", received: true },
      { amount: 52.8, date: "2026-06-01", received: true },
      { amount: 39.6, date: "2026-09-01", received: false },
    ]},
    { no: "HT-2026-021", title: "溯源质检系统建设合同", customer: "汇丰食品", project: "汇丰食品 · 溯源质检系统", amount: 102, signed: "2026-04-15", pays: [
      { amount: 30.6, date: "2026-05-01", received: true },
      { amount: 30.6, date: "2026-09-15", received: true },
      { amount: 40.8, date: "2026-12-15", received: false },
    ]},
    { no: "HT-2026-034", title: "集团数据中台建设合同", customer: "众合控股", project: "众合控股 · 集团数据中台", amount: 146, signed: "2026-06-10", pays: [
      { amount: 43.8, date: "2026-07-01", received: true },
      { amount: 58.4, date: "2026-12-01", received: false },
      { amount: 43.8, date: "2027-03-01", received: false },
    ]},
    { no: "HT-2026-047", title: "风控合规平台建设合同", customer: "中瑞控股", project: "中瑞控股 · 风控合规平台", amount: 74, signed: "2026-07-22", pays: [
      { amount: 22.2, date: "2026-08-01", received: true },
      { amount: 29.6, date: "2026-11-13", received: false },
      { amount: 22.2, date: "2027-01-20", received: false },
    ]},
    { no: "HT-2026-052", title: "渠道分销管理系统合同", customer: "汇丰食品", project: "汇丰食品 · 渠道分销管理", amount: 121, signed: "2026-10-12", pays: [
      { amount: 36.3, date: "2026-11-01", received: true },
      { amount: 48.4, date: "2027-01-15", received: false },
      { amount: 36.3, date: "2027-04-15", received: false },
    ]},
    { no: "HT-2026-056", title: "质量追溯平台预研合同", customer: "天工精密", project: "天工精密 · 质量追溯平台", amount: 22, signed: "2026-11-20", pays: [
      { amount: 22, date: "2026-12-05", received: false },
    ]},
  ];
  for (const c of contractSeeds) {
    const r = await db.insert(contracts).values({
      contractNo: c.no,
      title: c.title,
      customerName: c.customer,
      projectId: pid(c.project),
      totalAmount: c.amount,
      signedDate: c.signed,
    });
    const contractId = Number(r[0].insertId);
    for (const p of c.pays) {
      await db.insert(payments).values({
        contractId,
        amount: p.amount,
        plannedDate: p.date,
        received: p.received,
        receivedAt: p.received ? d(p.date) : null,
      });
    }
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
