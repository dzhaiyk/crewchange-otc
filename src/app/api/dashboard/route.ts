import { NextResponse } from "next/server";
import { assertApiAuth } from "@/lib/api-auth";
import { getDashboardData } from "@/lib/rotation-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = await assertApiAuth();
  if (authError) {
    return authError;
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date") ?? undefined;

  const data = await getDashboardData(dateParam);
  return NextResponse.json(data);
}
