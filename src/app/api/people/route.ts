import { NextResponse } from "next/server";
import { z } from "zod";
import { assertApiAuth } from "@/lib/api-auth";
import { createPerson, getPeople } from "@/lib/rotation-service";

const roleSchema = z.enum(["DD_DAY", "DD_NIGHT", "MWD_DAY", "MWD_NIGHT"]);

const createPersonSchema = z.object({
  name: z.string().min(1),
  primaryRole: roleSchema,
  employerId: z.string().optional(),
  contact: z.string().optional(),
  notes: z.string().optional(),
});

export const runtime = "nodejs";

export async function GET() {
  const authError = await assertApiAuth();
  if (authError) {
    return authError;
  }

  const people = await getPeople();
  return NextResponse.json({ people });
}

export async function POST(request: Request) {
  const authError = await assertApiAuth();
  if (authError) {
    return authError;
  }

  const body = await request.json().catch(() => null);
  const parsed = createPersonSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }

  const person = await createPerson(parsed.data);
  return NextResponse.json({ person }, { status: 201 });
}
