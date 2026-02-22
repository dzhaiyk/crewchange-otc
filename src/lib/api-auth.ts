import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSessionValid, SESSION_COOKIE } from "@/lib/auth";

export async function assertApiAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;

  if (!isSessionValid(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
