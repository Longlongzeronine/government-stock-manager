import { W as jsxRuntimeExports, O as useRouter, r as reactExports } from "./server-DkTiwXTO.js";
import { a1 } from "./server-DkTiwXTO.js";
import { A as AppShell } from "./AppShell-a1FTjCXc.js";
import { u as useAuth } from "./router-CfAHfNkT.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./use-mobile-BiTvKiC1.js";
import "./index-onWpx3op.js";
function AppShellGuard() {
  const {
    session,
    loading
  } = useAuth();
  const router = useRouter();
  reactExports.useEffect(() => {
    if (!loading && !session) {
      router.navigate({
        to: "/login"
      });
    }
  }, [session, loading, router]);
  if (loading || !session) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "Loading…" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, {});
}
const SplitComponent = () => /* @__PURE__ */ jsxRuntimeExports.jsx(AppShellGuard, {});
export {
  a1 as Outlet,
  SplitComponent as component
};
