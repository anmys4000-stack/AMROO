import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";
import { parseStudentsFile, parseTeachersFile } from "../../../src/lib/import-parse";

export const runtime = "nodejs";

const scrypt = promisify(scryptCb) as (p: string, s: Buffer, k: number) => Promise<Buffer>;
const MAX_BYTES = 5 * 1024 * 1024;

function randomPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(16), (b) => alphabet[b % alphabet.length]).join("");
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

// يرفع ملفًا واحدًا (طلاب أو معلمون) ويعرض معاينة، أو يعتمد الاستيراد عند mode=commit.
// الاستيراد داخل مدرسة المستخدم فقط، ولا يُكرّر طالبًا أو معلمًا موجودًا.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!hasPermission(user, "users:manage")) {
    return NextResponse.json({ error: "ليست لديك صلاحية الاستيراد" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

  const kind = String(form.get("kind") ?? "");
  const mode = String(form.get("mode") ?? "preview");
  const file = form.get("file");
  if (kind !== "students" && kind !== "teachers") {
    return NextResponse.json({ error: "نوع الملف غير معروف" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "اختر ملف Excel" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "حجم الملف أكبر من 5 ميغابايت" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  let parsed;
  try {
    parsed = kind === "students" ? await parseStudentsFile(buffer) : await parseTeachersFile(buffer);
  } catch {
    return NextResponse.json({ error: "تعذّر قراءة الملف، تأكد أنه ملف Excel صالح" }, { status: 400 });
  }

  const summary = {
    kind,
    rowsRead: parsed.rowsRead,
    toImport: kind === "students" ? parsed.students.length : parsed.teachers.length,
    skippedStudents: parsed.skippedStudents,
    teachersWithoutEmail: parsed.teachersWithoutEmail,
    classes: parsed.classNames.length,
  };

  if (mode !== "commit") {
    return NextResponse.json({ preview: summary });
  }

  const school = await prisma.school.findUnique({ where: { id: user.schoolId } });
  if (!school) return NextResponse.json({ error: "المدرسة غير موجودة" }, { status: 404 });

  if (kind === "students") {
    const classIdByName = new Map<string, string>();
    const existing = await prisma.schoolClass.findMany({ where: { schoolId: user.schoolId } });
    existing.forEach((c) => classIdByName.set(c.name, c.id));

    let createdClasses = 0;
    for (const name of parsed.classNames) {
      if (!classIdByName.has(name)) {
        const c = await prisma.schoolClass.create({ data: { schoolId: user.schoolId, name } });
        classIdByName.set(name, c.id);
        createdClasses++;
      }
    }

    let created = 0;
    let existingCount = 0;
    for (const s of parsed.students) {
      const classId = classIdByName.get(s.className) ?? null;
      const dup = await prisma.student.findFirst({ where: { schoolId: user.schoolId, fullName: s.fullName, classId } });
      if (dup) {
        existingCount++;
        continue;
      }
      await prisma.student.create({
        data: {
          schoolId: user.schoolId,
          classId,
          fullName: s.fullName,
          guardianName: s.guardianName,
          guardianPhone: s.guardianPhone,
        },
      });
      created++;
    }

    await prisma.auditLog.create({
      data: { schoolId: user.schoolId, actorId: user.id, action: "import_students", entity: "Student", entityId: null },
    });
    return NextResponse.json({ result: { createdClasses, createdStudents: created, existingStudents: existingCount } });
  }

  // المعلمون: حساب لكل معلم بكلمة مرور مؤقتة يُجبر على تغييرها عند أول دخول.
  const passwordRows: string[] = ["email,fullName,temporaryPassword"];
  let created = 0;
  let existingCount = 0;
  for (const t of parsed.teachers) {
    const exists = await prisma.user.findUnique({ where: { email: t.email } });
    if (exists) {
      existingCount++;
      continue;
    }
    const password = randomPassword();
    await prisma.user.create({
      data: {
        schoolId: user.schoolId,
        email: t.email,
        fullName: t.fullName,
        passwordHash: await hashPassword(password),
        role: "TEACHER",
        mustChangePassword: true,
        phone: t.phone,
        specialty: t.specialty,
      },
    });
    passwordRows.push(`${t.email},"${t.fullName.replace(/"/g, '""')}",${password}`);
    created++;
  }

  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, actorId: user.id, action: "import_teachers", entity: "User", entityId: null },
  });
  return NextResponse.json({
    result: { createdTeachers: created, existingTeachers: existingCount },
    // تُعرض مرة واحدة فقط ليحفظها المدير، ولا تُخزَّن على الخادم.
    passwordsCsv: passwordRows.length > 1 ? passwordRows.join("\n") + "\n" : null,
  });
}
