// استيراد الطلاب والمعلمين من ملفات Excel إلى مدرسة في AMROO.
//
// الاستخدام (يُشغَّل من جهازك، ويجب أن تملك موافقة المدرسة على نقل البيانات):
//   1) تجربة بدون كتابة (الافتراضي):
//      DATABASE_URL="..." node scripts/import-school.mjs --students students.xlsx --teachers teachers.xlsx --school "اسم المدرسة"
//   2) الكتابة الفعلية بعد مراجعة التقرير:
//      ... --commit --passwords-out teacher-passwords.csv
//
// ملاحظات حماية البيانات:
// - لا يُستورد السجل المدني ولا رقم الهوية أبدًا.
// - كلمات مرور المعلمين المؤقتة تُكتب إلى ملف CSV محلي تحدده أنت فقط، ولا تُعرض في الطرفية.
//   احذف هذا الملف بعد توزيعه على المعلمين.
// - كل معلم يُجبر على تغيير كلمة المرور عند أول دخول.
// - الفصول تُنشأ بالشكل «الصف - الفصل» مثل مسار، ولا تُكرَّر.
// - لا يُكتب شيء في قاعدة البيانات إلا مع --commit.
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { scrypt as scryptCb } from "node:crypto";
import ExcelJS from "exceljs";

const scrypt = promisify(scryptCb);

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const studentsPath = option("--students");
const teachersPath = option("--teachers");
const schoolName = option("--school");
const passwordsOut = option("--passwords-out");
const commit = flag("--commit");

function fail(msg) {
  console.error("FAILED:", msg);
  process.exit(1);
}

if (!studentsPath && !teachersPath) fail("pass --students and/or --teachers");
if (!schoolName) fail("pass --school \"اسم المدرسة\"");
if (commit && !/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "")) {
  fail("DATABASE_URL must start with postgresql:// to commit");
}
if (commit && !passwordsOut && teachersPath) {
  fail("--passwords-out is required with --commit when importing teachers");
}

const clean = (v) => (v === null || v === undefined ? "" : String(v).trim());
const normalizeGrade = (g) => clean(g).replace(/\s+/g, " ").replace(/^ال/, "ال");

// تحويل «الثالث ابتدائي» إلى «ثالث ابتدائي» لتطابق أسماء الفصول في الموقع.
function gradeLabel(raw) {
  return clean(raw).replace(/^ال/, "").replace(/^(أول|اول|الأول)/, "أول");
}

async function readRows(path) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const header = [];
  const out = [];
  ws.eachRow((row, rowNumber) => {
    // exceljs يعيد الخلايا من الفهرس 1، ونحوّلها إلى مصفوفة من الفهرس 0.
    const values = [];
    for (let i = 1; i <= Math.max(row.cellCount, header.length); i++) {
      const cell = row.getCell(i).value;
      values.push(cell && typeof cell === "object" && "text" in cell ? cell.text : cell);
    }
    if (rowNumber === 1) {
      values.forEach((v) => header.push(clean(v)));
      return;
    }
    if (!values.some((c) => clean(c) !== "")) return;
    const obj = {};
    header.forEach((h, i) => (obj[h] = values[i]));
    out.push(obj);
  });
  return out;
}

const report = { students: null, teachers: null, classesToCreate: [] };

let studentRows = [];
let teacherRows = [];
if (studentsPath) studentRows = await readRows(studentsPath);
if (teachersPath) teacherRows = await readRows(teachersPath);

// ---- تحليل الطلاب ----
const studentPlan = [];
const skippedStudents = [];
for (const r of studentRows) {
  const fullName = clean(r["الاسم"]);
  const grade = gradeLabel(r["الصف"]);
  const section = clean(r["الفصل"]);
  if (!fullName || !grade || !section) {
    skippedStudents.push(fullName || "(بدون اسم)");
    continue;
  }
  studentPlan.push({
    fullName,
    className: `${grade} - ${section}`,
    guardianName: clean(r["اسم ولي الأمر"]) || null,
    guardianPhone: clean(r["جوال ولي الأمر"]) || null,
    status: clean(r["الحالة"]),
  });
}
const classNames = [...new Set(studentPlan.map((s) => s.className))];
report.students = {
  rowsRead: studentRows.length,
  toImport: studentPlan.length,
  skippedMissingData: skippedStudents.length,
  classes: classNames.length,
  withoutGuardianPhone: studentPlan.filter((s) => !s.guardianPhone).length,
};

