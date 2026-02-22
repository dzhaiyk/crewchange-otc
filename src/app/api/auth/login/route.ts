import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAdminUsername,
  SESSION_COOKIE,
  sessionCookieValue,
  validateCredentials,
} from "@/lib/auth";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload.",
      },
      { status: 400 },
    );
  }

  if (!validateCredentials(parsed.data.username, parsed.data.password)) {
    return NextResponse.json(
      {
        error: "Invalid username or password.",
      },
      { status: 401 },
    );
  }

  const response = NextResponse.json({
    success: true,
    username: getAdminUsername(),
  });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: sessionCookieValue(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}
