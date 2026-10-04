import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, getRequestProtocol, setCookie } from "@tanstack/react-start/server";

const COOKIE_NAME = "supplify_developer_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

type DeveloperIdentity = { username: string; expiresAt: number };

function environmentValue(...names: string[]) {
  const workerEnv = (globalThis as typeof globalThis & {
    __WORKER_ENV__?: Record<string, unknown>;
  }).__WORKER_ENV__;
  for (const name of names) {
    const workerValue = workerEnv?.[name];
    const value =
      (typeof workerValue === "string" ? workerValue : process.env[name])?.trim();
    if (value) return value;
  }
  return "";
}

function getDeveloperAccounts() {
  const developerUsername = environmentValue("DEVELOPER_USERNAME", "DEV_MODE_USERNAME", "DEVMODE_USERNAME") || "Devmode";
  const developerPassword = environmentValue(
    "DEVELOPER_PASSWORD",
    "DEVELOPER_MODE_PASSWORD",
    "DEV_MODE_PASSWORD",
    "DEVMODE_PASSWORD",
  );
  const godModeUsername = environmentValue("GODMODE_USERNAME", "GOD_MODE_USERNAME") || "GodMode";
  const godModePassword = environmentValue("GODMODE_PASSWORD", "GOD_MODE_PASSWORD");
  return [
    ...(developerPassword ? [{ username: developerUsername, password: developerPassword }] : []),
    ...(godModePassword ? [{ username: godModeUsername, password: godModePassword }] : []),
  ];
}

function sessionSecret() {
  return environmentValue("DEVELOPER_SESSION_SECRET", "DEV_MODE_SESSION_SECRET");
}

function encode(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return encode(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

async function readDeveloperSession(): Promise<DeveloperIdentity | null> {
  const secret = sessionSecret();
  const token = getCookie(COOKIE_NAME);
  if (!secret || !token) return null;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;
  try {
    const expectedSignature = await signature(payload, secret);
    const left = decode(suppliedSignature);
    const right = decode(expectedSignature);
    if (left.length !== right.length) return null;
    let difference = 0;
    for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
    if (difference !== 0) return null;
    const identity = JSON.parse(new TextDecoder().decode(decode(payload))) as DeveloperIdentity;
    if (identity.expiresAt <= Date.now()) return null;
    if (!getDeveloperAccounts().some((account) => account.username === identity.username)) return null;
    return identity;
  } catch {
    return null;
  }
}

export const signInDeveloper = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const secret = sessionSecret();
    if (!secret) return { error: "Developer Mode is not configured on this server." };
    const accounts = getDeveloperAccounts();
    if (accounts.length === 0) {
      return { error: "Developer Mode credentials are not configured on this server." };
    }
    const username = data.username.trim();
    const candidate = new TextEncoder().encode(data.password);
    let valid = false;
    for (const account of accounts) {
      const expected = new TextEncoder().encode(account.password);
      let difference = candidate.length ^ expected.length;
      const length = Math.max(candidate.length, expected.length);
      for (let index = 0; index < length; index += 1) {
        difference |= (candidate[index] ?? 0) ^ (expected[index] ?? 0);
      }
      valid ||= username.toLowerCase() === account.username.toLowerCase() && difference === 0;
    }
    if (!valid) {
      return { error: "Invalid developer credentials. Check configured DevMode username and password." };
    }

    const payload = encode(JSON.stringify({ username, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 }));
    const token = `${payload}.${await signature(payload, secret)}`;
    setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: getRequestProtocol() === "https",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return { error: null, username };
  });

export const getDeveloperSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = await readDeveloperSession();
  if (!session && getCookie(COOKIE_NAME)) {
    deleteCookie(COOKIE_NAME, { path: "/" });
  }
  return session ? { username: session.username } : null;
});

export const signOutDeveloper = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(COOKIE_NAME, { path: "/" });
  return { success: true };
});