// ---- تحليل المعلمين ----
const teacherPlan = [];
const teacherNoEmail = [];
for (const r of teacherRows) {
  const fullName = clean(r["الاسم"]);
  const email = clean(r["البريد الإلكتروني"]).toLowerCase();
  if (!fullName) continue;
  if (!email || !email.includes("@")) {
    teacherNoEmail.push(fullName);
    continue;
  }
  teacherPlan.push({
    fullName,
    email,
    phone: clean(r["الجوال"]) || null,
    specialty: clean(r["التخصص"]) || null,
  });
}
report.teachers = {
  rowsRead: teacherRows.length,
  toCreate: teacherPlan.length,
  skippedNoEmail: teacherNoEmail.length,
};

console.log("Report:");
console.log(JSON.stringify(report, null, 2));

if (!commit) {
  console.log("\nDry run only. Nothing was written. Re-run with --commit to import.");
  process.exit(0);
}

// ---- الكتابة الفعلية ----
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

function randomPassword() {
  // 16 حرفًا عشوائيًا بدون أحرف ملتبسة.
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function hash(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

try {
  let school = await prisma.school.findFirst({ where: { name: schoolName } });
  if (!school) school = await prisma.school.create({ data: { name: schoolName } });

  // الفصول: إنشاء ما ينقص فقط.
  const classIdByName = new Map();
  const existingClasses = await prisma.schoolClass.findMany({ where: { schoolId: school.id } });
  for (const c of existingClasses) classIdByName.set(c.name, c.id);
  let createdClasses = 0;
  for (const name of classNames) {
    if (!classIdByName.has(name)) {
      const c = await prisma.schoolClass.create({ data: { schoolId: school.id, name } });
      classIdByName.set(name, c.id);
      createdClasses++;
    }
  }

  // الطلاب: تخطَّ من له الاسم نفسه في الفصل نفسه.
  let createdStudents = 0;
  let existingStudents = 0;
  for (const s of studentPlan) {
    const classId = classIdByName.get(s.className);
    const dup = await prisma.student.findFirst({
      where: { schoolId: school.id, fullName: s.fullName, classId },
    });
    if (dup) {
      existingStudents++;
      continue;
    }
    await prisma.student.create({
      data: {
        schoolId: school.id,
        classId,
        fullName: s.fullName,
        guardianName: s.guardianName,
        guardianPhone: s.guardianPhone,
      },
    });
    createdStudents++;
  }

  // المعلمون: حساب لكل معلم بكلمة مرور مؤقتة يُجبر على تغييرها.
  const passwordRows = ["email,fullName,temporaryPassword"];
  let createdTeachers = 0;
  let existingTeachers = 0;
  for (const t of teacherPlan) {
    const exists = await prisma.user.findUnique({ where: { email: t.email } });
    if (exists) {
      existingTeachers++;
      continue;
    }
    const password = randomPassword();
    await prisma.user.create({
      data: {
        schoolId: school.id,
        email: t.email,
        fullName: t.fullName,
        passwordHash: await hash(password),
        role: "TEACHER",
        mustChangePassword: true,
        phone: t.phone,
        specialty: t.specialty,
      },
    });
    passwordRows.push(`${t.email},"${t.fullName.replace(/"/g, '""')}",${password}`);
    createdTeachers++;
  }

  if (passwordsOut && passwordRows.length > 1) {
    writeFileSync(passwordsOut, passwordRows.join("\n") + "\n", { mode: 0o600 });
  }

  await prisma.auditLog.create({
    data: {
      schoolId: school.id,
      action: "bulk_import",
      entity: "School",
      entityId: school.id,
    },
  });

  console.log("\nCommitted:");
  console.log(
    JSON.stringify(
      { createdClasses, createdStudents, existingStudents, createdTeachers, existingTeachers },
      null,
      2,
    ),
  );
  if (passwordsOut) console.log(`Temporary teacher passwords written to the file you chose (${passwordsOut}). Delete it after distributing.`);
} finally {
  await prisma.$disconnect().catch(() => {});
}
