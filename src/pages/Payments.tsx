import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ProgressBar } from "@/components/charts";
import { Plus, ChevronDown, BadgeCheck, Clock } from "lucide-react";
import { fmtAmount, fmtDate } from "@/lib/format";

export default function Payments() {
  const { data, isLoading } = trpc.crm.contracts.list.useQuery();
  const [contractOpen, setContractOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const rows = data ?? [];
  const summary = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.contract.totalAmount, 0);
    const received = rows.reduce((s, r) => s + r.received, 0);
    const pending = rows
      .flatMap((r) => r.payments)
      .filter((p) => !p.received)
      .reduce((s, p) => s + p.amount, 0);
    return { total, received, pending, rate: total > 0 ? received / total : 0 };
  }, [rows]);

  return (
    <div>
      <PageHeader
        caps="Payments"
        title="回款管理"
        desc="合同台账与回款计划，登记每一笔到账"
        actions={
          <Button onClick={() => setContractOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> 新建合同
          </Button>
        }
      />

      {/* KPI */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="panel p-4">
          <p className="label-caps">合同总额</p>
          <p className="font-data mt-1.5 text-xl font-semibold md:text-2xl">
            {fmtAmount(summary.total)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="label-caps">已回款</p>
          <p className="font-data mt-1.5 text-xl font-semibold text-emerald-300 md:text-2xl">
            {fmtAmount(summary.received)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="label-caps">待回款</p>
          <p className="font-data mt-1.5 text-xl font-semibold text-amber-300 md:text-2xl">
            {fmtAmount(summary.pending)}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="panel h-28 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 py-14">
          <p className="text-sm text-muted-foreground">
            暂无合同台账，点击右上角新建
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const isOpen = expanded.has(r.contract.id);
            return (
              <Collapsible
                key={r.contract.id}
                open={isOpen}
                onOpenChange={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(r.contract.id)) next.delete(r.contract.id);
                    else next.add(r.contract.id);
                    return next;
                  })
                }
              >
                <div className="panel">
                  <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center gap-3 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[15px] font-medium">
                            {r.contract.title}
                          </p>
                          <span className="font-data shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {r.contract.contractNo}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {r.projectName ?? r.contract.customerName} · 签约{" "}
                          {fmtDate(r.contract.signedDate)}
                        </p>
                      </div>
                      <div className="hidden w-40 shrink-0 sm:block">
                        <ProgressBar
                          value={r.rate * 100}
                          color={
                            r.rate >= 0.6
                              ? "hsl(var(--ok))"
                              : r.rate >= 0.3
                                ? "hsl(var(--warn))"
                                : "hsl(var(--critical))"
                          }
                          height={6}
                        />
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-data text-sm">
                          <span className="text-emerald-300">
                            {fmtAmount(r.received)}
                          </span>
                          <span className="text-muted-foreground">
                            {" / "}
                            {fmtAmount(r.contract.totalAmount)}
                          </span>
                        </p>
                        <p className="font-data text-xs text-muted-foreground">
                          {Math.round(r.rate * 100)}% 已回款
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border p-4">
                      <PaymentPlan
                        contractId={r.contract.id}
                        payments={r.payments}
                        customerName={r.contract.customerName}
                        totalAmount={r.contract.totalAmount}
                      />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      <CreateContractDialog open={contractOpen} onClose={() => setContractOpen(false)} />
    </div>
  );
}

function PaymentPlan({
  contractId,
  payments,
  customerName,
  totalAmount,
}: {
  contractId: number;
  payments: {
    id: number;
    amount: number;
    plannedDate: string | null;
    received: boolean;
    note: string | null;
  }[];
  customerName: string;
  totalAmount: number;
}) {
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const invalidate = () => {
    utils.crm.contracts.list.invalidate();
    utils.crm.dashboard.invalidate();
  };
  const toggle = trpc.crm.payments.toggle.useMutation({
    onSuccess: () => {
      toast.success("回款状态已更新");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.crm.payments.delete.useMutation({
    onSuccess: () => {
      toast.success("已删除");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const create = trpc.crm.payments.create.useMutation({
    onSuccess: () => {
      toast.success("回款计划已添加");
      invalidate();
      setAddOpen(false);
      setAmount("");
      setDate("");
      setNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const plannedTotal = payments.reduce((s, p) => s + p.amount, 0);
  const gap = totalAmount - plannedTotal;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="label-caps font-data">回款计划 · {payments.length} 期</p>
        <div className="flex items-center gap-3">
          {gap > 0.001 && (
            <span className="font-data text-xs text-amber-300">
              尚有 {fmtAmount(gap)} 未排期
            </span>
          )}
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> 添加回款期
          </Button>
        </div>
      </div>
      {payments.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          尚未安排回款计划
        </p>
      ) : (
        <div className="flex flex-col">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0"
            >
              <button
                onClick={() => toggle.mutate({ id: p.id })}
                aria-label={p.received ? "标记为未到账" : "确认到账"}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {p.received ? (
                  <BadgeCheck className="h-5 w-5 text-emerald-300" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-data text-sm ${
                    p.received ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {fmtAmount(p.amount)}
                </p>
                <p className="font-data text-xs text-muted-foreground">
                  计划 {fmtDate(p.plannedDate)}
                  {p.note ? ` · ${p.note}` : ""}
                  {p.received ? " · 已到账" : ""}
                </p>
              </div>
              <button
                onClick={() => remove.mutate({ id: p.id })}
                aria-label="删除回款计划"
                className="flex h-11 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>添加回款期 · {customerName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">金额（万元）</Label>
              <Input
                type="number"
                min={0.01}
                step="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={gap > 0 ? `未排期余额 ${gap.toFixed(1)}` : "0.0"}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">计划到账日期</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">备注</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例：验收款 / 尾款"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              取消
            </Button>
            <Button
              disabled={!amount || Number(amount) <= 0 || create.isPending}
              onClick={() =>
                create.mutate({
                  contractId,
                  amount: Number(amount),
                  plannedDate: date || undefined,
                  note: note || undefined,
                })
              }
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateContractDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: projects } = trpc.crm.projects.list.useQuery();
  const [contractNo, setContractNo] = useState("");
  const [title, setTitle] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [amount, setAmount] = useState("");
  const [signedDate, setSignedDate] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setContractNo("");
      setTitle("");
      setCustomerName("");
      setProjectId("");
      setAmount("");
      setSignedDate("");
      setTouched(false);
    }
  }, [open]);

  const create = trpc.crm.contracts.create.useMutation({
    onSuccess: () => {
      toast.success("合同已创建");
      utils.crm.contracts.list.invalidate();
      utils.crm.dashboard.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const valid =
    contractNo.trim() && title.trim() && customerName.trim() &&
    amount !== "" && Number(amount) >= 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>新建合同</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                合同编号<span className="ml-0.5 text-emerald-400">*</span>
              </Label>
              <Input
                value={contractNo}
                onChange={(e) => setContractNo(e.target.value)}
                placeholder="HT-2026-000"
                className="font-data"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">签约日期</Label>
              <Input
                type="date"
                value={signedDate}
                onChange={(e) => setSignedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              合同名称<span className="ml-0.5 text-emerald-400">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：溯源质检系统建设合同"
            />
            {touched && !title.trim() && (
              <p className="text-xs text-destructive">请输入合同名称</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                客户名称<span className="ml-0.5 text-emerald-400">*</span>
              </Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="客户公司全称"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                合同金额（万元）<span className="ml-0.5 text-emerald-400">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">关联项目（可选）</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择项目" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((p) => (
                  <SelectItem key={p.project.id} value={String(p.project.id)}>
                    {p.project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            disabled={!valid || create.isPending}
            onClick={() => {
              setTouched(true);
              if (!valid) return;
              create.mutate({
                contractNo: contractNo.trim(),
                title: title.trim(),
                customerName: customerName.trim(),
                projectId: projectId ? Number(projectId) : undefined,
                totalAmount: Number(amount),
                signedDate: signedDate || undefined,
              });
            }}
          >
            {create.isPending ? "创建中…" : "创建合同"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
