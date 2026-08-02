import { c as createServerRpc } from "./createServerRpc-RASzoWcs.js";
import { a2 as createServerFn } from "./server-DkTiwXTO.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const roles = /* @__PURE__ */ new Set(["viewer", "staff", "accounting", "admin"]);
function assertRole(role) {
  if (!roles.has(role)) throw new Error("Invalid role");
}
async function getAdminClient(accessToken) {
  const {
    createClient
  } = await import("./index-onWpx3op.js");
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://pogmvgqfirovujjwgaqi.supabase.co";
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZ212Z3FmaXJvdnVqandnYXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODEwMTIsImV4cCI6MjA5MzY1NzAxMn0.AcRbtmzW90d4GObiHfhw3Ae360Cc9xxxScEFPJg4F-c";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || void 0;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  const userClient = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
  const adminClient = createClient(url, serviceKey);
  const {
    data: auth,
    error: authError
  } = await userClient.auth.getUser(accessToken);
  if (authError || !auth.user) throw new Error("Unauthorized");
  const {
    data: roleRows,
    error: roleError
  } = await adminClient.from("user_roles").select("role").eq("user_id", auth.user.id);
  if (roleError) throw new Error(roleError.message);
  if (!roleRows?.some((row) => row.role === "admin")) {
    throw new Error("Admin access required");
  }
  return adminClient;
}
const listAdminUsers_createServerFn_handler = createServerRpc({
  id: "8b0453aaedcd8ffb3f94b29f9a5c0af1ac36e00b3de1fd5ea828663e9feaa15d",
  name: "listAdminUsers",
  filename: "src/lib/admin.functions.ts"
}, (opts) => listAdminUsers.__executeServer(opts));
const listAdminUsers = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(listAdminUsers_createServerFn_handler, async ({
  data
}) => {
  const adminClient = await getAdminClient(data.accessToken);
  const [{
    data: profiles
  }, {
    data: roleRows
  }, {
    data: authUsers,
    error
  }] = await Promise.all([adminClient.from("profiles").select("id, full_name, email, created_at, status"), adminClient.from("user_roles").select("user_id, role"), adminClient.auth.admin.listUsers()]);
  if (error) throw new Error(error.message);
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const roleById = /* @__PURE__ */ new Map();
  (roleRows ?? []).forEach((row) => {
    roleById.set(row.user_id, roles.has(row.role) ? row.role : "viewer");
  });
  return authUsers.users.map((user) => {
    const profile = profileById.get(user.id);
    return {
      id: user.id,
      email: profile?.email ?? user.email ?? "",
      full_name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
      role: roleById.get(user.id) ?? "viewer",
      disabled: Boolean(user.banned_until && new Date(user.banned_until) > /* @__PURE__ */ new Date()),
      status: profile?.status ?? "pending",
      created_at: profile?.created_at ?? user.created_at
    };
  });
});
const createAdminUser_createServerFn_handler = createServerRpc({
  id: "5b2fa8b9e283673ffda98e7e19731f1aece3f1d2453b8825510a0e996c39e023",
  name: "createAdminUser",
  filename: "src/lib/admin.functions.ts"
}, (opts) => createAdminUser.__executeServer(opts));
const createAdminUser = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createAdminUser_createServerFn_handler, async ({
  data
}) => {
  assertRole(data.role);
  const adminClient = await getAdminClient(data.accessToken);
  const {
    data: created,
    error
  } = await adminClient.auth.admin.createUser({
    email: data.email.trim().toLowerCase(),
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.fullName.trim(),
      requested_role: data.role
    }
  });
  if (error) throw new Error(error.message);
  if (!created.user) throw new Error("User creation failed");
  await adminClient.from("profiles").upsert({
    id: created.user.id,
    email: created.user.email,
    full_name: data.fullName.trim(),
    status: "active"
  });
  await adminClient.from("user_roles").delete().eq("user_id", created.user.id);
  const {
    error: roleError
  } = await adminClient.from("user_roles").insert({
    user_id: created.user.id,
    role: data.role
  });
  if (roleError) throw new Error(roleError.message);
  return {
    ok: true
  };
});
const setUserRole_createServerFn_handler = createServerRpc({
  id: "db980dd7fbef43d3fc13d10ddc5f8ed5aae0f52362aa36d741670b7c62aab77f",
  name: "setUserRole",
  filename: "src/lib/admin.functions.ts"
}, (opts) => setUserRole.__executeServer(opts));
const setUserRole = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(setUserRole_createServerFn_handler, async ({
  data
}) => {
  assertRole(data.role);
  const adminClient = await getAdminClient(data.accessToken);
  await adminClient.from("user_roles").delete().eq("user_id", data.userId);
  const {
    error
  } = await adminClient.from("user_roles").insert({
    user_id: data.userId,
    role: data.role
  });
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const resetUserPassword_createServerFn_handler = createServerRpc({
  id: "ad94b442b4b58a20ca59ea52c0cf0af5c7ea7f1cb1b349c7ee7cba93b5934138",
  name: "resetUserPassword",
  filename: "src/lib/admin.functions.ts"
}, (opts) => resetUserPassword.__executeServer(opts));
const resetUserPassword = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(resetUserPassword_createServerFn_handler, async ({
  data
}) => {
  if (data.password.length < 6) throw new Error("Password must be at least 6 characters");
  const adminClient = await getAdminClient(data.accessToken);
  const {
    error
  } = await adminClient.auth.admin.updateUserById(data.userId, {
    password: data.password
  });
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const setUserDisabled_createServerFn_handler = createServerRpc({
  id: "ff5fd3b5eac055df94bebcb08efb725b94bac6b9ef90c8cbc4500dc6539843c3",
  name: "setUserDisabled",
  filename: "src/lib/admin.functions.ts"
}, (opts) => setUserDisabled.__executeServer(opts));
const setUserDisabled = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(setUserDisabled_createServerFn_handler, async ({
  data
}) => {
  const adminClient = await getAdminClient(data.accessToken);
  const {
    error
  } = await adminClient.auth.admin.updateUserById(data.userId, {
    ban_duration: data.disabled ? "876000h" : "none"
  });
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const deleteAdminUser_createServerFn_handler = createServerRpc({
  id: "71fa5d36fb064be3e1fa09a177b9f88400e4dc7e03003c59ff0bd89580fca2b5",
  name: "deleteAdminUser",
  filename: "src/lib/admin.functions.ts"
}, (opts) => deleteAdminUser.__executeServer(opts));
const deleteAdminUser = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(deleteAdminUser_createServerFn_handler, async ({
  data
}) => {
  const adminClient = await getAdminClient(data.accessToken);
  await adminClient.from("user_roles").delete().eq("user_id", data.userId);
  await adminClient.from("profiles").delete().eq("id", data.userId);
  const {
    error
  } = await adminClient.auth.admin.deleteUser(data.userId);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const approveUser_createServerFn_handler = createServerRpc({
  id: "305759db67d21a47a3a4f4acbf9dbacc80d7dba743785edd95a6ab72aec2cd84",
  name: "approveUser",
  filename: "src/lib/admin.functions.ts"
}, (opts) => approveUser.__executeServer(opts));
const approveUser = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(approveUser_createServerFn_handler, async ({
  data
}) => {
  const adminClient = await getAdminClient(data.accessToken);
  const {
    error
  } = await adminClient.from("profiles").update({
    status: "active"
  }).eq("id", data.userId);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const declineUser_createServerFn_handler = createServerRpc({
  id: "2fa03a3bb800faef9091466519b85ab1dd8240aa1ae224f3130f0f0095aae78d",
  name: "declineUser",
  filename: "src/lib/admin.functions.ts"
}, (opts) => declineUser.__executeServer(opts));
const declineUser = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(declineUser_createServerFn_handler, async ({
  data
}) => {
  const adminClient = await getAdminClient(data.accessToken);
  const {
    error
  } = await adminClient.from("profiles").update({
    status: "declined"
  }).eq("id", data.userId);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
export {
  approveUser_createServerFn_handler,
  createAdminUser_createServerFn_handler,
  declineUser_createServerFn_handler,
  deleteAdminUser_createServerFn_handler,
  listAdminUsers_createServerFn_handler,
  resetUserPassword_createServerFn_handler,
  setUserDisabled_createServerFn_handler,
  setUserRole_createServerFn_handler
};
