import ExcelJS from "exceljs";

// تحليل ملفات الاستيراد (الطلاب والمعلمون) من نظام نور أو مسار.
// نقرأ الأعمدة بأسمائها، ونتجاهل أي عمود لا نحتاجه، ولا نستورد السجل المدني أبدًا.

export type StudentRow = {
  fullName: string;
  className: string;
  guardianName: string | null;
  guardianPhone: string | null;
};

export type TeacherRow = {
  fullName: string;
  email: string;
  phone: string | null;
  specialty: string | null;
};

export type ParsedImport = {
  rowsRead: number;
  students: StudentRow[];
  skippedStudents: number;
  teachers: TeacherRow[];
  teachersWithoutEmail: number;
  classNames: string[];
};

function clean(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "text" in (v as object)) return String((v as { text: unknown }).text).trim();
  return String(v).trim();
}

// «الثالث ابتدائي» و«الأول متوسط» تصبح «ثالث ابتدائي» و«أول متوسط».
export function gradeLabel(raw: string): string {
  return clean(raw).replace(/^ال/, "").replace(/^(أول|اول)/, "أول").replace(/\s+/g, " ");
}

async function readSheetRows(buffer: ArrayBuffer): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const header: string[] = [];
  const out: Record<string, string>[] = [];
  ws.eachRow((row, rowNumber) => {
    const values: string[] = [];
    for (let i = 1; i <= Math.max(row.cellCount, header.length); i++) {
      values.push(clean(row.getCell(i).value));
    }
    if (rowNumber === 1) {
      values.forEach((v) => header.push(v));
      return;
    }
    if (!values.some((v) => v !== "")) return;
    const obj: Record<string, string> = {};
    header.forEach((h, i) => (obj[h] = values[i] ?? ""));
    out.push(obj);
  });
  return out;
}

export async function parseStudentsFile(buffer: ArrayBuffer): Promise<ParsedImport> {
  const rows = await readSheetRows(buffer);
  const students: StudentRow[] = [];
  let skipped = 0;
  for (const r of rows) {
    const fullName = clean(r["الاسم"]);
    const grade = gradeLabel(r["الصف"] ?? "");
    const section = clean(r["الفصل"]);
    if (!fullName || !grade || !section) {
      skipped++;
      continue;
    }
    students.push({
      fullName,
      className: `${grade} - ${section}`,
      guardianName: clean(r["اسم ولي الأمر"]) || null,
      guardianPhone: clean(r["جوال ولي الأمر"]) || null,
    });
  }
  return {
    rowsRead: rows.length,
    students,
    skippedStudents: skipped,
    teachers: [],
    teachersWithoutEmail: 0,
    classNames: [...new Set(students.map((s) => s.className))],
  };
}

export async function parseTeachersFile(buffer: ArrayBuffer): Promise<ParsedImport> {
  const rows = await readSheetRows(buffer);
  const teachers: TeacherRow[] = [];
  let noEmail = 0;
  for (const r of rows) {
    const fullName = clean(r["الاسم"]);
    const email = clean(r["البريد الإلكتروني"]).toLowerCase();
    if (!fullName) continue;
    if (!email || !email.includes("@")) {
      noEmail++;
      continue;
    }
    teachers.push({
      fullName,
      email,
      phone: clean(r["الجوال"]) || null,
      specialty: clean(r["التخصص"]) || null,
    });
  }
  return {
    rowsRead: rows.length,
    students: [],
    skippedStudents: 0,
    teachers,
    teachersWithoutEmail: noEmail,
    classNames: [],
  };
}
