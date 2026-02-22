import { ExceptionType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUsername } from "@/lib/auth";
import { assertApiAuth } from "@/lib/api-auth";
import {
  applyExceptionAndPersist,
  getExceptionsAudit,
  mapExceptionInputToScheduler,
} from "@/lib/rotation-service";

const exceptionSchema = z.object({
  type: z.nativeEnum(ExceptionType),
  role: z.enum(["DD_DAY", "DD_NIGHT", "MWD_DAY", "MWD_NIGHT"]),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reason: z.string().min(3),
});

export async function POST(request: Request) {
  const authError = await assertApiAuth();
  if (authError) {
    return authError;
  }

  const body = await request.json().catch(() => null);
  const parsed = exceptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }

  try {
    const createdBy = getAdminUsername();
    const schedulerInput = mapExceptionInputToScheduler({
      ...parsed.data,
      createdBy,
    });
    const result = await applyExceptionAndPersist({
      ...schedulerInput,
      reason: parsed.data.reason,
    });

    return NextResponse.json({
      message: result.message,
      resolvedDate: result.resolvedDate,
      oldDate: result.oldDate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Exception apply failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const authError = await assertApiAuth();
  if (authError) {
    return authError;
  }

  const history = await getExceptionsAudit(25);
  return NextResponse.json({ history });
}
