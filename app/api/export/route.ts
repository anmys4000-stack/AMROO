import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

export const runtime = "nodejs";

// تصدير CSV (يُفتح في Excel) لتقارير المدرسة: الطلاب، والسلوك، والحضور، داخل مدرسة المستخدم فقط.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "students:view")) {
    return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "";
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  let header: string[] = [];
  let rows: string[][] = [];

  if (type === "students") {
    const students = await prisma.student.findMany({
      where: { schoolId: user.schoolId, isActive: true },
      select: { fullName: true, guardianName: true, guardianPhone: true, schoolClass: { select: { name: true } } },
      orderBy: { fullName: "asc" },
    });
    header = ["الاسم", "الفصل", "ولي الأمر", "جوال ولي الأمر"];
    rows = students.map((s) => [s.fullName, s.schoolClass?.name ?? "", s.guardianName ?? "", s.guardianPhone ?? ""]);
  } else if (type === "behavior") {
    const records = await prisma.behaviorRecord.findMany({
      where: { schoolId: user.schoolId },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { category: true, description: true, createdAt: true, student: { select: { fullName: true } } },
    });
    header = ["التاريخ", "الطالب", "النوع", "الوصف"];
    rows = records.map((r) => [r.createdAt.toISOString().slice(0, 10), r.student.fullName, r.category, r.description]);
  } else if (type === "attendance") {
    const records = await prisma.attendance.findMany({
      where: { schoolId: user.schoolId },
      orderBy: { date: "desc" },
      take: 5000,
      select: { date: true, status: true, student: { select: { fullName: true } } },
    });
    header = ["التاريخ", "الطالب", "الحالة"];
    rows = records.map((r) => [r.date.toISOString().slice(0, 10), r.student.fullName, r.status]);
  } else {
    return NextResponse.json({ error: "نوع التصدير غير معروف" }, { status: 400 });
  }

  const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}.csv"`,
    },
  });
}
