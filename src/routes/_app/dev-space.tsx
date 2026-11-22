import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dev-space")({
  beforeLoad: () => {
    throw redirect({ to: "/migrations" });
  },
});
