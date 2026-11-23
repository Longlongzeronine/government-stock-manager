import { createServerFn } from "@tanstack/react-start";
import { writeAuditEvent } from "@/lib/audit.server";

export const signInDeveloper = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { createDeveloperSession } =
      await import("./developer-session.server");
    const result = await createDeveloperSession(data.username, data.password);
    if (!result.error && result.username) {
      try {
        await writeAuditEvent({
          actorId: `developer:${result.username}`,
          actorEmail: result.username,
          action: "developer_login",
          tableName: "authentication",
          payload: { event: "login", mode: "developer", actor_name: result.username },
        });
      } catch (error) {
        console.error("Could not record developer login audit event", error);
      }
    }
    return result;
  });

export const getDeveloperSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const { clearDeveloperSession, readDeveloperSession } =
      await import("./developer-session.server");
    const session = await readDeveloperSession();
    if (!session) clearDeveloperSession();
    return session ? { username: session.username } : null;
  },
);

export const signOutDeveloper = createServerFn({ method: "POST" }).handler(
  async () => {
    const { clearDeveloperSession, readDeveloperSession } =
      await import("./developer-session.server");
    const session = await readDeveloperSession();
    if (session) {
      try {
        await writeAuditEvent({
          actorId: `developer:${session.username}`,
          actorEmail: session.username,
          action: "developer_logout",
          tableName: "authentication",
          payload: { event: "logout", mode: "developer", actor_name: session.username },
        });
      } catch (error) {
        console.error("Could not record developer logout audit event", error);
      }
    }
    clearDeveloperSession();
    return { success: true };
  },
);
