import { a2 as createServerFn, r as reactExports, W as jsxRuntimeExports } from "./server-DkTiwXTO.js";
import { u as useQuery } from "./useQuery-CPGv4dSv.js";
import { P as PageHeader } from "./AppShell-a1FTjCXc.js";
import { u as useAuth, t as toast } from "./router-CfAHfNkT.js";
import { M as MobileCard, a as MobileCardRow } from "./MobileCard-BcxUBx43.js";
import { c as createSsrRpc, u as useIsMobile } from "./use-mobile-BiTvKiC1.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-onWpx3op.js";
const listAdminUsers = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createSsrRpc("8b0453aaedcd8ffb3f94b29f9a5c0af1ac36e00b3de1fd5ea828663e9feaa15d"));
const createAdminUser = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createSsrRpc("5b2fa8b9e283673ffda98e7e19731f1aece3f1d2453b8825510a0e996c39e023"));
const setUserRole = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createSsrRpc("db980dd7fbef43d3fc13d10ddc5f8ed5aae0f52362aa36d741670b7c62aab77f"));
const resetUserPassword = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createSsrRpc("ad94b442b4b58a20ca59ea52c0cf0af5c7ea7f1cb1b349c7ee7cba93b5934138"));
const setUserDisabled = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createSsrRpc("ff5fd3b5eac055df94bebcb08efb725b94bac6b9ef90c8cbc4500dc6539843c3"));
const deleteAdminUser = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createSsrRpc("71fa5d36fb064be3e1fa09a177b9f88400e4dc7e03003c59ff0bd89580fca2b5"));
const approveUser = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createSsrRpc("305759db67d21a47a3a4f4acbf9dbacc80d7dba743785edd95a6ab72aec2cd84"));
const declineUser = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createSsrRpc("2fa03a3bb800faef9091466519b85ab1dd8240aa1ae224f3130f0f0095aae78d"));
function UsersPage() {
  const {
    isAdmin,
    session
  } = useAuth();
  const accessToken = session?.access_token ?? "";
  const [creating, setCreating] = reactExports.useState(false);
  const [resetTarget, setResetTarget] = reactExports.useState(null);
  const [newPassword, setNewPassword] = reactExports.useState("");
  const [resetting, setResetting] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    email: "",
    fullName: "",
    password: "",
    role: "viewer"
  });
  const {
    data: profiles = [],
    refetch
  } = useQuery({
    queryKey: ["profiles", "admin"],
    enabled: Boolean(isAdmin && accessToken),
    queryFn: async () => listAdminUsers({
      data: {
        accessToken
      }
    })
  });
  if (!isAdmin) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-sm text-muted-foreground", children: "Admin access required." });
  }
  async function setRole(uid, role) {
    try {
      await setUserRole({
        data: {
          accessToken,
          userId: uid,
          role
        }
      });
      toast.success("Role updated");
      refetch();
    } catch (e) {
      toast.error(e?.message ?? "Role update failed");
    }
  }
  async function createUser(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await createAdminUser({
        data: {
          accessToken,
          ...form
        }
      });
      toast.success("User created");
      setForm({
        email: "",
        fullName: "",
        password: "",
        role: "viewer"
      });
      refetch();
    } catch (e2) {
      toast.error(e2?.message ?? "User creation failed");
    } finally {
      setCreating(false);
    }
  }
  async function resetPassword(e) {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    try {
      await resetUserPassword({
        data: {
          accessToken,
          userId: resetTarget.id,
          password: newPassword
        }
      });
      toast.success("Password reset");
      setResetTarget(null);
      setNewPassword("");
    } catch (e2) {
      toast.error(e2?.message ?? "Password reset failed");
    } finally {
      setResetting(false);
    }
  }
  async function toggleDisabled(uid, disabled) {
    try {
      await setUserDisabled({
        data: {
          accessToken,
          userId: uid,
          disabled
        }
      });
      toast.success(disabled ? "User deactivated" : "User activated");
      refetch();
    } catch (e) {
      toast.error(e?.message ?? "Status update failed");
    }
  }
  async function deleteUser(uid, email) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      await deleteAdminUser({
        data: {
          accessToken,
          userId: uid
        }
      });
      toast.success("User deleted");
      refetch();
    } catch (e) {
      toast.error(e?.message ?? "User delete failed");
    }
  }
  const isMobileView = useIsMobile();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Users & Roles", subtitle: "Manage access for personnel" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-6 lg:p-8 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: createUser, className: "bg-card border border-border rounded-lg p-4 grid gap-3 md:grid-cols-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { required: true, type: "email", placeholder: "Email", value: form.email, onChange: (e) => setForm({
          ...form,
          email: e.target.value
        }), className: "border border-input rounded-md bg-card px-3 py-2 text-sm w-full" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { required: true, placeholder: "Full name", value: form.fullName, onChange: (e) => setForm({
          ...form,
          fullName: e.target.value
        }), className: "border border-input rounded-md bg-card px-3 py-2 text-sm w-full" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { required: true, type: "password", minLength: 6, placeholder: "Password", value: form.password, onChange: (e) => setForm({
          ...form,
          password: e.target.value
        }), className: "border border-input rounded-md bg-card px-3 py-2 text-sm w-full" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(RoleSelect, { value: form.role, onChange: (role) => setForm({
          ...form,
          role
        }), className: "border border-input rounded-md bg-card px-3 py-2 text-sm w-full" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: creating, className: "rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50 w-full md:w-auto", children: creating ? "Creating..." : "Create user" })
      ] }),
      !isMobileView && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card border border-border rounded-lg overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Email" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Role" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          profiles.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-medium", children: u.full_name ?? "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: u.email }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RoleSelect, { value: u.role, onChange: (role) => setRole(u.id, role), className: "border border-input rounded-md bg-card px-2 py-1 text-sm" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: u.status === "pending" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-0.5 rounded-md bg-warning/15 text-warning-foreground border border-warning/30", children: "pending" }) : u.status === "declined" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-0.5 rounded-md bg-destructive/15 text-destructive border border-destructive/30", children: "declined" }) : u.disabled ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border", children: "disabled" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-0.5 rounded-md bg-success/15 text-success border border-success/30", children: "active" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-4 py-3 text-right whitespace-nowrap", children: [
              u.status === "pending" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: async () => {
                  try {
                    await approveUser({
                      data: {
                        accessToken,
                        userId: u.id
                      }
                    });
                    toast.success("User approved");
                    refetch();
                  } catch (e) {
                    toast.error(e?.message ?? "Approve failed");
                  }
                }, className: "px-2 py-1 rounded border border-success/50 text-success text-xs mr-2 cursor-pointer hover:bg-success/10", children: "Approve" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: async () => {
                  try {
                    await declineUser({
                      data: {
                        accessToken,
                        userId: u.id
                      }
                    });
                    toast.success("User declined");
                    refetch();
                  } catch (e) {
                    toast.error(e?.message ?? "Decline failed");
                  }
                }, className: "px-2 py-1 rounded border border-destructive/40 text-destructive text-xs mr-2 cursor-pointer hover:bg-destructive/10", children: "Decline" })
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setResetTarget({
                  id: u.id,
                  email: u.email
                }), className: "px-2 py-1 rounded border border-input text-xs mr-2 cursor-pointer hover:bg-accent", children: "Reset password" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => toggleDisabled(u.id, !u.disabled), className: "px-2 py-1 rounded border border-input text-xs mr-2 cursor-pointer hover:bg-accent", children: u.disabled ? "Activate" : "Deactivate" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => deleteUser(u.id, u.email), className: "px-2 py-1 rounded border border-destructive/40 text-destructive text-xs cursor-pointer hover:bg-destructive/10", children: "Delete" })
            ] })
          ] }, u.id)),
          profiles.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, className: "p-12 text-center text-sm text-muted-foreground", children: "No users found." }) })
        ] })
      ] }) }),
      isMobileView && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        profiles.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MobileCard, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium text-base", children: u.full_name ?? "-" }),
            u.status === "pending" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-1 rounded-md shrink-0 bg-warning/15 text-warning-foreground border border-warning/30", children: "pending" }) : u.status === "declined" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-1 rounded-md shrink-0 bg-destructive/15 text-destructive border border-destructive/30", children: "declined" }) : u.disabled ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-1 rounded-md shrink-0 bg-muted text-muted-foreground border border-border", children: "disabled" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-1 rounded-md shrink-0 bg-success/15 text-success border border-success/30", children: "active" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border pt-2 space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MobileCardRow, { label: "Email", value: u.email }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Role" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(RoleSelect, { value: u.role, onChange: (role) => setRole(u.id, role), className: "border border-input rounded-md bg-card px-2 py-1 text-sm" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-2 pt-2 border-t border-border", children: u.status === "pending" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: async () => {
              try {
                await approveUser({
                  data: {
                    accessToken,
                    userId: u.id
                  }
                });
                toast.success("User approved");
                refetch();
              } catch (e) {
                toast.error(e?.message ?? "Approve failed");
              }
            }, className: "flex-1 px-3 py-2 rounded-md border border-success/50 text-success text-sm cursor-pointer hover:bg-success/10", children: "Approve" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: async () => {
              try {
                await declineUser({
                  data: {
                    accessToken,
                    userId: u.id
                  }
                });
                toast.success("User declined");
                refetch();
              } catch (e) {
                toast.error(e?.message ?? "Decline failed");
              }
            }, className: "flex-1 px-3 py-2 rounded-md border border-destructive/40 text-destructive text-sm cursor-pointer hover:bg-destructive/10", children: "Decline" })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setResetTarget({
              id: u.id,
              email: u.email
            }), className: "w-full px-3 py-2 rounded-md border border-input text-sm cursor-pointer hover:bg-accent", children: "Reset password" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => toggleDisabled(u.id, !u.disabled), className: "flex-1 px-3 py-2 rounded-md border border-input text-sm cursor-pointer hover:bg-accent", children: u.disabled ? "Activate" : "Deactivate" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => deleteUser(u.id, u.email), className: "px-3 py-2 rounded-md border border-destructive/40 text-destructive text-sm cursor-pointer hover:bg-destructive/10", children: "Delete" })
            ] })
          ] }) })
        ] }, u.id)),
        profiles.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-12 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg", children: "No users found." })
      ] })
    ] }),
    resetTarget && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: resetPassword, className: "bg-card border border-border rounded-lg w-full max-w-sm p-6 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl", children: "Reset password" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: resetTarget.email })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { autoFocus: true, required: true, type: "password", minLength: 6, placeholder: "New password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), className: "w-full border border-input rounded-md bg-card px-3 py-2 text-sm" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => {
          setResetTarget(null);
          setNewPassword("");
        }, className: "px-4 py-2 rounded-md border border-input text-sm cursor-pointer hover:bg-accent", children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: resetting, className: "px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50", children: resetting ? "Resetting..." : "Reset password" })
      ] })
    ] }) })
  ] });
}
function RoleSelect({
  value,
  onChange,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value, onChange: (e) => onChange(e.target.value), className, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "viewer", children: "viewer" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "staff", children: "staff" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "accounting", children: "accounting" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "admin", children: "admin" })
  ] });
}
export {
  UsersPage as component
};
