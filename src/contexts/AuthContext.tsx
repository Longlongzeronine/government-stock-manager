import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type AppRole } from "@/integrations/supabase/client";
import {
  getDeveloperSession,
  signInDeveloper,
  signOutDeveloper,
} from "@/lib/developer-auth.functions";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  roles: AppRole[];
  employmentStatus: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
  canWrite: boolean;
  developerMode: boolean;
  developerUsername: string | null;
  signInAsDeveloper: (username: string, password: string) => Promise<{ error: string | null }>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);
const authInFlight = new Map<string, Promise<{ error: string | null }>>();

// Client-side rate limiting to prevent hitting Supabase's rate limits
const RATE_LIMIT_WINDOW_MS = 120000; // 2 minutes window
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 requests per window
const authRequestTimestamps = new Map<string, number[]>();

function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const timestamps = authRequestTimestamps.get(key) || [];
  
  // Filter to only keep timestamps within the current window
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestTimestamp = recentTimestamps[0];
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp);
    return { allowed: false, retryAfterMs };
  }
  
  recentTimestamps.push(now);
  authRequestTimestamps.set(key, recentTimestamps);
  return { allowed: true, retryAfterMs: 0 };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeAuthError(message: string | null | undefined) {
  if (!message) return null;
  const msg = message.toLowerCase();
  if (msg.includes("signups are disabled")) {
    return "Email signups are disabled in Supabase. Enable Authentication -> Providers -> Email -> Allow new users to sign up.";
  }
  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Too many requests. Please wait a moment before trying again.";
  }
  return message;
}

