import { useEffect, useState } from "react";
import { Link } from "react-router";
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
import { ProgressBar } from "@/components/charts";
import { Plus, ArrowUpRight } from "lucide-react";
import { fmtAmount, fmtDate, PROJECT_STATUS_META } from "@/lib/format";
import type { PROJECT_STATUSES } from "@db/schema";

const STATUS_TABS: { key: (typeof PROJECT_STATUSES)[number] | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "at_risk", label: "有风险" },
  { key: "delayed", label: "已延期" },
  { key: "done", label: "已交付" },
];

export default function Projects() {
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["key"]>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = trpc.crm.projects.list.useQuery();

  const rows = (data ?? []).filter((r) => tab === "all" || r.project.status === tab);

  const counts = (key: (typeof STATUS_TABS)[number]["key"]) =>
    key === "all"
      ? (data ?? []).length
      : (data ?? []).filter((r) => r.project.status === key).length;

  return (
    <div>
      <PageHeader
        caps="Projects"
        title="项目跟踪"
        desc="成交商机的交付落地：里程碑、任务与进度健康度"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> 新建项目
          </Button>
        }
      />

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tab === t.key
                ? "border-primary/40 bg-primary/20 text-emerald-300"
                : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span className="font-data text-xs opacity-70">{counts(t.key)}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="panel h-44 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 py-14">
          <p className="text-sm text-muted-foreground">暂无项目</p>
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            创建第一个项目
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => {
            const p = r.project;
            const meta = PROJECT_STATUS_META[p.status];
            const msPct =
              r.milestones.total > 0
                ? Math.round((r.milestones.done / r.milestones.total) * 100)
                : 0;
            const taskPct =
              r.tasks.total > 0
                ? Math.round((r.tasks.done / r.tasks.total) * 100)
                : 0;
            const overdue =
              p.endDate && p.status !== "done" && p.endDate < new Date().toISOString().slice(0, 10);
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="panel group flex flex-col gap-3 p-4 transition-colors hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`led ${meta.led} ${p.status === "active" ? "led-pulse" : ""}`} aria-hidden />
                    <p className="min-w-0 truncate text-[15px] font-medium leading-snug transition-colors group-hover:text-emerald-300">
                      {p.name}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{r.customerName ?? "—"}</span>
                  <span className="font-data ml-auto text-sm font-semibold text-emerald-300">
                    {fmtAmount(p.contractAmount)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-xs text-muted-foreground">
                      里程碑
                    </span>
                    <div className="flex-1">
                      <ProgressBar value={msPct} color="hsl(199 89% 60%)" />
                    </div>
                    <span className="font-data w-10 text-right text-xs">
                      {r.milestones.done}/{r.milestones.total}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-xs text-muted-foreground">
                      任务
                    </span>
                    <div className="flex-1">
                      <ProgressBar
                        value={taskPct}
                        color={
                          p.status === "delayed"
                            ? "hsl(var(--critical))"
                            : p.status === "at_risk"
                              ? "hsl(var(--warn))"
                              : "hsl(var(--ok))"
                        }
                      />
                    </div>
                    <span className="font-data w-10 text-right text-xs">
                      {r.tasks.done}/{r.tasks.total}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                  <span>
                    {meta.label}
                    {overdue && (
                      <span className="ml-2 text-rose-400">已超期</span>
                    )}
                  </span>
                  <span className="font-data">
                    {fmtDate(p.startDate)} ~ {fmtDate(p.endDate)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <CreateProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

export function CreateProjectDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: customers } = trpc.crm.customers.list.useQuery();
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [desc, setDesc] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setCustomerId("");
      setAmount("");
      setStartDate("");
      setEndDate("");
      setDesc("");
      setTouched(false);
    }
  }, [open]);

  const createProject = trpc.crm.projects.create.useMutation({
    onSuccess: () => {
      toast.success("项目已创建");
      utils.crm.projects.list.invalidate();
      utils.crm.dashboard.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const amountNum = Number(amount);
  const valid =
    name.trim().length > 0 &&
    amount !== "" &&
    !Number.isNaN(amountNum) &&
    amountNum >= 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>新建项目</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              项目名称<span className="ml-0.5 text-emerald-400">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：汇丰食品 · 溯源质检系统"
            />
            {touched && !name.trim() && (
              <p className="text-xs text-destructive">请输入项目名称</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">关联客户</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择客户（可选）" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                合同金额<span className="ml-0.5 text-emerald-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  万元
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">开始日期</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">交付日期</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">项目说明</Label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="交付范围、关键约束…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            disabled={createProject.isPending}
            onClick={() => {
              setTouched(true);
              if (!valid) return;
              createProject.mutate({
                name: name.trim(),
                customerId: customerId ? Number(customerId) : undefined,
                contractAmount: amountNum,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                description: desc || undefined,
              });
            }}
          >
            {createProject.isPending ? "创建中…" : "创建项目"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
