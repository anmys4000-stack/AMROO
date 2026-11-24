import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser } from "../../../src/lib/auth";

export const runtime = "nodejs";

const PLAN_TYPES: string[] = ["CLASS", "NON_CLASS", "ACTIVITY"];

// المعلم يرفع خطته الأسبوعية، ويحدّثها إن كانت موجودة لذلك الأسبوع.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (user.role !== "TEACHER") {
    return NextResponse.json({ error: "الخطة الأسبوعية للمعلمين" }, { status: 403 });
  }

  let body: { weekStart?: unknown; content?: unknown; planType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const weekStart = typeof body.weekStart === "string" ? new Date(`${body.weekStart}T00:00:00Z`) : null;
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const planType = PLAN_TYPES.includes(body.planType as string) ? (body.planType as string) : "CLASS";
  if (!weekStart || Number.isNaN(weekStart.getTime()) || content.length < 5 || content.length > 4000) {
    return NextResponse.json({ error: "بيانات الخطة غير صالحة" }, { status: 400 });
  }

  const plan = await prisma.weeklyPlan.upsert({
    where: { teacherId_weekStart: { teacherId: user.id, weekStart } },
    create: { schoolId: user.schoolId, teacherId: user.id, weekStart, content, planType },
    update: { content, planType },
    select: { id: true },
  });
  return NextResponse.json({ plan }, { status: 201 });
}
