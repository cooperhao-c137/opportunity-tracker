import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/charts";
import { Plus, Search, LayoutGrid, Table2, ArrowRight, RotateCcw } from "lucide-react";
import type { OpportunityStage } from "@contracts/types";
import {
  fmtAmount,
  fmtDate,
  relTime,
  STAGE_META,
  NEXT_STAGES,
} from "@/lib/format";

const BOARD_STAGES: OpportunityStage[] = [
  "lead",
  "contact",
  "proposal",
  "negotiation",
  "won",
];

export default function Opportunities() {
  const [view, setView] = useState<"board" | "table">("board");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<OpportunityStage | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OpportunityLike | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data, isLoading } = trpc.crm.opportunities.list.useQuery({
    search: search || undefined,
    stage: stageFilter === "all" ? undefined : stageFilter,
  });
  const utils = trpc.useUtils();

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <div>
      <PageHeader
        caps="Opportunities"
        title="商机管理"
        desc="从线索到成交的全流程跟踪，拖拽卡片即可推进阶段"
        actions={
          <>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索商机…"
                className="w-full pl-8 sm:w-40 md:w-52"
              />
            </div>
            <div className="flex overflow-hidden rounded-md border border-border">
              <ToggleBtn
                active={view === "board"}
                onClick={() => setView("board")}
                label="看板"
                icon={<LayoutGrid className="h-4 w-4" />}
              />
              <ToggleBtn
                active={view === "table"}
                onClick={() => setView("table")}
                label="列表"
                icon={<Table2 className="h-4 w-4" />}
              />
            </div>
            <Button
              onClick={() => {
                setEditTarget(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> 新建商机
            </Button>
          </>
        }
      />

      {/* 阶段过滤 */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {(["all", ...BOARD_STAGES, "lost"] as const).map((s) => {
          const active = stageFilter === s;
          const count =
            s === "all"
              ? rows.length
              : rows.filter((r) => r.opportunity.stage === s).length;
          return (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "border-primary/40 bg-primary/20 text-emerald-300"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "全部" : STAGE_META[s].label}
              <span className="font-data text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="panel h-64 animate-pulse" />
          ))}
        </div>
      ) : view === "board" ? (
        <Board
          rows={rows}
          onOpenDetail={(id) => setDetailId(id)}
          onRefetch={() => utils.crm.opportunities.list.invalidate()}
        />
      ) : (
        <OpportunityTable rows={rows} onOpenDetail={(id) => setDetailId(id)} />
      )}

      <OpportunityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editTarget={editTarget}
      />
      <OpportunityDetail
        id={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(row) => {
          setEditTarget(row);
          setFormOpen(true);
        }}
        onOpenProject={(pid) => {
          window.location.href = `/projects/${pid}`;
        }}
      />
    </div>
  );
}

type OpportunityRow = import("@/lib/types").OpportunityRow;

type OpportunityLike = {
  opportunity: OpportunityRow["opportunity"];
  customerName: string;
  customerRegion: string;
};

