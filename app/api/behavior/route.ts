import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

const CATEGORIES = ["مخالفة", "سلوك إيجابي", "إجراء تربوي"] as const;

// سجلات السلوك لطالب واحد، داخل مدرسة المستخدم فقط.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "behavior:record")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  const studentId = new URL(request.url).searchParams.get("studentId") ?? "";
  if (!studentId) return NextResponse.json({ records: [] });

  const records = await prisma.behaviorRecord.findMany({
    where: { schoolId: user.schoolId, studentId },
    select: { id: true, category: true, description: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ records });
}

// تسجيل حدث سلوكي لطالب في مدرسة المستخدم.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "behavior:record")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { studentId?: unknown; category?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const category = typeof body.category === "string" ? body.category : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!studentId || !(CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "بيانات السلوك غير صالحة" }, { status: 400 });
  }
  if (description.length < 3 || description.length > 1000) {
    return NextResponse.json({ error: "الوصف يجب أن يكون بين 3 و1000 حرف" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }

  const record = await prisma.behaviorRecord.create({
    data: { schoolId: user.schoolId, studentId, category, description, recordedBy: user.id },
    select: { id: true, category: true, description: true, createdAt: true },
  });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "behavior_recorded", entity: "Student", entityId: studentId },
  });
  return NextResponse.json({ record }, { status: 201 });
}
