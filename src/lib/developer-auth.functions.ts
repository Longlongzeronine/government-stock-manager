import { createServerFn } from "@tanstack/react-start";

export const signInDeveloper = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { createDeveloperSession } =
      await import("./developer-session.server");
    return createDeveloperSession(data.username, data.password);
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
    const { clearDeveloperSession } =
      await import("./developer-session.server");
    clearDeveloperSession();
    return { success: true };
  },
);
