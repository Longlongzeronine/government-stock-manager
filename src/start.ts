import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "./integrations/supabase/client";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const publicServerFunctions = new Set([
  "signInDeveloper",
  "getDeveloperSession",
  "signOutDeveloper",
  "getRisVerification",
]);

const adminOnlyFunctions = new Set([
  "createItem",
  "importItems",
  "updateItem",
  "updateItemMonthlyQuantity",
  "deleteItem",
  "createCategory",
  "updateCategory",
  "deleteCategory",
  "deleteSupplier",
]);

const inventoryAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return next({
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    });
  })
  .server(async ({ next, method, serverFnMeta }) => {
    if (publicServerFunctions.has(serverFnMeta.name)) return next();

    const { readDeveloperSession } =
      await import("./lib/developer-session.server");
    const developerIdentity = await readDeveloperSession();
    let role = developerIdentity ? "admin" : "";

    if (!developerIdentity) {
      const authorization = getRequestHeader("authorization") || "";
      const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
      if (!accessToken) throw new Error("Authentication required.");

      const runtime = globalThis as typeof globalThis & {
        __WORKER_ENV__?: Record<string, unknown>;
        process?: { env?: Record<string, string | undefined> };
      };
      const env = runtime.__WORKER_ENV__ ?? runtime.process?.env ?? {};
      const url = String(
        env.SUPABASE_URL ||
          env.VITE_SUPABASE_URL ||
          import.meta.env.VITE_SUPABASE_URL ||
          "",
      );
      const anonKey = String(
        env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          "",
      );
      if (!url || !anonKey)
        throw new Error("Authentication service is not configured.");

      const client = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
      const {
        data: { user },
        error,
      } = await client.auth.getUser(accessToken);
      if (error || !user) throw new Error("Authentication required.");

      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw new Error("Could not verify account status.");
      if (["pending", "declined", "disabled"].includes(profile?.status ?? "")) {
        throw new Error("Account is not approved for access.");
      }

      const { data: roles, error: rolesError } = await client
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (rolesError) throw new Error("Could not verify account permissions.");
      const roleOrder: Record<string, number> = {
        admin: 1,
        staff: 2,
        accounting: 3,
        viewer: 4,
      };
      role =
        [...(roles ?? [])].sort(
          (left, right) =>
            (roleOrder[left.role] ?? 9) - (roleOrder[right.role] ?? 9),
        )[0]?.role ?? "viewer";
    }

    if (method !== "GET" && role !== "admin" && role !== "staff") {
      throw new Error("Write access required.");
    }
    if (adminOnlyFunctions.has(serverFnMeta.name) && role !== "admin") {
      throw new Error("Admin access required.");
    }
    return next();
  });

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [inventoryAuthMiddleware],
}));
