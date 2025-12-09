/**
 * Stack Auth client (email/password + email reset)
 * Reads configuration from .env
 */
import { z } from "zod";

const STACK_BASE_URL =
  import.meta.env.VITE_STACK_AUTH_URL ||
  import.meta.env.VITE_STACKAUTH_URL ||
  "";
const STACK_APP_ID =
  import.meta.env.VITE_STACK_AUTH_APP_ID ||
  import.meta.env.VITE_STACKAUTH_APP_ID ||
  "";
const STACK_PUBLIC_KEY =
  import.meta.env.VITE_STACK_AUTH_PUBLIC_KEY ||
  import.meta.env.VITE_STACKAUTH_PUBLIC_KEY ||
  "";

const TOKEN_KEY = "octo_stack_token";

function assertConfigured() {
  if (!STACK_BASE_URL || !STACK_APP_ID || !STACK_PUBLIC_KEY) {
    throw new Error(
      "Stack Auth is not configured. Please set VITE_STACK_AUTH_URL, VITE_STACK_AUTH_APP_ID, and VITE_STACK_AUTH_PUBLIC_KEY in your .env."
    );
  }
}

const AuthResponseSchema = z.object({
  access_token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable().optional(),
  }),
});

export type StackUser = z.infer<typeof AuthResponseSchema>["user"];

function getHeaders(includeAuth = false) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-stack-app-id": STACK_APP_ID,
    "x-stack-public-key": STACK_PUBLIC_KEY,
  };
  if (includeAuth) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response) {
  if (res.ok) {
    // Successful JSON response
    return (await res.json()) as T;
  }

  // Try to parse a structured error
  let detail = "";
  try {
    const json = await res.json();
    detail =
      (json && (json.error || json.message || json.detail || json.reason)) ||
      JSON.stringify(json);
  } catch {
    detail = await res.text().catch(() => "");
  }

  const status = res.status;
  const fallback = detail ? `${detail}` : `Request failed (${status})`;

  // Friendlier messages by status
  if (status === 400) throw new Error(detail || "Invalid request. Please check your input.");
  if (status === 401) throw new Error("Unauthorized or session expired. Please sign in again.");
  if (status === 403) throw new Error("Forbidden. Your account lacks access to this action.");
  if (status === 404) throw new Error("Not found. Please check the request or token.");
  if (status === 429) throw new Error("Too many attempts. Please wait a moment and try again.");
  if (status >= 500) throw new Error("Server error from Stack Auth. Please try again shortly.");

  throw new Error(fallback);
}

export async function stackSignUp(email: string, password: string, name?: string) {
  assertConfigured();
  const res = await fetch(`${STACK_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ email, password, name }),
  });
  const data = await handleResponse<z.infer<typeof AuthResponseSchema>>(res);
  AuthResponseSchema.parse(data);
  localStorage.setItem(TOKEN_KEY, data.access_token);
  return data.user;
}

export async function stackSignIn(email: string, password: string) {
  assertConfigured();
  const res = await fetch(`${STACK_BASE_URL}/auth/login`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<z.infer<typeof AuthResponseSchema>>(res);
  AuthResponseSchema.parse(data);
  localStorage.setItem(TOKEN_KEY, data.access_token);
  return data.user;
}

export async function stackGetCurrentUser(): Promise<StackUser | null> {
  assertConfigured();
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const res = await fetch(`${STACK_BASE_URL}/auth/me`, {
    method: "GET",
    headers: getHeaders(true),
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  const data = await handleResponse<{ user: StackUser }>(res);
  return data.user;
}

export function stackLogout() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function stackForgotPassword(email: string) {
  assertConfigured();
  const res = await fetch(`${STACK_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ email }),
  });
  await handleResponse<unknown>(res);
}

export async function stackResetPassword(token: string, newPassword: string) {
  assertConfigured();
  const res = await fetch(`${STACK_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ token, password: newPassword }),
  });
  await handleResponse<unknown>(res);
}

export function getStackToken() {
  return localStorage.getItem(TOKEN_KEY);
}

