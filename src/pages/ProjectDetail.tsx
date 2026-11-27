import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Flag,
  CircleDollarSign,
} from "lucide-react";
import type { PROJECT_STATUSES } from "@db/schema";
import { fmtAmount, fmtDate, todayStr, PROJECT_STATUS_META } from "@/lib/format";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = Number(id);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.crm.projects.byId.useQuery(
    { id: projectId },
    { enabled: Number.isInteger(projectId) && projectId > 0 },
  );

  const updateProject = trpc.crm.projects.update.useMutation({
    onSuccess: () => {
      toast.success("项目已更新");
      utils.crm.projects.byId.invalidate();
      utils.crm.projects.list.invalidate();
      utils.crm.dashboard.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteProject = trpc.crm.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("项目已删除");
      utils.crm.projects.list.invalidate();
      utils.crm.dashboard.invalidate();
      navigate("/projects");
    },
    onError: (e) => toast.error(e.message),
  });

  const [msOpen, setMsOpen] = useState(false);
  const [msTitle, setMsTitle] = useState("");
  const [msDue, setMsDue] = useState("");
  const [taskOpen, setTaskOpen] = useState<{ milestoneId: number | null } | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const createMs = trpc.crm.milestones.create.useMutation({
    onSuccess: () => {
      toast.success("里程碑已添加");
      utils.crm.projects.byId.invalidate();
      utils.crm.projects.list.invalidate();
      setMsOpen(false);
      setMsTitle("");
      setMsDue("");
    },
    onError: (e) => toast.error(e.message),
  });
  const toggleMs = trpc.crm.milestones.toggle.useMutation({
    onSuccess: () => {
      utils.crm.projects.byId.invalidate();
      utils.crm.projects.list.invalidate();
      utils.crm.dashboard.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMs = trpc.crm.milestones.delete.useMutation({
    onSuccess: () => {
      toast.success("里程碑已删除");
      utils.crm.projects.byId.invalidate();
      utils.crm.projects.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const createTask = trpc.crm.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("任务已添加");
      utils.crm.projects.byId.invalidate();
      utils.crm.projects.list.invalidate();
      setTaskOpen(null);
      setTaskTitle("");
      setTaskAssignee("");
      setTaskDue("");
    },
    onError: (e) => toast.error(e.message),
  });
  const toggleTask = trpc.crm.tasks.toggle.useMutation({
    onSuccess: () => {
      utils.crm.projects.byId.invalidate();
      utils.crm.projects.list.invalidate();
      utils.crm.dashboard.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteTask = trpc.crm.tasks.delete.useMutation({
    onSuccess: () => {
      utils.crm.projects.byId.invalidate();
      utils.crm.projects.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="panel h-64 animate-pulse" />;
  }
  if (!data) {
    return (
      <div className="panel flex flex-col items-center gap-4 py-16">
        <p className="text-muted-foreground">项目不存在或已被删除</p>
        <Link to="/projects">
          <Button variant="outline">返回项目列表</Button>
        </Link>
      </div>
    );
  }

  const p = data.project;
  const meta = PROJECT_STATUS_META[p.status];
  const allTasks = [
    ...data.milestones.flatMap((m) => m.tasks),
    ...data.looseTasks,
  ];
  const taskTotal = allTasks.length;
  const taskDone = allTasks.filter((t) => t.done).length;
  const taskPct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
  const msTotal = data.milestones.length;
  const msDone = data.milestones.filter((m) => m.done).length;
  const today = todayStr();

  return (
    <div>
      <button
        onClick={() => navigate("/projects")}
        className="mb-4 flex h-9 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" /> 返回项目列表
      </button>

      {/* 项目头 */}
      <div className="panel mb-4 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`led ${meta.led} ${p.status === "active" ? "led-pulse" : ""}`} aria-hidden />
              <h1 className="text-xl font-semibold tracking-tight">{p.name}</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.customerName ?? "未关联客户"}
              {data.customerRegion ? ` · ${data.customerRegion}` : ""}
              {data.opportunity ? (
                <>
                  {" · "}来源商机：
                  <Link
                    to="/opportunities"
                    className="text-emerald-300 hover:underline"
                  >
                    {data.opportunity.name}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={p.status}
              onValueChange={(v) =>
                updateProject.mutate({
                  id: p.id,
                  status: v as (typeof PROJECT_STATUSES)[number],
                })
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["active", "at_risk", "delayed", "done"] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              编辑
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <HeadStat label="合同金额" value={fmtAmount(p.contractAmount)} />
          <HeadStat label="周期" value={`${fmtDate(p.startDate)} ~ ${fmtDate(p.endDate)}`} small />
          <HeadStat label="里程碑" value={`${msDone} / ${msTotal}`} />
          <HeadStat label="任务完成" value={`${taskPct}%`} tint={taskPct >= 60 ? "text-emerald-300" : taskPct >= 30 ? "text-amber-300" : "text-rose-300"} />
        </div>

        {p.description && (
          <p className="mt-4 border-t border-border/60 pt-3 text-sm text-muted-foreground">
            {p.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* 里程碑 */}
        <section className="panel p-4 md:p-5 xl:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <p className="label-caps font-data">里程碑 · {msDone}/{msTotal}</p>
            <Button size="sm" variant="outline" onClick={() => setMsOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> 添加里程碑
            </Button>
          </div>
          {data.milestones.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              暂无里程碑，点击右上角添加
            </p>
          ) : (
            <div className="flex flex-col">
              {data.milestones.map((m) => {
                const mTasks = m.tasks;
                const mDone = mTasks.filter((t) => t.done).length;
                const overdueMs = !m.done && m.dueDate && m.dueDate < today;
                return (
                  <div
                    key={m.id}
                    className="border-b border-border/60 py-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleMs.mutate({ id: m.id })}
                        aria-label={m.done ? "标记为未完成" : "标记为完成"}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                            m.done
                              ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                              : "border-border text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${
                            m.done
                              ? "text-muted-foreground line-through"
                              : overdueMs
                                ? "text-rose-300"
                                : ""
                          }`}
                        >
                          {m.title}
                        </p>
                        <p className="font-data text-xs text-muted-foreground">
                          {m.done
                            ? "已完成"
                            : `截止 ${fmtDate(m.dueDate)}${
                                overdueMs ? " · 已逾期" : ""
                              }`}
                          {mTasks.length > 0 && ` · ${mDone}/${mTasks.length} 任务`}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setTaskOpen({ milestoneId: m.id })
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="添加任务"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteMs.mutate({ id: m.id })}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="删除里程碑"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {/* 任务 */}
                    {mTasks.length > 0 && (
                      <div className="ml-9 mt-1 flex flex-col">
                        {mTasks.map((t) => (
                          <TaskRow
                            key={t.id}
                            task={t}
                            onToggle={() => toggleTask.mutate({ id: t.id })}
                            onDelete={() => deleteTask.mutate({ id: t.id })}
                            today={today}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 未归组任务 */}
          {data.looseTasks.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="label-caps mb-2">未关联里程碑的任务</p>
              {data.looseTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onToggle={() => toggleTask.mutate({ id: t.id })}
                  onDelete={() => deleteTask.mutate({ id: t.id })}
                  today={today}
                />
              ))}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => setTaskOpen({ milestoneId: null })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> 添加未归组任务
          </Button>
        </section>

        {/* 进度概览 */}
        <section className="panel flex flex-col gap-5 p-4 md:p-5 xl:col-span-5">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="label-caps font-data">整体任务进度</p>
              <span className="font-data text-2xl font-semibold">
                {taskPct}
                <span className="text-sm text-muted-foreground">%</span>
              </span>
            </div>
            <ProgressBar value={taskPct} height={8} />
            <p className="mt-1.5 font-data text-xs text-muted-foreground">
              {taskDone} / {taskTotal} 项任务已完成
            </p>
          </div>

          <div>
            <p className="label-caps font-data mb-3">
              <Flag className="mr-1 inline h-3.5 w-3.5" />
              里程碑完成度
            </p>
            <div className="flex gap-1.5">
              {data.milestones.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleMs.mutate({ id: m.id })}
                  title={m.title}
                  aria-label={`切换 ${m.title}`}
                  className={`h-9 flex-1 rounded-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    m.done
                      ? "bg-emerald-400/70 hover:bg-emerald-400"
                      : "bg-secondary hover:bg-secondary/70"
                  }`}
                />
              ))}
              {data.milestones.length === 0 && (
                <p className="text-sm text-muted-foreground">暂无里程碑</p>
              )}
            </div>
          </div>

          <div>
            <p className="label-caps font-data mb-3">
              <CircleDollarSign className="mr-1 inline h-3.5 w-3.5" />
              关联合同
            </p>
            <ContractPeek projectId={p.id} customerName={data.customerName} />
          </div>

          <div className="mt-auto border-t border-border pt-4">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-muted-foreground">
                  确认删除该项目？里程碑与任务将一并删除。
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteProject.mutate({ id: p.id })}
                  disabled={deleteProject.isPending}
                >
                  确认
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  取消
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                删除此项目
              </button>
            )}
          </div>
        </section>
      </div>

      {/* 里程碑对话框 */}
      <Dialog open={msOpen} onOpenChange={setMsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>添加里程碑</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">名称</Label>
              <Input
                value={msTitle}
                onChange={(e) => setMsTitle(e.target.value)}
                placeholder="例：试点上线"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">截止日期</Label>
              <Input
                type="date"
                value={msDue}
                onChange={(e) => setMsDue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMsOpen(false)}>
              取消
            </Button>
            <Button
              disabled={!msTitle.trim() || createMs.isPending}
              onClick={() =>
                createMs.mutate({
                  projectId: p.id,
                  title: msTitle.trim(),
                  dueDate: msDue || undefined,
                })
              }
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 任务对话框 */}
      <Dialog
        open={taskOpen !== null}
        onOpenChange={(v) => !v && setTaskOpen(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>添加任务</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">任务内容</Label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="例：接口联调"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">负责人</Label>
                <Input
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  placeholder="姓名"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">截止日期</Label>
                <Input
                  type="date"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTaskOpen(null)}>
              取消
            </Button>
            <Button
              disabled={!taskTitle.trim() || createTask.isPending}
              onClick={() =>
                createTask.mutate({
                  projectId: p.id,
                  milestoneId: taskOpen?.milestoneId ?? undefined,
                  title: taskTitle.trim(),
                  assignee: taskAssignee || undefined,
                  dueDate: taskDue || undefined,
                })
              }
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑项目 */}
      <EditProjectDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={p}
        onSave={(values) => updateProject.mutate({ id: p.id, ...values })}
        saving={updateProject.isPending}
      />
    </div>
  );
}

function HeadStat({
  label,
  value,
  tint,
  small,
}: {
  label: string;
  value: string;
  tint?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 truncate font-medium ${small ? "font-data text-xs" : "text-sm"} ${tint ?? ""}`}>
        {value}
      </p>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  today,
}: {
  task: { id: number; title: string; assignee: string | null; dueDate: string | null; done: boolean };
  onToggle: () => void;
  onDelete: () => void;
  today: string;
}) {
  const overdue = !task.done && task.dueDate && task.dueDate < today;
  return (
    <div className="group flex items-center gap-2 py-1.5">
      <button
        onClick={onToggle}
        aria-label={task.done ? "标记为未完成" : "标记为完成"}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded border text-[11px] ${
            task.done
              ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
              : "border-border text-transparent"
          }`}
        >
          ✓
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${
            task.done ? "text-muted-foreground line-through" : ""
          }`}
        >
          {task.title}
        </p>
        <p className="font-data text-[11px] text-muted-foreground">
          {task.assignee ? `${task.assignee} · ` : ""}
          {task.dueDate ? fmtDate(task.dueDate) : "无截止"}
          {overdue && <span className="text-rose-400"> · 已逾期</span>}
        </p>
      </div>
      <button
        onClick={onDelete}
        aria-label="删除任务"
        className="flex h-11 w-8 items-center justify-center text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ContractPeek({
  projectId,
  customerName,
}: {
  projectId: number;
  customerName: string | null;
}) {
  const { data: contracts } = trpc.crm.contracts.list.useQuery();
  const related = (contracts ?? []).filter((c) => c.contract.projectId === projectId);
  if (related.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        暂无关联合同，可在「回款管理」中为「{customerName ?? "该客户"}」新建合同。
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {related.map((c) => (
        <Link
          key={c.contract.id}
          to="/payments"
          className="rounded-md border border-border bg-secondary/40 p-3 transition-colors hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium">
              {c.contract.title}
            </p>
            <span className="font-data text-xs text-muted-foreground">
              {c.contract.contractNo}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar value={c.rate * 100} />
            </div>
            <span className="font-data text-xs">
              {fmtAmount(c.received)} / {fmtAmount(c.contract.totalAmount)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function EditProjectDialog({
  open,
  onClose,
  project,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  project: { name: string; contractAmount: number; startDate: string | null; endDate: string | null; description: string | null };
  onSave: (values: {
    name: string;
    contractAmount: number;
    startDate?: string | null;
    endDate?: string | null;
    description?: string | null;
  }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(project.name);
  const [amount, setAmount] = useState(String(project.contractAmount));
  const [startDate, setStartDate] = useState(project.startDate ?? "");
  const [endDate, setEndDate] = useState(project.endDate ?? "");
  const [desc, setDesc] = useState(project.description ?? "");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>编辑项目</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">项目名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">合同金额（万元）</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">开始日期</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">交付日期</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">项目说明</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button
            disabled={!name.trim() || saving}
            onClick={() =>
              onSave({
                name: name.trim(),
                contractAmount: Number(amount) || 0,
                startDate: startDate || null,
                endDate: endDate || null,
                description: desc || null,
              })
            }
          >
            {saving ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
