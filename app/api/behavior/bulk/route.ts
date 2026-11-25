import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../../src/lib/auth";

export const runtime = "nodejs";

type Row = { name: string; className: string; violation: string; degree: string; date: string; recorder: string };

// استيراد سجل المخالفات السلوكية دفعة واحدة. يطابق الطالب باسمه واسم فصله داخل المدرسة نفسها،
// ويتجاهل الصف الذي لم يُطابَق أو تكرر بنفس الطالب والتاريخ والمخالفة، ويعيد تقريرًا بالنتيجة.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "behavior:record")) return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });

  let rows: Row[];
  try {
    const body = await request.json();
    rows = Array.isArray(body.rows) ? body.rows.slice(0, 200) : [];
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const students = await prisma.student.findMany({
    where: { schoolId: user.schoolId },
    select: { id: true, fullName: true, schoolClass: { select: { name: true } } },
  });
  const byKey = new Map<string, string>();
  for (const s of students) byKey.set(`${s.fullName.trim()}|${(s.schoolClass?.name ?? "").trim()}`, s.id);

  let created = 0;
  const unmatched: string[] = [];
  const duplicates: string[] = [];
  for (const r of rows) {
    const name = String(r.name ?? "").trim();
    const className = String(r.className ?? "").trim();
    const violation = String(r.violation ?? "").trim();
    const date = new Date(`${String(r.date ?? "")}T00:00:00Z`);
    const studentId = byKey.get(`${name}|${className}`);
    if (!studentId || !violation || Number.isNaN(date.getTime())) {
      unmatched.push(`${name} · ${className}`);
      continue;
    }
    const exists = await prisma.behaviorRecord.findFirst({
      where: { schoolId: user.schoolId, studentId, category: "مخالفة", description: { startsWith: violation }, createdAt: { gte: date, lt: new Date(date.getTime() + 86400000) } },
      select: { id: true },
    });
    if (exists) {
      duplicates.push(`${name} · ${date.toISOString().slice(0, 10)}`);
      continue;
    }
    const description = [violation, r.degree ? `(${r.degree})` : "", r.recorder ? `· سجّلها: ${r.recorder}` : ""].filter(Boolean).join(" ");
    await prisma.behaviorRecord.create({
      data: { schoolId: user.schoolId, studentId, category: "مخالفة", description, recordedBy: user.id, createdAt: date },
    });
    created++;
  }
  return NextResponse.json({ created, unmatchedCount: unmatched.length, unmatched: unmatched.slice(0, 50), duplicateCount: duplicates.length }, { status: 201 });
}