function ToggleBtn({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 px-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "bg-primary/25 text-emerald-300"
          : "text-muted-foreground hover:text-foreground"
      }`}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}

/* ============ 看板 ============ */
function Board({
  rows,
  onOpenDetail,
  onRefetch,
}: {
  rows: OpportunityRow[];
  onOpenDetail: (id: number) => void;
  onRefetch: () => void;
}) {
  const [dragOver, setDragOver] = useState<OpportunityStage | null>(null);
  const setStage = trpc.crm.opportunities.setStage.useMutation({
    onSuccess: () => {
      toast.success("阶段已更新");
      onRefetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const lostRows = rows.filter((r) => r.opportunity.stage === "lost");

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {BOARD_STAGES.map((stage) => {
        const cards = rows.filter((r) => r.opportunity.stage === stage);
        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(stage);
            }}
            onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = Number(e.dataTransfer.getData("text/opp-id"));
              if (!id) return;
              const row = rows.find((r) => r.opportunity.id === id);
              if (!row || row.opportunity.stage === stage) return;
              setStage.mutate({ id, stage });
            }}
            className={`flex w-[268px] shrink-0 flex-col rounded-md border transition-colors ${
              dragOver === stage
                ? "border-primary/50 bg-primary/10"
                : "border-border bg-secondary/30"
            }`}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: STAGE_META[stage].bar }}
                aria-hidden
              />
              <span className="text-sm font-medium">
                {STAGE_META[stage].label}
              </span>
              <span className="font-data ml-auto text-xs text-muted-foreground">
                {cards.length} · {fmtAmount(cards.reduce((s, c) => s + c.opportunity.amount, 0))}
              </span>
            </div>
            <div className="flex min-h-[120px] flex-col gap-2 p-2">
              {cards.map((row) => (
                <OppCard
                  key={row.opportunity.id}
                  row={row}
                  onOpen={() => onOpenDetail(row.opportunity.id)}
                />
              ))}
              {cards.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  拖拽商机到此列
                </p>
              )}
            </div>
          </div>
        );
      })}
      {/* 流失列 */}
      <div className="flex w-[220px] shrink-0 flex-col rounded-md border border-border bg-secondary/20">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <span className="inline-block h-2 w-2 rounded-full bg-rose-400" aria-hidden />
          <span className="text-sm font-medium text-muted-foreground">流失</span>
          <span className="font-data ml-auto text-xs text-muted-foreground">
            {lostRows.length}
          </span>
        </div>
        <div className="flex flex-col gap-2 p-2">
          {lostRows.map((row) => (
            <OppCard
              key={row.opportunity.id}
              row={row}
              dim
              onOpen={() => onOpenDetail(row.opportunity.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OppCard({
  row,
  onOpen,
  dim,
}: {
  row: OpportunityRow;
  onOpen: () => void;
  dim?: boolean;
}) {
  const o = row.opportunity;
  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/opp-id", String(o.id));
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onOpen}
      className={`rounded-md border border-border bg-card p-3 text-left transition-all duration-200 hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        dim ? "opacity-55" : ""
      }`}
    >
      <p className="line-clamp-2 text-sm font-medium leading-snug">{o.name}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{row.customerName}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-data text-sm font-semibold text-emerald-300">
          {fmtAmount(o.amount)}
        </span>
        <span className="font-data text-xs text-muted-foreground">
          赢率 {o.probability}%
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar value={o.probability} color={STAGE_META[o.stage].bar} height={3} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <Badge variant="outline" className="border-border text-[10px]">
          {row.customerRegion}
        </Badge>
        <span>预计 {fmtDate(o.expectedClose)}</span>
      </div>
    </button>
  );
}

/* ============ 列表 ============ */
function OpportunityTable({
  rows,
  onOpenDetail,
}: {
  rows: OpportunityRow[];
  onOpenDetail: (id: number) => void;
}) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="label-caps px-4 py-3 font-medium">商机名称</th>
            <th className="label-caps px-4 py-3 font-medium">客户</th>
            <th className="label-caps px-4 py-3 text-right font-medium">金额</th>
            <th className="label-caps px-4 py-3 font-medium">阶段</th>
            <th className="label-caps px-4 py-3 text-right font-medium">赢率</th>
            <th className="label-caps px-4 py-3 font-medium">预计成交</th>
            <th className="label-caps px-4 py-3 font-medium">更新时间</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.opportunity.id}
              onClick={() => onOpenDetail(r.opportunity.id)}
              className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/50"
            >
              <td className="max-w-[280px] truncate px-4 py-3 font-medium">
                {r.opportunity.name}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{r.customerName}</td>
              <td className="font-data px-4 py-3 text-right text-emerald-300">
                {fmtAmount(r.opportunity.amount)}
              </td>
              <td className="px-4 py-3">
                <span className={STAGE_META[r.opportunity.stage].tint}>
                  {STAGE_META[r.opportunity.stage].label}
                </span>
              </td>
              <td className="font-data px-4 py-3 text-right">
                {r.opportunity.probability}%
              </td>
              <td className="font-data px-4 py-3 text-muted-foreground">
                {fmtDate(r.opportunity.expectedClose)}
              </td>
              <td className="font-data px-4 py-3 text-xs text-muted-foreground">
                {relTime(r.opportunity.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          没有匹配的商机
        </p>
      )}
    </div>
  );
}

/* ============ 新建 / 编辑 ============ */
export function OpportunityForm({
  open,
  onClose,
  editTarget,
}: {
  open: boolean;
  onClose: () => void;
  editTarget: OpportunityLike | null;
}) {
  const isEdit = !!editTarget;
  const utils = trpc.useUtils();
  const { data: customers } = trpc.crm.customers.list.useQuery();

  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [probability, setProbability] = useState("10");
  const [source, setSource] = useState("");
  const [expectedClose, setExpectedClose] = useState("");
  const [note, setNote] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerRegion, setNewCustomerRegion] = useState("华东");
  const [touched, setTouched] = useState(false);

  // 打开时初始化
  useEffect(() => {
    if (open) {
      setName(editTarget?.opportunity.name ?? "");
      setCustomerId(editTarget ? String(editTarget.opportunity.customerId) : "");
      setAmount(editTarget ? String(editTarget.opportunity.amount) : "");
      setProbability(editTarget ? String(editTarget.opportunity.probability) : "10");
      setSource(editTarget?.opportunity.source ?? "");
      setExpectedClose(editTarget?.opportunity.expectedClose ?? "");
      setNote(editTarget?.opportunity.note ?? "");
      setNewCustomerName("");
      setTouched(false);
    }
  }, [open, editTarget]);

  const createCustomer = trpc.crm.customers.create.useMutation();
  const createOpp = trpc.crm.opportunities.create.useMutation({
    onSuccess: () => {
      toast.success("商机已创建");
      utils.crm.opportunities.list.invalidate();
      utils.crm.customers.list.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateOpp = trpc.crm.opportunities.update.useMutation({
    onSuccess: () => {
      toast.success("商机已更新");
      utils.crm.opportunities.list.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const amountNum = Number(amount);
  const valid =
    name.trim().length > 0 &&
    (isEdit || customerId === "new" || customerId !== "") &&
    (customerId !== "new" || newCustomerName.trim().length > 0) &&
    amount !== "" &&
    !Number.isNaN(amountNum) &&
    amountNum >= 0;

  async function submit() {
    setTouched(true);
    if (!valid) return;
    if (isEdit) {
      updateOpp.mutate({
        id: editTarget!.opportunity.id,
        name: name.trim(),
        amount: amountNum,
        probability: Number(probability) || 0,
        source: source || undefined,
        expectedClose: expectedClose || undefined,
        note: note || undefined,
      });
      return;
    }
    let cid = Number(customerId);
    if (customerId === "new") {
      const created = await createCustomer.mutateAsync({
        name: newCustomerName.trim(),
        region: newCustomerRegion as "华东" | "华北" | "华南" | "西南" | "其他",
      });
      if (!created?.id) {
        toast.error("客户创建失败");
        return;
      }
      cid = created.id;
    }
    createOpp.mutate({
      name: name.trim(),
      customerId: Number(cid),
      amount: amountNum,
      probability: Number(probability) || 0,
      source: source || undefined,
      expectedClose: expectedClose || undefined,
      note: note || undefined,
    });
  }

  const submitting = createOpp.isPending || updateOpp.isPending || createCustomer.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑商机" : "新建商机"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="商机名称" required error={touched && !name.trim() ? "请输入商机名称" : undefined}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：汇丰食品 · 溯源质检系统"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="客户" required>
              <Select value={customerId} onValueChange={setCustomerId} disabled={isEdit}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择客户" />
                </SelectTrigger>
                <SelectContent>
                  {!isEdit && (
                    <SelectItem value="new">+ 新建客户</SelectItem>
                  )}
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="预计成交金额"
              required
              error={
                touched && (amount === "" || Number.isNaN(amountNum) || amountNum < 0)
                  ? "请输入有效金额"
                  : undefined
              }
            >
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  万元
                </span>
              </div>
            </Field>
          </div>
          {customerId === "new" && !isEdit && (
            <div className="grid grid-cols-2 gap-4 rounded-md border border-dashed border-border p-3">
              <Field label="新客户名称" required>
                <Input
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="客户公司全称"
                />
              </Field>
              <Field label="区域">
                <Select value={newCustomerRegion} onValueChange={setNewCustomerRegion}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["华东", "华北", "华南", "西南", "其他"].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="赢率">
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={probability}
                  onChange={(e) => setProbability(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </Field>
            <Field label="预计成交日期">
              <Input
                type="date"
                value={expectedClose}
                onChange={(e) => setExpectedClose(e.target.value)}
              />
            </Field>
          </div>
          <Field label="来源">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择来源" />
              </SelectTrigger>
              <SelectContent>
                {["老客户转介绍", "官网咨询", "展会活动", "渠道伙伴", "陌生拜访", "其他"].map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="备注">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="需求要点、关键人、竞争情况…"
              rows={3}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "提交中…" : isEdit ? "保存修改" : "创建商机"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-emerald-400">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ============ 详情抽屉 ============ */
function OpportunityDetail({
  id,
  onClose,
  onEdit,
  onOpenProject,
}: {
  id: number | null;
  onClose: () => void;
  onEdit: (row: OpportunityLike) => void;
  onOpenProject: (projectId: number) => void;
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.crm.opportunities.byId.useQuery(
    { id: id ?? 0 },
    { enabled: id !== null },
  );
  const setStage = trpc.crm.opportunities.setStage.useMutation({
    onSuccess: () => {
      toast.success("阶段已更新");
      utils.crm.opportunities.byId.invalidate();
      utils.crm.opportunities.list.invalidate();
      utils.crm.dashboard.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteOpp = trpc.crm.opportunities.delete.useMutation({
    onSuccess: () => {
      toast.success("商机已删除");
      utils.crm.opportunities.list.invalidate();
      utils.crm.dashboard.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const next = data ? NEXT_STAGES[data.opportunity.stage] : undefined;
  const o = data?.opportunity;

  return (
    <Sheet
      open={id !== null}
      onOpenChange={(v) => {
        if (!v) {
          setLostOpen(false);
          setConfirmDelete(false);
          onClose();
        }
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-[480px]">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`led ${
                !o
                  ? "led-idle"
                  : o.stage === "won"
                    ? "led-ok"
                    : o.stage === "lost"
                      ? "led-critical"
                      : "led-warn"
              }`}
              aria-hidden
            />
            <SheetTitle className="text-left leading-snug">
              {o?.name ?? "商机详情"}
            </SheetTitle>
          </div>
        </SheetHeader>
        {isLoading || !data || !o ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            加载中…
          </div>
        ) : (
          <>

            <div className="mb-5 grid grid-cols-3 gap-2">
              <StatBox label="预计金额" value={fmtAmount(o.amount)} />
              <StatBox label="当前阶段" value={STAGE_META[o.stage].label} tint={STAGE_META[o.stage].tint} />
              <StatBox label="赢率" value={`${o.probability}%`} />
              <StatBox label="客户" value={data.customerName} />
              <StatBox label="区域" value={data.customerRegion} />
              <StatBox label="预计成交" value={fmtDate(o.expectedClose)} />
              {data.customerContact && (
                <StatBox label="联系人" value={data.customerContact} />
              )}
              {data.customerPhone && (
                <StatBox label="电话" value={data.customerPhone} />
              )}
              {o.source && <StatBox label="来源" value={o.source} />}
            </div>

            {/* 阶段操作 */}
            {o.stage !== "won" && o.stage !== "lost" && (
              <div className="mb-5 flex flex-col gap-2">
                {next && (
                  <Button
                    className="w-full"
                    disabled={setStage.isPending}
                    onClick={() =>
                      setStage.mutate({
                        id: o.id,
                        stage: next,
                        note: `推进至「${STAGE_META[next].label}」`,
                      })
                    }
                  >
                    推进到「{STAGE_META[next].label}」阶段
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setLostOpen(true)}
                  >
                    标记流失
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      onEdit({
                        opportunity: o,
                        customerName: data.customerName,
                        customerRegion: data.customerRegion,
                      })
                    }
                  >
                    编辑
                  </Button>
                </div>
              </div>
            )}
            {o.stage === "won" && (
              <div className="mb-5 flex flex-col gap-2">
                {data.project ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onOpenProject(data.project!.id)}
                  >
                    查看关联项目
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                ) : (
                  <CreateProjectFromOpp
                    name={o.name}
                    opportunityId={o.id}
                    customerId={o.customerId}
                  />
                )}
              </div>
            )}

            {o.note && (
              <div className="mb-5 rounded-md border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
                {o.note}
              </div>
            )}
            {o.lostReason && (
              <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-rose-300">
                流失原因:{o.lostReason}
              </div>
            )}

            {/* 流转时间线 */}
            <p className="label-caps font-data mb-3">跟进时间线</p>
            <div className="relative flex flex-col gap-0 border-l border-border pl-4">
              {data.events.map((e, i) => (
                <div key={e.event.id} className="relative pb-4 last:pb-0">
                  <span
                    className={`absolute -left-[21.5px] top-1.5 led ${
                      e.event.toStage === "won"
                        ? "led-ok"
                        : e.event.toStage === "lost"
                          ? "led-critical"
                          : i === 0
                            ? "led-warn led-pulse"
                            : "led-idle"
                    }`}
                    aria-hidden
                  />
                  <p className="text-sm">
                    {e.event.fromStage ? (
                      <>
                        <span className="text-muted-foreground">
                          {STAGE_META[e.event.fromStage].label}
                        </span>
                        <span className="mx-1.5 text-muted-foreground">→</span>
                      </>
                    ) : null}
                    <span className={e.event.toStage ? STAGE_META[e.event.toStage].tint : ""}>
                      {e.event.toStage ? STAGE_META[e.event.toStage].label : "更新"}
                    </span>
                  </p>
                  {e.event.note && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {e.event.note}
                    </p>
                  )}
                  <p className="font-data mt-0.5 text-[11px] text-muted-foreground">
                    {e.userName ?? "系统"} · {relTime(e.event.createdAt)}
                  </p>
                </div>
              ))}
            </div>

            {/* 危险区 */}
            <div className="mt-6 border-t border-border pt-4">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-xs text-muted-foreground">
                    确认删除该商机？此操作不可恢复。
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteOpp.mutate({ id: o.id })}
                    disabled={deleteOpp.isPending}
                  >
                    确认删除
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    取消
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  删除此商机
                </button>
              )}
            </div>

            {/* 流失对话框 */}
            <Dialog open={lostOpen} onOpenChange={setLostOpen}>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>标记为流失</DialogTitle>
                </DialogHeader>
                <Field label="流失原因">
                  <Textarea
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)}
                    placeholder="例：预算冻结 / 选择竞对 / 需求取消…"
                    rows={3}
                  />
                </Field>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setLostOpen(false)}>
                    取消
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={setStage.isPending}
                    onClick={() => {
                      setStage.mutate(
                        { id: o.id, stage: "lost", lostReason },
                        { onSuccess: () => setLostOpen(false) },
                      );
                    }}
                  >
                    确认流失
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StatBox({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 truncate text-sm font-medium ${tint ?? ""}`}>
        {value}
      </p>
    </div>
  );
}

function CreateProjectFromOpp({
  name,
  opportunityId,
  customerId,
}: {
  name: string;
  opportunityId: number;
  customerId: number;
}) {
  const utils = trpc.useUtils();
  const createProject = trpc.crm.projects.create.useMutation({
    onSuccess: (r) => {
      toast.success("项目已创建");
      utils.crm.projects.list.invalidate();
      window.location.href = `/projects/${r.id}`;
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Button
      className="w-full"
      disabled={createProject.isPending}
      onClick={() =>
        createProject.mutate({ name, opportunityId, customerId })
      }
    >
      <RotateCcw className="mr-1.5 h-4 w-4" />
      成交转项目
    </Button>
  );
}
