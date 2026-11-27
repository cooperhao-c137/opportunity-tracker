import type { ReactNode } from "react";

export default function PageHeader({
  caps,
  title,
  desc,
  actions,
}: {
  caps: string;
  title: string;
  desc?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="label-caps font-data">{caps}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
          {title}
        </h1>
        {desc && (
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
