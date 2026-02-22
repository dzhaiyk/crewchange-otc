import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "crew_admin_session";

const SESSION_VALUE = "crew_change_admin_auth";

export function getAdminUsername(): string {
  return process.env.ADMIN_USERNAME ?? "admin";
}

export function validateCredentials(username: string, password: string): boolean {
  const expectedUsername = getAdminUsername();
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "fatih-admin";
  return username === expectedUsername && password === expectedPassword;
}

export function sessionCookieValue(): string {
  return SESSION_VALUE;
}

export function isSessionValid(value: string | undefined): boolean {
  return value === SESSION_VALUE;
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return isSessionValid(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requirePageAuth(): Promise<void> {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/login");
  }
}
