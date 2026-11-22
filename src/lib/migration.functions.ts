import { createServerFn } from "@tanstack/react-start";

export const listMigrationStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { listMigrationStatusHandler } = await import("@/lib/migration-runner.server");
  return listMigrationStatusHandler();
});

export const runPendingMigrations = createServerFn({ method: "POST" })
  .inputValidator((data: { confirmation: string }) => data)
  .handler(async ({ data }) => {
    const { runPendingMigrationsHandler } = await import("@/lib/migration-runner.server");
    return runPendingMigrationsHandler(data.confirmation);
  });
