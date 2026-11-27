import { Button } from "@/components/ui/button";
import { Radar } from "lucide-react";

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="panel flex w-full max-w-sm flex-col items-center gap-6 p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/40 bg-primary/15">
            <Radar className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">商脉</h1>
            <p className="font-data mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Opportunity OS
            </p>
          </div>
        </div>
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          商机与项目跟踪系统
          <br />
          登录后数据将保存在云端，跨设备同步
        </p>
        <Button
          className="w-full"
          size="lg"
          onClick={() => {
            window.location.href = getOAuthUrl();
          }}
        >
          使用 Kimi 账号登录
        </Button>
      </div>
    </div>
  );
}
