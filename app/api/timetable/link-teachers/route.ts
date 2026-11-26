import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../../src/lib/auth";

export const runtime = "nodejs";

// توحيد الاسم للمقارنة: مسافات زائدة، وتشكيل الهمزات والتاء المربوطة والياء.
function norm(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// يربط حصص الجدول التي كُتب فيها اسم المعلم فقط بحساب المعلم المطابق في المدرسة. المدير فقط.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "users:manage")) return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });

  const [teachers, unlinked] = await Promise.all([
    prisma.user.findMany({ where: { schoolId: user.schoolId, role: "TEACHER" }, select: { id: true, fullName: true } }),
    prisma.timetableEntry.findMany({
      where: { schoolId: user.schoolId, teacherId: null, teacherName: { not: null } },
      select: { id: true, teacherName: true },
    }),
  ]);

  const byName = new Map<string, string[]>();
  for (const t of teachers) {
    const key = norm(t.fullName);
    byName.set(key, [...(byName.get(key) ?? []), t.id]);
  }

  let linked = 0;
  let ambiguous = 0;
  const unmatched = new Set<string>();
  const updates = [];
  for (const e of unlinked) {
    const ids = byName.get(norm(e.teacherName ?? ""));
    if (!ids) {
      unmatched.add(e.teacherName ?? "");
    } else if (ids.length > 1) {
      ambiguous += 1;
    } else {
      updates.push(prisma.timetableEntry.update({ where: { id: e.id }, data: { teacherId: ids[0] } }));
      linked += 1;
    }
  }
  await prisma.$transaction(updates);
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "teachers_linked", entity: "TimetableEntry", entityId: user.schoolId },
  });
  return NextResponse.json({ linked, ambiguous, unmatchedNames: Array.from(unmatched) });
}