async function runAuthRequest(
  key: string,
  request: () => Promise<{ error: string | null }>,
) {
  const pending = authInFlight.get(key);
  if (pending) return pending;

  const promise = request().finally(() => authInFlight.delete(key));
  authInFlight.set(key, promise);
  return promise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [employmentStatus, setEmploymentStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [developerUsername, setDeveloperUsername] = useState<string | null>(null);

  useEffect(() => {
    let authStateChanged = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      authStateChanged = true;
      setSession(s);
      setLoading(false);
      if (s?.user) {
        setDeveloperUsername(null);
        void signOutDeveloper();
        setTimeout(() => loadRole(s.user.id), 0);
      } else {
        setRole(null);
        setRoles([]);
        setEmploymentStatus(null);
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (authStateChanged) return;
      setSession(data.session);
      if (data.session?.user) loadRole(data.session.user.id);

      if (data.session) {
        setDeveloperUsername(null);
        setLoading(false);
        void getDeveloperSession().then((developerSession) => {
          if (developerSession) void signOutDeveloper();
        }).catch(() => undefined);
        return;
      }

      // Bound the separate developer-cookie request so an unavailable server
      // function cannot leave the app stuck on its loading screen.
      const lookupTimeout = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 5000);
      });
      void Promise.race([getDeveloperSession(), lookupTimeout]).then((developerSession) => {
        if (authStateChanged) return;
        setDeveloperUsername(developerSession?.username ?? null);
        setLoading(false);
      }).catch(() => {
        if (!authStateChanged) {
          setDeveloperUsername(null);
          setLoading(false);
        }
      });
    }).catch(() => {
      if (!authStateChanged) setSession(null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadRole(uid: string) {
    const [{ data }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("employment_status").eq("id", uid).maybeSingle(),
    ]);
    const order: Record<string, number> = { admin: 0, supply_officer: 1, inspection_officer: 2, financial_analyst: 3, permanent_employee: 4, regular_user: 5 };
    const assigned = [...new Set((data ?? []).map((row: any) => row.role as AppRole))];
    assigned.sort((a, b) => (order[a] ?? 10) - (order[b] ?? 10));
    setRoles(assigned.length ? assigned : ["regular_user"]);
    setRole(assigned[0] ?? "regular_user");
    setEmploymentStatus(profile?.employment_status ?? "Casual");
  }

  const developerMode = developerUsername !== null && session === null;
  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    role,
    loading,
    roles,
    employmentStatus,
    isAdmin: roles.includes("admin") || developerMode,
    isStaff: roles.includes("supply_officer") || roles.includes("inspection_officer"),
    canWrite: developerMode || roles.some((assignedRole) => assignedRole !== "regular_user" && assignedRole !== "permanent_employee"),
    developerMode,
    developerUsername,
    signInAsDeveloper: async (username, password) => {
      try {
        const result = await signInDeveloper({ data: { username, password } });
        if (result.error) return { error: result.error };
        await supabase.auth.signOut();
        setRole(null);
        setRoles([]);
        setEmploymentStatus(null);
        setDeveloperUsername(result.username ?? username);
        return { error: null };
      } catch (error: any) {
        return { error: error?.message ?? "Developer sign in failed." };
      }
    },
    signIn: async (email, password) => {
      const key = `signin:${normalizeEmail(email)}`;
      const rateLimit = checkRateLimit(key);
      if (!rateLimit.allowed) {
        return { 
          error: `Too many attempts. Please wait ${Math.ceil(rateLimit.retryAfterMs / 1000)} seconds before trying again.` 
        };
      }
      
      return runAuthRequest(key, async () => {
        try {
          const signInPromise = supabase.auth.signInWithPassword({
            email: normalizeEmail(email),
            password,
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out")), 10000)
          );
          const { data, error } = await Promise.race([signInPromise, timeoutPromise]);
          if (error) return { error: normalizeAuthError(error?.message) };

          // Check user approval status
          if (data?.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("status,disabled")
              .eq("id", data.user.id)
              .single();

            if (profile?.status === "pending") {
              // Sign out immediately since they're not approved
              await supabase.auth.signOut();
              return { error: "Your account is pending admin approval. You will be notified once approved." };
            }
            if (profile?.status === "declined") {
              await supabase.auth.signOut();
              return { error: "Your account request has been declined. Contact an administrator." };
            }
            if (profile?.disabled) {
              await supabase.auth.signOut();
              return { error: "Your account is inactive. Contact an administrator." };
            }
          }

          await signOutDeveloper();
          setDeveloperUsername(null);

          return { error: null };
        } catch (err: any) {
          // Handle network errors or other exceptions that might include rate limiting
          const errorMessage = err?.message || err?.toString() || '';
          if (err?.status === 429 || 
              errorMessage.includes('429') || 
              errorMessage.includes('Too Many Requests') ||
              errorMessage.includes('rate limit')) {
            return { error: "Too many requests. Please wait a moment before trying again." };
          }
          if (errorMessage.includes('timed out')) {
            return { error: "Request timed out. Check your internet connection." };
          }
          return { error: normalizeAuthError(errorMessage || "An unexpected error occurred") };
        }
      });
    },
    signUp: async (email, password, fullName) => {
      const key = `signup:${normalizeEmail(email)}`;
      const rateLimit = checkRateLimit(key);
      if (!rateLimit.allowed) {
        return { 
          error: `Too many attempts. Please wait ${Math.ceil(rateLimit.retryAfterMs / 1000)} seconds before trying again.` 
        };
      }
      
      return runAuthRequest(key, async () => {
        try {
          const signUpPromise = supabase.auth.signUp({
            email: normalizeEmail(email),
            password,
            options: { data: { full_name: fullName.trim(), requested_role: "regular_user" } },
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out")), 10000)
          );
          const { error } = await Promise.race([signUpPromise, timeoutPromise]);
          if (error) return { error: normalizeAuthError(error.message) };
          return { error: null };
        } catch (err: any) {
          // Handle network errors or other exceptions that might include rate limiting
          const errorMessage = err?.message || err?.toString() || '';
          if (err?.status === 429 || 
              errorMessage.includes('429') || 
              errorMessage.includes('Too Many Requests') ||
              errorMessage.includes('rate limit')) {
            return { error: "Too many requests. Please wait a moment before trying again." };
          }
          if (errorMessage.includes('timed out')) {
            return { error: "Request timed out. Check your internet connection." };
          }
          return { error: normalizeAuthError(errorMessage || "An unexpected error occurred") };
        }
      });
    },
    signOut: async () => {
      await Promise.all([supabase.auth.signOut(), signOutDeveloper()]);
      setDeveloperUsername(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
