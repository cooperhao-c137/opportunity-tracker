import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Gauge,
  Target,
  FolderKanban,
  Banknote,
  LogOut,
  Menu,
  Radar,
} from "lucide-react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { AuthLayoutSkeleton } from "./AuthLayoutSkeleton";
import { Button } from "./ui/button";

export const NAV_ITEMS = [
  { icon: Gauge, label: "经营驾驶舱", path: "/" },
  { icon: Target, label: "商机管理", path: "/opportunities" },
  { icon: FolderKanban, label: "项目跟踪", path: "/projects" },
  { icon: Banknote, label: "回款管理", path: "/payments" },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/15">
        <Radar className="h-4 w-4 text-emerald-400" />
      </div>
      <div className="leading-none">
        <p className="text-[15px] font-semibold tracking-wide">商脉</p>
        <p className="mt-1 font-data text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Opportunity&nbsp;OS
        </p>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path);
        return (
          <button
            key={item.path}
            onClick={() => {
              navigate(item.path);
              onNavigate?.();
            }}
            className={`flex min-h-[44px] items-center gap-3 rounded-md border border-transparent px-3 text-left text-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive
                ? "border-primary/30 bg-primary/15 text-emerald-300"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
            {isActive && (
              <span className="led led-ok led-pulse ml-auto" aria-hidden />
            )}
          </button>
        );
      })}
    </nav>
  );
}

function UserFooter() {
  const { user, logout } = useAuth();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-md border border-border bg-secondary/40 px-2.5 py-2 text-left transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-8 w-8 shrink-0 border border-border">
            <AvatarFallback className="bg-primary/20 text-xs font-medium text-emerald-300">
              {user?.name?.charAt(0).toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">
              {user?.name || "-"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email || "-"}
            </p>
          </div>
          <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { isLoading, user } = useAuth();
  const isMobile = useIsMobile();

  if (isLoading) {
    return <AuthLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex w-full max-w-md flex-col items-center gap-8 p-8">
          <div className="flex flex-col items-center gap-4">
            <Brand />
            <h1 className="text-xl font-semibold tracking-tight">
              登录后继续
            </h1>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              商机与项目跟踪系统需要登录后使用，数据将保存在云端并跨设备同步。
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = "/login";
            }}
            size="lg"
            className="w-full"
          >
            使用 Kimi 账号登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* 桌面端左侧导航轨 */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col border-r border-sidebar-border bg-sidebar">
          <div className="hairline-b flex h-16 items-center px-4">
            <Brand />
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <NavList />
          </div>
          <div className="hairline-b p-3">
            <UserFooter />
          </div>
        </aside>
      )}

      {/* 移动端顶栏 */}
      {isMobile && (
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0"
                aria-label="打开导航菜单"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="hairline-b flex h-16 flex-row items-center px-4">
                <SheetTitle className="text-left">
                  <Brand />
                </SheetTitle>
              </SheetHeader>
              <div className="flex h-full flex-col p-3">
                <NavList />
                <div className="mt-auto pb-6">
                  <UserFooter />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <MobileTitle />
        </header>
      )}

      <div
        className={
          isMobile ? "pb-20" : "pl-[232px]"
        }
      >
        <main className="mx-auto max-w-[1440px] p-4 md:p-6">{children}</main>
      </div>

      {/* 移动端底部标签栏 */}
      {isMobile && <MobileTabBar />}
    </div>
  );
}

function MobileTitle() {
  const location = useLocation();
  const item = NAV_ITEMS.find((i) =>
    i.path === "/" ? location.pathname === "/" : location.pathname.startsWith(i.path),
  );
  return (
    <div className="flex items-center gap-2">
      <span className="led led-ok led-pulse" aria-hidden />
      <p className="text-[15px] font-medium tracking-wide">
        {location.pathname.startsWith("/projects/")
          ? "项目详情"
          : (item?.label ?? "商脉")}
      </p>
    </div>
  );
}

function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 text-[10px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring insets-y ${
                isActive
                  ? "text-emerald-300"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
