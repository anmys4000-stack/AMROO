import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// إرسال رسالة من المدرسة إلى ولي أمر طالب محدد، داخل مدرسة المستخدم فقط.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "students:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  let body: { studentId?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!studentId || text.length < 2 || text.length > 1000) {
    return NextResponse.json({ error: "بيانات الرسالة غير صالحة" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: { schoolId: user.schoolId, studentId, senderId: user.id, body: text },
    select: { id: true },
  });
  return NextResponse.json({ message }, { status: 201 });
}
