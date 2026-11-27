import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../api/router";

export type RouterOutputs = inferRouterOutputs<AppRouter>;

export type OpportunityRow = RouterOutputs["crm"]["opportunities"]["list"][number];
export type OpportunityDetail = NonNullable<
  RouterOutputs["crm"]["opportunities"]["byId"]
>;
export type ProjectRow = RouterOutputs["crm"]["projects"]["list"][number];
export type ProjectDetail = NonNullable<RouterOutputs["crm"]["projects"]["byId"]>;
export type ContractRow = RouterOutputs["crm"]["contracts"]["list"][number];
export type DashboardData = RouterOutputs["crm"]["dashboard"];
