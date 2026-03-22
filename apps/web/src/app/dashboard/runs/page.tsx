import { fetchManagedRunsForList } from "@/lib/managed-runs-queries";
import { RunsDashboardClient } from "./runs-dashboard-client";

export default async function RunsPage() {
  const runs = await fetchManagedRunsForList();
  return <RunsDashboardClient runs={runs} />;
}
