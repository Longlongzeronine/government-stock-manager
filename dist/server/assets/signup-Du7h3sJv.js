import { r as reactExports, W as jsxRuntimeExports } from "./server-DkTiwXTO.js";
import { u as useAuth, a as useNavigate, L as Link, t as toast } from "./router-CfAHfNkT.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-onWpx3op.js";
function SignupPage() {
  const {
    signUp
  } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = reactExports.useState("");
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  const submitLockRef = reactExports.useRef(false);
  async function onSubmit(e) {
    e.preventDefault();
    if (loading || submitLockRef.current) return;
    submitLockRef.current = true;
    setLoading(true);
    try {
      const {
        error
      } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Registration submitted. An admin must approve your account before you can sign in.");
      navigate({
        to: "/login"
      });
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen grid place-items-center bg-background p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit, className: "w-full max-w-sm space-y-5 bg-card border border-border rounded-lg p-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl", children: "Request access" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "New accounts start as viewers. An admin can upgrade access from Users & Roles." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Full name", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "input", required: true, value: fullName, onChange: (e) => setFullName(e.target.value), disabled: loading }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Email", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "email", className: "input", required: true, value: email, onChange: (e) => setEmail(e.target.value), disabled: loading }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Password", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", className: "input", minLength: 6, required: true, value: password, onChange: (e) => setPassword(e.target.value), disabled: loading }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: loading, className: "w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50", children: loading ? "Creating…" : "Create account" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground text-center", children: [
      "Already enrolled?",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/login", className: "text-primary font-medium hover:underline", children: "Sign in" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `.input{width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.55rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 25%,transparent)}` })
  ] }) });
}
function Field({
  label,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium uppercase tracking-wider", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5", children })
  ] });
}
export {
  SignupPage as component
};
