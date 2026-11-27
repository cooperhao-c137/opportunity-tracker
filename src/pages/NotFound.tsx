import { Button } from "@/components/ui/button";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="panel flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center">
        <p className="font-data text-4xl font-semibold tracking-tight text-emerald-300">
          404
        </p>
        <p className="text-sm text-muted-foreground">页面不存在或已被移动</p>
        <Button asChild className="w-full">
          <Link to="/">返回驾驶舱</Link>
        </Button>
      </div>
    </div>
  );
}
