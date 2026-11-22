import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "./integrations/supabase/client";

import { renderErrorPage } from "./lib/error-page";
import { ACCESS_PRESETS, canAccess, isAccessSchemaUnavailable, normalizeAccess, SERVER_FUNCTION_ACCESS } from "./lib/access-control";

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

    // The separately authenticated developer identity is intentionally scoped
    // to server functions through the same central middleware. Supabase account
    // administration still requires a Supabase access token in its handler.
    if (developerIdentity) return next();

    {
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
        .select("status,disabled")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw new Error("Could not verify account status.");
      if (["pending", "declined", "disabled"].includes(profile?.status ?? "") || profile?.disabled) {
        throw new Error("Account is not approved for access.");
      }

      const requirements = SERVER_FUNCTION_ACCESS[serverFnMeta.name];
      if (!requirements?.length) {
        console.error(`Access map missing for server function: ${serverFnMeta.name}`);
        throw Object.assign(new Error("Forbidden: this operation is not registered in the access-control map."), { statusCode: 403 });
      }
      const { data: rawAccess, error: accessError } = await client.rpc("get_my_access");
      let access;
      if (accessError) {
        if (!isAccessSchemaUnavailable(accessError)) throw new Error(`Could not verify account access: ${accessError.message}`);
        const { data: legacyRoles, error: rolesError } = await client.from("user_roles").select("role").eq("user_id", user.id);
        if (rolesError) throw new Error("Could not verify bootstrap account permissions.");
        const isLegacyAdministrator = (legacyRoles ?? []).some((row: { role: string }) => row.role === "admin" || row.role === "super_admin");
        access = isLegacyAdministrator ? normalizeAccess(ACCESS_PRESETS.admin.access) : { dashboard: ["view"] };
      } else {
        access = normalizeAccess(rawAccess);
      }
      const allowed = requirements.some((requirement) =>
        canAccess(access, requirement.module, requirement.action ?? "view"),
      );
      if (!allowed) {
        const expected = requirements.map((requirement) => `${requirement.module}.${requirement.action ?? "view"}`).join(" or ");
        throw Object.assign(new Error(`Forbidden: ${expected} permission required.`), { statusCode: 403 });
      }
    }
    return next();
  });

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [inventoryAuthMiddleware],
}));
