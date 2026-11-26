import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../../src/lib/auth";
import { DEFAULT_SETTINGS, validateSettings, type TimetableSettings } from "../../../../src/lib/timetable-settings";

export const runtime = "nodejs";

// قراءة وحفظ إعدادات الجدول. الحفظ لمن يملك صلاحية إدارة الجدول فقط، وداخل مدرسته.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "timetable:manage")) return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  const row = await prisma.timetableSettings.findUnique({ where: { schoolId: user.schoolId } });
  return NextResponse.json({ settings: (row?.data as TimetableSettings | undefined) ?? DEFAULT_SETTINGS });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "timetable:manage")) return NextResponse.json({ error: "ليست لديك صلاحية" }, { status: 403 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const err = validateSettings(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  await prisma.timetableSettings.upsert({
    where: { schoolId: user.schoolId },
    create: { schoolId: user.schoolId, data: body as object },
    update: { data: body as object },
  });
  return NextResponse.json({ ok: true });
}
