import { NextResponse } from "next/server";
import { z } from "zod";
import { assertApiAuth } from "@/lib/api-auth";
import { softDeletePerson, updatePerson } from "@/lib/rotation-service";

const roleSchema = z.enum(["DD_DAY", "DD_NIGHT", "MWD_DAY", "MWD_NIGHT"]);

const updatePersonSchema = z.object({
  name: z.string().min(1).optional(),
  primaryRole: roleSchema.optional(),
  employerId: z.string().optional(),
  contact: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const authError = await assertApiAuth();
  if (authError) {
    return authError;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updatePersonSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }

  try {
    const person = await updatePerson(id, parsed.data);
    return NextResponse.json({ person });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const authError = await assertApiAuth();
  if (authError) {
    return authError;
  }

  const { id } = await params;

  try {
    const person = await softDeletePerson(id);
    return NextResponse.json({ person });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
